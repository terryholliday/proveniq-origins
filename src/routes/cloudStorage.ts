import { Router, Request, Response } from 'express';
import { google } from 'googleapis';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest, requireAuth } from './auth';
import sanitize from 'sanitize-filename';

export const cloudStorageRoutes = Router();

// Google Drive OAuth2 configuration
const getGoogleOAuth2Client = () => {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI || 'http://localhost:3001/api/cloud/google/callback';

  if (!clientId || !clientSecret) {
    return null;
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

// ============================================
// GOOGLE DRIVE
// ============================================

// GET /api/cloud/google/auth - Start Google OAuth flow
cloudStorageRoutes.get('/google/auth', (req: Request, res: Response) => {
  const oauth2Client = getGoogleOAuth2Client();

  if (!oauth2Client) {
    return res.status(500).json({
      error: 'Google Drive not configured',
      setup: 'Add GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET to .env'
    });
  }

  const scopes = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.metadata.readonly',
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Force consent to get refresh token
  });

  res.json({ authUrl });
});

// GET /api/cloud/google/callback - OAuth callback
// Using requireAuth to attach token to current user
cloudStorageRoutes.get('/google/callback', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { code } = req.query;
  const userId = req.authUser!.uid;

  if (!code || typeof code !== 'string') {
    return res.status(400).send('Missing authorization code');
  }

  const oauth2Client = getGoogleOAuth2Client();
  if (!oauth2Client) {
    return res.status(500).send('Google Drive not configured');
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);

    // Save refresh token to DB if present
    if (tokens.refresh_token) {
      await prisma.user.update({
        where: { id: userId },
        data: { googleRefreshToken: tokens.refresh_token },
      });
    }

    // Note: We don't save access_token to DB as it expires quickly. 
    // We regenerate it from refresh_token on demand.

    // Redirect back to app with success
    res.redirect('http://localhost:5173/import/cloud?provider=google&status=connected');
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.redirect('http://localhost:5173/import/cloud?provider=google&status=error');
  }
});

// GET /api/cloud/google/status - Check connection status
cloudStorageRoutes.get('/google/status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.authUser!.uid;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleRefreshToken: true }
  });

  res.json({
    connected: !!user?.googleRefreshToken,
    configured: !!process.env.GOOGLE_DRIVE_CLIENT_ID
  });
});

// Helper to get fresh access token for user
async function getUserGoogleAuth(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleRefreshToken: true }
  });

  if (!user?.googleRefreshToken) return null;

  const oauth2Client = getGoogleOAuth2Client();
  if (!oauth2Client) return null;

  oauth2Client.setCredentials({
    refresh_token: user.googleRefreshToken,
  });

  return oauth2Client;
}

