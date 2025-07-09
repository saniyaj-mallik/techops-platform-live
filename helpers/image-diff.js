// File: wdm-techops-platform/helpers/image-diff.js
// Image diffing helper using pixelmatch, sharp, and node-fetch
import fetch from 'node-fetch';
import sharp from 'sharp';
import pixelmatch from 'pixelmatch';

/**
 * Compare two images by URL and generate a diff image buffer and percent difference
 * @param {string} beforeUrl - URL of the before image
 * @param {string} afterUrl - URL of the after image
 * @param {object} [options] - Options (threshold, etc.)
 * @returns {Promise<{diffBuffer: Buffer, diffPercent: number, width: number, height: number}>}
 */
export async function diffImagesByUrl(beforeUrl, afterUrl, options = {}) {
    const threshold = options.threshold || 0.1; // pixelmatch threshold
    // Download both images
    const [beforeRes, afterRes] = await Promise.all([
        fetch(beforeUrl),
        fetch(afterUrl)
    ]);
    if (!beforeRes.ok || !afterRes.ok) {
        throw new Error('Failed to fetch one or both images');
    }
    const beforeBuffer = await beforeRes.buffer();
    const afterBuffer = await afterRes.buffer();

    // Use sharp to ensure both images are same size and RGBA
    const beforeImg = sharp(beforeBuffer).ensureAlpha();
    const afterImg = sharp(afterBuffer).ensureAlpha();
    const beforeMeta = await beforeImg.metadata();
    const afterMeta = await afterImg.metadata();
    const width = Math.min(beforeMeta.width, afterMeta.width);
    const height = Math.min(beforeMeta.height, afterMeta.height);
    const beforeRaw = await beforeImg.resize(width, height).raw().toBuffer();
    const afterRaw = await afterImg.resize(width, height).raw().toBuffer();

    // Prepare diff buffer
    const diffRaw = Buffer.alloc(width * height * 4);
    const diffPixels = pixelmatch(
        beforeRaw,
        afterRaw,
        diffRaw,
        width,
        height,
        { threshold, alpha: 0.7 }
    );
    const diffPercent = (diffPixels / (width * height)) * 100;
    // Convert diffRaw to PNG buffer
    const diffBuffer = await sharp(diffRaw, { raw: { width, height, channels: 4 } }).png().toBuffer();
    return { diffBuffer, diffPercent, width, height };
} 