"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spotifyRoutes = void 0;
const express_1 = require("express");
exports.spotifyRoutes = (0, express_1.Router)();
// Spotify API credentials
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
let accessToken = null;
let tokenExpiry = 0;
// Get Spotify access token using Client Credentials flow
async function getAccessToken() {
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
        return null;
    }
    // Return cached token if still valid
    if (accessToken && Date.now() < tokenExpiry) {
        return accessToken;
    }
    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
            },
            body: 'grant_type=client_credentials',
        });
        if (!response.ok) {
            console.error('Spotify token error:', await response.text());
            return null;
        }
        const data = await response.json();
        accessToken = data.access_token;
        tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // Refresh 1 min early
        return accessToken;
    }
    catch (error) {
        console.error('Spotify token fetch error:', error);
        return null;
    }
}
// GET /api/spotify/search?q=song+name
exports.spotifyRoutes.get('/search', async (req, res) => {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.trim().length < 2) {
        return res.json({ tracks: [] });
    }
    const token = await getAccessToken();
    if (!token) {
        return res.status(503).json({
            error: 'Spotify not configured',
            setup: 'Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to .env'
        });
    }
    try {
        const searchUrl = new URL('https://api.spotify.com/v1/search');
        searchUrl.searchParams.set('q', q.trim());
        searchUrl.searchParams.set('type', 'track');
        searchUrl.searchParams.set('limit', '10');
        const response = await fetch(searchUrl.toString(), {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        if (!response.ok) {
            console.error('Spotify search error:', await response.text());
            return res.status(500).json({ error: 'Spotify search failed' });
        }
        const data = await response.json();
        // Transform to simpler format
        const tracks = data.tracks.items.map((track) => ({
            spotifyId: track.id,
            title: track.name,
            artist: track.artists.map(a => a.name).join(', '),
            album: track.album.name,
            releaseYear: track.album.release_date?.split('-')[0] || null,
            albumArt: track.album.images[0]?.url || null,
            spotifyUrl: track.external_urls.spotify,
            previewUrl: track.preview_url,
        }));
        res.json({ tracks });
    }
    catch (error) {
        console.error('Spotify search error:', error);
        res.status(500).json({ error: 'Spotify search failed' });
    }
});
// GET /api/spotify/status - Check if Spotify is configured
exports.spotifyRoutes.get('/status', async (req, res) => {
    const token = await getAccessToken();
    res.json({
        configured: !!token,
        hasCredentials: !!(SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET),
    });
});
//# sourceMappingURL=spotify.js.map