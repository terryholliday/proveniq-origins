"use strict";
/**
 * PROVENIQ Core Client for Origins
 *
 * Queries Core for asset registry data (PAID lookup, ownership, valuations).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCoreClient = getCoreClient;
const CORE_SERVICE_URL = process.env.CORE_SERVICE_URL || 'http://localhost:8000';
class CoreClient {
    /**
     * Get asset by PROVENIQ Asset ID (PAID)
     */
    async getAsset(paid) {
        try {
            const response = await fetch(`${CORE_SERVICE_URL}/v1/assets/${paid}`);
            if (!response.ok) {
                if (response.status === 404)
                    return null;
                console.warn(`[CORE] Asset lookup failed: ${response.status}`);
                return null;
            }
            const data = await response.json();
            return {
                paid: data.paid,
                sourceApp: data.source_app,
                sourceAssetId: data.source_asset_id,
                assetType: data.asset_type,
                category: data.category,
                name: data.name,
                description: data.description,
                ownerId: data.owner_id,
                currentValueMicros: data.current_value_micros,
                anchorId: data.anchor_id,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
            };
        }
        catch (error) {
            console.error('[CORE] Asset lookup error:', error);
            return null;
        }
    }
    /**
     * Search assets by owner
     */
    async getAssetsByOwner(ownerId) {
        try {
            const response = await fetch(`${CORE_SERVICE_URL}/v1/assets?owner_id=${ownerId}`);
            if (!response.ok) {
                console.warn(`[CORE] Assets by owner failed: ${response.status}`);
                return [];
            }
            const data = await response.json();
            return (data.assets || data || []).map((a) => ({
                paid: a.paid,
                sourceApp: a.source_app,
                sourceAssetId: a.source_asset_id,
                assetType: a.asset_type,
                category: a.category,
                name: a.name,
                description: a.description,
                ownerId: a.owner_id,
                currentValueMicros: a.current_value_micros,
                anchorId: a.anchor_id,
                createdAt: a.created_at,
                updatedAt: a.updated_at,
            }));
        }
        catch (error) {
            console.error('[CORE] Assets by owner error:', error);
            return [];
        }
    }
    /**
     * Search assets by source app
     */
    async getAssetsBySource(sourceApp, sourceId) {
        try {
            let url = `${CORE_SERVICE_URL}/v1/assets?source_app=${sourceApp}`;
            if (sourceId)
                url += `&source_id=${sourceId}`;
            const response = await fetch(url);
            if (!response.ok) {
                console.warn(`[CORE] Assets by source failed: ${response.status}`);
                return [];
            }
            const data = await response.json();
            return (data.assets || data || []).map((a) => ({
                paid: a.paid,
                sourceApp: a.source_app,
                sourceAssetId: a.source_asset_id,
                assetType: a.asset_type,
                category: a.category,
                name: a.name,
                description: a.description,
                ownerId: a.owner_id,
                currentValueMicros: a.current_value_micros,
                anchorId: a.anchor_id,
                createdAt: a.created_at,
                updatedAt: a.updated_at,
            }));
        }
        catch (error) {
            console.error('[CORE] Assets by source error:', error);
            return [];
        }
    }
}
// Singleton
let coreClientInstance = null;
function getCoreClient() {
    if (!coreClientInstance) {
        coreClientInstance = new CoreClient();
    }
    return coreClientInstance;
}
//# sourceMappingURL=core-client.js.map