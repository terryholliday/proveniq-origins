/**
 * @file routes/pdfExport.ts
 * @description PDF Export for Origins Memoir/Book
 * 
 * Generates a print-ready PDF memoir from chapters and events.
 * Uses HTML-to-PDF approach for rich formatting without heavy dependencies.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const pdfExportRoutes = Router();

interface ExportOptions {
  chapterIds?: string[];
  includePhotos?: boolean;
  includeArtifacts?: boolean;
  includeSynchronicities?: boolean;
  authorName?: string;
  bookTitle?: string;
  includeTableOfContents?: boolean;
  pageSize?: 'letter' | 'a4';
  fontSize?: 'small' | 'medium' | 'large';
}

// Helper: Escape HTML
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
}

// Helper: Format date
function formatDate(date: Date | string | null): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Generate CSS for print styling
function generatePrintCSS(options: ExportOptions): string {
  const fontSize = options.fontSize === 'small' ? '11pt' : options.fontSize === 'large' ? '14pt' : '12pt';
  const pageSize = options.pageSize === 'a4' ? 'A4' : 'letter';

  return `
    @page {
      size: ${pageSize};
      margin: 1in;
    }
    
    @media print {
      .page-break { page-break-after: always; }
      .no-break { page-break-inside: avoid; }
    }
    
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: ${fontSize};
      line-height: 1.6;
      color: #1a1a1a;
      max-width: 6.5in;
      margin: 0 auto;
      padding: 0;
    }
    
    /* Title Page */
    .title-page {
      text-align: center;
      padding-top: 3in;
      page-break-after: always;
    }
    
    .title-page h1 {
      font-size: 2.5em;
      font-weight: normal;
      margin-bottom: 0.5em;
      letter-spacing: 0.05em;
    }
    
    .title-page .author {
      font-size: 1.2em;
      font-style: italic;
      margin-top: 2em;
    }
    
    .title-page .date {
      font-size: 0.9em;
      color: #666;
      margin-top: 4em;
    }
    
    /* Table of Contents */
    .toc {
      page-break-after: always;
    }
    
    .toc h2 {
      font-size: 1.5em;
      text-align: center;
      margin-bottom: 1.5em;
    }
    
    .toc-entry {
      display: flex;
      justify-content: space-between;
      margin: 0.5em 0;
      border-bottom: 1px dotted #ccc;
    }
    
    .toc-entry span:last-child {
      background: white;
      padding-left: 0.5em;
    }
    
    /* Chapters */
    .chapter {
      page-break-before: always;
    }
    
    .chapter:first-of-type {
      page-break-before: auto;
    }
    
    .chapter-header {
      text-align: center;
      margin-bottom: 2em;
      padding-top: 1in;
    }
    
    .chapter-number {
      font-size: 0.9em;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      color: #666;
    }
    
    .chapter-title {
      font-size: 1.8em;
      font-weight: normal;
      margin: 0.5em 0;
    }
    
    .chapter-years {
      font-size: 0.9em;
      font-style: italic;
      color: #666;
    }
    
    .chapter-summary {
      font-style: italic;
      text-align: center;
      margin: 1.5em 2em;
      color: #444;
    }
    
    /* Events */
    .event {
      margin: 2em 0;
      page-break-inside: avoid;
    }
    
    .event-title {
      font-size: 1.1em;
      font-weight: bold;
      margin-bottom: 0.3em;
    }
    
    .event-meta {
      font-size: 0.85em;
      color: #666;
      margin-bottom: 0.5em;
    }
    
    .event-content {
      text-align: justify;
    }
    
    .event-notes {
      margin-top: 0.5em;
      padding-left: 1em;
      border-left: 2px solid #ddd;
      font-style: italic;
    }
    
    .keystone-badge {
      display: inline-block;
      background: #f0e68c;
      padding: 0.1em 0.5em;
      font-size: 0.8em;
      border-radius: 3px;
      margin-left: 0.5em;
    }
    
    /* Artifacts */
    .artifact-list {
      margin-top: 1em;
      padding: 0.5em 1em;
      background: #f9f9f9;
      border-radius: 4px;
      font-size: 0.9em;
    }
    
    .artifact-list h4 {
      margin: 0 0 0.5em 0;
      font-size: 0.9em;
      color: #666;
    }
    
    /* People */
    .people-mentioned {
      font-size: 0.85em;
      color: #555;
      margin-top: 0.5em;
    }
    
    /* Synchronicities */
    .synchronicity {
      margin: 1em 0;
      padding: 0.5em 1em;
      background: #f5f0ff;
      border-left: 3px solid #9370db;
      font-style: italic;
    }
    
    /* Footer */
    .book-footer {
      text-align: center;
      margin-top: 3em;
      padding-top: 2em;
      border-top: 1px solid #ddd;
      font-size: 0.9em;
      color: #666;
    }
  `;
}

// POST /api/export/pdf/preview - Generate HTML preview (can be converted to PDF client-side)
pdfExportRoutes.post('/preview', async (req: Request, res: Response) => {
  try {
    const options: ExportOptions = {
      chapterIds: req.body.chapterIds,
      includePhotos: req.body.includePhotos ?? false,
      includeArtifacts: req.body.includeArtifacts ?? true,
      includeSynchronicities: req.body.includeSynchronicities ?? true,
      authorName: req.body.authorName || 'Anonymous',
      bookTitle: req.body.bookTitle || 'My Origins',
      includeTableOfContents: req.body.includeTableOfContents ?? true,
      pageSize: req.body.pageSize || 'letter',
      fontSize: req.body.fontSize || 'medium',
    };

    // Fetch chapters with events
    const whereClause = options.chapterIds?.length 
      ? { id: { in: options.chapterIds } }
      : {};

    const chapters = await prisma.chapter.findMany({
      where: whereClause,
      include: {
        events: {
          include: {
            personLinks: { include: { person: true } },
            artifactLinks: { include: { artifact: true } },
            synchronicityLinks: { include: { synchronicity: true } },
            tagLinks: { include: { tag: true } },
          },
          orderBy: { date: 'asc' },
        },
      },
      orderBy: { number: 'asc' },
    });

    // Build HTML
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(options.bookTitle || 'My Origins')}</title>
  <style>${generatePrintCSS(options)}</style>
</head>
<body>`;

    // Title page
    html += `
  <div class="title-page">
    <h1>${escapeHtml(options.bookTitle || 'My Origins')}</h1>
    <div class="author">by ${escapeHtml(options.authorName || 'Anonymous')}</div>
    <div class="date">Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</div>
  </div>`;

    // Table of Contents
    if (options.includeTableOfContents && chapters.length > 0) {
      html += `
  <div class="toc">
    <h2>Contents</h2>`;
      
      chapters.forEach((chapter, idx) => {
        html += `
    <div class="toc-entry">
      <span>Chapter ${chapter.number}: ${escapeHtml(chapter.title)}</span>
      <span>${idx + 1}</span>
    </div>`;
      });

      html += `
  </div>`;
    }

    // Chapters
    for (const chapter of chapters) {
      const yearsCovered = JSON.parse(chapter.yearsCovered || '[]');

      html += `
  <div class="chapter">
    <div class="chapter-header">
      <div class="chapter-number">Chapter ${chapter.number}</div>
      <h1 class="chapter-title">${escapeHtml(chapter.title)}</h1>
      ${yearsCovered.length > 0 ? `<div class="chapter-years">${yearsCovered.join(' – ')}</div>` : ''}
    </div>
    ${chapter.summary ? `<p class="chapter-summary">${escapeHtml(chapter.summary)}</p>` : ''}`;

      // Events in this chapter
      for (const event of chapter.events) {
        const emotionTags = JSON.parse(event.emotionTags || '[]');
        const people = event.personLinks.map(l => l.person.name);
        const artifacts = event.artifactLinks.map(l => l.artifact);
        const synchronicities = event.synchronicityLinks.map(l => l.synchronicity);
        const tags = event.tagLinks.map(l => l.tag.name);

        html += `
    <div class="event no-break">
      <div class="event-title">
        ${escapeHtml(event.title)}
        ${event.isKeystone ? '<span class="keystone-badge">★ Keystone</span>' : ''}
      </div>
      <div class="event-meta">
        ${formatDate(event.date)}${event.location ? ` • ${escapeHtml(event.location)}` : ''}
        ${emotionTags.length > 0 ? ` • ${emotionTags.join(', ')}` : ''}
      </div>`;

        if (event.summary) {
          html += `
      <div class="event-content">${escapeHtml(event.summary)}</div>`;
        }

        if (event.notes) {
          html += `
      <div class="event-notes">${escapeHtml(event.notes)}</div>`;
        }

        if (people.length > 0) {
          html += `
      <div class="people-mentioned">People: ${people.map(p => escapeHtml(p)).join(', ')}</div>`;
        }

        if (options.includeArtifacts && artifacts.length > 0) {
          html += `
      <div class="artifact-list">
        <h4>Artifacts</h4>
        <ul>
          ${artifacts.map(a => `<li>${escapeHtml(a.shortDescription || a.type)}</li>`).join('')}
        </ul>
      </div>`;
        }

        if (options.includeSynchronicities && synchronicities.length > 0) {
          for (const sync of synchronicities) {
            html += `
      <div class="synchronicity">
        <strong>${escapeHtml(sync.type)}</strong>: ${escapeHtml(sync.description || '')}
      </div>`;
          }
        }

        html += `
    </div>`;
      }

      html += `
  </div>`;
    }

    // Footer
    html += `
  <div class="book-footer">
    <p>Generated with PROVENIQ Origins</p>
    <p>${new Date().toLocaleDateString()}</p>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error generating PDF preview:', error);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

// GET /api/export/pdf/config - Get export configuration options
pdfExportRoutes.get('/config', async (_req: Request, res: Response) => {
  try {
    const chapters = await prisma.chapter.findMany({
      select: {
        id: true,
        number: true,
        title: true,
        _count: { select: { events: true } },
      },
      orderBy: { number: 'asc' },
    });

    const stats = await prisma.$transaction([
      prisma.event.count(),
      prisma.artifact.count(),
      prisma.synchronicity.count(),
      prisma.person.count(),
    ]);

    res.json({
      chapters: chapters.map(c => ({
        id: c.id,
        number: c.number,
        title: c.title,
        eventCount: c._count.events,
      })),
      stats: {
        totalEvents: stats[0],
        totalArtifacts: stats[1],
        totalSynchronicities: stats[2],
        totalPeople: stats[3],
      },
      options: {
        pageSizes: ['letter', 'a4'],
        fontSizes: ['small', 'medium', 'large'],
      },
    });
  } catch (error) {
    console.error('Error fetching export config:', error);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

// POST /api/export/pdf/download - Generate downloadable HTML (print to PDF in browser)
pdfExportRoutes.post('/download', async (req: Request, res: Response) => {
  try {
    const options: ExportOptions = {
      chapterIds: req.body.chapterIds,
      includePhotos: req.body.includePhotos ?? false,
      includeArtifacts: req.body.includeArtifacts ?? true,
      includeSynchronicities: req.body.includeSynchronicities ?? true,
      authorName: req.body.authorName || 'Anonymous',
      bookTitle: req.body.bookTitle || 'My Origins',
      includeTableOfContents: req.body.includeTableOfContents ?? true,
      pageSize: req.body.pageSize || 'letter',
      fontSize: req.body.fontSize || 'medium',
    };

    // Fetch chapters with events
    const whereClause = options.chapterIds?.length 
      ? { id: { in: options.chapterIds } }
      : {};

    const chapters = await prisma.chapter.findMany({
      where: whereClause,
      include: {
        events: {
          include: {
            personLinks: { include: { person: true } },
            artifactLinks: { include: { artifact: true } },
            synchronicityLinks: { include: { synchronicity: true } },
            tagLinks: { include: { tag: true } },
          },
          orderBy: { date: 'asc' },
        },
      },
      orderBy: { number: 'asc' },
    });

    // Build HTML (same as preview but with download headers)
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(options.bookTitle || 'My Origins')}</title>
  <style>${generatePrintCSS(options)}</style>
  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</head>
<body>`;

    // Title page
    html += `
  <div class="title-page">
    <h1>${escapeHtml(options.bookTitle || 'My Origins')}</h1>
    <div class="author">by ${escapeHtml(options.authorName || 'Anonymous')}</div>
    <div class="date">Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</div>
  </div>`;

    // Table of Contents
    if (options.includeTableOfContents && chapters.length > 0) {
      html += `
  <div class="toc">
    <h2>Contents</h2>`;
      
      chapters.forEach((chapter, idx) => {
        html += `
    <div class="toc-entry">
      <span>Chapter ${chapter.number}: ${escapeHtml(chapter.title)}</span>
      <span>${idx + 1}</span>
    </div>`;
      });

      html += `
  </div>`;
    }

    // Chapters
    for (const chapter of chapters) {
      const yearsCovered = JSON.parse(chapter.yearsCovered || '[]');

      html += `
  <div class="chapter">
    <div class="chapter-header">
      <div class="chapter-number">Chapter ${chapter.number}</div>
      <h1 class="chapter-title">${escapeHtml(chapter.title)}</h1>
      ${yearsCovered.length > 0 ? `<div class="chapter-years">${yearsCovered.join(' – ')}</div>` : ''}
    </div>
    ${chapter.summary ? `<p class="chapter-summary">${escapeHtml(chapter.summary)}</p>` : ''}`;

      for (const event of chapter.events) {
        const emotionTags = JSON.parse(event.emotionTags || '[]');
        const people = event.personLinks.map(l => l.person.name);

        html += `
    <div class="event no-break">
      <div class="event-title">
        ${escapeHtml(event.title)}
        ${event.isKeystone ? '<span class="keystone-badge">★ Keystone</span>' : ''}
      </div>
      <div class="event-meta">
        ${formatDate(event.date)}${event.location ? ` • ${escapeHtml(event.location)}` : ''}
      </div>`;

        if (event.summary) {
          html += `
      <div class="event-content">${escapeHtml(event.summary)}</div>`;
        }

        if (event.notes) {
          html += `
      <div class="event-notes">${escapeHtml(event.notes)}</div>`;
        }

        if (people.length > 0) {
          html += `
      <div class="people-mentioned">People: ${people.map(p => escapeHtml(p)).join(', ')}</div>`;
        }

        html += `
    </div>`;
      }

      html += `
  </div>`;
    }

    html += `
  <div class="book-footer">
    <p>Generated with PROVENIQ Origins</p>
  </div>
</body>
</html>`;

    const filename = `${(options.bookTitle || 'origins').replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.html`;
    
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(html);
  } catch (error) {
    console.error('Error generating download:', error);
    res.status(500).json({ error: 'Failed to generate download' });
  }
});
