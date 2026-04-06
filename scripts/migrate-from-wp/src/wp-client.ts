/**
 * WordPress REST API client for ilovefdl.com
 *
 * Handles paginated fetching of all WP content types,
 * media file downloads, and retry logic for transient errors.
 */

const WP_BASE_URL = "https://ilovefdl.com/wp-json/wp/v2";
const PER_PAGE = 100; // WP max per_page
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// ─── WP response types ──────────────────────────────────

export interface WpPost {
  id: number;
  date: string;
  date_gmt: string;
  modified: string;
  modified_gmt: string;
  slug: string;
  status: string;
  title: { rendered: string };
  content: { rendered: string; protected: boolean };
  excerpt: { rendered: string; protected: boolean };
  author: number;
  featured_media: number;
  categories: number[];
  tags: number[];
  link: string;
}

export interface WpCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
  description: string;
  parent: number;
}

export interface WpTag {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export interface WpMedia {
  id: number;
  date: string;
  slug: string;
  title: { rendered: string };
  source_url: string;
  media_type: string;
  mime_type: string;
  alt_text: string;
  media_details: {
    width: number;
    height: number;
    file: string;
    sizes?: Record<
      string,
      { file: string; width: number; height: number; source_url: string }
    >;
  };
}

export interface WpUser {
  id: number;
  name: string;
  slug: string;
  description: string;
  avatar_urls: Record<string, string>;
}

export interface WcProduct {
  id: number;
  name: string;
  slug: string;
  parent: number;
  type: string;
  description: string;
  short_description: string;
  sku: string;
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
  categories: Array<{ id: number; name: string; slug: string }>;
  tags: Array<{ id: number; name: string; slug: string }>;
  stock_status: string;
  stock_quantity: number | null;
  permalink: string;
}

// ─── helpers ─────────────────────────────────────────────

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  retries = MAX_RETRIES,
): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;

      // If rate-limited, respect Retry-After header
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : RETRY_DELAY_MS * attempt;
        console.warn(`  Rate limited. Waiting ${waitMs}ms before retry ${attempt}/${retries}...`);
        await sleep(waitMs);
        continue;
      }

      // Server errors are retryable
      if (response.status >= 500) {
        console.warn(
          `  Server error ${response.status} on attempt ${attempt}/${retries}: ${url}`,
        );
        if (attempt < retries) await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }

      // Client errors (4xx except 429) are not retryable
      throw new Error(
        `HTTP ${response.status}: ${response.statusText} — ${url}`,
      );
    } catch (error) {
      if (
        error instanceof TypeError &&
        attempt < retries
      ) {
        // Network error – retry
        console.warn(
          `  Network error on attempt ${attempt}/${retries}: ${(error as Error).message}`,
        );
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }
      throw error;
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} attempts`);
}

/**
 * Generic paginated fetcher for any WP REST endpoint.
 * Reads X-WP-TotalPages and fetches every page sequentially.
 */
async function fetchAllPages<T>(endpoint: string, params: Record<string, string> = {}): Promise<T[]> {
  const results: T[] = [];
  let page = 1;
  let totalPages = 1;

  const queryBase = new URLSearchParams({ per_page: String(PER_PAGE), ...params });

  while (page <= totalPages) {
    const qs = new URLSearchParams(queryBase);
    qs.set("page", String(page));
    const url = `${WP_BASE_URL}/${endpoint}?${qs.toString()}`;

    console.log(`  Fetching ${endpoint} page ${page}/${totalPages}...`);
    const response = await fetchWithRetry(url);

    // Read total pages from first response
    if (page === 1) {
      const tp = response.headers.get("X-WP-TotalPages");
      if (tp) totalPages = parseInt(tp, 10);
      console.log(`  Total pages for ${endpoint}: ${totalPages}`);
    }

    const data = (await response.json()) as T[];
    results.push(...data);
    page++;
  }

  return results;
}

// ─── public API ──────────────────────────────────────────

export async function fetchAllPosts(): Promise<WpPost[]> {
  // Fetch all statuses so we capture drafts/scheduled too if available
  return fetchAllPages<WpPost>("posts", { status: "publish" });
}

export async function fetchAllCategories(): Promise<WpCategory[]> {
  return fetchAllPages<WpCategory>("categories");
}

export async function fetchAllTags(): Promise<WpTag[]> {
  return fetchAllPages<WpTag>("tags");
}

export async function fetchAllMedia(): Promise<WpMedia[]> {
  return fetchAllPages<WpMedia>("media");
}

export async function fetchAllUsers(): Promise<WpUser[]> {
  return fetchAllPages<WpUser>("users");
}

/**
 * Fetch products from the WooCommerce Store API.
 * This endpoint is public and includes pricing data.
 */
export async function fetchAllWcProducts(): Promise<WcProduct[]> {
  const WC_STORE_URL = "https://ilovefdl.com/wp-json/wc/store/v1";
  const results: WcProduct[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `${WC_STORE_URL}/products?per_page=${PER_PAGE}&page=${page}`;
    console.log(`  Fetching WC products page ${page}...`);
    const response = await fetchWithRetry(url);
    const data = (await response.json()) as WcProduct[];
    results.push(...data);
    // If we got fewer than PER_PAGE, we've fetched everything
    hasMore = data.length === PER_PAGE;
    page++;
  }

  return results;
}

/**
 * Download a single media file from a URL and write it to `outputPath`.
 * Returns the number of bytes written.
 */
export async function downloadMediaFile(
  url: string,
  outputPath: string,
): Promise<number> {
  const response = await fetchWithRetry(url);
  const buffer = Buffer.from(await response.arrayBuffer());

  const fs = await import("node:fs/promises");
  const path = await import("node:path");

  // Ensure directory exists
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, buffer);

  return buffer.byteLength;
}
