import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';

export const smsImportRoutes = Router();

// Configure multer for XML file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '../../uploads/sms-imports');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `sms-${uniqueSuffix}.xml`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB max (SMS backups can be large)
});

// ============================================
// ANDROID SMS BACKUP & RESTORE XML FORMAT
// ============================================
//
// App: "SMS Backup & Restore" by SyncTech (free on Play Store)
// Export: Settings → Backup → Local backup only → Creates XML file
//
// XML Structure:
// <?xml version="1.0" encoding="UTF-8"?>
// <smses count="1234" backup_set="..." backup_date="1702656000000">
//   <sms 
//     protocol="0"
//     address="+15551234567"           // Phone number
//     date="1702656000000"             // Unix timestamp ms
//     type="1"                         // 1=received, 2=sent, 3=draft
//     subject="null"
//     body="Message text here"
//     toa="null"
//     sc_toa="null"
//     service_center="null"
//     read="1"                         // 1=read, 0=unread
//     status="-1"
//     locked="0"
//     date_sent="1702655999000"
//     sub_id="-1"
//     readable_date="Dec 15, 2024 10:00:00 AM"
//     contact_name="John Doe"          // Contact name if in phone
//   />
//   <mms ...>                          // MMS messages (multimedia)
//     <parts>
//       <part ... text="MMS text" />
//     </parts>
//     <addrs>
//       <addr address="+15551234567" type="137" />
//     </addrs>
//   </mms>
// </smses>
//
// Type codes:
//   1 = MESSAGE_TYPE_INBOX (received)
//   2 = MESSAGE_TYPE_SENT
//   3 = MESSAGE_TYPE_DRAFT
//   4 = MESSAGE_TYPE_OUTBOX
//   5 = MESSAGE_TYPE_FAILED
//   6 = MESSAGE_TYPE_QUEUED
// ============================================

interface SmsMessage {
  address: string;
  date: number;
  type: number;
  body: string;
  contactName: string | null;
  readableDate: string;
}

interface MmsMessage {
  address: string;
  date: number;
  type: number;
  body: string;
  contactName: string | null;
  hasMedia: boolean;
}

interface ParsedMessage {
  sender: string;
  phoneNumber: string;
  timestamp: Date;
  content: string;
  direction: 'sent' | 'received' | 'draft' | 'other';
  hasMedia: boolean;
  isMms: boolean;
}

interface ParsedConversation {
  contactName: string;
  phoneNumber: string;
  messageCount: number;
  dateRange: { earliest: Date; latest: Date };
  messages: ParsedMessage[];
}

interface ParsedBackup {
  totalMessages: number;
  backupDate: Date | null;
  conversations: ParsedConversation[];
}

function getDirection(type: number): 'sent' | 'received' | 'draft' | 'other' {
  switch (type) {
    case 1: return 'received';
    case 2: return 'sent';
    case 3: return 'draft';
    default: return 'other';
  }
}

