"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatgptImportRoutes = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const prisma_1 = require("../lib/prisma");
exports.chatgptImportRoutes = (0, express_1.Router)();
// Configure multer for JSON file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadsDir = path_1.default.join(__dirname, '../../uploads/chatgpt-imports');
        if (!fs_1.default.existsSync(uploadsDir)) {
            fs_1.default.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `chatgpt-${uniqueSuffix}.json`);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max (ChatGPT exports can be large)
});
function extractMessagesFromMapping(mapping) {
    const messages = [];
    // Find root node (parent is null)
    let currentId = null;
    for (const [id, node] of Object.entries(mapping)) {
        if (node.parent === null) {
            currentId = node.children[0] || null;
            break;
        }
    }
    // Traverse the conversation tree
    const visited = new Set();
    while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        const node = mapping[currentId];
        if (!node)
            break;
        if (node.message && node.message.content) {
            const role = node.message.author.role;
            if (role === 'user' || role === 'assistant') {
                let content = '';
                if (node.message.content.parts) {
                    content = node.message.content.parts.filter(p => typeof p === 'string').join('\n');
                }
                else if (node.message.content.text) {
                    content = node.message.content.text;
                }
                if (content.trim()) {
                    messages.push({
                        role,
                        content: content.trim(),
                        timestamp: node.message.create_time
                            ? new Date(node.message.create_time * 1000)
                            : null,
                    });
                }
            }
        }
        // Move to first child (main conversation thread)
        currentId = node.children[0] || null;
    }
    return messages;
}
function parseConversations(jsonContent) {
    const raw = JSON.parse(jsonContent);
    return raw.map(conv => {
        const messages = extractMessagesFromMapping(conv.mapping);
        return {
            id: conv.conversation_id,
            title: conv.title || 'Untitled Conversation',
            createdAt: new Date(conv.create_time * 1000),
            updatedAt: new Date(conv.update_time * 1000),
            messages,
            messageCount: messages.length,
        };
    }).filter(conv => conv.messageCount > 0)
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}
// POST /api/chatgpt-import/parse - Parse export and return conversation list
exports.chatgptImportRoutes.post('/parse', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }
        const content = fs_1.default.readFileSync(req.file.path, 'utf-8');
        const conversations = parseConversations(content);
        // Clean up uploaded file
        fs_1.default.unlinkSync(req.file.path);
        // Return summary of all conversations
        res.json({
            totalConversations: conversations.length,
            conversations: conversations.map(c => ({
                id: c.id,
                title: c.title,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt,
                messageCount: c.messageCount,
                preview: c.messages.slice(0, 3).map(m => ({
                    role: m.role,
                    content: m.content.slice(0, 200) + (m.content.length > 200 ? '...' : ''),
                })),
            })),
        });
    }
    catch (error) {
        console.error('Error parsing ChatGPT export:', error);
        res.status(500).json({ error: 'Failed to parse ChatGPT export file' });
    }
});
// POST /api/chatgpt-import/import - Import selected conversations
exports.chatgptImportRoutes.post('/import', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }
        const { conversationIds, // JSON array of conversation IDs to import, or 'all'
        createArtifacts = 'true', createEvents = 'true', } = req.body;
        const content = fs_1.default.readFileSync(req.file.path, 'utf-8');
        const allConversations = parseConversations(content);
        // Clean up uploaded file
        fs_1.default.unlinkSync(req.file.path);
        // Filter conversations if specific IDs provided
        let conversationsToImport = allConversations;
        if (conversationIds && conversationIds !== 'all') {
            const ids = JSON.parse(conversationIds);
            conversationsToImport = allConversations.filter(c => ids.includes(c.id));
        }
        const results = {
            conversationsImported: 0,
            artifactsCreated: 0,
            eventsCreated: 0,
        };
        for (const conv of conversationsToImport) {
            // Build transcript
            const transcript = conv.messages
                .map(m => {
                const timestamp = m.timestamp ? m.timestamp.toISOString() : '';
                const speaker = m.role === 'user' ? 'You' : 'ChatGPT';
                return `[${timestamp}] ${speaker}:\n${m.content}`;
            })
                .join('\n\n---\n\n');
            let artifactId = null;
            // Create artifact with full conversation
            if (createArtifacts === 'true') {
                const artifact = await prisma_1.prisma.artifact.create({
                    data: {
                        type: 'document',
                        sourceSystem: 'chatgpt',
                        shortDescription: `ChatGPT: ${conv.title}`,
                        transcribedText: transcript,
                        importedFrom: `ChatGPT export - ${conv.title}`,
                    },
                });
                artifactId = artifact.id;
                results.artifactsCreated++;
            }
            // Create event for the conversation
            if (createEvents === 'true') {
                const userMessages = conv.messages.filter(m => m.role === 'user');
                const summary = userMessages[0]?.content.slice(0, 300) || 'ChatGPT conversation';
                const event = await prisma_1.prisma.event.create({
                    data: {
                        title: `ChatGPT: ${conv.title}`,
                        date: conv.createdAt,
                        summary: summary + (summary.length >= 300 ? '...' : ''),
                        notes: `## ChatGPT Conversation\n\n**Created:** ${conv.createdAt.toLocaleDateString()}\n**Messages:** ${conv.messageCount}\n\n---\n\n${transcript}`,
                        emotionTags: '[]',
                    },
                });
                results.eventsCreated++;
                // Link event to artifact
                if (artifactId) {
                    await prisma_1.prisma.eventArtifact.create({
                        data: { eventId: event.id, artifactId },
                    });
                }
            }
            results.conversationsImported++;
        }
        res.json({
            success: true,
            results,
        });
    }
    catch (error) {
        console.error('Error importing ChatGPT data:', error);
        res.status(500).json({ error: 'Failed to import ChatGPT data' });
    }
});
// GET /api/chatgpt-import/instructions - Return instructions for users
exports.chatgptImportRoutes.get('/instructions', (req, res) => {
    res.json({
        title: 'How to Export Your ChatGPT Data',
        steps: [
            {
                step: 1,
                title: 'Open ChatGPT Settings',
                description: 'Click your profile icon in the bottom-left, then click "Settings"',
            },
            {
                step: 2,
                title: 'Go to Data Controls',
                description: 'Click "Data controls" in the settings menu',
            },
            {
                step: 3,
                title: 'Export Data',
                description: 'Click "Export data" and confirm. ChatGPT will email you when ready.',
            },
            {
                step: 4,
                title: 'Download ZIP',
                description: 'Check your email and download the ZIP file (usually arrives within minutes)',
            },
            {
                step: 5,
                title: 'Extract conversations.json',
                description: 'Unzip the file and find "conversations.json" - this contains all your chats',
            },
            {
                step: 6,
                title: 'Upload to Origins',
                description: 'Upload conversations.json here to preview and import your conversations',
            },
        ],
        notes: [
            'The export includes ALL your ChatGPT conversations',
            'You can select which conversations to import after uploading',
            'Each conversation becomes an artifact and/or event in your memoir',
            'Images and file attachments are not included in the export',
            'Large exports may take a moment to process',
        ],
    });
});
//# sourceMappingURL=chatgptImport.js.map