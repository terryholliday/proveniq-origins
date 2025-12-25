/**
 * PROVENIQ Ledger Client for Origins
 *
 * Queries the ecosystem-wide Ledger for asset provenance data.
 * Origins aggregates events from all PROVENIQ apps to build complete timelines.
 */
export interface LedgerEvent {
    eventId: string;
    source: string;
    eventType: string;
    assetId?: string;
    anchorId?: string;
    actorId?: string;
    correlationId?: string;
    payload: Record<string, unknown>;
    payloadHash: string;
    entryHash: string;
    previousHash?: string;
    sequenceNumber: number;
    createdAt: string;
}
export interface ProvenanceTimeline {
    assetId: string;
    paid?: string;
    totalEvents: number;
    firstSeen: string;
    lastSeen: string;
    sources: string[];
    chainIntegrity: 'verified' | 'unverified' | 'broken';
    events: LedgerEvent[];
}
declare class LedgerClient {
    /**
     * Get all events for a PROVENIQ Asset ID
     */
    getAssetEvents(assetId: string): Promise<LedgerEvent[]>;
    /**
     * Get all events for an Anchor ID
     */
    getAnchorEvents(anchorId: string): Promise<LedgerEvent[]>;
    /**
     * Query events with filters
     */
    queryEvents(filters: {
        source?: string;
        eventType?: string;
        assetId?: string;
        anchorId?: string;
        actorId?: string;
        startDate?: string;
        endDate?: string;
        limit?: number;
    }): Promise<LedgerEvent[]>;
    /**
     * Build complete provenance timeline for an asset
     */
    buildProvenanceTimeline(assetId: string): Promise<ProvenanceTimeline>;
    /**
     * Verify ledger integrity
     */
    verifyIntegrity(): Promise<{
        valid: boolean;
        totalEntries: number;
        lastVerified: string;
    }>;
    private mapEvent;
}
export declare function getLedgerClient(): LedgerClient;
export {};
//# sourceMappingURL=ledger-client.d.ts.map