// GET /api/cloud/google/files - List files from Google Drive
cloudStorageRoutes.get('/google/files', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.authUser!.uid;
  const oauth2Client = await getUserGoogleAuth(userId);

  if (!oauth2Client) {
    return res.status(401).json({ error: 'Not connected to Google Drive' });
  }

  const { folderId, pageToken, mimeType } = req.query;

  try {
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Build query
    let query = "trashed = false";
    if (folderId && typeof folderId === 'string') {
      query += ` and '${folderId}' in parents`;
    } else {
      query += " and 'root' in parents";
    }

    if (mimeType === 'images') {
      query += " and (mimeType contains 'image/' or mimeType = 'application/vnd.google-apps.folder')";
    } else if (mimeType === 'documents') {
      query += " and (mimeType contains 'document' or mimeType contains 'text/' or mimeType = 'application/pdf' or mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType = 'application/vnd.google-apps.folder')";
    } else if (mimeType === 'audio') {
      query += " and (mimeType contains 'audio/' or mimeType = 'application/vnd.google-apps.folder')";
    }

    const response = await drive.files.list({
      q: query,
      pageSize: 50,
      pageToken: typeof pageToken === 'string' ? pageToken : undefined,
      fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, thumbnailLink, webViewLink)',
      orderBy: 'modifiedTime desc',
    });

    res.json({
      files: response.data.files || [],
      nextPageToken: response.data.nextPageToken,
    });
  } catch (error) {
    console.error('Google Drive list error:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// GET /api/cloud/google/download/:fileId - Download a file
cloudStorageRoutes.get('/google/download/:fileId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.authUser!.uid;
  const oauth2Client = await getUserGoogleAuth(userId);

  if (!oauth2Client) {
    return res.status(401).json({ error: 'Not connected to Google Drive' });
  }

  const { fileId } = req.params;

  try {
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const metadata = await drive.files.get({
      fileId,
      fields: 'name, mimeType, size',
    });

    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    res.json({
      name: metadata.data.name,
      mimeType: metadata.data.mimeType,
      size: metadata.data.size,
      content: Buffer.from(response.data as ArrayBuffer).toString('base64'),
    });
  } catch (error) {
    console.error('Google Drive download error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// POST /api/cloud/google/disconnect - Disconnect Google Drive
cloudStorageRoutes.post('/google/disconnect', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await prisma.user.update({
      where: { id: req.authUser!.uid },
      data: { googleRefreshToken: null },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete google token error:', error);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

// POST /api/cloud/import - Import a file from cloud storage
cloudStorageRoutes.post('/import', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { provider, fileId, fileName, mimeType, content, artifactType } = req.body;
  const userId = req.authUser!.uid;

  if (!content || !fileName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const fs = require('fs');
    const path = require('path');
    const { extractContent } = require('../services/contentExtractor');

    // Create uploads directory if needed
    const uploadsDir = path.join(process.cwd(), 'uploads', 'cloud');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Save file
    const safeFileName = sanitize(fileName);
    const filePath = path.join(uploadsDir, `${Date.now()}-${safeFileName}`);
    const fileBuffer = Buffer.from(content, 'base64');
    fs.writeFileSync(filePath, fileBuffer);

    // Create artifact record scoped to current user
    const artifact = await prisma.artifact.create({
      data: {
        userId,
        type: artifactType || 'document',
        sourceSystem: provider || 'cloud',
        sourcePathOrUrl: `/uploads/cloud/${path.basename(filePath)}`,
        shortDescription: fileName,
        importedFrom: `${provider}:${fileId}`,
      },
    });

    // Extract content from file
    let extractedText = '';
    let aiAnalysis = null;

    try {
      const result = await extractContent(filePath, mimeType, artifact.id);
      extractedText = result.text || '';

      if (extractedText) {
        await prisma.artifact.update({
          where: { id: artifact.id },
          data: { transcribedText: extractedText },
        });

        // Trigger AI analysis (check if user has consent later)
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
                  content: `You are Ori, a master biographer. Analyze this document and respond in JSON:
{
  "summary": "2-3 sentence summary",
  "keyThemes": ["theme1", "theme2"],
  "peopleIdentified": ["name1", "name2"],
  "emotionalTone": "The emotional quality",
  "oriMessage": "A warm message about what you found"
}`
                },
                {
                  role: 'user',
                  content: `Analyze this ${artifactType} titled "${fileName}":\n\n${extractedText.substring(0, 6000)}`
                }
              ],
              max_tokens: 800,
              temperature: 0.7,
            }),
          });

          if (analysisResponse.ok) {
            const data = await analysisResponse.json();
            const responseContent = data.choices?.[0]?.message?.content || '';
            const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              aiAnalysis = JSON.parse(jsonMatch[0]);
              await prisma.artifact.update({
                where: { id: artifact.id },
                data: { shortDescription: aiAnalysis.summary || fileName },
              });
            }
          }
        }
      }
    } catch (extractError) {
      console.error('Content extraction error:', extractError);
    }

    res.json({
      success: true,
      artifact,
      extractedText: extractedText ? extractedText.substring(0, 500) : null,
      aiAnalysis,
    });
  } catch (error) {
    console.error('Cloud import error:', error);
    res.status(500).json({ error: 'Failed to import file' });
  }
});

// ============================================
// DROPBOX
// ============================================

const DROPBOX_APP_KEY = process.env.DROPBOX_APP_KEY;
const DROPBOX_APP_SECRET = process.env.DROPBOX_APP_SECRET;
const DROPBOX_REDIRECT_URI = process.env.DROPBOX_REDIRECT_URI || 'http://localhost:3001/api/cloud/dropbox/callback';

