/**
 * PROVENIQ Core Client for Origins
 *
 * Queries Core for asset registry data (PAID lookup, ownership, valuations).
 */
export interface RegisteredAsset {
    paid: string;
    sourceApp: string;
    sourceAssetId: string;
    assetType: string;
    category: string;
    name: string;
    description?: string;
    ownerId?: string;
    currentValueMicros?: string;
    anchorId?: string;
    createdAt: string;
    updatedAt: string;
}
export interface AssetValuation {
    valuationId: string;
    assetId: string;
    estimatedValueMicros: string;
    confidenceScore: number;
    confidenceLevel: 'high' | 'medium' | 'low';
    method: string;
    createdAt: string;
}
declare class CoreClient {
    /**
     * Get asset by PROVENIQ Asset ID (PAID)
     */
    getAsset(paid: string): Promise<RegisteredAsset | null>;
    /**
     * Search assets by owner
     */
    getAssetsByOwner(ownerId: string): Promise<RegisteredAsset[]>;
    /**
     * Search assets by source app
     */
    getAssetsBySource(sourceApp: string, sourceId?: string): Promise<RegisteredAsset[]>;
}
export declare function getCoreClient(): CoreClient;
export {};
//# sourceMappingURL=core-client.d.ts.map