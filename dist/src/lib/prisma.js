"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
// Use local SQLite for development
// Turso will be configured in Vercel via environment variables
exports.prisma = new client_1.PrismaClient();
console.log('🗄️ Database connected');
//# sourceMappingURL=prisma.js.map