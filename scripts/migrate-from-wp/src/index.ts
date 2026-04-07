/**
 * WordPress → I Love FDL content migration
 *
 * Pulls blog posts and WooCommerce products from ilovefdl.com via the
 * WP REST API / WC Store API, maps them to Prisma models, and upserts
 * into the database.
 *
 * Usage:
 *   npm run migrate          (from scripts/migrate-from-wp)
 *   npm run migrate:wp       (from repo root)
 *
 * Environment:
 *   DATABASE_URL  — Postgres connection string (required)
 */

import path from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  fetchAllPosts,
  fetchAllCategories,
  fetchAllTags,
  fetchAllMedia,
  fetchAllUsers,
  fetchAllWcProducts,
  type WpTag,
  type WpMedia,
  type WpUser,
  type WcProduct,
} from "./wp-client.js";
import { mapWpPostToBlogPost, mapWcProductToProduct, stripHtmlTags, generateSlug } from "./mappers.js";
import { downloadImage } from "./media.js";

// ─── configuration ───────────────────────────────────────

const MEDIA_OUTPUT_DIR = path.resolve(
  process.cwd(),
  "migrated-media",
);

// ─── stats ───────────────────────────────────────────────

interface MigrationStats {
  authorsCreated: number;
  authorsSkipped: number;
  postsCreated: number;
  postsUpdated: number;
  postErrors: number;
  productsCreated: number;
  productsUpdated: number;
  productErrors: number;
  vendorsCreated: number;
  imagesDownloaded: number;
  imageErrors: number;
}

function printStats(stats: MigrationStats): void {
  console.log("\n========================================");
  console.log("  Migration Summary");
  console.log("========================================");
  console.log(`  Authors created:    ${stats.authorsCreated}`);
  console.log(`  Authors skipped:    ${stats.authorsSkipped}`);
  console.log(`  Posts created:      ${stats.postsCreated}`);
  console.log(`  Posts updated:      ${stats.postsUpdated}`);
  console.log(`  Post errors:        ${stats.postErrors}`);
  console.log(`  Vendors created:    ${stats.vendorsCreated}`);
  console.log(`  Products created:   ${stats.productsCreated}`);
  console.log(`  Products updated:   ${stats.productsUpdated}`);
  console.log(`  Product errors:     ${stats.productErrors}`);
  console.log(`  Images downloaded:  ${stats.imagesDownloaded}`);
  console.log(`  Image errors:       ${stats.imageErrors}`);
  console.log("========================================\n");
}

