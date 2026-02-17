/**
 * Media handling — download images from WordPress and optimise
 * them with sharp before storing locally.
 */

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { downloadMediaFile } from "./wp-client.js";

/** Max width/height for optimised images */
const MAX_DIMENSION = 1600;
/** WebP quality setting (0–100) */
const WEBP_QUALITY = 80;

/**
 * Download an image from `url`, optimise it (resize + convert to WebP),
 * and save it under `outputDir`.
 *
 * Returns the absolute path of the saved file.
 *
 * If the download or conversion fails the error is caught, logged,
 * and `null` is returned so a single broken image does not halt the
 * entire migration.
 */
export async function downloadImage(
  url: string,
  outputDir: string,
): Promise<string | null> {
  try {
    // Derive a filename from the URL
    const urlObj = new URL(url);
    const originalName = path.basename(urlObj.pathname);
    const baseName = originalName.replace(/\.[^.]+$/, "");
    const webpName = `${baseName}.webp`;

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Download to a temp file first
    const tempPath = path.join(outputDir, `_tmp_${originalName}`);
    const bytes = await downloadMediaFile(url, tempPath);
    console.log(
      `    Downloaded ${originalName} (${(bytes / 1024).toFixed(1)} KB)`,
    );

    // Optimise with sharp
    const outputPath = path.join(outputDir, webpName);
    const image = sharp(tempPath);
    const metadata = await image.metadata();

    let pipeline = image;
    if (
      metadata.width &&
      metadata.height &&
      (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION)
    ) {
      pipeline = pipeline.resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    await pipeline.webp({ quality: WEBP_QUALITY }).toFile(outputPath);

    // Clean up temp file
    await fs.unlink(tempPath).catch(() => {
      /* ignore */
    });

    const stats = await fs.stat(outputPath);
    console.log(
      `    Optimised → ${webpName} (${(stats.size / 1024).toFixed(1)} KB)`,
    );

    return outputPath;
  } catch (error) {
    console.error(
      `    Failed to download/optimise image ${url}: ${(error as Error).message}`,
    );
    return null;
  }
}
