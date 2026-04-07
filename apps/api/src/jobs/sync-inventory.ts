/**
 * Background inventory sync job
 *
 * Periodically pulls inventory from connected Square / Shopify stores
 * and updates local product quantities. This catches changes that
 * webhooks might miss (e.g. during downtime).
 *
 * Run interval is controlled by SYNC_INTERVAL_MS (default: 15 minutes).
 */

import { ExternalPlatform } from '@ilovefdl/shared';
import { PrismaClient } from '@prisma/client';
import { getAdapter } from '../integrations';

const SYNC_INTERVAL_MS = parseInt(
  process.env.SYNC_INTERVAL_MS || String(15 * 60 * 1000),
  10,
);

let running = false;

export async function runInventorySync(prisma: PrismaClient): Promise<void> {
  if (running) {
    console.log('[sync] Previous sync still running, skipping...');
    return;
  }

  running = true;
  const startTime = Date.now();

  try {
    // Find all active vendor connections
    const connections = await prisma.vendorConnection.findMany({
      where: {
        isActive: true,
        accessToken: { not: null },
        platform: { in: [ExternalPlatform.SHOPIFY, ExternalPlatform.SQUARE, ExternalPlatform.ETSY] },
      },
      include: {
        vendor: { select: { id: true, businessName: true } },
      },
    });

    if (connections.length === 0) {
      running = false;
      return;
    }

    console.log(`[sync] Starting inventory sync for ${connections.length} connection(s)...`);

    let totalSynced = 0;
    let totalErrors = 0;

    for (const connection of connections) {
      try {
        const adapter = getAdapter(connection.platform);

        // Pull remote inventory
        const remoteInventory = await adapter.fetchInventory(
          connection.accessToken!,
          connection.shopDomain ?? undefined,
        );

        // Get local products linked to this platform
        const localProducts = await prisma.product.findMany({
          where: {
            vendorId: connection.vendorId,
            externalPlatform: connection.platform,
            externalId: { not: null },
          },
        });

        let updated = 0;
        for (const product of localProducts) {
          if (!product.externalId) continue;
          const remoteQty = remoteInventory.get(product.externalId);
          if (remoteQty !== undefined && remoteQty !== product.inventory) {
            await prisma.product.update({
              where: { id: product.id },
              data: { inventory: remoteQty },
            });
            updated++;
          }
        }

        // Update last sync timestamp
        await prisma.vendorConnection.update({
          where: { id: connection.id },
          data: { lastSyncAt: new Date() },
        });

        if (updated > 0) {
          console.log(
            `[sync] ${connection.vendor.businessName} (${connection.platform}): updated ${updated} product(s)`,
          );
        }
        totalSynced += updated;
      } catch (error) {
        totalErrors++;
        console.error(
          `[sync] Error syncing ${connection.vendor.businessName} (${connection.platform}):`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    if (totalSynced > 0 || totalErrors > 0) {
      console.log(
        `[sync] Completed in ${elapsed}s — ${totalSynced} updated, ${totalErrors} error(s)`,
      );
    }
  } catch (error) {
    console.error('[sync] Fatal sync error:', error);
  } finally {
    running = false;
  }
}

/**
 * Start the periodic sync loop. Call once at server startup.
 */
export function startInventorySyncJob(prisma: PrismaClient): void {
  if (SYNC_INTERVAL_MS <= 0) {
    console.log('[sync] Inventory sync disabled (SYNC_INTERVAL_MS <= 0)');
    return;
  }

  console.log(
    `[sync] Inventory sync job started — interval: ${(SYNC_INTERVAL_MS / 60000).toFixed(0)} min`,
  );

  // Run once after a short delay, then periodically
  setTimeout(() => runInventorySync(prisma), 10_000);
  setInterval(() => runInventorySync(prisma), SYNC_INTERVAL_MS);
}
