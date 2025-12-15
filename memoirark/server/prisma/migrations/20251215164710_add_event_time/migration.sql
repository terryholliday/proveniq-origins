-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "date" DATETIME,
    "time" TEXT,
    "timeApproximate" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "summary" TEXT,
    "emotionTags" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "isKeystone" BOOLEAN NOT NULL DEFAULT false,
    "chapterId" TEXT,
    "traumaCycleId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Event_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Event_traumaCycleId_fkey" FOREIGN KEY ("traumaCycleId") REFERENCES "TraumaCycle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Event" ("chapterId", "createdAt", "date", "emotionTags", "id", "isKeystone", "location", "notes", "summary", "title", "traumaCycleId", "updatedAt") SELECT "chapterId", "createdAt", "date", "emotionTags", "id", "isKeystone", "location", "notes", "summary", "title", "traumaCycleId", "updatedAt" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