function parseXmlAttribute(element: string, attr: string): string | null {
  const regex = new RegExp(`${attr}="([^"]*)"`, 'i');
  const match = element.match(regex);
  return match ? match[1] : null;
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#10;/g, '\n')
    .replace(/&#13;/g, '\r')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
}

function parseSmsBackupXml(xmlContent: string): ParsedBackup {
  const messages: ParsedMessage[] = [];
  
  // Parse backup metadata
  const smsesMatch = xmlContent.match(/<smses[^>]*>/i);
  let backupDate: Date | null = null;
  if (smsesMatch) {
    const backupDateStr = parseXmlAttribute(smsesMatch[0], 'backup_date');
    if (backupDateStr) {
      backupDate = new Date(parseInt(backupDateStr, 10));
    }
  }

  // Parse SMS messages
  const smsRegex = /<sms\s+[^>]*\/>/gi;
  let smsMatch;
  while ((smsMatch = smsRegex.exec(xmlContent)) !== null) {
    const element = smsMatch[0];
    
    const address = parseXmlAttribute(element, 'address') || 'Unknown';
    const dateStr = parseXmlAttribute(element, 'date');
    const typeStr = parseXmlAttribute(element, 'type');
    const body = parseXmlAttribute(element, 'body') || '';
    const contactName = parseXmlAttribute(element, 'contact_name');
    
    if (dateStr && typeStr) {
      const type = parseInt(typeStr, 10);
      const direction = getDirection(type);
      
      messages.push({
        sender: direction === 'received' 
          ? (contactName && contactName !== '(Unknown)' ? contactName : address)
          : 'Me',
        phoneNumber: address,
        timestamp: new Date(parseInt(dateStr, 10)),
        content: decodeXmlEntities(body),
        direction,
        hasMedia: false,
        isMms: false,
      });
    }
  }

  // Parse MMS messages (simplified - extract text parts)
  const mmsRegex = /<mms\s+[^>]*>[\s\S]*?<\/mms>/gi;
  let mmsMatch;
  while ((mmsMatch = mmsRegex.exec(xmlContent)) !== null) {
    const element = mmsMatch[0];
    
    const dateStr = parseXmlAttribute(element, 'date');
    const typeStr = parseXmlAttribute(element, 'm_type'); // MMS uses m_type
    const contactName = parseXmlAttribute(element, 'contact_name');
    
    // Extract address from addrs section
    const addrMatch = element.match(/<addr[^>]*address="([^"]*)"[^>]*type="137"[^>]*\/?>/i) ||
                      element.match(/<addr[^>]*address="([^"]*)"[^>]*\/?>/i);
    const address = addrMatch ? addrMatch[1] : 'Unknown';
    
    // Extract text from parts
    const textPartMatch = element.match(/<part[^>]*ct="text\/plain"[^>]*text="([^"]*)"[^>]*\/?>/i);
    const body = textPartMatch ? decodeXmlEntities(textPartMatch[1]) : '';
    
    // Check for media parts
    const hasMedia = /<part[^>]*ct="(image|video|audio)\/[^"]*"[^>]*\/?>/i.test(element);
    
    if (dateStr) {
      // MMS m_type: 132=received, 128=sent
      const mType = typeStr ? parseInt(typeStr, 10) : 0;
      const direction = mType === 132 ? 'received' : mType === 128 ? 'sent' : 'other';
      
      messages.push({
        sender: direction === 'received'
          ? (contactName && contactName !== '(Unknown)' ? contactName : address)
          : 'Me',
        phoneNumber: address,
        timestamp: new Date(parseInt(dateStr, 10)),
        content: body || (hasMedia ? '[Media message]' : '[Empty MMS]'),
        direction,
        hasMedia,
        isMms: true,
      });
    }
  }

  // Group messages by phone number into conversations
  const conversationMap = new Map<string, ParsedMessage[]>();
  for (const msg of messages) {
    const key = msg.phoneNumber.replace(/\D/g, ''); // Normalize phone number
    if (!conversationMap.has(key)) {
      conversationMap.set(key, []);
    }
    conversationMap.get(key)!.push(msg);
  }

  // Build conversation objects
  const conversations: ParsedConversation[] = [];
  for (const [phoneKey, msgs] of conversationMap) {
    msgs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Get contact name from first message that has one
    const contactMsg = msgs.find(m => m.sender !== 'Me' && m.sender !== m.phoneNumber);
    const contactName = contactMsg?.sender || msgs[0]?.phoneNumber || 'Unknown';
    const phoneNumber = msgs[0]?.phoneNumber || phoneKey;
    
    const timestamps = msgs.map(m => m.timestamp.getTime());
    
    conversations.push({
      contactName,
      phoneNumber,
      messageCount: msgs.length,
      dateRange: {
        earliest: new Date(Math.min(...timestamps)),
        latest: new Date(Math.max(...timestamps)),
      },
      messages: msgs,
    });
  }

  // Sort conversations by message count (most active first)
  conversations.sort((a, b) => b.messageCount - a.messageCount);

  return {
    totalMessages: messages.length,
    backupDate,
    conversations,
  };
}

