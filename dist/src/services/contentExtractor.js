"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractContent = extractContent;
exports.processUnextractedArtifacts = processUnextractedArtifacts;
exports.extractPdfText = extractPdfText;
exports.extractTextFile = extractTextFile;
exports.transcribeAudio = transcribeAudio;
exports.analyzeVideo = analyzeVideo;
exports.analyzeImage = analyzeImage;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma_1 = require("../lib/prisma");
// PDF extraction
async function extractPdfText(filePath) {
    try {
        const pdfParse = require('pdf-parse');
        const dataBuffer = fs_1.default.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        return data.text || '';
    }
    catch (error) {
        console.error('PDF extraction error:', error);
        return '';
    }
}
// Plain text extraction
async function extractTextFile(filePath) {
    try {
        return fs_1.default.readFileSync(filePath, 'utf-8');
    }
    catch (error) {
        console.error('Text file extraction error:', error);
        return '';
    }
}
// Audio transcription using OpenAI Whisper
// IMPORTANT: Whisper API has a 25MB file size limit
const WHISPER_MAX_SIZE = 25 * 1024 * 1024; // 25MB
async function transcribeAudio(filePath) {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
        console.log('OpenAI API key not configured for audio transcription');
        return '[TRANSCRIPTION PENDING: OpenAI API key not configured]';
    }
    try {
        // Check file size - Whisper has 25MB limit
        const stats = fs_1.default.statSync(filePath);
        if (stats.size > WHISPER_MAX_SIZE) {
            const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
            console.log(`Audio file too large for Whisper: ${sizeMB}MB (max 25MB)`);
            return `[TRANSCRIPTION PENDING: Audio file is ${sizeMB}MB, exceeds Whisper's 25MB limit. Consider splitting into smaller segments.]`;
        }
        const FormData = require('form-data');
        const fetch = require('node-fetch');
        const formData = new FormData();
        formData.append('file', fs_1.default.createReadStream(filePath));
        formData.append('model', 'whisper-1');
        formData.append('response_format', 'text');
        console.log(`Transcribing audio: ${filePath} (${(stats.size / (1024 * 1024)).toFixed(1)}MB)`);
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
            },
            body: formData,
        });
        if (!response.ok) {
            const error = await response.text();
            console.error('Whisper API error:', error);
            return `[TRANSCRIPTION FAILED: ${error.substring(0, 100)}]`;
        }
        const transcript = await response.text();
        console.log(`Transcription complete: ${transcript.length} characters`);
        return transcript;
    }
    catch (error) {
        console.error('Audio transcription error:', error);
        return `[TRANSCRIPTION ERROR: ${error instanceof Error ? error.message : 'Unknown error'}]`;
    }
}
// Video analysis using OpenAI Vision (extracts key frames description)
async function analyzeVideo(filePath) {
    // For now, just extract audio and transcribe it
    // Full video analysis would require frame extraction + vision API
    console.log('Video analysis: extracting audio track for transcription');
    // Try to transcribe the audio track
    const transcript = await transcribeAudio(filePath);
    if (transcript) {
        return `[Audio transcript from video]\n${transcript}`;
    }
    return '[Video uploaded - audio transcription not available]';
}
// Image analysis using OpenAI Vision
async function analyzeImage(filePath) {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
        console.log('OpenAI API key not configured for image analysis');
        return { description: '', memoryPrompts: [] };
    }
    try {
        const fetch = require('node-fetch');
        // Read image and convert to base64
        const imageBuffer = fs_1.default.readFileSync(filePath);
        const base64Image = imageBuffer.toString('base64');
        const mimeType = filePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: `You are Ori, a master memoir interviewer. Analyze this image and respond in JSON format:

{
  "description": "Detailed description of what you see (people, setting, objects, mood)",
  "estimatedEra": "Approximate time period (e.g., 'late 1990s', 'early 2010s') based on clothing, technology, photo quality",
  "estimatedDate": "If you can estimate a specific date or year, provide it (e.g., '1998', 'Summer 1985')",
  "peopleCount": number of people visible,
  "setting": "Where this appears to be (graduation, wedding, beach, home, etc.)",
  "mood": "The emotional tone (joyful, solemn, casual, formal, etc.)",
  "memoryPrompts": [
    "A specific, evocative question about this photo",
    "Another question that digs into the emotional context",
    "A question about the people or relationships shown",
    "A question about what happened before or after this moment"
  ]
}

Make the memory prompts feel like a skilled interviewer asking follow-up questions. Be warm but probing.`,
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:${mimeType};base64,${base64Image}`,
                                },
                            },
                        ],
                    },
                ],
                max_tokens: 800,
            }),
        });
        if (!response.ok) {
            const error = await response.text();
            console.error('Vision API error:', error);
            return { description: '', memoryPrompts: [] };
        }
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        try {
            // Parse JSON response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    description: `${parsed.description}\n\nEstimated era: ${parsed.estimatedEra}\nSetting: ${parsed.setting}\nMood: ${parsed.mood}\nPeople visible: ${parsed.peopleCount}`,
                    memoryPrompts: parsed.memoryPrompts || [],
                    estimatedDate: parsed.estimatedDate,
                };
            }
        }
        catch (e) {
            // Fall back to raw content if JSON parsing fails
            console.log('Could not parse image analysis as JSON, using raw response');
        }
        return { description: content, memoryPrompts: [] };
    }
    catch (error) {
        console.error('Image analysis error:', error);
        return { description: '', memoryPrompts: [] };
    }
}
// Main extraction function
async function extractContent(filePath, mimeType, artifactId) {
    let text = '';
    let analysis = '';
    let memoryPrompts = [];
    let estimatedDate;
    const absolutePath = path_1.default.isAbsolute(filePath)
        ? filePath
        : path_1.default.join(process.cwd(), 'uploads', filePath.replace(/^\/uploads\//, ''));
    if (!fs_1.default.existsSync(absolutePath)) {
        console.error('File not found for extraction:', absolutePath);
        return { text: '', analysis: 'File not found' };
    }
    // PDF
    if (mimeType === 'application/pdf' || filePath.endsWith('.pdf')) {
        text = await extractPdfText(absolutePath);
        console.log(`Extracted ${text.length} characters from PDF`);
    }
    // Plain text files
    else if (mimeType.startsWith('text/') ||
        filePath.endsWith('.txt') ||
        filePath.endsWith('.md') ||
        filePath.endsWith('.csv')) {
        text = await extractTextFile(absolutePath);
        console.log(`Extracted ${text.length} characters from text file`);
    }
    // Audio files
    else if (mimeType.startsWith('audio/')) {
        text = await transcribeAudio(absolutePath);
        console.log(`Transcribed ${text.length} characters from audio`);
    }
    // Video files
    else if (mimeType.startsWith('video/')) {
        text = await analyzeVideo(absolutePath);
        console.log(`Analyzed video, got ${text.length} characters`);
    }
    // Image files
    else if (mimeType.startsWith('image/')) {
        const imageResult = await analyzeImage(absolutePath);
        analysis = imageResult.description;
        memoryPrompts = imageResult.memoryPrompts;
        estimatedDate = imageResult.estimatedDate;
        console.log(`Analyzed image, got ${analysis.length} characters, ${memoryPrompts.length} prompts`);
    }
    // Update artifact with extracted content if artifactId provided
    if (artifactId && (text || analysis)) {
        try {
            await prisma_1.prisma.artifact.update({
                where: { id: artifactId },
                data: {
                    transcribedText: text || analysis || null,
                },
            });
            console.log(`Updated artifact ${artifactId} with extracted content`);
        }
        catch (error) {
            console.error('Error updating artifact:', error);
        }
    }
    return { text, analysis, memoryPrompts, estimatedDate };
}
// Process all artifacts that don't have transcribed text
async function processUnextractedArtifacts() {
    const artifacts = await prisma_1.prisma.artifact.findMany({
        where: {
            transcribedText: null,
            sourcePathOrUrl: {
                startsWith: '/uploads/',
            },
        },
    });
    console.log(`Found ${artifacts.length} artifacts to process`);
    for (const artifact of artifacts) {
        const filePath = artifact.sourcePathOrUrl;
        const mimeType = getMimeType(filePath);
        console.log(`Processing artifact ${artifact.id}: ${filePath}`);
        await extractContent(filePath, mimeType, artifact.id);
    }
}
// Helper to guess mime type from file extension
function getMimeType(filePath) {
    const ext = path_1.default.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.pdf': 'application/pdf',
        '.txt': 'text/plain',
        '.md': 'text/markdown',
        '.csv': 'text/csv',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.m4a': 'audio/mp4',
        '.ogg': 'audio/ogg',
        '.wma': 'audio/x-ms-wma',
        '.mp4': 'video/mp4',
        '.mov': 'video/quicktime',
        '.avi': 'video/x-msvideo',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
    };
    return mimeTypes[ext] || 'application/octet-stream';
}
//# sourceMappingURL=contentExtractor.js.map