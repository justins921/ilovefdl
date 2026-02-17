/**
 * WordPress → I Love FDL content migration
 *
 * Pulls all published blog content from ilovefdl.com via the WP REST API,
 * maps it to the platform's Prisma models, and upserts into the database.
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
  type WpTag,
  type WpMedia,
  type WpUser,
} from "./wp-client.js";
import { mapWpPostToBlogPost, stripHtmlTags } from "./mappers.js";
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
    imagesDownloaded: 0,
    imageErrors: 0,
  };

  try {
    // ── Step 1: Fetch all WP data ──────────────────────────

    console.log("[1/5] Fetching WordPress categories...");
    const wpCategories = await fetchAllCategories();
    console.log(`  Found ${wpCategories.length} categories.\n`);

    console.log("[2/5] Fetching WordPress tags...");
    const wpTags = await fetchAllTags();
    console.log(`  Found ${wpTags.length} tags.\n`);

    console.log("[3/5] Fetching WordPress users...");
    const wpUsers = await fetchAllUsers();
    console.log(`  Found ${wpUsers.length} users.\n`);

    console.log("[4/5] Fetching WordPress media...");
    const wpMedia = await fetchAllMedia();
    console.log(`  Found ${wpMedia.length} media items.\n`);

    console.log("[5/5] Fetching WordPress posts...");
    const wpPosts = await fetchAllPosts();
    console.log(`  Found ${wpPosts.length} posts.\n`);

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

    // ── Done ───────────────────────────────────────────────

    printStats(stats);

    if (stats.postErrors > 0) {
      console.log(
        "Some posts failed to migrate. Review the errors above and re-run — the script is idempotent.\n",
      );
    } else {
      console.log("All posts migrated successfully.\n");
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
