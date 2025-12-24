"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const events_1 = require("./routes/events");
const chapters_1 = require("./routes/chapters");
const traumaCycles_1 = require("./routes/traumaCycles");
const songs_1 = require("./routes/songs");
const stats_1 = require("./routes/stats");
const persons_1 = require("./routes/persons");
const artifacts_1 = require("./routes/artifacts");
const synchronicities_1 = require("./routes/synchronicities");
const links_1 = require("./routes/links");
const timeline_1 = require("./routes/timeline");
const search_1 = require("./routes/search");
const narrative_1 = require("./routes/narrative");
const export_1 = require("./routes/export");
const tags_1 = require("./routes/tags");
const collections_1 = require("./routes/collections");
const uploads_1 = require("./routes/uploads");
const messengerImport_1 = require("./routes/messengerImport");
const smsImport_1 = require("./routes/smsImport");
const chatgptImport_1 = require("./routes/chatgptImport");
const chapterOrganizer_1 = require("./routes/chapterOrganizer");
const memoirExport_1 = require("./routes/memoirExport");
const ori_1 = require("./routes/ori");
const cloudStorage_1 = require("./routes/cloudStorage");
const auth_1 = require("./routes/auth");
const spotify_1 = require("./routes/spotify");
const insights_1 = require("./routes/insights");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map(o => o.trim()).filter(Boolean);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// Routes
app.use('/api/auth', auth_1.authRoutes);
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Require auth for all remaining API routes
app.use('/api', auth_1.requireAuth);
app.use('/api/events', events_1.eventRoutes);
app.use('/api/chapters', chapters_1.chapterRoutes);
app.use('/api/trauma-cycles', traumaCycles_1.traumaCycleRoutes);
app.use('/api/songs', songs_1.songRoutes);
app.use('/api/stats', stats_1.statsRoutes);
app.use('/api/persons', persons_1.personRoutes);
app.use('/api/artifacts', artifacts_1.artifactRoutes);
app.use('/api/synchronicities', synchronicities_1.synchronicityRoutes);
app.use('/api', links_1.linkRoutes);
app.use('/api/timeline', timeline_1.timelineRoutes);
app.use('/api/search', search_1.searchRoutes);
app.use('/api/narrative', narrative_1.narrativeRoutes);
app.use('/api/export', export_1.exportRoutes);
app.use('/api/tags', tags_1.tagRoutes);
app.use('/api/collections', collections_1.collectionRoutes);
app.use('/api/uploads', uploads_1.uploadRoutes);
app.use('/api/messenger-import', messengerImport_1.messengerImportRoutes);
app.use('/api/sms-import', smsImport_1.smsImportRoutes);
app.use('/api/chatgpt-import', chatgptImport_1.chatgptImportRoutes);
app.use('/api/chapters', chapterOrganizer_1.chapterOrganizerRoutes);
app.use('/api/memoir', memoirExport_1.memoirExportRoutes);
app.use('/api/ai', ori_1.OriRoutes);
app.use('/api/cloud', cloudStorage_1.cloudStorageRoutes);
app.use('/api/spotify', spotify_1.spotifyRoutes);
app.use('/api/insights', insights_1.insightsRoutes);
// Favicon handler (no favicon, return 204)
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});
// Chrome DevTools request - return 204 to silence errors
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => res.status(204).end());
app.listen(PORT, () => {
    console.log(`🚀 Origins server running at http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map