// ─── main ────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("Starting WordPress → I Love FDL migration...\n");

  if (!process.env.DATABASE_URL) {
    console.error("ERROR: DATABASE_URL environment variable is not set.");
    console.error("Create a .env file (see .env.example) and try again.");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const stats: MigrationStats = {
    authorsCreated: 0,
    authorsSkipped: 0,
    postsCreated: 0,
    postsUpdated: 0,
    postErrors: 0,
    productsCreated: 0,
    productsUpdated: 0,
    productErrors: 0,
    vendorsCreated: 0,
    imagesDownloaded: 0,
    imageErrors: 0,
  };

  try {
    // ── Step 1: Fetch all WP data ──────────────────────────

    console.log("[1/6] Fetching WordPress categories...");
    const wpCategories = await fetchAllCategories();
    console.log(`  Found ${wpCategories.length} categories.\n`);

    console.log("[2/6] Fetching WordPress tags...");
    const wpTags = await fetchAllTags();
    console.log(`  Found ${wpTags.length} tags.\n`);

    console.log("[3/6] Fetching WordPress users...");
    const wpUsers = await fetchAllUsers();
    console.log(`  Found ${wpUsers.length} users.\n`);

    console.log("[4/6] Fetching WordPress media...");
    const wpMedia = await fetchAllMedia();
    console.log(`  Found ${wpMedia.length} media items.\n`);

    console.log("[5/6] Fetching WordPress posts...");
    const wpPosts = await fetchAllPosts();
    console.log(`  Found ${wpPosts.length} posts.\n`);

    console.log("[6/6] Fetching WooCommerce products...");
    const wcProducts = await fetchAllWcProducts();
    console.log(`  Found ${wcProducts.length} products.\n`);

    // ── Step 2: Build lookup maps ──────────────────────────

    // Tag map: WP tag ID → tag name
    const tagMap: Record<number, string> = {};
    for (const tag of wpTags) {
      tagMap[tag.id] = tag.name;
    }

    // Media map: WP media ID → WpMedia object (for source_url)
    const mediaLookup: Record<number, WpMedia> = {};
    for (const m of wpMedia) {
      mediaLookup[m.id] = m;
    }

    // ── Step 3: Create / resolve author accounts ───────────

    console.log("Creating author accounts...");
    const authorMap: Record<number, string> = {};

    for (const wpUser of wpUsers) {
      // Use a deterministic email so re-runs match the same user
      const email = `wp-${wpUser.id}@ilovefdl.com`;
      const name = wpUser.name || `WP Author ${wpUser.id}`;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        authorMap[wpUser.id] = existing.id;
        stats.authorsSkipped++;
        console.log(`  Skipped existing author: ${name} (${email})`);
      } else {
        const user = await prisma.user.create({
          data: {
            email,
            name,
            role: "EDITOR",
            avatarUrl: wpUser.avatar_urls?.["96"] ?? null,
          },
        });
        authorMap[wpUser.id] = user.id;
        stats.authorsCreated++;
        console.log(`  Created author: ${name} (${email}) → ${user.id}`);
      }
    }
    console.log("");

    // ── Step 4: Download & optimise featured images ────────

    console.log("Downloading featured images...");
    const mediaMap: Record<number, string> = {};

    // Collect unique featured media IDs from posts
    const featuredMediaIds = new Set(
      wpPosts
        .map((p) => p.featured_media)
        .filter((id) => id && id > 0),
    );

    for (const mediaId of featuredMediaIds) {
      const media = mediaLookup[mediaId];
      if (!media?.source_url) {
        console.log(`  No source URL for media ${mediaId}, skipping.`);
        stats.imageErrors++;
        continue;
      }

      console.log(`  Processing media ${mediaId}: ${media.source_url}`);
      const localPath = await downloadImage(media.source_url, MEDIA_OUTPUT_DIR);
      if (localPath) {
        // Store a relative path suitable for serving
        mediaMap[mediaId] = path.relative(process.cwd(), localPath);
        stats.imagesDownloaded++;
      } else {
        stats.imageErrors++;
      }
    }
    console.log("");

    // ── Step 5: Upsert blog posts ──────────────────────────

    console.log("Migrating blog posts...");

    for (const wpPost of wpPosts) {
      try {
        const data = mapWpPostToBlogPost(wpPost, authorMap, tagMap, mediaMap);
        const title = stripHtmlTags(wpPost.title.rendered);

        const existing = await prisma.blogPost.findUnique({
          where: { wpOriginalId: wpPost.id },
        });

        if (existing) {
          await prisma.blogPost.update({
            where: { wpOriginalId: wpPost.id },
            data,
          });
          stats.postsUpdated++;
          console.log(`  Updated: [${wpPost.id}] ${title}`);
        } else {
          // Ensure slug uniqueness — append wp id if collision
          const slugTaken = await prisma.blogPost.findUnique({
            where: { slug: data.slug },
          });
          if (slugTaken) {
            data.slug = `${data.slug}-wp${wpPost.id}`;
          }

          await prisma.blogPost.create({ data });
          stats.postsCreated++;
          console.log(`  Created: [${wpPost.id}] ${title}`);
        }
      } catch (error) {
        stats.postErrors++;
        console.error(
          `  ERROR migrating post ${wpPost.id}: ${(error as Error).message}`,
        );
      }
    }

    // ── Step 6: Migrate WooCommerce products ────────────────

    if (wcProducts.length > 0) {
      console.log("\nMigrating WooCommerce products...");

      // Create a shared vendor account for WP-imported products
      // (we use a deterministic email so re-runs find the same vendor)
      const wpVendorEmail = "wp-store@ilovefdl.com";
      let wpVendor = await prisma.vendor.findFirst({
        where: { user: { email: wpVendorEmail } },
      });

      if (!wpVendor) {
        // Create user + vendor for WP store products
        let wpStoreUser = await prisma.user.findUnique({
          where: { email: wpVendorEmail },
        });
        if (!wpStoreUser) {
          wpStoreUser = await prisma.user.create({
            data: {
              email: wpVendorEmail,
              name: "I Love FDL Store",
              role: "VENDOR",
            },
          });
        }

        wpVendor = await prisma.vendor.create({
          data: {
            userId: wpStoreUser.id,
            businessName: "I Love FDL Marketplace",
            slug: "ilovefdl-marketplace",
            description:
              "Official I Love Fond du Lac marketplace — featuring products from local FDL vendors and artisans.",
            status: "APPROVED",
            seoTitle: "I Love FDL Marketplace",
            seoDescription:
              "Shop local products from Fond du Lac businesses and artisans.",
          },
        });
        stats.vendorsCreated++;
        console.log(
          `  Created vendor: ${wpVendor.businessName} (${wpVendor.id})`,
        );
      } else {
        console.log(
          `  Using existing vendor: ${wpVendor.businessName} (${wpVendor.id})`,
        );
      }

      // Download product images
      console.log("\n  Downloading product images...");
      const productImageMap: Record<string, string> = {};

      for (const product of wcProducts) {
        for (const img of product.images) {
          if (img.src && !productImageMap[img.src]) {
            const localPath = await downloadImage(img.src, MEDIA_OUTPUT_DIR);
            if (localPath) {
              productImageMap[img.src] = path.relative(process.cwd(), localPath);
              stats.imagesDownloaded++;
            } else {
              stats.imageErrors++;
            }
          }
        }
      }

      // Upsert products
      console.log("\n  Importing products...");
      for (const wcProduct of wcProducts) {
        try {
          // Skip placeholder/test products
          if (
            wcProduct.name.toLowerCase().includes("my product") ||
            wcProduct.name.toLowerCase() === "test"
          ) {
            console.log(`  Skipped test product: ${wcProduct.name}`);
            continue;
          }

          const data = mapWcProductToProduct(
            wcProduct,
            wpVendor.id,
            productImageMap,
          );

          // Check if product already exists by externalId
          const existing = await prisma.product.findFirst({
            where: { externalId: `wc-${wcProduct.id}` },
          });

          if (existing) {
            await prisma.product.update({
              where: { id: existing.id },
              data,
            });
            stats.productsUpdated++;
            console.log(`  Updated: [${wcProduct.id}] ${wcProduct.name}`);
          } else {
            // Ensure slug uniqueness
            const slugTaken = await prisma.product.findUnique({
              where: { slug: data.slug },
            });
            if (slugTaken) {
              data.slug = `${data.slug}-wc${wcProduct.id}`;
            }

            await prisma.product.create({ data });
            stats.productsCreated++;
            console.log(`  Created: [${wcProduct.id}] ${wcProduct.name}`);
          }
        } catch (error) {
          stats.productErrors++;
          console.error(
            `  ERROR migrating product ${wcProduct.id}: ${(error as Error).message}`,
          );
        }
      }
    }

    // ── Done ───────────────────────────────────────────────

    printStats(stats);

    const totalErrors = stats.postErrors + stats.productErrors;
    if (totalErrors > 0) {
      console.log(
        "Some items failed to migrate. Review the errors above and re-run — the script is idempotent.\n",
      );
    } else {
      console.log("All content migrated successfully.\n");
    }
  } finally {
    await prisma.$disconnect();
  }
}

// ─── entry point ─────────────────────────────────────────

main().catch((error) => {
  console.error("Fatal migration error:", error);
  process.exit(1);
});