// POST /api/sms-import/parse - Parse XML and return preview
smsImportRoutes.post('/parse', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const content = fs.readFileSync(req.file.path, 'utf-8');
    const parsed = parseSmsBackupXml(content);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    // Return preview (conversations with first 20 messages each)
    res.json({
      totalMessages: parsed.totalMessages,
      backupDate: parsed.backupDate,
      conversationCount: parsed.conversations.length,
      conversations: parsed.conversations.map(conv => ({
        contactName: conv.contactName,
        phoneNumber: conv.phoneNumber,
        messageCount: conv.messageCount,
        dateRange: conv.dateRange,
        preview: conv.messages.slice(0, 20),
      })),
    });
  } catch (error) {
    console.error('Error parsing SMS backup:', error);
    res.status(500).json({ error: 'Failed to parse SMS backup file' });
  }
});

// POST /api/sms-import/import - Import selected conversations
smsImportRoutes.post('/import', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const {
      createPeople = 'true',
      createArtifact = 'true',
      groupByDay = 'true',
      selectedConversations, // JSON array of phone numbers to import, or 'all'
    } = req.body;

    const content = fs.readFileSync(req.file.path, 'utf-8');
    const parsed = parseSmsBackupXml(content);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    // Filter conversations if specific ones selected
    let conversationsToImport = parsed.conversations;
    if (selectedConversations && selectedConversations !== 'all') {
      const selected = JSON.parse(selectedConversations) as string[];
      conversationsToImport = parsed.conversations.filter(conv => 
        selected.some(s => conv.phoneNumber.includes(s) || s.includes(conv.phoneNumber.replace(/\D/g, '')))
      );
    }

    const results = {
      peopleCreated: 0,
      artifactsCreated: 0,
      eventsCreated: 0,
      conversationsImported: 0,
    };

    for (const conversation of conversationsToImport) {
      const personMap = new Map<string, string>();

      // Create Person record for contact
      if (createPeople === 'true') {
        const name = conversation.contactName !== conversation.phoneNumber 
          ? conversation.contactName 
          : `SMS Contact (${conversation.phoneNumber})`;
        
        const existing = await prisma.person.findFirst({ 
          where: { 
            OR: [
              { name },
              { notes: { contains: conversation.phoneNumber } }
            ]
          } 
        });
        
        if (existing) {
          personMap.set(conversation.contactName, existing.id);
        } else {
          const person = await prisma.person.create({
            data: {
              name,
              role: 'SMS Contact',
              relationshipType: 'contact',
              notes: `Phone: ${conversation.phoneNumber}\nImported from SMS backup`,
            },
          });
          personMap.set(conversation.contactName, person.id);
          results.peopleCreated++;
        }
      }

      // Create artifact with full conversation transcript
      let artifactId: string | null = null;
      if (createArtifact === 'true') {
        const transcript = conversation.messages
          .map(m => {
            const date = m.timestamp.toISOString().split('T')[0];
            const time = m.timestamp.toTimeString().split(' ')[0];
            const direction = m.direction === 'sent' ? '→' : '←';
            const media = m.hasMedia ? ' [media]' : '';
            const mms = m.isMms ? ' (MMS)' : '';
            return `[${date} ${time}] ${direction} ${m.sender}: ${m.content}${media}${mms}`;
          })
          .join('\n');

        const artifact = await prisma.artifact.create({
          data: {
            type: 'document',
            sourceSystem: 'android-sms',
            shortDescription: `SMS: ${conversation.contactName}`,
            transcribedText: transcript,
            importedFrom: `Android SMS backup - ${conversation.contactName} (${conversation.phoneNumber})`,
          },
        });
        artifactId = artifact.id;
        results.artifactsCreated++;

        // Link artifact to person
        for (const personId of personMap.values()) {
          await prisma.artifactPerson.create({
            data: { artifactId: artifact.id, personId },
          });
        }
      }

      // Create events
      if (groupByDay === 'true') {
        // Group messages by day
        const messagesByDay = new Map<string, ParsedMessage[]>();
        for (const msg of conversation.messages) {
          const day = msg.timestamp.toISOString().split('T')[0];
          if (!messagesByDay.has(day)) {
            messagesByDay.set(day, []);
          }
          messagesByDay.get(day)!.push(msg);
        }

        for (const [day, dayMessages] of messagesByDay) {
          const sentCount = dayMessages.filter(m => m.direction === 'sent').length;
          const receivedCount = dayMessages.filter(m => m.direction === 'received').length;
          
          const event = await prisma.event.create({
            data: {
              title: `SMS with ${conversation.contactName}`,
              date: new Date(day),
              summary: `${dayMessages.length} messages (${sentCount} sent, ${receivedCount} received)`,
              notes: dayMessages
                .map(m => {
                  const time = m.timestamp.toTimeString().split(' ')[0];
                  const dir = m.direction === 'sent' ? '→' : '←';
                  return `[${time}] ${dir} ${m.content}`;
                })
                .join('\n'),
              emotionTags: '[]',
            },
          });
          results.eventsCreated++;

          // Link event to person
          for (const personId of personMap.values()) {
            await prisma.eventPerson.create({
              data: { eventId: event.id, personId },
            });
          }

          // Link event to artifact
          if (artifactId) {
            await prisma.eventArtifact.create({
              data: { eventId: event.id, artifactId },
            });
          }
        }
      } else {
        // Create single event for entire conversation
        const event = await prisma.event.create({
          data: {
            title: `SMS conversation: ${conversation.contactName}`,
            date: conversation.dateRange.earliest,
            summary: `${conversation.messageCount} messages from ${conversation.dateRange.earliest.toLocaleDateString()} to ${conversation.dateRange.latest.toLocaleDateString()}`,
            notes: `Text message history with ${conversation.contactName} (${conversation.phoneNumber})`,
            emotionTags: '[]',
          },
        });
        results.eventsCreated++;

        for (const personId of personMap.values()) {
          await prisma.eventPerson.create({
            data: { eventId: event.id, personId },
          });
        }

        if (artifactId) {
          await prisma.eventArtifact.create({
            data: { eventId: event.id, artifactId },
          });
        }
      }

      results.conversationsImported++;
    }

    res.json({
      success: true,
      totalMessages: parsed.totalMessages,
      results,
    });
  } catch (error) {
    console.error('Error importing SMS data:', error);
    res.status(500).json({ error: 'Failed to import SMS data' });
  }
});