// GET /api/cloud/dropbox/auth - Start Dropbox OAuth flow
cloudStorageRoutes.get('/dropbox/auth', (req: Request, res: Response) => {
  if (!DROPBOX_APP_KEY) {
    return res.status(500).json({
      error: 'Dropbox not configured',
      setup: 'Add DROPBOX_APP_KEY and DROPBOX_APP_SECRET to .env'
    });
  }

  const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${DROPBOX_APP_KEY}&redirect_uri=${encodeURIComponent(DROPBOX_REDIRECT_URI)}&response_type=code&token_access_type=offline`;

  res.json({ authUrl });
});

// GET /api/cloud/dropbox/callback - OAuth callback
cloudStorageRoutes.get('/dropbox/callback', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { code } = req.query;
  const userId = req.authUser!.uid;

  if (!code || typeof code !== 'string') {
    return res.status(400).send('Missing authorization code');
  }

  if (!DROPBOX_APP_KEY || !DROPBOX_APP_SECRET) {
    return res.status(500).send('Dropbox not configured');
  }

  try {
    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: DROPBOX_APP_KEY,
        client_secret: DROPBOX_APP_SECRET,
        redirect_uri: DROPBOX_REDIRECT_URI,
      }),
    });

    const data = await response.json() as { access_token?: string; error?: string };

    if (data.access_token) {
      await prisma.user.update({
        where: { id: userId },
        data: { dropboxToken: data.access_token },
      });
      res.redirect('http://localhost:5173/import/cloud?provider=dropbox&status=connected');
    } else {
      throw new Error('No access token received');
    }
  } catch (error) {
    console.error('Dropbox OAuth error:', error);
    res.redirect('http://localhost:5173/import/cloud?provider=dropbox&status=error');
  }
});

// GET /api/cloud/dropbox/status - Check connection status
cloudStorageRoutes.get('/dropbox/status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.authUser!.uid;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { dropboxToken: true }
  });

  res.json({
    connected: !!user?.dropboxToken,
    configured: !!DROPBOX_APP_KEY
  });
});

// Helper to get dropbox token
async function getUserDropboxToken(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { dropboxToken: true }
  });
  return user?.dropboxToken;
}

// GET /api/cloud/dropbox/files - List files from Dropbox
cloudStorageRoutes.get('/dropbox/files', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.authUser!.uid;
  const dropboxToken = await getUserDropboxToken(userId);

  if (!dropboxToken) {
    return res.status(401).json({ error: 'Not connected to Dropbox' });
  }

  const { path = '', cursor } = req.query;

  try {
    const endpoint = cursor
      ? 'https://api.dropboxapi.com/2/files/list_folder/continue'
      : 'https://api.dropboxapi.com/2/files/list_folder';

    const body = cursor
      ? { cursor }
      : { path: path || '', recursive: false, limit: 50 };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dropboxToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json() as {
      entries: Array<{ id: string; name: string; path_display: string; '.tag': string; size?: number; client_modified?: string }>;
      has_more: boolean;
      cursor: string;
      error?: boolean;
      error_summary?: string;
    };

    if (data.error) {
      throw new Error(data.error_summary);
    }

    res.json({
      files: data.entries.map((entry) => ({
        id: entry.id,
        name: entry.name,
        path: entry.path_display,
        isFolder: entry['.tag'] === 'folder',
        size: entry.size,
        modifiedTime: entry.client_modified,
      })),
      cursor: data.has_more ? data.cursor : null,
    });
  } catch (error) {
    console.error('Dropbox list error:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// GET /api/cloud/dropbox/download - Download a file
cloudStorageRoutes.get('/dropbox/download', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.authUser!.uid;
  const dropboxToken = await getUserDropboxToken(userId);

  if (!dropboxToken) {
    return res.status(401).json({ error: 'Not connected to Dropbox' });
  }

  const { path } = req.query;

  if (!path || typeof path !== 'string') {
    return res.status(400).json({ error: 'File path required' });
  }

  try {
    const response = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dropboxToken}`,
        'Dropbox-API-Arg': JSON.stringify({ path }),
      },
    });

    const metadata = JSON.parse(response.headers.get('dropbox-api-result') || '{}');
    const buffer = await response.arrayBuffer();

    res.json({
      name: metadata.name,
      size: metadata.size,
      content: Buffer.from(buffer).toString('base64'),
    });
  } catch (error) {
    console.error('Dropbox download error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// POST /api/cloud/dropbox/disconnect - Disconnect Dropbox
cloudStorageRoutes.post('/dropbox/disconnect', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await prisma.user.update({
      where: { id: req.authUser!.uid },
      data: { dropboxToken: null },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete dropbox token error:', error);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

// ============================================
// COMBINED STATUS
// ============================================

// GET /api/cloud/status - Get all cloud storage connection statuses
cloudStorageRoutes.get('/status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.authUser!.uid;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      googleRefreshToken: true,
      dropboxToken: true
    }
  });

  res.json({
    google: {
      connected: !!user?.googleRefreshToken,
      configured: !!process.env.GOOGLE_DRIVE_CLIENT_ID,
    },
    dropbox: {
      connected: !!user?.dropboxToken,
      configured: !!DROPBOX_APP_KEY,
    },
  });
});
