# PROVENIQ Origins

**Personal Memoir & Life Archive Engine**

PROVENIQ Origins is a single-user, local-first application for storing, organizing, and linking a lifetime of journals, chat logs, artifacts, and memories. It provides a structured archive to support writing a memoir.

## Tech Stack

### Backend (`/server`)
- **Runtime:** Node.js
- **Framework:** Express
- **Language:** TypeScript
- **ORM:** Prisma
- **Database:** SQLite (file-based, local)
- **Validation:** Zod

### Frontend (`/client`)
- **Framework:** React (Vite)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Data Fetching:** React Query (TanStack Query)
- **Typography:** Inter (UI), Source Serif Pro (narrative text)

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   cd memoirark
   ```

2. **Install server dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install client dependencies**
   ```bash
   cd ../client
   npm install
   ```

### Database Setup

1. **Run Prisma migrations**
   ```bash
   cd server
   npx prisma migrate dev
   ```

2. **Seed the database**
   ```bash
   npx prisma db seed
   ```

### Running the Application

1. **Start the backend server**
   ```bash
   cd server
   npm run dev
   ```
   Server runs at `http://localhost:3001`

2. **Start the frontend dev server**
   ```bash
   cd client
   npm run dev
   ```
   Client runs at `http://localhost:5173`

## Project Structure

```
proveniq-origins/
├── README.md
├── project-rules.md
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   ├── lib/            # Utilities and API client
│   │   └── App.tsx
│   └── package.json
└── server/                 # Express backend
    ├── src/
    │   ├── routes/         # API routes
    │   └── index.ts
    ├── prisma/
    │   ├── schema.prisma   # Database schema
    │   └── seed.ts         # Seed data
    └── package.json
```

## Current Phase

**Phase 1: Foundation & Seeding** (Current)
- ✅ Monorepo scaffolding
- ✅ Prisma schema + migration
- ✅ Seed data (Chapters, TraumaCycles, Songs)
- ✅ Event CRUD API
- ✅ Dashboard & Event UI

## License

Private - Terry Holliday
