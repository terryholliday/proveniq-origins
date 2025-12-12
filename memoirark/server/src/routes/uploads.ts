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

const upload = multer({
  storage,
  fileFilter: audioFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max for long therapy sessions
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
