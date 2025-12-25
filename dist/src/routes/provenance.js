"use strict";
/**
 * PROVENIQ Origins - Provenance Routes
 *
 * Endpoints for querying asset provenance across the PROVENIQ ecosystem.
 * Aggregates data from Ledger and Core to build complete asset timelines.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.provenanceRoutes = void 0;
const express_1 = require("express");
const ledger_client_1 = require("../services/ledger-client");
const core_client_1 = require("../services/core-client");
const router = (0, express_1.Router)();
/**
 * GET /api/provenance/assets/:paid
 * Get complete provenance timeline for a PROVENIQ Asset ID
 */
router.get('/assets/:paid', async (req, res) => {
    const { paid } = req.params;
    try {
        const coreClient = (0, core_client_1.getCoreClient)();
        const ledgerClient = (0, ledger_client_1.getLedgerClient)();
        // Get asset details from Core
        const asset = await coreClient.getAsset(paid);
        // Get provenance timeline from Ledger
        const timeline = await ledgerClient.buildProvenanceTimeline(paid);
        // If asset has an anchor, also get anchor events
        let anchorEvents = [];
        if (asset?.anchorId) {
            anchorEvents = await ledgerClient.getAnchorEvents(asset.anchorId);
        }
        return res.json({
            asset: asset ? {
                paid: asset.paid,
                name: asset.name,
                category: asset.category,
                assetType: asset.assetType,
                sourceApp: asset.sourceApp,
                ownerId: asset.ownerId,
                currentValueMicros: asset.currentValueMicros,
                anchorId: asset.anchorId,
                createdAt: asset.createdAt,
            } : null,
            provenance: {
                totalEvents: timeline.totalEvents,
                firstSeen: timeline.firstSeen,
                lastSeen: timeline.lastSeen,
                sources: timeline.sources,
                chainIntegrity: timeline.chainIntegrity,
                events: timeline.events.map(e => ({
                    eventId: e.eventId,
                    source: e.source,
                    eventType: e.eventType,
                    actorId: e.actorId,
                    timestamp: e.createdAt,
                    summary: summarizeEvent(e.source, e.eventType, e.payload),
                })),
            },
            anchor: asset?.anchorId ? {
                anchorId: asset.anchorId,
                eventCount: anchorEvents.length,
                events: anchorEvents.slice(0, 20).map(e => ({
                    eventId: e.eventId,
                    eventType: e.eventType,
                    timestamp: e.createdAt,
                })),
            } : null,
        });
    }
    catch (error) {
        console.error('[PROVENANCE] Asset timeline error:', error);
        return res.status(500).json({ error: 'Failed to build provenance timeline' });
    }
});
/**
 * GET /api/provenance/owner/:ownerId
 * Get all assets owned by a user with their provenance summaries
 */
router.get('/owner/:ownerId', async (req, res) => {
    const { ownerId } = req.params;
    try {
        const coreClient = (0, core_client_1.getCoreClient)();
        const ledgerClient = (0, ledger_client_1.getLedgerClient)();
        // Get all assets for this owner
        const assets = await coreClient.getAssetsByOwner(ownerId);
        // Build provenance summary for each asset
        const assetsWithProvenance = await Promise.all(assets.map(async (asset) => {
            const timeline = await ledgerClient.buildProvenanceTimeline(asset.paid);
            return {
                paid: asset.paid,
                name: asset.name,
                category: asset.category,
                sourceApp: asset.sourceApp,
                anchorId: asset.anchorId,
                currentValueMicros: asset.currentValueMicros,
                provenance: {
                    totalEvents: timeline.totalEvents,
                    firstSeen: timeline.firstSeen,
                    lastSeen: timeline.lastSeen,
                    sources: timeline.sources,
                    chainIntegrity: timeline.chainIntegrity,
                },
            };
        }));
        return res.json({
            ownerId,
            totalAssets: assets.length,
            assets: assetsWithProvenance,
        });
    }
    catch (error) {
        console.error('[PROVENANCE] Owner assets error:', error);
        return res.status(500).json({ error: 'Failed to get owner assets' });
    }
});
/**
 * GET /api/provenance/source/:sourceApp
 * Get events from a specific source app
 */
router.get('/source/:sourceApp', async (req, res) => {
    const { sourceApp } = req.params;
    const { limit = '50', startDate, endDate } = req.query;
    try {
        const ledgerClient = (0, ledger_client_1.getLedgerClient)();
        const events = await ledgerClient.queryEvents({
            source: sourceApp,
            limit: parseInt(limit, 10),
            startDate: startDate,
            endDate: endDate,
        });
        return res.json({
            source: sourceApp,
            totalEvents: events.length,
            events: events.map(e => ({
                eventId: e.eventId,
                eventType: e.eventType,
                assetId: e.assetId,
                anchorId: e.anchorId,
                actorId: e.actorId,
                timestamp: e.createdAt,
                summary: summarizeEvent(e.source, e.eventType, e.payload),
            })),
        });
    }
    catch (error) {
        console.error('[PROVENANCE] Source events error:', error);
        return res.status(500).json({ error: 'Failed to get source events' });
    }
});
/**
 * GET /api/provenance/anchor/:anchorId
 * Get provenance timeline for an Anchor device
 */
