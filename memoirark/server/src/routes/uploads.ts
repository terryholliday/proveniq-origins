import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';

export const uploadRoutes = Router();

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

    res.status(201).json({
      artifact,
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
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

// GET /api/uploads/:filename - Serve uploaded file
uploadRoutes.get('/:filename', (req: Request, res: Response) => {
  const { filename } = req.params;
  const filePath = path.join(uploadsDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.sendFile(filePath);
});

// DELETE /api/uploads/:filename - Delete uploaded file
uploadRoutes.delete('/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadsDir, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
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