// GET /api/sms-import/instructions - Return instructions for users
smsImportRoutes.get('/instructions', (req: Request, res: Response) => {
  res.json({
    title: 'How to Export Your Android SMS/Text Messages',
    steps: [
      {
        step: 1,
        title: 'Install SMS Backup & Restore',
        description: 'Download "SMS Backup & Restore" by SyncTech from the Google Play Store (free)',
        link: 'https://play.google.com/store/apps/details?id=com.riteshsahu.SMSBackupRestore',
      },
      {
        step: 2,
        title: 'Grant Permissions',
        description: 'Open the app and grant SMS and storage permissions when prompted',
      },
      {
        step: 3,
        title: 'Create Backup',
        description: 'Tap "Back Up Now" or go to Settings → Backup to customize what to include',
      },
      {
        step: 4,
        title: 'Choose Local Backup',
        description: 'Select "Local backup only" (no cloud account needed)',
      },
      {
        step: 5,
        title: 'Find the Backup File',
        description: 'The backup is saved to your phone storage, typically in SMSBackupRestore folder. File is named like "sms-20241215120000.xml"',
      },
      {
        step: 6,
        title: 'Transfer to Computer',
        description: 'Connect your phone via USB, use cloud storage, or email the file to yourself',
      },
      {
        step: 7,
        title: 'Upload to Origins',
        description: 'Upload the .xml file here to preview and import your text message history',
      },
    ],
    notes: [
      'This only works with Android phones - iOS does not allow SMS export',
      'MMS messages (with photos/videos) will show as "[Media message]" - media files are not imported',
      'Group messages are supported but may show as separate conversations',
      'Very large backups (10,000+ messages) may take a minute to process',
      'Your messages never leave your computer - processing happens locally',
    ],
    alternativeApps: [
      {
        name: 'SMS Backup+',
        note: 'Also exports to XML format, should be compatible',
      },
      {
        name: 'Super Backup',
        note: 'May use different XML format - not guaranteed to work',
      },
    ],
  });
});
