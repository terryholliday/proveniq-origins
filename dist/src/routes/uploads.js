"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadRoutes = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const adm_zip_1 = __importDefault(require("adm-zip"));
const prisma_1 = require("../lib/prisma");
const contentExtractor_1 = require("../services/contentExtractor");
exports.uploadRoutes = (0, express_1.Router)();
// Ensure uploads directory exists
const uploadsDir = path_1.default.join(__dirname, '../../uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
// Configure multer for audio file storage
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `audio-${uniqueSuffix}${ext}`);
    },
});
// File filter for audio files
const audioFilter = (req, file, cb) => {
    const allowedTypes = [
        'audio/mpeg', // .mp3
        'audio/wav', // .wav
        'audio/wave', // .wav
        'audio/x-wav', // .wav
        'audio/mp4', // .m4a
        'audio/x-m4a', // .m4a
        'audio/aac', // .aac
        'audio/ogg', // .ogg
        'audio/webm', // .webm
        'audio/flac', // .flac
        'audio/x-flac', // .flac
        'audio/x-ms-wma', // .wma (Windows Media Audio)
        'audio/wma', // .wma
        'audio/amr', // .amr (voice recordings)
        'audio/3gpp', // .3gp (phone recordings)
        'audio/3gpp2', // .3g2
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error(`Invalid file type: ${file.mimetype}. Only audio files are allowed.`));
    }
};
// File filter for images
const imageFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/heic',
        'image/heif',
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error(`Invalid file type: ${file.mimetype}. Only image files are allowed.`));
    }
};
// Storage for images
const imageStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const imagesDir = path_1.default.join(uploadsDir, 'images');
        if (!fs_1.default.existsSync(imagesDir)) {
            fs_1.default.mkdirSync(imagesDir, { recursive: true });
        }
        cb(null, imagesDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `photo-${uniqueSuffix}${ext}`);
    },
});
const upload = (0, multer_1.default)({
    storage,
    fileFilter: audioFilter,
    limits: {
        fileSize: 500 * 1024 * 1024, // 500MB max for long therapy sessions
    },
});
const uploadImage = (0, multer_1.default)({
    storage: imageStorage,
    fileFilter: imageFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max for photos
    },
});
// Storage for documents (PDFs, text files, etc.)
const documentStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const docsDir = path_1.default.join(uploadsDir, 'documents');
        if (!fs_1.default.existsSync(docsDir)) {
            fs_1.default.mkdirSync(docsDir, { recursive: true });
        }
        cb(null, docsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `doc-${uniqueSuffix}${ext}`);
    },
});
const documentFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/pdf',
        'text/plain',
        'text/markdown',
        'text/csv',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const allowedExtensions = ['.pdf', '.txt', '.md', '.csv', '.doc', '.docx'];
    const ext = path_1.default.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
        cb(null, true);
    }
    else {
        cb(new Error(`Invalid file type: ${file.mimetype}. Only documents are allowed.`));
    }
};
const uploadDocument = (0, multer_1.default)({
    storage: documentStorage,
    fileFilter: documentFilter,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB max for documents
    },
});
// Storage for bulk uploads (any file type)
const bulkStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const bulkDir = path_1.default.join(uploadsDir, 'bulk');
        if (!fs_1.default.existsSync(bulkDir)) {
            fs_1.default.mkdirSync(bulkDir, { recursive: true });
        }
        cb(null, bulkDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `bulk-${uniqueSuffix}${ext}`);
    },
});
const uploadBulk = (0, multer_1.default)({
    storage: bulkStorage,
    limits: {
        fileSize: 500 * 1024 * 1024, // 500MB max for bulk/zip
    },
});
// POST /api/uploads/audio - Upload audio file and create artifact
exports.uploadRoutes.post('/audio', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }
        const { shortDescription, sourceSystem } = req.body;
        // Create artifact record
        const artifact = await prisma_1.prisma.artifact.create({
            data: {
                type: 'audio',
                sourceSystem: sourceSystem || 'upload',
                sourcePathOrUrl: `/uploads/${req.file.filename}`,
                shortDescription: shortDescription || req.file.originalname,
                importedFrom: req.file.originalname,
            },
        });
        // Extract/transcribe content synchronously and return for user review
        const filePath = path_1.default.join(uploadsDir, req.file.filename);
        let extractedText = '';
        try {
            const result = await (0, contentExtractor_1.extractContent)(filePath, req.file.mimetype);
            extractedText = result.text || '';
            console.log(`Audio transcription complete: ${extractedText.length} chars`);
        }
        catch (err) {
            console.error('Audio transcription error:', err);
        }
        res.status(201).json({
            artifact,
            file: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype,
            },
            extractedText,
            message: extractedText ? 'Audio uploaded and transcribed. Review below.' : 'Audio uploaded. Transcription not available (check OpenAI API key).',
        });
    }
    catch (error) {
        console.error('Error uploading audio:', error);
        // Clean up file if artifact creation failed
        if (req.file) {
            fs_1.default.unlinkSync(path_1.default.join(uploadsDir, req.file.filename));
        }
        res.status(500).json({ error: 'Failed to upload audio file' });
    }
});
// POST /api/uploads/audio/batch - Upload multiple audio files
exports.uploadRoutes.post('/audio/batch', upload.array('audio', 50), async (req, res) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No audio files provided' });
        }
        const { sourceSystem } = req.body;
        const artifacts = [];
        for (const file of files) {
            const artifact = await prisma_1.prisma.artifact.create({
                data: {
                    type: 'audio',
                    sourceSystem: sourceSystem || 'upload',
                    sourcePathOrUrl: `/uploads/${file.filename}`,
                    shortDescription: file.originalname,
                    importedFrom: file.originalname,
                },
            });
            artifacts.push(artifact);
        }
        res.status(201).json({
            count: artifacts.length,
            artifacts,
        });
    }
    catch (error) {
        console.error('Error uploading audio batch:', error);
        res.status(500).json({ error: 'Failed to upload audio files' });
    }
});
// GET /api/uploads/:filename - Serve uploaded file
exports.uploadRoutes.get('/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path_1.default.join(uploadsDir, filename);
    if (!fs_1.default.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }
    res.sendFile(filePath);
});
// DELETE /api/uploads/:filename - Delete uploaded file
exports.uploadRoutes.delete('/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path_1.default.join(uploadsDir, filename);
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});
// POST /api/uploads/image - Upload image and create artifact (alias for /photo)
exports.uploadRoutes.post('/image', uploadImage.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image provided' });
        }
        const { shortDescription, sourceSystem } = req.body;
        const imagesDir = path_1.default.join(uploadsDir, 'images');
        const artifact = await prisma_1.prisma.artifact.create({
            data: {
                type: 'photo',
                sourceSystem: sourceSystem || 'upload',
                sourcePathOrUrl: `/uploads/images/${req.file.filename}`,
                shortDescription: shortDescription || req.file.originalname,
                importedFrom: req.file.originalname,
            },
        });
        // Analyze image synchronously and return for user review
        const filePath = path_1.default.join(imagesDir, req.file.filename);
        let extractedText = '';
        let memoryPrompts = [];
        let estimatedDate;
        try {
            const result = await (0, contentExtractor_1.extractContent)(filePath, req.file.mimetype);
            extractedText = result.analysis || result.text || '';
            memoryPrompts = result.memoryPrompts || [];
            estimatedDate = result.estimatedDate;
            console.log(`Image analysis complete: ${extractedText.length} chars, ${memoryPrompts.length} prompts`);
        }
        catch (err) {
            console.error('Image analysis error:', err);
        }
        res.status(201).json({
            artifact,
            file: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype,
                path: `/uploads/images/${req.file.filename}`,
            },
            extractedText,
            memoryPrompts,
            estimatedDate,
            message: extractedText ? 'Image uploaded and analyzed. Review the AI description below.' : 'Image uploaded. AI analysis not available (check OpenAI API key).',
        });
    }
    catch (error) {
        console.error('Error uploading image:', error);
        if (req.file) {
            const imagesDir = path_1.default.join(uploadsDir, 'images');
            fs_1.default.unlinkSync(path_1.default.join(imagesDir, req.file.filename));
        }
        res.status(500).json({ error: 'Failed to upload image' });
    }
});
// POST /api/uploads/document - Upload document (PDF, text) and extract content
exports.uploadRoutes.post('/document', uploadDocument.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No document provided' });
        }
        const { shortDescription, sourceSystem } = req.body;
        const docsDir = path_1.default.join(uploadsDir, 'documents');
        // Determine document type
        const ext = path_1.default.extname(req.file.originalname).toLowerCase();
        let docType = 'document';
        if (ext === '.pdf')
            docType = 'document';
        else if (['.txt', '.md'].includes(ext))
            docType = 'journal';
        else if (ext === '.csv')
            docType = 'document';
        const artifact = await prisma_1.prisma.artifact.create({
            data: {
                type: docType,
                sourceSystem: sourceSystem || 'upload',
                sourcePathOrUrl: `/uploads/documents/${req.file.filename}`,
                shortDescription: shortDescription || req.file.originalname,
                importedFrom: req.file.originalname,
            },
        });
        // Extract content synchronously and return for user review
        const filePath = path_1.default.join(docsDir, req.file.filename);
        let extractedText = '';
        try {
            const result = await (0, contentExtractor_1.extractContent)(filePath, req.file.mimetype);
            extractedText = result.text || '';
            console.log(`Document extraction complete: ${extractedText.length} chars`);
        }
        catch (err) {
            console.error('Document extraction error:', err);
        }
        // If we extracted text, trigger AI analysis
        let aiAnalysis = null;
        if (extractedText) {
            try {
                const openaiKey = process.env.OPENAI_API_KEY;
                if (openaiKey) {
                    const fetch = require('node-fetch');
                    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${openaiKey}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            model: 'gpt-4o-mini',
                            messages: [
                                {
                                    role: 'system',
                                    content: `You are Ori, a master biographer and journalist. A user just uploaded a document. Analyze it and respond in JSON:
{
  "summary": "2-3 sentence summary",
  "keyThemes": ["theme1", "theme2"],
  "peopleIdentified": ["name1", "name2"],
  "emotionalTone": "The emotional quality",
  "followUpQuestions": ["Question 1", "Question 2", "Question 3"],
  "oriMessage": "A warm journalist-style message about what you found and what you'd like to explore"
}`
                                },
                                {
                                    role: 'user',
                                    content: `Analyze this document:\n\n${extractedText.substring(0, 6000)}`
                                }
                            ],
                            max_tokens: 1000,
                            temperature: 0.7,
                        }),
                    });
                    if (analysisResponse.ok) {
                        const data = await analysisResponse.json();
                        const content = data.choices?.[0]?.message?.content || '';
                        const jsonMatch = content.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            aiAnalysis = JSON.parse(jsonMatch[0]);
                            // Update artifact with summary
                            await prisma_1.prisma.artifact.update({
                                where: { id: artifact.id },
                                data: {
                                    transcribedText: extractedText,
                                    shortDescription: aiAnalysis.summary || shortDescription || req.file.originalname,
                                },
                            });
                        }
                    }
                }
            }
            catch (aiError) {
                console.error('AI analysis error:', aiError);
            }
        }
        res.status(201).json({
            artifact,
            file: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype,
                path: `/uploads/documents/${req.file.filename}`,
            },
            extractedText,
            aiAnalysis,
            message: aiAnalysis
                ? 'Document uploaded and analyzed by Ori.'
                : extractedText
                    ? 'Document uploaded and text extracted.'
                    : 'Document uploaded. Could not extract text automatically.',
        });
    }
    catch (error) {
        console.error('Error uploading document:', error);
        if (req.file) {
            const docsDir = path_1.default.join(uploadsDir, 'documents');
            fs_1.default.unlinkSync(path_1.default.join(docsDir, req.file.filename));
        }
        res.status(500).json({ error: 'Failed to upload document' });
    }
});
// POST /api/uploads/photo - Upload photo and create artifact
exports.uploadRoutes.post('/photo', uploadImage.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No photo provided' });
        }
        const { shortDescription, sourceSystem, dateTaken, location } = req.body;
        // Create artifact record
        const artifact = await prisma_1.prisma.artifact.create({
            data: {
                type: 'photo',
                sourceSystem: sourceSystem || 'upload',
                sourcePathOrUrl: `/uploads/images/${req.file.filename}`,
                shortDescription: shortDescription || req.file.originalname,
                importedFrom: req.file.originalname,
            },
        });
        res.status(201).json({
            artifact,
            file: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype,
                path: `/uploads/images/${req.file.filename}`,
            },
        });
    }
    catch (error) {
        console.error('Error uploading photo:', error);
        if (req.file) {
            const imagesDir = path_1.default.join(uploadsDir, 'images');
            fs_1.default.unlinkSync(path_1.default.join(imagesDir, req.file.filename));
        }
        res.status(500).json({ error: 'Failed to upload photo' });
    }
});
// POST /api/uploads/photo/analyze - AI analysis of uploaded photo
exports.uploadRoutes.post('/photo/analyze', async (req, res) => {
    try {
        const { artifactId, imageUrl } = req.body;
        if (!artifactId && !imageUrl) {
            return res.status(400).json({ error: 'Artifact ID or image URL required' });
        }
        let imagePath = imageUrl;
        if (artifactId) {
            const artifact = await prisma_1.prisma.artifact.findUnique({ where: { id: artifactId } });
            if (!artifact) {
                return res.status(404).json({ error: 'Artifact not found' });
            }
            imagePath = artifact.sourcePathOrUrl;
        }
        const googleAiKey = process.env.GOOGLE_AI_API_KEY;
        if (!googleAiKey) {
            return res.status(500).json({ error: 'AI not configured' });
        }
        // For now, return a prompt for the user to describe the photo
        // Full image analysis would require Gemini Vision API with base64 encoding
        res.json({
            message: 'Photo uploaded successfully. Describe what you see in this photo to create a memory.',
            artifactId,
            suggestedQuestions: [
                'Who is in this photo?',
                'When was this taken?',
                'Where was this?',
                'What was happening?',
                'How did you feel in this moment?',
            ],
        });
    }
    catch (error) {
        console.error('Error analyzing photo:', error);
        res.status(500).json({ error: 'Failed to analyze photo' });
    }
});
// GET /api/uploads/documents/:filename - Serve uploaded document
exports.uploadRoutes.get('/documents/:filename', (req, res) => {
    const { filename } = req.params;
    const docsDir = path_1.default.join(uploadsDir, 'documents');
    const filePath = path_1.default.join(docsDir, filename);
    if (!fs_1.default.existsSync(filePath)) {
        return res.status(404).json({ error: 'Document not found' });
    }
    res.sendFile(filePath);
});
// GET /api/uploads/images/:filename - Serve uploaded image
exports.uploadRoutes.get('/images/:filename', (req, res) => {
    const { filename } = req.params;
    const imagesDir = path_1.default.join(uploadsDir, 'images');
    const filePath = path_1.default.join(imagesDir, filename);
    if (!fs_1.default.existsSync(filePath)) {
        return res.status(404).json({ error: 'Image not found' });
    }
    res.sendFile(filePath);
});
// Helper to determine artifact type from file extension
function getArtifactTypeFromFile(filename) {
    const ext = path_1.default.extname(filename).toLowerCase();
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.bmp', '.tiff'];
    const audioExts = ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.wma', '.aac', '.amr'];
    const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.wmv', '.flv'];
    const docExts = ['.pdf', '.doc', '.docx', '.txt', '.md', '.rtf'];
    if (imageExts.includes(ext))
        return 'photo';
    if (audioExts.includes(ext))
        return 'audio';
    if (videoExts.includes(ext))
        return 'video';
    if (docExts.includes(ext))
        return 'document';
    return 'other';
}
// Helper to get mime type from extension
function getMimeTypeFromExt(filename) {
    const ext = path_1.default.extname(filename).toLowerCase();
    const mimeMap = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
        '.gif': 'image/gif', '.webp': 'image/webp', '.pdf': 'application/pdf',
        '.txt': 'text/plain', '.md': 'text/markdown', '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.mp4': 'video/mp4',
        '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    return mimeMap[ext] || 'application/octet-stream';
}
// POST /api/uploads/bulk - Upload multiple files or a ZIP archive
exports.uploadRoutes.post('/bulk', uploadBulk.array('files', 100), async (req, res) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No files provided' });
        }
        const { sourceSystem } = req.body;
        const results = {
            success: [],
            failed: [],
            extracted: 0,
        };
        const bulkDir = path_1.default.join(uploadsDir, 'bulk');
        const processedDir = path_1.default.join(uploadsDir, 'processed');
        if (!fs_1.default.existsSync(processedDir)) {
            fs_1.default.mkdirSync(processedDir, { recursive: true });
        }
        // Process each uploaded file
        for (const file of files) {
            const filePath = path_1.default.join(bulkDir, file.filename);
            // Check if it's a ZIP file
            if (file.originalname.toLowerCase().endsWith('.zip') || file.mimetype === 'application/zip') {
                try {
                    const zip = new adm_zip_1.default(filePath);
                    const zipEntries = zip.getEntries();
                    for (const entry of zipEntries) {
                        // Skip directories and hidden files
                        if (entry.isDirectory || entry.entryName.startsWith('.') || entry.entryName.includes('__MACOSX')) {
                            continue;
                        }
                        const entryName = path_1.default.basename(entry.entryName);
                        const artifactType = getArtifactTypeFromFile(entryName);
                        // Skip unsupported file types
                        if (artifactType === 'other')
                            continue;
                        // Extract file
                        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                        const ext = path_1.default.extname(entryName);
                        const newFilename = `extracted-${uniqueSuffix}${ext}`;
                        // Determine destination based on type
                        let destDir = processedDir;
                        let urlPath = `/uploads/processed/${newFilename}`;
                        if (artifactType === 'photo') {
                            destDir = path_1.default.join(uploadsDir, 'images');
                            if (!fs_1.default.existsSync(destDir))
                                fs_1.default.mkdirSync(destDir, { recursive: true });
                            urlPath = `/uploads/images/${newFilename}`;
                        }
                        else if (artifactType === 'audio') {
                            destDir = uploadsDir;
                            urlPath = `/uploads/${newFilename}`;
                        }
                        else if (artifactType === 'document') {
                            destDir = path_1.default.join(uploadsDir, 'documents');
                            if (!fs_1.default.existsSync(destDir))
                                fs_1.default.mkdirSync(destDir, { recursive: true });
                            urlPath = `/uploads/documents/${newFilename}`;
                        }
                        const destPath = path_1.default.join(destDir, newFilename);
                        zip.extractEntryTo(entry, destDir, false, true, false, newFilename);
                        // Create artifact
                        try {
                            const artifact = await prisma_1.prisma.artifact.create({
                                data: {
                                    type: artifactType,
                                    sourceSystem: sourceSystem || 'bulk-upload',
                                    sourcePathOrUrl: urlPath,
                                    shortDescription: entryName,
                                    importedFrom: `${file.originalname}/${entry.entryName}`,
                                },
                            });
                            // Queue content extraction (async, don't wait)
                            const mimeType = getMimeTypeFromExt(entryName);
                            (0, contentExtractor_1.extractContent)(destPath, mimeType, artifact.id).catch(err => console.error(`Extraction error for ${entryName}:`, err));
                            results.success.push({
                                id: artifact.id,
                                filename: entryName,
                                type: artifactType,
                                source: 'zip',
                            });
                            results.extracted++;
                        }
                        catch (err) {
                            results.failed.push({ filename: entryName, error: 'Failed to create artifact' });
                        }
                    }
                    // Clean up ZIP file
                    fs_1.default.unlinkSync(filePath);
                }
                catch (err) {
                    console.error('ZIP extraction error:', err);
                    results.failed.push({ filename: file.originalname, error: 'Failed to extract ZIP' });
                }
            }
            else {
                // Regular file - move to appropriate directory and create artifact
                const artifactType = getArtifactTypeFromFile(file.originalname);
                if (artifactType === 'other') {
                    results.failed.push({ filename: file.originalname, error: 'Unsupported file type' });
                    fs_1.default.unlinkSync(filePath);
                    continue;
                }
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                const ext = path_1.default.extname(file.originalname);
                const newFilename = `bulk-${uniqueSuffix}${ext}`;
                let destDir = processedDir;
                let urlPath = `/uploads/processed/${newFilename}`;
                if (artifactType === 'photo') {
                    destDir = path_1.default.join(uploadsDir, 'images');
                    if (!fs_1.default.existsSync(destDir))
                        fs_1.default.mkdirSync(destDir, { recursive: true });
                    urlPath = `/uploads/images/${newFilename}`;
                }
                else if (artifactType === 'audio') {
                    destDir = uploadsDir;
                    urlPath = `/uploads/${newFilename}`;
                }
                else if (artifactType === 'document') {
                    destDir = path_1.default.join(uploadsDir, 'documents');
                    if (!fs_1.default.existsSync(destDir))
                        fs_1.default.mkdirSync(destDir, { recursive: true });
                    urlPath = `/uploads/documents/${newFilename}`;
                }
                const destPath = path_1.default.join(destDir, newFilename);
                fs_1.default.renameSync(filePath, destPath);
                try {
                    const artifact = await prisma_1.prisma.artifact.create({
                        data: {
                            type: artifactType,
                            sourceSystem: sourceSystem || 'bulk-upload',
                            sourcePathOrUrl: urlPath,
                            shortDescription: file.originalname,
                            importedFrom: file.originalname,
                        },
                    });
                    // Queue content extraction (async)
                    (0, contentExtractor_1.extractContent)(destPath, file.mimetype, artifact.id).catch(err => console.error(`Extraction error for ${file.originalname}:`, err));
                    results.success.push({
                        id: artifact.id,
                        filename: file.originalname,
                        type: artifactType,
                        source: 'direct',
                    });
                }
                catch (err) {
                    results.failed.push({ filename: file.originalname, error: 'Failed to create artifact' });
                }
            }
        }
        res.status(201).json({
            message: `Processed ${results.success.length} files successfully${results.extracted > 0 ? ` (${results.extracted} extracted from ZIP)` : ''}`,
            success: results.success,
            failed: results.failed,
            total: results.success.length,
            failedCount: results.failed.length,
        });
    }
    catch (error) {
        console.error('Bulk upload error:', error);
        res.status(500).json({ error: 'Failed to process bulk upload' });
    }
});
//# sourceMappingURL=uploads.js.map