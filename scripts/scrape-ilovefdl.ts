/**
 * Scrape ilovefdl.com — pulls blog posts (WP REST API) and
 * products (WC Store API) into the I Love FDL database.
 *
 * Usage (from repo root):
 *   npx tsx scripts/scrape-ilovefdl.ts
 *
 * Reads DATABASE_URL from apps/api/.env automatically.
 */

import fs from "node:fs";
import path from "node:path";
import { PrismaClient, type PostCategory, type PostStatus } from "@prisma/client";

// ─── Load env from apps/api/.env ────────────────────────

const envPath = path.resolve(import.meta.dirname ?? __dirname, "../apps/api/.env");
const envContent = fs.readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^(\w+)=["']?(.+?)["']?$/);
  if (match) process.env[match[1]] = match[2];
}

const prisma = new PrismaClient();

// ─── Config ─────────────────────────────────────────────

const WP_API = "https://ilovefdl.com/wp-json/wp/v2";
const WC_STORE_API = "https://ilovefdl.com/wp-json/wc/store/products";
const PER_PAGE = 100;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

// ─── Helpers ────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchRetry(url: string): Promise<Response> {
  for (let i = 1; i <= MAX_RETRIES; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      if (res.status === 429) {
        const wait = parseInt(res.headers.get("Retry-After") || "0", 10) * 1000 || RETRY_DELAY * i;
        console.log(`  Rate limited, waiting ${wait}ms...`);
        await sleep(wait);
        continue;
      }
      if (res.status >= 500) {
        console.log(`  Server error ${res.status}, retry ${i}/${MAX_RETRIES}...`);
        await sleep(RETRY_DELAY * i);
        continue;
      }
      throw new Error(`HTTP ${res.status}: ${url}`);
    } catch (err) {
      if (i < MAX_RETRIES && err instanceof TypeError) {
        console.log(`  Network error, retry ${i}/${MAX_RETRIES}...`);
        await sleep(RETRY_DELAY * i);
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Failed after ${MAX_RETRIES} retries: ${url}`);
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;/g, "\u2019")
    .replace(/&#8216;/g, "\u2018")
    .replace(/&#8220;/g, "\u201C")
    .replace(/&#8221;/g, "\u201D")
    .replace(/&#8211;/g, "\u2013")
    .replace(/&#8212;/g, "\u2014")
    .replace(/&#8230;/g, "\u2026")
    .replace(/\s+/g, " ")
    .trim();
}

function makeSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── WP category mapping ────────────────────────────────

const WP_CATEGORY_MAP: Record<number, PostCategory> = {
  441: "THE_FONDY_FRONTLINE",
  442: "FACES_OF_OUR_FUTURE",
  443: "FINDING_BALANCE",
  444: "PLAY_EXPLORE_REPEAT",
  445: "HOMEGROWN_HEROS",
  446: "THE_CREATIVE_CORNER",
  447: "WEEKLY_SAVINGS",
  1: "UNCATEGORIZED",
};

// ─── Fetch paginated WP data ────────────────────────────

async function fetchWpPages<T>(endpoint: string, params: Record<string, string> = {}): Promise<T[]> {
  const results: T[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const qs = new URLSearchParams({ per_page: String(PER_PAGE), ...params, page: String(page) });
    const url = `${WP_API}/${endpoint}?${qs}`;
    console.log(`  Fetching ${endpoint} page ${page}/${totalPages}...`);
    const res = await fetchRetry(url);

    if (page === 1) {
      const tp = res.headers.get("X-WP-TotalPages");
      if (tp) totalPages = parseInt(tp, 10);
    }

    const data = (await res.json()) as T[];
    results.push(...data);
    page++;
  }
  return results;
}

// ─── Blog post scraping ─────────────────────────────────

interface WpPost {
  id: number;
  date_gmt: string;
  slug: string;
  status: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  author: number;
  featured_media: number;
  categories: number[];
  tags: number[];
}

interface WpCategory {
  id: number;
  name: string;
}

interface WpTag {
  id: number;
  name: string;
}

interface WpMedia {
  id: number;
  source_url: string;
}

interface WpUser {
  id: number;
  name: string;
  avatar_urls: Record<string, string>;
}

async function scrapeBlogPosts(): Promise<void> {
  console.log("\n=== Scraping Blog Posts ===\n");

  // Fetch all WP data in parallel
  console.log("Fetching WordPress data...");
  const [wpPosts, wpCategories, wpTags, wpMedia, wpUsers] = await Promise.all([
    fetchWpPages<WpPost>("posts", { status: "publish" }),
    fetchWpPages<WpCategory>("categories"),
    fetchWpPages<WpTag>("tags"),
    fetchWpPages<WpMedia>("media"),
    fetchWpPages<WpUser>("users"),
  ]);

  console.log(`\nFound: ${wpPosts.length} posts, ${wpCategories.length} categories, ${wpTags.length} tags, ${wpMedia.length} media, ${wpUsers.length} users\n`);

  // Build lookup maps
  const tagMap: Record<number, string> = {};
  for (const t of wpTags) tagMap[t.id] = t.name;

  const mediaMap: Record<number, string> = {};
  for (const m of wpMedia) mediaMap[m.id] = m.source_url;

  // Create/resolve authors
  const authorMap: Record<number, string> = {};
  for (const u of wpUsers) {
    const email = `wp-${u.id}@ilovefdl.com`;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      authorMap[u.id] = existing.id;
    } else {
      const user = await prisma.user.create({
        data: {
          email,
          name: u.name || `WP Author ${u.id}`,
          role: "EDITOR",
          avatarUrl: u.avatar_urls?.["96"] ?? null,
        },
      });
      authorMap[u.id] = user.id;
      console.log(`  Created author: ${u.name} (${email})`);
    }
  }

  // Import posts
  let created = 0, updated = 0, errors = 0;

  for (const post of wpPosts) {
    try {
      const title = stripHtml(post.title.rendered);
      const slug = post.slug || makeSlug(title);
      const excerpt = stripHtml(post.excerpt.rendered) || null;

      // Map category
      let category: PostCategory = "UNCATEGORIZED";
      for (const catId of post.categories) {
        const mapped = WP_CATEGORY_MAP[catId];
        if (mapped && mapped !== "UNCATEGORIZED") { category = mapped; break; }
      }

      // Map status
      const statusMap: Record<string, PostStatus> = {
        publish: "PUBLISHED",
        draft: "DRAFT",
        future: "SCHEDULED",
      };
      const status = statusMap[post.status] ?? "DRAFT";

      // Resolve author
      let authorId = authorMap[post.author];
      if (!authorId) authorId = Object.values(authorMap)[0];
      if (!authorId) throw new Error("No authors available");

      // Tags
      const tags = post.tags.map((id) => tagMap[id]).filter(Boolean);

      // Featured image — use the WP URL directly
      const featuredImage = post.featured_media ? (mediaMap[post.featured_media] ?? null) : null;

      const data = {
        authorId,
        title,
        slug,
        content: post.content.rendered,
        excerpt,
        featuredImage,
        category,
        tags,
        status,
        publishedAt: post.status === "publish" ? new Date(post.date_gmt + "Z") : null,
        seoTitle: title,
        seoDescription: excerpt?.slice(0, 160) ?? null,
        wpOriginalId: post.id,
      };

      const existing = await prisma.blogPost.findUnique({ where: { wpOriginalId: post.id } });
      if (existing) {
        await prisma.blogPost.update({ where: { wpOriginalId: post.id }, data });
        updated++;
        console.log(`  Updated: ${title}`);
      } else {
        // Check slug collision
        const slugTaken = await prisma.blogPost.findUnique({ where: { slug: data.slug } });
        if (slugTaken) data.slug = `${data.slug}-wp${post.id}`;

        await prisma.blogPost.create({ data });
        created++;
        console.log(`  Created: ${title}`);
      }
    } catch (err) {
      errors++;
      console.error(`  ERROR on post ${post.id}: ${(err as Error).message}`);
    }
  }

  console.log(`\nBlog posts: ${created} created, ${updated} updated, ${errors} errors`);
}

// ─── Product scraping ───────────────────────────────────

interface WcStoreProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  description: string;
  short_description: string;
  prices: {
    price: string;
    regular_price: string;
    sale_price: string;
    currency_code: string;
    currency_minor_unit: number;
  };
  images: Array<{
    id: number;
    src: string;
    thumbnail: string;
    name: string;
    alt: string;
  }>;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  on_sale: boolean;
  is_purchasable: boolean;
}

async function scrapeProducts(): Promise<void> {
  console.log("\n=== Scraping Products ===\n");

  // Fetch products from WC Store API (public, no auth needed)
  let allProducts: WcStoreProduct[] = [];
  let page = 1;

  while (true) {
    const url = `${WC_STORE_API}?per_page=${PER_PAGE}&page=${page}`;
    console.log(`  Fetching products page ${page}...`);
    const res = await fetchRetry(url);
    const products = (await res.json()) as WcStoreProduct[];
    if (products.length === 0) break;
    allProducts.push(...products);
    if (products.length < PER_PAGE) break;
    page++;
  }

  console.log(`  Found ${allProducts.length} products\n`);

  // Filter out test products
  allProducts = allProducts.filter((p) => p.name !== "My Product 1" && p.images.length > 0);
  console.log(`  ${allProducts.length} products after filtering test/empty items\n`);

  // Ensure we have a vendor for imported products
  // Look for existing "I Love FDL Marketplace" vendor, or create one
  const vendorEmail = "marketplace@ilovefdl.com";
  let vendorUser = await prisma.user.findUnique({ where: { email: vendorEmail } });
  if (!vendorUser) {
    vendorUser = await prisma.user.create({
      data: {
        email: vendorEmail,
        name: "I Love FDL Marketplace",
        role: "VENDOR",
      },
    });
    console.log(`  Created vendor user: ${vendorEmail}`);
  }

  let vendor = await prisma.vendor.findUnique({ where: { slug: "ilovefdl-marketplace" } });
  if (!vendor) {
    vendor = await prisma.vendor.create({
      data: {
        userId: vendorUser.id,
        businessName: "I Love FDL Marketplace",
        slug: "ilovefdl-marketplace",
        description: "Products from local Fond du Lac vendors on ilovefdl.com",
        status: "APPROVED",
      },
    });
    console.log(`  Created vendor: ${vendor.businessName}`);
  }

  // Import products
  let created = 0, updated = 0, errors = 0;

  for (const product of allProducts) {
    try {
      const name = stripHtml(product.name);
      const description = stripHtml(product.short_description || product.description || "");
      const slug = product.slug || makeSlug(name);

      // WC Store API returns prices in minor units (cents)
      const minorUnit = product.prices.currency_minor_unit || 2;
      const divisor = Math.pow(10, minorUnit);
      const price = parseInt(product.prices.price, 10) / divisor;
      const regularPrice = parseInt(product.prices.regular_price, 10) / divisor;
      const salePrice = product.on_sale ? parseInt(product.prices.sale_price, 10) / divisor : null;

      const images = product.images.map((img) => img.src);
      const categoryTags = product.categories.map((c) => c.name);

      const data = {
        vendorId: vendor.id,
        name,
        slug,
        description: description || null,
        price: salePrice ?? price,
        compareAtPrice: product.on_sale ? regularPrice : null,
        images,
        categoryTags,
        inventory: 0,
        isActive: true,
        externalPlatform: "NATIVE" as const,
        externalId: String(product.id),
      };

      // Check if product already exists by slug
      const existing = await prisma.product.findUnique({ where: { slug } });
      if (existing) {
        await prisma.product.update({ where: { slug }, data: { ...data, slug: undefined } });
        updated++;
        console.log(`  Updated: ${name} — $${data.price}`);
      } else {
        await prisma.product.create({ data });
        created++;
        console.log(`  Created: ${name} — $${data.price}`);
      }
    } catch (err) {
      errors++;
      console.error(`  ERROR on product ${product.id} (${product.name}): ${(err as Error).message}`);
    }
  }

  console.log(`\nProducts: ${created} created, ${updated} updated, ${errors} errors`);
}

// ─── Main ───────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("Scraping ilovefdl.com...\n");

  await scrapeBlogPosts();
  await scrapeProducts();

  console.log("\n========================================");
  console.log("  Scrape complete!");
  console.log("========================================\n");
}

main()
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
