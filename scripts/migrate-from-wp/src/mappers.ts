/**
 * Data mappers — convert WordPress REST API objects into
 * Prisma-compatible input for the I Love FDL platform.
 */

import type { PostCategory, PostStatus, Prisma } from "@prisma/client";
import type { WpPost, WpMedia, WcProduct } from "./wp-client.js";

// ─── WordPress category ID → PostCategory enum ─────────

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

/**
 * Map a WordPress category ID to our PostCategory enum value.
 * Falls back to UNCATEGORIZED for unknown IDs.
 */
export function mapWpCategoryToPostCategory(
  wpCategoryId: number,
): PostCategory {
  return WP_CATEGORY_MAP[wpCategoryId] ?? "UNCATEGORIZED";
}

// ─── HTML helpers ────────────────────────────────────────

/**
 * Strip all HTML tags from a string, returning plain text.
 * Also decodes common HTML entities and collapses whitespace.
 */
export function stripHtmlTags(html: string): string {
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

/**
 * Extract readable plain text from HTML content.
 * Converts block elements to newlines before stripping tags.
 */
export function extractPlainText(html: string): string {
  return html
    .replace(/<\/?(p|div|br|h[1-6]|li|blockquote|tr)[^>]*>/gi, "\n")
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
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Generate a URL-safe slug from a title string.
 * Used as a fallback when the WP slug is missing or empty.
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── Post mapper ─────────────────────────────────────────

interface AuthorMap {
  /** WP user ID  →  platform User.id (cuid) */
  [wpUserId: number]: string;
}

interface TagMap {
  /** WP tag ID  →  tag name */
  [wpTagId: number]: string;
}

interface MediaMap {
  /** WP media ID  →  local file path (or remote URL) */
  [wpMediaId: number]: string;
}

/**
 * Convert a WordPress post to a Prisma BlogPost create/update payload.
 *
 * The returned object works with both `prisma.blogPost.create({ data })` and
 * `prisma.blogPost.update({ data })`.
 */
export function mapWpPostToBlogPost(
  wpPost: WpPost,
  authorMap: AuthorMap,
  tagMap: TagMap,
  mediaMap: MediaMap,
): Prisma.BlogPostUncheckedCreateInput {
  // Resolve the primary category — pick the first mapped one
  let category: PostCategory = "UNCATEGORIZED";
  for (const catId of wpPost.categories) {
    const mapped = mapWpCategoryToPostCategory(catId);
    if (mapped !== "UNCATEGORIZED") {
      category = mapped;
      break;
    }
  }
  // If every category resolved to UNCATEGORIZED but there *is* a category, keep it
  if (category === "UNCATEGORIZED" && wpPost.categories.length > 0) {
    category = mapWpCategoryToPostCategory(wpPost.categories[0]);
  }

  // Resolve tags by ID
  const tags: string[] = wpPost.tags
    .map((tagId) => tagMap[tagId])
    .filter((t): t is string => Boolean(t));

  // Resolve featured image
  const featuredImage =
    wpPost.featured_media && mediaMap[wpPost.featured_media]
      ? mediaMap[wpPost.featured_media]
      : null;

  // Resolve author — fall back to the first author in the map
  let authorId = authorMap[wpPost.author];
  if (!authorId) {
    const fallback = Object.values(authorMap)[0];
    if (fallback) {
      authorId = fallback;
    }
  }
  if (!authorId) {
    throw new Error(
      `No platform user found for WP author ${wpPost.author}. AuthorMap is empty.`,
    );
  }

  // Map WP status
  const statusMap: Record<string, PostStatus> = {
    publish: "PUBLISHED",
    draft: "DRAFT",
    future: "SCHEDULED",
    pending: "DRAFT",
    private: "DRAFT",
  };
  const status: PostStatus = statusMap[wpPost.status] ?? "DRAFT";

  const slug = wpPost.slug || generateSlug(stripHtmlTags(wpPost.title.rendered));

  return {
    authorId,
    title: stripHtmlTags(wpPost.title.rendered),
    slug,
    content: wpPost.content.rendered,
    excerpt: stripHtmlTags(wpPost.excerpt.rendered) || null,
    featuredImage,
    category,
    tags,
    status,
    publishedAt: wpPost.status === "publish" ? new Date(wpPost.date_gmt + "Z") : null,
    seoTitle: stripHtmlTags(wpPost.title.rendered),
    seoDescription: stripHtmlTags(wpPost.excerpt.rendered).slice(0, 160) || null,
    wpOriginalId: wpPost.id,
  };
}

// ─── Product mapper ─────────────────────────────────────

/**
 * Convert a WooCommerce Store API product into a Prisma Product create payload.
 */
export function mapWcProductToProduct(
  wcProduct: WcProduct,
  vendorId: string,
  imageMap: Record<string, string>,
): Prisma.ProductUncheckedCreateInput {
  // WC Store API prices are in minor units (cents)
  const minorUnit = wcProduct.prices.currency_minor_unit || 2;
  const divisor = Math.pow(10, minorUnit);
  const price = parseInt(wcProduct.prices.price, 10) / divisor;
  const regularPrice = parseInt(wcProduct.prices.regular_price, 10) / divisor;
  const salePrice = wcProduct.prices.sale_price
    ? parseInt(wcProduct.prices.sale_price, 10) / divisor
    : null;

  // Use sale price as current price if available
  const currentPrice = salePrice && salePrice > 0 ? salePrice : price;
  const compareAtPrice = salePrice && salePrice > 0 && regularPrice > salePrice ? regularPrice : null;

  // Map images — use downloaded local paths if available, otherwise original URLs
  const images: string[] = wcProduct.images
    .map((img) => imageMap[img.src] || img.src)
    .filter(Boolean);

  // Collect category + tag strings
  const categoryTags: string[] = [
    ...wcProduct.categories.map((c) => c.name),
    ...wcProduct.tags.map((t) => t.name),
  ];

  const slug = wcProduct.slug || generateSlug(wcProduct.name);

  return {
    vendorId,
    name: stripHtmlTags(wcProduct.name),
    slug,
    description: wcProduct.description
      ? extractPlainText(wcProduct.description)
      : wcProduct.short_description
        ? extractPlainText(wcProduct.short_description)
        : null,
    price: currentPrice || 0,
    compareAtPrice,
    sku: wcProduct.sku || null,
    images,
    categoryTags,
    inventory: wcProduct.stock_quantity ?? 0,
    isActive: wcProduct.stock_status !== "outofstock",
    externalPlatform: "NATIVE",
    externalId: `wc-${wcProduct.id}`,
    seoTitle: stripHtmlTags(wcProduct.name),
    seoDescription: wcProduct.short_description
      ? extractPlainText(wcProduct.short_description).slice(0, 160)
      : null,
  };
}
