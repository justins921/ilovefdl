/**
 * Upload images to the API server's migration endpoint.
 *
 * Sends WordPress image URLs to the API, which downloads,
 * optimises (sharp → WebP), and stores them on its own disk.
 */

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Upload a single image by URL to the API migration endpoint.
 * Returns the API-relative path (e.g. `/uploads/images/abc123.webp`)
 * or `null` if the upload fails after retries.
 */
export async function uploadImageToApi(
  imageUrl: string,
  apiBaseUrl: string,
  migrationKey: string,
): Promise<string | null> {
  const endpoint = `${apiBaseUrl}/uploads/migrate`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-migration-key": migrationKey,
        },
        body: JSON.stringify({ url: imageUrl }),
      });

      if (response.ok) {
        const json = (await response.json()) as { data: string };
        return json.data;
      }

      const errorBody = await response.text();
      console.warn(
        `  Upload attempt ${attempt}/${MAX_RETRIES} failed (HTTP ${response.status}): ${errorBody}`,
      );

      if (response.status >= 500 && attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }

      // Client errors are not retryable
      if (response.status < 500) return null;
    } catch (error) {
      console.warn(
        `  Upload attempt ${attempt}/${MAX_RETRIES} network error: ${(error as Error).message}`,
      );
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  return null;
}
