"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloudStorageRoutes = void 0;
const express_1 = require("express");
const googleapis_1 = require("googleapis");
exports.cloudStorageRoutes = (0, express_1.Router)();
// Google Drive OAuth2 configuration
const getGoogleOAuth2Client = () => {
    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI || 'http://localhost:3001/api/cloud/google/callback';
    if (!clientId || !clientSecret) {
        return null;
    }
    return new googleapis_1.google.auth.OAuth2(clientId, clientSecret, redirectUri);
};
// In-memory token storage (in production, use database per user)
let googleTokens = null;
let dropboxToken = null;
// ============================================
// GOOGLE DRIVE
// ============================================
// GET /api/cloud/google/auth - Start Google OAuth flow
exports.cloudStorageRoutes.get('/google/auth', (req, res) => {
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
exports.cloudStorageRoutes.get('/google/callback', async (req, res) => {
    const { code } = req.query;
    if (!code || typeof code !== 'string') {
        return res.status(400).send('Missing authorization code');
    }
    const oauth2Client = getGoogleOAuth2Client();
    if (!oauth2Client) {
        return res.status(500).send('Google Drive not configured');
    }
    try {
        const { tokens } = await oauth2Client.getToken(code);
        googleTokens = {
            access_token: tokens.access_token ?? undefined,
            refresh_token: tokens.refresh_token ?? undefined,
        };
        // Redirect back to app with success
        res.redirect('http://localhost:5173/import/cloud?provider=google&status=connected');
    }
    catch (error) {
        console.error('Google OAuth error:', error);
        res.redirect('http://localhost:5173/import/cloud?provider=google&status=error');
    }
});
// GET /api/cloud/google/status - Check connection status
exports.cloudStorageRoutes.get('/google/status', (req, res) => {
    res.json({
        connected: !!googleTokens?.access_token,
        configured: !!process.env.GOOGLE_DRIVE_CLIENT_ID
    });
});
// GET /api/cloud/google/files - List files from Google Drive
exports.cloudStorageRoutes.get('/google/files', async (req, res) => {
    if (!googleTokens?.access_token) {
        return res.status(401).json({ error: 'Not connected to Google Drive' });
    }
    const oauth2Client = getGoogleOAuth2Client();
    if (!oauth2Client) {
        return res.status(500).json({ error: 'Google Drive not configured' });
    }
    oauth2Client.setCredentials(googleTokens);
    const { folderId, pageToken, mimeType } = req.query;
    try {
        const drive = googleapis_1.google.drive({ version: 'v3', auth: oauth2Client });
        // Build query
        let query = "trashed = false";
        if (folderId && typeof folderId === 'string') {
            query += ` and '${folderId}' in parents`;
        }
        else {
            query += " and 'root' in parents";
        }
        // Filter by mime type if specified (e.g., images, documents)
        // Always include folders so users can navigate
        if (mimeType === 'images') {
            query += " and (mimeType contains 'image/' or mimeType = 'application/vnd.google-apps.folder')";
        }
        else if (mimeType === 'documents') {
            query += " and (mimeType contains 'document' or mimeType contains 'text/' or mimeType = 'application/pdf' or mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType = 'application/vnd.google-apps.folder')";
        }
        else if (mimeType === 'audio') {
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
    }
    catch (error) {
        console.error('Google Drive list error:', error);
        res.status(500).json({ error: 'Failed to list files' });
    }
});
// GET /api/cloud/google/download/:fileId - Download a file
exports.cloudStorageRoutes.get('/google/download/:fileId', async (req, res) => {
    if (!googleTokens?.access_token) {
        return res.status(401).json({ error: 'Not connected to Google Drive' });
    }
    const oauth2Client = getGoogleOAuth2Client();
    if (!oauth2Client) {
        return res.status(500).json({ error: 'Google Drive not configured' });
    }
    oauth2Client.setCredentials(googleTokens);
    const { fileId } = req.params;
    try {
        const drive = googleapis_1.google.drive({ version: 'v3', auth: oauth2Client });
        // Get file metadata first
        const metadata = await drive.files.get({
            fileId,
            fields: 'name, mimeType, size',
        });
        // Download file content
        const response = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' });
        res.json({
            name: metadata.data.name,
            mimeType: metadata.data.mimeType,
            size: metadata.data.size,
            content: Buffer.from(response.data).toString('base64'),
        });
    }
    catch (error) {
        console.error('Google Drive download error:', error);
        res.status(500).json({ error: 'Failed to download file' });
    }
});
// POST /api/cloud/google/disconnect - Disconnect Google Drive
exports.cloudStorageRoutes.post('/google/disconnect', (req, res) => {
    googleTokens = null;
    res.json({ success: true });
});
// POST /api/cloud/import - Import a file from cloud storage
exports.cloudStorageRoutes.post('/import', async (req, res) => {
    const { provider, fileId, fileName, mimeType, content, artifactType } = req.body;
    if (!content || !fileName) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        const fs = require('fs');
        const path = require('path');
        const { prisma } = require('../lib/prisma');
        const { extractContent } = require('../services/contentExtractor');
        // Create uploads directory if needed
        const uploadsDir = path.join(process.cwd(), 'uploads', 'cloud');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        // Save file
        const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = path.join(uploadsDir, `${Date.now()}-${safeFileName}`);
        const fileBuffer = Buffer.from(content, 'base64');
        fs.writeFileSync(filePath, fileBuffer);
        // Create artifact record
        const artifact = await prisma.artifact.create({
            data: {
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
            // Update artifact with extracted text
            if (extractedText) {
                await prisma.artifact.update({
                    where: { id: artifact.id },
                    data: { transcribedText: extractedText },
                });
                // Trigger AI analysis
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
                            // Update with AI summary
                            await prisma.artifact.update({
                                where: { id: artifact.id },
                                data: { shortDescription: aiAnalysis.summary || fileName },
                            });
                        }
                    }
                }
            }
        }
        catch (extractError) {
            console.error('Content extraction error:', extractError);
        }
        res.json({
            success: true,
            artifact,
            extractedText: extractedText ? extractedText.substring(0, 500) : null,
            aiAnalysis,
        });
    }
    catch (error) {
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
exports.cloudStorageRoutes.get('/dropbox/auth', (req, res) => {
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
exports.cloudStorageRoutes.get('/dropbox/callback', async (req, res) => {
    const { code } = req.query;
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
        const data = await response.json();
        if (data.access_token) {
            dropboxToken = data.access_token;
            res.redirect('http://localhost:5173/import/cloud?provider=dropbox&status=connected');
        }
        else {
            throw new Error('No access token received');
        }
    }
    catch (error) {
        console.error('Dropbox OAuth error:', error);
        res.redirect('http://localhost:5173/import/cloud?provider=dropbox&status=error');
    }
});
// GET /api/cloud/dropbox/status - Check connection status
exports.cloudStorageRoutes.get('/dropbox/status', (req, res) => {
    res.json({
        connected: !!dropboxToken,
        configured: !!DROPBOX_APP_KEY
    });
});
// GET /api/cloud/dropbox/files - List files from Dropbox
exports.cloudStorageRoutes.get('/dropbox/files', async (req, res) => {
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
        const data = await response.json();
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
    }
    catch (error) {
        console.error('Dropbox list error:', error);
        res.status(500).json({ error: 'Failed to list files' });
    }
});
// GET /api/cloud/dropbox/download - Download a file
exports.cloudStorageRoutes.get('/dropbox/download', async (req, res) => {
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
    }
    catch (error) {
        console.error('Dropbox download error:', error);
        res.status(500).json({ error: 'Failed to download file' });
    }
});
// POST /api/cloud/dropbox/disconnect - Disconnect Dropbox
exports.cloudStorageRoutes.post('/dropbox/disconnect', (req, res) => {
    dropboxToken = null;
    res.json({ success: true });
});
// ============================================
// COMBINED STATUS
// ============================================
// GET /api/cloud/status - Get all cloud storage connection statuses
exports.cloudStorageRoutes.get('/status', (req, res) => {
    res.json({
        google: {
            connected: !!googleTokens?.access_token,
            configured: !!process.env.GOOGLE_DRIVE_CLIENT_ID,
        },
        dropbox: {
            connected: !!dropboxToken,
            configured: !!DROPBOX_APP_KEY,
        },
    });
});
//# sourceMappingURL=cloudStorage.js.map