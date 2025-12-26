# PHASE 5 — LEDGER INTEGRATION, FAMILY SHARING, MOBILE ARCHITECTURE

## Status: IN PROGRESS

## Scope

### 1. Ledger Write-Through ✅
Write Origins events to PROVENIQ Ledger for immutable provenance.

**Implemented:**
- `src/services/ledger-writer.ts` - Ledger write service
- Event types:
  - `ORIGINS_EVENT_CREATED`
  - `ORIGINS_EVENT_UPDATED`
  - `ORIGINS_ARTIFACT_ADDED`
  - `ORIGINS_CHAPTER_CREATED`
  - `ORIGINS_MEMOIR_EXPORTED`
  - `ORIGINS_FAMILY_SHARE_CREATED`
  - `ORIGINS_FAMILY_SHARE_REVOKED`
  - `ORIGINS_PROVENANCE_CERTIFIED`

**Configuration:**
```env
LEDGER_API_URL=http://localhost:8006/api/v1
LEDGER_API_KEY=your-api-key
```

### 2. Family Sharing ✅
Share memoir content with family members via magic link.

**New Schema:**
- `FamilyShare` - Tracks share invitations and permissions
- `LedgerSync` - Tracks which events have been synced to Ledger

**API Endpoints:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/family/shares` | GET | List all shares |
| `/api/family/shares` | POST | Create new share |
| `/api/family/shares/:id` | DELETE | Revoke share |
| `/api/family/shares/:id` | PATCH | Update share settings |
| `/api/family/shares/:id/regenerate-token` | POST | Generate new access token |
| `/api/family/shared/:token` | GET | Access shared content (public) |

**Features:**
- Magic link access (no login required for recipients)
- Scoped access (all chapters, specific chapters, specific collections)
- Expiration dates
- Access level (read, contribute)
- Revocation with Ledger audit trail

### 3. Mobile App Architecture 🔲
Scaffold for future React Native mobile app.

**Planned:**
- Shared API client library
- Offline-first data sync
- Push notifications for family updates
- Camera integration for artifact capture

## Migration Required

Run after pulling this code:
```bash
npx prisma migrate dev --name phase5_family_sharing_ledger
npx prisma generate
```

## New Files

```
src/
├── services/
│   └── ledger-writer.ts       # Ledger write-through service
├── routes/
│   └── familyShare.ts         # Family sharing API routes
prisma/
└── schema.prisma              # Updated with FamilyShare, LedgerSync models
```

## Environment Variables

Add to `.env`:
```env
# Ledger Integration
LEDGER_API_URL=http://localhost:8006/api/v1
LEDGER_API_KEY=

# Client URL for share links
CLIENT_URL=http://localhost:5173
```

## Next Steps

1. Wire Ledger writer into event/artifact/chapter creation routes
2. Build Family Share UI in client
3. Add email notifications for share invitations
4. Mobile app scaffolding
