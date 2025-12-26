/**
 * @file services/ledger-writer.ts
 * @description Ledger Write-Through Service for Origins
 * 
 * Writes Origins events to the PROVENIQ Ledger for immutable provenance.
 * All significant memoir events are recorded for cryptographic proof.
 */

const LEDGER_API_URL = process.env.LEDGER_API_URL || 'http://localhost:8006/api/v1';
const LEDGER_API_KEY = process.env.LEDGER_API_KEY || '';

export type OriginsEventType = 
  | 'ORIGINS_MEMOIR_CREATED'
  | 'ORIGINS_EVENT_CREATED'
  | 'ORIGINS_EVENT_UPDATED'
  | 'ORIGINS_ARTIFACT_ADDED'
  | 'ORIGINS_CHAPTER_CREATED'
  | 'ORIGINS_COLLECTION_CREATED'
  | 'ORIGINS_MEMOIR_EXPORTED'
  | 'ORIGINS_FAMILY_SHARE_CREATED'
  | 'ORIGINS_FAMILY_SHARE_REVOKED'
  | 'ORIGINS_PROVENANCE_CERTIFIED';

export interface LedgerWritePayload {
  eventType: OriginsEventType;
  userId: string;
  resourceId: string;
  resourceType: 'event' | 'artifact' | 'chapter' | 'collection' | 'memoir' | 'share';
  metadata: Record<string, unknown>;
  correlationId?: string;
}

export interface LedgerWriteResult {
  success: boolean;
  eventId?: string;
  entryHash?: string;
  sequenceNumber?: number;
  error?: string;
}

class LedgerWriter {
  private enabled: boolean;

  constructor() {
    this.enabled = !!process.env.LEDGER_API_URL;
    if (!this.enabled) {
      console.log('[LEDGER-WRITER] Disabled - LEDGER_API_URL not configured');
    }
  }

  /**
   * Write an event to the Ledger
   */
  async write(payload: LedgerWritePayload): Promise<LedgerWriteResult> {
    if (!this.enabled) {
      return { success: true, eventId: `mock-${Date.now()}` };
    }

    try {
      const response = await fetch(`${LEDGER_API_URL}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(LEDGER_API_KEY ? { 'X-API-Key': LEDGER_API_KEY } : {}),
        },
        body: JSON.stringify({
          source: 'origins',
          event_type: payload.eventType,
          actor_id: payload.userId,
          asset_id: payload.resourceType === 'event' ? payload.resourceId : undefined,
          correlation_id: payload.correlationId,
          payload: {
            resource_id: payload.resourceId,
            resource_type: payload.resourceType,
            ...payload.metadata,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[LEDGER-WRITER] Write failed:', response.status, error);
        return { success: false, error: `Ledger write failed: ${response.status}` };
      }

      const data = await response.json() as any;
      return {
        success: true,
        eventId: data.data?.event_id || data.event_id,
        entryHash: data.data?.entry_hash || data.entry_hash,
        sequenceNumber: data.data?.sequence_number || data.sequence_number,
      };
    } catch (error: any) {
      console.error('[LEDGER-WRITER] Write error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record event creation
   */
  async recordEventCreated(userId: string, eventId: string, title: string, date?: Date): Promise<LedgerWriteResult> {
    return this.write({
      eventType: 'ORIGINS_EVENT_CREATED',
      userId,
      resourceId: eventId,
      resourceType: 'event',
      metadata: {
        title,
        date: date?.toISOString(),
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Record event update
   */
  async recordEventUpdated(userId: string, eventId: string, changes: string[]): Promise<LedgerWriteResult> {
    return this.write({
      eventType: 'ORIGINS_EVENT_UPDATED',
      userId,
      resourceId: eventId,
      resourceType: 'event',
      metadata: {
        changes,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Record artifact addition
   */
  async recordArtifactAdded(userId: string, artifactId: string, type: string, linkedEventIds: string[]): Promise<LedgerWriteResult> {
    return this.write({
      eventType: 'ORIGINS_ARTIFACT_ADDED',
      userId,
      resourceId: artifactId,
      resourceType: 'artifact',
      metadata: {
        artifact_type: type,
        linked_events: linkedEventIds,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Record chapter creation
   */
  async recordChapterCreated(userId: string, chapterId: string, number: number, title: string): Promise<LedgerWriteResult> {
    return this.write({
      eventType: 'ORIGINS_CHAPTER_CREATED',
      userId,
      resourceId: chapterId,
      resourceType: 'chapter',
      metadata: {
        chapter_number: number,
        title,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Record memoir export
   */
  async recordMemoirExported(userId: string, exportId: string, format: string, chapterCount: number, eventCount: number): Promise<LedgerWriteResult> {
    return this.write({
      eventType: 'ORIGINS_MEMOIR_EXPORTED',
      userId,
      resourceId: exportId,
      resourceType: 'memoir',
      metadata: {
        format,
        chapter_count: chapterCount,
        event_count: eventCount,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Record family share creation
   */
  async recordFamilyShareCreated(
    userId: string, 
    shareId: string, 
    recipientEmail: string, 
    accessLevel: string
  ): Promise<LedgerWriteResult> {
    return this.write({
      eventType: 'ORIGINS_FAMILY_SHARE_CREATED',
      userId,
      resourceId: shareId,
      resourceType: 'share',
      metadata: {
        recipient_email_hash: this.hashEmail(recipientEmail),
        access_level: accessLevel,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Record family share revocation
   */
  async recordFamilyShareRevoked(userId: string, shareId: string): Promise<LedgerWriteResult> {
    return this.write({
      eventType: 'ORIGINS_FAMILY_SHARE_REVOKED',
      userId,
      resourceId: shareId,
      resourceType: 'share',
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Generate provenance certificate for memoir
   */
  async certifyProvenance(
    userId: string, 
    memoirHash: string, 
    eventCount: number, 
    artifactCount: number
  ): Promise<LedgerWriteResult> {
    return this.write({
      eventType: 'ORIGINS_PROVENANCE_CERTIFIED',
      userId,
      resourceId: memoirHash,
      resourceType: 'memoir',
      metadata: {
        memoir_hash: memoirHash,
        event_count: eventCount,
        artifact_count: artifactCount,
        certified_at: new Date().toISOString(),
      },
    });
  }

  /**
   * Simple email hash for privacy
   */
  private hashEmail(email: string): string {
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      const char = email.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `email_${Math.abs(hash).toString(16)}`;
  }
}

// Singleton
let ledgerWriterInstance: LedgerWriter | null = null;

export function getLedgerWriter(): LedgerWriter {
  if (!ledgerWriterInstance) {
    ledgerWriterInstance = new LedgerWriter();
  }
  return ledgerWriterInstance;
}