router.get('/anchor/:anchorId', async (req, res) => {
    const { anchorId } = req.params;
    try {
        const ledgerClient = (0, ledger_client_1.getLedgerClient)();
        const events = await ledgerClient.getAnchorEvents(anchorId);
        // Sort by timestamp
        events.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        // Extract unique assets this anchor has tracked
        const trackedAssets = [...new Set(events.filter(e => e.assetId).map(e => e.assetId))];
        return res.json({
            anchorId,
            totalEvents: events.length,
            firstSeen: events[0]?.createdAt,
            lastSeen: events[events.length - 1]?.createdAt,
            trackedAssets,
            events: events.map(e => ({
                eventId: e.eventId,
                eventType: e.eventType,
                assetId: e.assetId,
                timestamp: e.createdAt,
                payload: e.payload,
            })),
        });
    }
    catch (error) {
        console.error('[PROVENANCE] Anchor events error:', error);
        return res.status(500).json({ error: 'Failed to get anchor events' });
    }
});
/**
 * GET /api/provenance/integrity
 * Check Ledger integrity status
 */
router.get('/integrity', async (_req, res) => {
    try {
        const ledgerClient = (0, ledger_client_1.getLedgerClient)();
        const integrity = await ledgerClient.verifyIntegrity();
        return res.json({
            ledgerIntegrity: integrity,
        });
    }
    catch (error) {
        console.error('[PROVENANCE] Integrity check error:', error);
        return res.status(500).json({ error: 'Failed to check integrity' });
    }
});
/**
 * GET /api/provenance/search
 * Search events with multiple filters
 */
router.get('/search', async (req, res) => {
    const { source, eventType, assetId, anchorId, actorId, startDate, endDate, limit = '50' } = req.query;
    try {
        const ledgerClient = (0, ledger_client_1.getLedgerClient)();
        const events = await ledgerClient.queryEvents({
            source: source,
            eventType: eventType,
            assetId: assetId,
            anchorId: anchorId,
            actorId: actorId,
            startDate: startDate,
            endDate: endDate,
            limit: parseInt(limit, 10),
        });
        return res.json({
            filters: { source, eventType, assetId, anchorId, actorId, startDate, endDate },
            totalResults: events.length,
            events: events.map(e => ({
                eventId: e.eventId,
                source: e.source,
                eventType: e.eventType,
                assetId: e.assetId,
                anchorId: e.anchorId,
                actorId: e.actorId,
                timestamp: e.createdAt,
                summary: summarizeEvent(e.source, e.eventType, e.payload),
            })),
        });
    }
    catch (error) {
        console.error('[PROVENANCE] Search error:', error);
        return res.status(500).json({ error: 'Failed to search events' });
    }
});
/**
 * Helper to generate human-readable event summaries
 */
function summarizeEvent(source, eventType, payload) {
    const typeMap = {
        // Home events
        'HOME_ITEM_ADDED': 'Item added to inventory',
        'HOME_ITEM_UPDATED': 'Item details updated',
        'HOME_VALUATION_CREATED': 'Valuation generated',
        'HOME_CLAIM_INITIATED': 'Insurance claim started',
        // Bids events
        'BIDS_AUCTION_LISTED': 'Listed for auction',
        'BIDS_BID_PLACED': `Bid placed: ${payload.amount || 'unknown'}`,
        'BIDS_AUCTION_SETTLED': `Auction ${payload.outcome || 'completed'}`,
        // ClaimsIQ events
        'CLAIMSIQ_CLAIM_CREATED': 'Claim submitted',
        'CLAIMSIQ_CLAIM_SETTLED': `Claim ${payload.decision || 'processed'}`,
        // Transit events
        'TRANSIT_SHIPMENT_CREATED': 'Shipment created',
        'TRANSIT_CUSTODY_TRANSFERRED': 'Custody transferred',
        'TRANSIT_DELIVERED': 'Delivered',
        // Protect events
        'PROTECT_POLICY_CREATED': 'Insurance policy created',
        'PROTECT_CLAIM_FILED': 'Insurance claim filed',
        // Anchor events
        'ANCHOR_REGISTERED': 'Anchor device registered',
        'ANCHOR_HEARTBEAT': 'Anchor check-in',
        'ANCHOR_TAMPER_DETECTED': '⚠️ Tamper detected',
        'ANCHOR_GEOFENCE_EXIT': '⚠️ Left geofence',
        // Capital events
        'CAPITAL_CLAIM_PAYOUT': `Payout: ${payload.amount_micros ? `$${(parseInt(payload.amount_micros) / 1000000).toFixed(2)}` : 'processed'}`,
        'CAPITAL_LOAN_ORIGINATED': 'Loan originated',
        'CAPITAL_COLLATERAL_LOCKED': 'Collateral locked',
        // Service events
        'SERVICE_WORK_ORDER_CREATED': 'Service requested',
        'SERVICE_WORK_COMPLETED': 'Service completed',
    };
    return typeMap[eventType] || `${source}: ${eventType}`;
}
exports.provenanceRoutes = router;
//# sourceMappingURL=provenance.js.map