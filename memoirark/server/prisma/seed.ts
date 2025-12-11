import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding MemoirArk database...');

  // Seed Chapters
  const chapters = [
    { number: 1, title: 'Written in the Stars', summary: '', yearsCovered: '[]' },
    { number: 2, title: 'The First Betrayal', summary: '', yearsCovered: '[]' },
    { number: 3, title: 'The Shadow of 1998', summary: '', yearsCovered: '[]' },
    { number: 4, title: 'Collapse & Consequence', summary: '', yearsCovered: '[]' },
    { number: 5, title: 'The Long Dark Road', summary: '', yearsCovered: '[]' },
    { number: 6, title: 'Fire & Reforging', summary: '', yearsCovered: '[]' },
    { number: 7, title: 'Becoming', summary: '', yearsCovered: '[]' },
    { number: 8, title: 'The Storm Years', summary: '', yearsCovered: '[]' },
    { number: 9, title: 'The Reckoning', summary: '', yearsCovered: '[]' },
    { number: 10, title: 'The Great Severing', summary: '', yearsCovered: '[]' },
    { number: 11, title: 'The Return Home', summary: '', yearsCovered: '[]' },
    { number: 12, title: 'Rebuilding What Remains', summary: '', yearsCovered: '[]' },
    { number: 13, title: 'Love Wins', summary: '', yearsCovered: '[]' },
    { number: 14, title: 'After the Smoke Clears', summary: '', yearsCovered: '[]' }, // Epilogue
  ];

  for (const chapter of chapters) {
    await prisma.chapter.upsert({
      where: { id: `chapter-${chapter.number}` },
      update: chapter,
      create: { id: `chapter-${chapter.number}`, ...chapter },
    });
  }
  console.log(`✅ Seeded ${chapters.length} chapters`);

  // Seed TraumaCycles
  const traumaCycles = [
    { id: 'tc-1997', label: '1997 — The Exile', startYear: 1997, endYear: 1997, description: 'The Exile' },
    { id: 'tc-1998', label: '1998 — The Breaking', startYear: 1998, endYear: 1998, description: 'The Breaking' },
    { id: 'tc-2002', label: '2002 — The Drifting', startYear: 2002, endYear: 2002, description: 'The Drifting' },
    { id: 'tc-2006', label: '2006 — The Pivot', startYear: 2006, endYear: 2006, description: 'The Pivot' },
    { id: 'tc-2011', label: '2011 — The Unraveling', startYear: 2011, endYear: 2011, description: 'The Unraveling' },
    { id: 'tc-2019', label: '2019 — The Corruption', startYear: 2019, endYear: 2019, description: 'The Corruption' },
    { id: 'tc-2020', label: '2020 — The Fracture', startYear: 2020, endYear: 2020, description: 'The Fracture' },
    { id: 'tc-2022', label: '2022 — The Attack', startYear: 2022, endYear: 2022, description: 'The Attack' },
    { id: 'tc-2023-2024', label: '2023–2024 — The Collapse & Rebirth', startYear: 2023, endYear: 2024, description: 'The Collapse & Rebirth' },
  ];

  for (const tc of traumaCycles) {
    await prisma.traumaCycle.upsert({
      where: { id: tc.id },
      update: { label: tc.label, startYear: tc.startYear, endYear: tc.endYear, description: tc.description },
      create: tc,
    });
  }
  console.log(`✅ Seeded ${traumaCycles.length} trauma cycles`);

  // Seed Songs
  const songs = [
    { id: 'song-1', title: 'Only Happy When It Rains', artist: 'Garbage', era: '90s', keyLyric: '', notes: '' },
    { id: 'song-2', title: 'Hurt', artist: 'Nine Inch Nails', era: '90s', keyLyric: '', notes: '' },
    { id: 'song-3', title: 'Fear Is a Liar', artist: 'Zach Williams', era: '2010s', keyLyric: '', notes: '' },
  ];

  for (const song of songs) {
    await prisma.song.upsert({
      where: { id: song.id },
      update: { title: song.title, artist: song.artist, era: song.era, keyLyric: song.keyLyric, notes: song.notes },
      create: song,
    });
  }
  console.log(`✅ Seeded ${songs.length} songs`);

  console.log('🎉 Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
