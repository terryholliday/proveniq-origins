/*
  Warnings:

  - You are about to drop the `_ArtifactToEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ArtifactToPerson` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_EventToPerson` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_EventToSong` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_EventToSynchronicity` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "_ArtifactToEvent_B_index";

-- DropIndex
DROP INDEX "_ArtifactToEvent_AB_unique";

-- DropIndex
DROP INDEX "_ArtifactToPerson_B_index";

-- DropIndex
DROP INDEX "_ArtifactToPerson_AB_unique";

-- DropIndex
DROP INDEX "_EventToPerson_B_index";

-- DropIndex
DROP INDEX "_EventToPerson_AB_unique";

-- DropIndex
DROP INDEX "_EventToSong_B_index";

-- DropIndex
DROP INDEX "_EventToSong_AB_unique";

-- DropIndex
DROP INDEX "_EventToSynchronicity_B_index";

-- DropIndex
DROP INDEX "_EventToSynchronicity_AB_unique";

-- AlterTable
ALTER TABLE "Artifact" ADD COLUMN "importedFrom" TEXT;

-- AlterTable
ALTER TABLE "Synchronicity" ADD COLUMN "symbolicTag" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_ArtifactToEvent";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_ArtifactToPerson";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_EventToPerson";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_EventToSong";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_EventToSynchronicity";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "EventPerson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventPerson_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventPerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventSong" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventSong_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventSong_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventArtifact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "artifactId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventArtifact_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventArtifact_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "Artifact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventSynchronicity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "synchronicityId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventSynchronicity_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventSynchronicity_synchronicityId_fkey" FOREIGN KEY ("synchronicityId") REFERENCES "Synchronicity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ArtifactPerson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "artifactId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArtifactPerson_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "Artifact" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ArtifactPerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "date" DATETIME,
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
INSERT INTO "new_Event" ("chapterId", "createdAt", "date", "emotionTags", "id", "location", "notes", "summary", "title", "traumaCycleId", "updatedAt") SELECT "chapterId", "createdAt", "date", "emotionTags", "id", "location", "notes", "summary", "title", "traumaCycleId", "updatedAt" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
CREATE TABLE "new_Person" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '',
    "relationshipType" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Person" ("createdAt", "id", "name", "notes", "relationshipType", "role", "updatedAt") SELECT "createdAt", "id", "name", "notes", "relationshipType", "role", "updatedAt" FROM "Person";
DROP TABLE "Person";
ALTER TABLE "new_Person" RENAME TO "Person";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "EventPerson_eventId_personId_key" ON "EventPerson"("eventId", "personId");

-- CreateIndex
CREATE UNIQUE INDEX "EventSong_eventId_songId_key" ON "EventSong"("eventId", "songId");

-- CreateIndex
CREATE UNIQUE INDEX "EventArtifact_eventId_artifactId_key" ON "EventArtifact"("eventId", "artifactId");

-- CreateIndex
CREATE UNIQUE INDEX "EventSynchronicity_eventId_synchronicityId_key" ON "EventSynchronicity"("eventId", "synchronicityId");

-- CreateIndex
CREATE UNIQUE INDEX "ArtifactPerson_artifactId_personId_key" ON "ArtifactPerson"("artifactId", "personId");
