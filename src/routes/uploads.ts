import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import sanitize from 'sanitize-filename';
import { prisma } from '../lib/prisma';
import { extractContent } from '../services/contentExtractor';

import { uploadLimiter } from '../middleware/rateLimit';

export const uploadRoutes = Router();

// Apply rate limiting to all upload routes
uploadRoutes.use(uploadLimiter);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for audio file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `audio-${uniqueSuffix}${ext}`);
  },
});

// File filter for audio files
const audioFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    'audio/mpeg',       // .mp3
    'audio/wav',        // .wav
    'audio/wave',       // .wav
    'audio/x-wav',      // .wav
    'audio/mp4',        // .m4a
    'audio/x-m4a',      // .m4a
    'audio/aac',        // .aac
    'audio/ogg',        // .ogg
    'audio/webm',       // .webm
    'audio/flac',       // .flac
    'audio/x-flac',     // .flac
    'audio/x-ms-wma',   // .wma (Windows Media Audio)
    'audio/wma',        // .wma
    'audio/amr',        // .amr (voice recordings)
    'audio/3gpp',       // .3gp (phone recordings)
    'audio/3gpp2',      // .3g2
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only audio files are allowed.`));
  }
};

// File filter for images
const imageFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
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
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only image files are allowed.`));
  }
};

// Storage for images
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const imagesDir = path.join(uploadsDir, 'images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    cb(null, imagesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `photo-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: audioFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max for long therapy sessions
  },
});

const uploadImage = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max for photos
  },
});

// Storage for documents (PDFs, text files, etc.)
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const docsDir = path.join(uploadsDir, 'documents');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    cb(null, docsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `doc-${uniqueSuffix}${ext}`);
  },
});

const documentFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    'application/pdf',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  const allowedExtensions = ['.pdf', '.txt', '.md', '.csv', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only documents are allowed.`));
  }
};

const uploadDocument = multer({
  storage: documentStorage,
  fileFilter: documentFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max for documents
  },
});

// Storage for bulk uploads (any file type)
const bulkStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const bulkDir = path.join(uploadsDir, 'bulk');
    if (!fs.existsSync(bulkDir)) {
      fs.mkdirSync(bulkDir, { recursive: true });
    }
    cb(null, bulkDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `bulk-${uniqueSuffix}${ext}`);
  },
});

const uploadBulk = multer({
  storage: bulkStorage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max for bulk/zip
  },
});

// POST /api/uploads/audio - Upload audio file and create artifact
uploadRoutes.post('/audio', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const { shortDescription, sourceSystem } = req.body;

    // Create artifact record
    const artifact = await prisma.artifact.create({
      data: {
        type: 'audio',
        sourceSystem: sourceSystem || 'upload',
        sourcePathOrUrl: `/uploads/${req.file.filename}`,
        shortDescription: shortDescription || req.file.originalname,
        importedFrom: req.file.originalname,
      },
    });

    // Extract/transcribe content synchronously and return for user review
    const filePath = path.join(uploadsDir, req.file.filename);
    let extractedText = '';

    // Check AI Consent
    const user = await prisma.user.findUnique({
      where: { id: (req as any).authUser.uid },
      select: { aiConsent: true }
    });

    if (user?.aiConsent) {
      try {
        const result = await extractContent(filePath, req.file.mimetype);
        extractedText = result.text || '';
        console.log(`Audio transcription complete: ${extractedText.length} chars`);
      } catch (err) {
        console.error('Audio transcription error:', err);
      }
    } else {
      console.log('Skipping audio transcription (No AI Consent)');
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
  } catch (error) {
    console.error('Error uploading audio:', error);
    // Clean up file if artifact creation failed
    if (req.file) {
      fs.unlinkSync(path.join(uploadsDir, req.file.filename));
    }
    res.status(500).json({ error: 'Failed to upload audio file' });
  }
});

// POST /api/uploads/audio/batch - Upload multiple audio files
uploadRoutes.post('/audio/batch', upload.array('audio', 50), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No audio files provided' });
    }

    const { sourceSystem } = req.body;
    const artifacts = [];

    for (const file of files) {
      const artifact = await prisma.artifact.create({
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
  } catch (error) {
    console.error('Error uploading audio batch:', error);
    res.status(500).json({ error: 'Failed to upload audio files' });
  }
});

import sanitize from 'sanitize-filename';
// ... imports

// ...

// GET /api/uploads/:filename - Serve uploaded file
uploadRoutes.get('/:filename', (req: Request, res: Response) => {
  const { filename } = req.params;
  const safeFilename = sanitize(filename);

  // Prevent path traversal double check (sanitize should handle it, but good to be explicit)
  if (safeFilename !== filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  const filePath = path.join(uploadsDir, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.sendFile(filePath);
});

// DELETE /api/uploads/:filename - Delete uploaded file
uploadRoutes.delete('/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const safeFilename = sanitize(filename);

    if (safeFilename !== filename) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filePath = path.join(uploadsDir, safeFilename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.status(204).send();
  } catch (error) {
    // ...
  }
});

// POST /api/uploads/image - Upload image and create artifact (alias for /photo)
uploadRoutes.post('/image', uploadImage.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const { shortDescription, sourceSystem } = req.body;
    const imagesDir = path.join(uploadsDir, 'images');

    const artifact = await prisma.artifact.create({
      data: {
        type: 'photo',
        sourceSystem: sourceSystem || 'upload',
        sourcePathOrUrl: `/uploads/images/${req.file.filename}`,
        shortDescription: shortDescription || req.file.originalname,
        importedFrom: req.file.originalname,
      },
    });

    // Analyze image synchronously and return for user review
    const filePath = path.join(imagesDir, req.file.filename);
    let extractedText = '';
    let memoryPrompts: string[] = [];
    let estimatedDate: string | undefined;

    // Check AI Consent
    const user = await prisma.user.findUnique({
      where: { id: (req as any).authUser.uid },
      select: { aiConsent: true }
    });

    if (user?.aiConsent) {
      try {
        const result = await extractContent(filePath, req.file.mimetype);
        extractedText = result.analysis || result.text || '';
        memoryPrompts = result.memoryPrompts || [];
        estimatedDate = result.estimatedDate;
        console.log(`Image analysis complete: ${extractedText.length} chars, ${memoryPrompts.length} prompts`);
      } catch (err) {
        console.error('Image analysis error:', err);
      }
    } else {
      console.log('Skipping image analysis (No AI Consent)');
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
  } catch (error) {
    console.error('Error uploading image:', error);
    if (req.file) {
      const imagesDir = path.join(uploadsDir, 'images');
      fs.unlinkSync(path.join(imagesDir, req.file.filename));
    }
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// POST /api/uploads/document - Upload document (PDF, text) and extract content
uploadRoutes.post('/document', uploadDocument.single('document'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document provided' });
    }

    const { shortDescription, sourceSystem } = req.body;
    const docsDir = path.join(uploadsDir, 'documents');

    // Determine document type
    const ext = path.extname(req.file.originalname).toLowerCase();
    let docType = 'document';
    if (ext === '.pdf') docType = 'document';
    else if (['.txt', '.md'].includes(ext)) docType = 'journal';
    else if (ext === '.csv') docType = 'document';

    const artifact = await prisma.artifact.create({
      data: {
        type: docType,
        sourceSystem: sourceSystem || 'upload',
        sourcePathOrUrl: `/uploads/documents/${req.file.filename}`,
        shortDescription: shortDescription || req.file.originalname,
        importedFrom: req.file.originalname,
      },
    });

    // Extract content synchronously and return for user review
    const filePath = path.join(docsDir, req.file.filename);
    let extractedText = '';

    // Check AI Consent
    const user = await prisma.user.findUnique({
      where: { id: (req as any).authUser.uid },
      select: { aiConsent: true }
    });

    if (user?.aiConsent) {
      try {
        const result = await extractContent(filePath, req.file.mimetype);
        extractedText = result.text || '';
        console.log(`Document extraction complete: ${extractedText.length} chars`);
      } catch (err) {
        console.error('Document extraction error:', err);
      }
    } else {
      console.log('Skipping document extraction (No AI Consent)');
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
              await prisma.artifact.update({
                where: { id: artifact.id },
                data: {
                  transcribedText: extractedText,
                  shortDescription: aiAnalysis.summary || shortDescription || req.file.originalname,
                },
              });
            }
          }
        }
      } catch (aiError) {
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
  } catch (error) {
    console.error('Error uploading document:', error);
    if (req.file) {
      const docsDir = path.join(uploadsDir, 'documents');
      fs.unlinkSync(path.join(docsDir, req.file.filename));
    }
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// POST /api/uploads/photo - Upload photo and create artifact
uploadRoutes.post('/photo', uploadImage.single('photo'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo provided' });
    }

    const { shortDescription, sourceSystem, dateTaken, location } = req.body;

    // Create artifact record
    const artifact = await prisma.artifact.create({
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
  } catch (error) {
    console.error('Error uploading photo:', error);
    if (req.file) {
      const imagesDir = path.join(uploadsDir, 'images');
      fs.unlinkSync(path.join(imagesDir, req.file.filename));
    }
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

// POST /api/uploads/photo/analyze - AI analysis of uploaded photo
uploadRoutes.post('/photo/analyze', async (req: Request, res: Response) => {
  try {
    const { artifactId, imageUrl } = req.body;

    if (!artifactId && !imageUrl) {
      return res.status(400).json({ error: 'Artifact ID or image URL required' });
    }

    let imagePath = imageUrl;
    if (artifactId) {
      const artifact = await prisma.artifact.findUnique({ where: { id: artifactId } });
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

  } catch (error) {
    console.error('Error analyzing photo:', error);
    res.status(500).json({ error: 'Failed to analyze photo' });
  }
});

// GET /api/uploads/documents/:filename - Serve uploaded document
uploadRoutes.get('/documents/:filename', (req: Request, res: Response) => {
  const { filename } = req.params;
  const docsDir = path.join(uploadsDir, 'documents');
  const filePath = path.join(docsDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Document not found' });
  }

  res.sendFile(filePath);
});

// GET /api/uploads/images/:filename - Serve uploaded image
uploadRoutes.get('/images/:filename', (req: Request, res: Response) => {
  const { filename } = req.params;
  const imagesDir = path.join(uploadsDir, 'images');
  const filePath = path.join(imagesDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Image not found' });
  }

  res.sendFile(filePath);
});

// Helper to determine artifact type from file extension
function getArtifactTypeFromFile(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.bmp', '.tiff'];
  const audioExts = ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.wma', '.aac', '.amr'];
  const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.wmv', '.flv'];
  const docExts = ['.pdf', '.doc', '.docx', '.txt', '.md', '.rtf'];

  if (imageExts.includes(ext)) return 'photo';
  if (audioExts.includes(ext)) return 'audio';
  if (videoExts.includes(ext)) return 'video';
  if (docExts.includes(ext)) return 'document';
  return 'other';
}

// Helper to get mime type from extension
function getMimeTypeFromExt(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.pdf': 'application/pdf',
    '.txt': 'text/plain', '.md': 'text/markdown', '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.mp4': 'video/mp4',
    '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

// POST /api/uploads/bulk - Upload multiple files or a ZIP archive
uploadRoutes.post('/bulk', uploadBulk.array('files', 100), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const { sourceSystem } = req.body;
    const results: { success: any[]; failed: any[]; extracted: number } = {
      success: [],
      failed: [],
      extracted: 0,
    };

    const bulkDir = path.join(uploadsDir, 'bulk');
    const processedDir = path.join(uploadsDir, 'processed');
    if (!fs.existsSync(processedDir)) {
      fs.mkdirSync(processedDir, { recursive: true });
    }

    // Process each uploaded file
    for (const file of files) {
      const filePath = path.join(bulkDir, file.filename);

      // Check if it's a ZIP file
      if (file.originalname.toLowerCase().endsWith('.zip') || file.mimetype === 'application/zip') {
        try {
          const zip = new AdmZip(filePath);
          const zipEntries = zip.getEntries();

          for (const entry of zipEntries) {
            // Skip directories and hidden files
            if (entry.isDirectory || entry.entryName.startsWith('.') || entry.entryName.includes('__MACOSX')) {
              continue;
            }

            const entryName = path.basename(entry.entryName);
            const artifactType = getArtifactTypeFromFile(entryName);

            // Skip unsupported file types
            if (artifactType === 'other') continue;

            // Extract file
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = path.extname(entryName);
            const newFilename = `extracted-${uniqueSuffix}${ext}`;

            // Determine destination based on type
            let destDir = processedDir;
            let urlPath = `/uploads/processed/${newFilename}`;
            if (artifactType === 'photo') {
              destDir = path.join(uploadsDir, 'images');
              if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
              urlPath = `/uploads/images/${newFilename}`;
            } else if (artifactType === 'audio') {
              destDir = uploadsDir;
              urlPath = `/uploads/${newFilename}`;
            } else if (artifactType === 'document') {
              destDir = path.join(uploadsDir, 'documents');
              if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
              urlPath = `/uploads/documents/${newFilename}`;
            }

            const destPath = path.join(destDir, newFilename);
            zip.extractEntryTo(entry, destDir, false, true, false, newFilename);

            // Create artifact
            try {
              const artifact = await prisma.artifact.create({
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
              extractContent(destPath, mimeType, artifact.id).catch(err =>
                console.error(`Extraction error for ${entryName}:`, err)
              );

              results.success.push({
                id: artifact.id,
                filename: entryName,
                type: artifactType,
                source: 'zip',
              });
              results.extracted++;
            } catch (err) {
              results.failed.push({ filename: entryName, error: 'Failed to create artifact' });
            }
          }

          // Clean up ZIP file
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error('ZIP extraction error:', err);
          results.failed.push({ filename: file.originalname, error: 'Failed to extract ZIP' });
        }
      } else {
        // Regular file - move to appropriate directory and create artifact
        const artifactType = getArtifactTypeFromFile(file.originalname);

        if (artifactType === 'other') {
          results.failed.push({ filename: file.originalname, error: 'Unsupported file type' });
          fs.unlinkSync(filePath);
          continue;
        }

        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        const newFilename = `bulk-${uniqueSuffix}${ext}`;

        let destDir = processedDir;
        let urlPath = `/uploads/processed/${newFilename}`;
        if (artifactType === 'photo') {
          destDir = path.join(uploadsDir, 'images');
          if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
          urlPath = `/uploads/images/${newFilename}`;
        } else if (artifactType === 'audio') {
          destDir = uploadsDir;
          urlPath = `/uploads/${newFilename}`;
        } else if (artifactType === 'document') {
          destDir = path.join(uploadsDir, 'documents');
          if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
          urlPath = `/uploads/documents/${newFilename}`;
        }

        const destPath = path.join(destDir, newFilename);
        fs.renameSync(filePath, destPath);

        try {
          const artifact = await prisma.artifact.create({
            data: {
              type: artifactType,
              sourceSystem: sourceSystem || 'bulk-upload',
              sourcePathOrUrl: urlPath,
              shortDescription: file.originalname,
              importedFrom: file.originalname,
            },
          });

          // Queue content extraction (async)
          extractContent(destPath, file.mimetype, artifact.id).catch(err =>
            console.error(`Extraction error for ${file.originalname}:`, err)
          );

          results.success.push({
            id: artifact.id,
            filename: file.originalname,
            type: artifactType,
            source: 'direct',
          });
        } catch (err) {
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
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ error: 'Failed to process bulk upload' });
  }
});
