/**
 * Extract the first image from each blog post's HTML content
 * and set it as the featuredImage.
 *
 * Usage:
 *   npx tsx --env-file=.env src/fix-images.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Extract the first <img src="..."> from HTML */
function extractFirstImage(html: string): string | null {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] || null;
}

async function main() {
  console.log("Extracting featured images from blog post content...\n");

  const posts = await prisma.blogPost.findMany({
    select: { id: true, title: true, content: true, featuredImage: true },
  });

  console.log(`Found ${posts.length} posts\n`);

  let updated = 0;
  let skipped = 0;
  let noImage = 0;

  for (const post of posts) {
    const imgUrl = extractFirstImage(post.content);

    if (!imgUrl) {
      console.log(`  [no image] ${post.title}`);
      noImage++;
      continue;
    }

    if (post.featuredImage === imgUrl) {
      skipped++;
      continue;
    }

    await prisma.blogPost.update({
      where: { id: post.id },
      data: { featuredImage: imgUrl },
    });

    console.log(`  [updated] ${post.title}`);
    console.log(`            → ${imgUrl}`);
    updated++;
  }

  console.log(`\nDone!`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped (already set): ${skipped}`);
  console.log(`  No image found: ${noImage}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Error:", err);
  prisma.$disconnect();
  process.exit(1);
});
