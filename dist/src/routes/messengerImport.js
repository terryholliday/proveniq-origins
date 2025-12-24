"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.messengerImportRoutes = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const prisma_1 = require("../lib/prisma");
exports.messengerImportRoutes = (0, express_1.Router)();
// Configure multer for ZIP file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadsDir = path_1.default.join(__dirname, '../../uploads/messenger-imports');
        if (!fs_1.default.existsSync(uploadsDir)) {
            fs_1.default.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `messenger-${uniqueSuffix}.json`);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
});
// Fix Facebook's mojibake encoding (latin1 → UTF-8)
function fixEncoding(str) {
    try {
        // Facebook exports text encoded as latin1 but stored as UTF-8
        return Buffer.from(str, 'latin1').toString('utf-8');
    }
    catch {
        return str;
    }
}
function fixEncodingDeep(obj) {
    if (typeof obj === 'string') {
        return fixEncoding(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map(fixEncodingDeep);
    }
    if (obj && typeof obj === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = fixEncodingDeep(value);
        }
        return result;
    }
    return obj;
}
function parseMessengerJson(jsonContent) {
    const raw = JSON.parse(jsonContent);
    const data = fixEncodingDeep(raw);
    const messages = data.messages
        .filter(m => m.type === 'Generic' || m.type === 'Share')
        .map(m => {
        const mediaTypes = [];
        if (m.photos?.length)
            mediaTypes.push('photo');
        if (m.videos?.length)
            mediaTypes.push('video');
        if (m.audio_files?.length)
            mediaTypes.push('audio');
        if (m.gifs?.length)
            mediaTypes.push('gif');
        if (m.sticker)
            mediaTypes.push('sticker');
        let content = m.content || '';
        if (m.share?.link) {
            content += (content ? '\n' : '') + `[Shared: ${m.share.link}]`;
        }
        if (m.is_unsent) {
            content = '[Message unsent]';
        }
        return {
            sender: m.sender_name,
            timestamp: new Date(m.timestamp_ms),
            content,
            type: m.type,
            hasMedia: mediaTypes.length > 0,
            mediaTypes,
            reactions: m.reactions || [],
        };
    })
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const timestamps = messages.map(m => m.timestamp.getTime());
    return {
        title: data.title,
        participants: data.participants.map(p => p.name),
        messageCount: messages.length,
        dateRange: {
            earliest: new Date(Math.min(...timestamps)),
            latest: new Date(Math.max(...timestamps)),
        },
        messages,
    };
}
// POST /api/messenger-import/parse - Parse a single JSON file and return preview
exports.messengerImportRoutes.post('/parse', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }
        const content = fs_1.default.readFileSync(req.file.path, 'utf-8');
        const parsed = parseMessengerJson(content);
        // Clean up uploaded file
        fs_1.default.unlinkSync(req.file.path);
        // Return preview (first 50 messages)
        res.json({
            title: parsed.title,
            participants: parsed.participants,
            messageCount: parsed.messageCount,
            dateRange: parsed.dateRange,
            preview: parsed.messages.slice(0, 50),
        });
    }
    catch (error) {
        console.error('Error parsing Messenger JSON:', error);
        res.status(500).json({ error: 'Failed to parse Messenger export file' });
    }
});
// POST /api/messenger-import/import - Import conversation as events/artifacts
exports.messengerImportRoutes.post('/import', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }
        const { createPeople = 'true', createArtifact = 'true', groupByDay = 'true', } = req.body;
        const content = fs_1.default.readFileSync(req.file.path, 'utf-8');
        const parsed = parseMessengerJson(content);
        // Clean up uploaded file
        fs_1.default.unlinkSync(req.file.path);
        const results = {
            peopleCreated: 0,
            artifactsCreated: 0,
            eventsCreated: 0,
        };
        // Create Person records for participants
        const personMap = new Map(); // name -> id
        if (createPeople === 'true') {
            for (const name of parsed.participants) {
                const existing = await prisma_1.prisma.person.findFirst({ where: { name } });
                if (existing) {
                    personMap.set(name, existing.id);
                }
                else {
                    const person = await prisma_1.prisma.person.create({
                        data: {
                            name,
                            role: 'Messenger Contact',
                            relationshipType: 'contact',
                            notes: `Imported from Facebook Messenger conversation: ${parsed.title}`,
                        },
                    });
                    personMap.set(name, person.id);
                    results.peopleCreated++;
                }
            }
        }
        // Create artifact with full conversation transcript
        let artifactId = null;
        if (createArtifact === 'true') {
            const transcript = parsed.messages
                .map(m => {
                const date = m.timestamp.toISOString().split('T')[0];
                const time = m.timestamp.toTimeString().split(' ')[0];
                const media = m.hasMedia ? ` [${m.mediaTypes.join(', ')}]` : '';
                const reactions = m.reactions.length
                    ? ` (${m.reactions.map(r => `${r.reaction} by ${r.actor}`).join(', ')})`
                    : '';
                return `[${date} ${time}] ${m.sender}: ${m.content}${media}${reactions}`;
            })
                .join('\n');
            const artifact = await prisma_1.prisma.artifact.create({
                data: {
                    type: 'document',
                    sourceSystem: 'facebook-messenger',
                    shortDescription: `Messenger: ${parsed.title}`,
                    transcribedText: transcript,
                    importedFrom: `Facebook Messenger export - ${parsed.title}`,
                },
            });
            artifactId = artifact.id;
            results.artifactsCreated++;
            // Link artifact to people
            for (const personId of personMap.values()) {
                await prisma_1.prisma.artifactPerson.create({
                    data: { artifactId: artifact.id, personId },
                });
            }
        }
        // Create events (grouped by day or as single event)
        if (groupByDay === 'true') {
            // Group messages by day
            const messagesByDay = new Map();
            for (const msg of parsed.messages) {
                const day = msg.timestamp.toISOString().split('T')[0];
                if (!messagesByDay.has(day)) {
                    messagesByDay.set(day, []);
                }
                messagesByDay.get(day).push(msg);
            }
            for (const [day, dayMessages] of messagesByDay) {
                const senders = [...new Set(dayMessages.map(m => m.sender))];
                const event = await prisma_1.prisma.event.create({
                    data: {
                        title: `Messenger chat: ${parsed.title}`,
                        date: new Date(day),
                        summary: `${dayMessages.length} messages with ${senders.join(', ')}`,
                        notes: dayMessages
                            .map(m => `[${m.timestamp.toTimeString().split(' ')[0]}] ${m.sender}: ${m.content}`)
                            .join('\n'),
                        emotionTags: '[]',
                    },
                });
                results.eventsCreated++;
                // Link event to people
                for (const personId of personMap.values()) {
                    await prisma_1.prisma.eventPerson.create({
                        data: { eventId: event.id, personId },
                    });
                }
                // Link event to artifact
                if (artifactId) {
                    await prisma_1.prisma.eventArtifact.create({
                        data: { eventId: event.id, artifactId },
                    });
                }
            }
        }
        else {
            // Create single event for entire conversation
            const event = await prisma_1.prisma.event.create({
                data: {
                    title: `Messenger conversation: ${parsed.title}`,
                    date: parsed.dateRange.earliest,
                    summary: `${parsed.messageCount} messages from ${parsed.dateRange.earliest.toLocaleDateString()} to ${parsed.dateRange.latest.toLocaleDateString()}`,
                    notes: `Conversation with ${parsed.participants.join(', ')}`,
                    emotionTags: '[]',
                },
            });
            results.eventsCreated++;
            for (const personId of personMap.values()) {
                await prisma_1.prisma.eventPerson.create({
                    data: { eventId: event.id, personId },
                });
            }
            if (artifactId) {
                await prisma_1.prisma.eventArtifact.create({
                    data: { eventId: event.id, artifactId },
                });
            }
        }
        res.json({
            success: true,
            conversation: parsed.title,
            participants: parsed.participants,
            messageCount: parsed.messageCount,
            dateRange: parsed.dateRange,
            results,
        });
    }
    catch (error) {
        console.error('Error importing Messenger data:', error);
        res.status(500).json({ error: 'Failed to import Messenger data' });
    }
});
// GET /api/messenger-import/instructions - Return instructions for users
exports.messengerImportRoutes.get('/instructions', (req, res) => {
    res.json({
        title: 'How to Export Your Facebook Messenger Data',
        steps: [
            {
                step: 1,
                title: 'Go to Facebook Data Download',
                description: 'Visit facebook.com/dyi or go to Settings → Your Facebook Information → Download Your Information',
            },
            {
                step: 2,
                title: 'Select Messages',
                description: 'Under "Your Information", check only "Messages" to keep the download size manageable',
            },
            {
                step: 3,
                title: 'Choose JSON Format',
                description: 'Select "JSON" as the format (not HTML). This is required for import.',
            },
            {
                step: 4,
                title: 'Select Date Range',
                description: 'Optionally filter by date range to limit the export size',
            },
            {
                step: 5,
                title: 'Request Download',
                description: 'Click "Create File". Facebook will notify you when ready (can take hours to days)',
            },
            {
                step: 6,
                title: 'Download and Extract',
                description: 'Download the ZIP file and extract it. Find your conversations in messages/inbox/',
            },
            {
                step: 7,
                title: 'Upload to Origins',
                description: 'Upload the message_1.json file from any conversation folder',
            },
        ],
        notes: [
            'Each conversation folder contains message_1.json (and message_2.json, etc. for long conversations)',
            'Media files (photos, videos) are in subfolders but are not imported - only message text',
            'Facebook encodes special characters oddly - we automatically fix this during import',
            'Large conversations may take a moment to process',
        ],
    });
});
//# sourceMappingURL=messengerImport.js.map