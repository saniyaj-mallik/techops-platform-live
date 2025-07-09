import { chromium } from 'playwright';
import cloudinary from '@/lib/cloudinary';

/**
 * Capture screenshot of a URL using Playwright and upload to Cloudinary
 * @param {string} url - URL to capture screenshot of
 * @param {Object} options - Screenshot options
 * @param {string} options.phase - 'before' or 'after' for VRT
 * @param {string} options.documentId - VRT document ID for organization
 * @param {string} options.type - 'page' or 'post' for categorization
 * @param {boolean} options.fullPage - Whether to capture full page (default: true)
 * @param {number} options.timeout - Timeout in milliseconds (default: 30000)
 * @returns {Object} Object containing Cloudinary URL and public ID
 */
export async function captureAndUploadScreenshot(url, options = {}) {
    const {
        phase = 'screenshot',
        documentId = 'unknown',
        type = 'page',
        fullPage = true,
        timeout = 30000
    } = options;

    let browser = null;
    let context = null;
    let page = null;

    try {
        // Launch browser
        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });

        // Create context with mobile user agent and reasonable viewport
        context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        // Create page
        page = await context.newPage();

        // Set timeout
        page.setDefaultTimeout(timeout);

        // Navigate to URL with better error handling
        console.log(`📸 Navigating to ${url}...`);
        
        try {
            await page.goto(url, { 
                waitUntil: 'networkidle',
                timeout: timeout 
            });
        } catch (navError) {
            // Try with domcontentloaded if networkidle fails
            console.warn(`⚠️ NetworkIdle failed for ${url}, trying domcontentloaded...`);
            await page.goto(url, { 
                waitUntil: 'domcontentloaded',
                timeout: timeout 
            });
        }

        // Wait a bit for any lazy-loaded content
        await page.waitForTimeout(2000);

        // Hide any cookie banners or popups that might interfere
        await page.addStyleTag({
            content: `
                .cookie-banner, .cookie-notice, .gdpr-banner, 
                .privacy-notice, .consent-banner, .popup-overlay,
                #cookie-law-info-bar, .cookie-bar, .cookies-eu-banner,
                .eu-cookie-compliance-banner, .cookie-compliance,
                .wp-block-cookie-banner { display: none !important; }
            `
        });

        // Capture screenshot
        console.log(`📸 Capturing ${fullPage ? 'full page' : 'viewport'} screenshot...`);
        const screenshotBuffer = await page.screenshot({
            fullPage,
            type: 'jpeg',
            quality: 80  // Compress JPEG to reduce file size for Cloudinary
        });

        // Generate organized public ID
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substr(2, 9);
        const sanitizedUrl = url.replace(/[^a-zA-Z0-9]/g, '_').substr(0, 30);
        const publicId = `${phase}_${type}_${documentId}_${sanitizedUrl}_${timestamp}_${randomId}`;

        // Upload to Cloudinary with fallback for large images
        console.log(`☁️ Uploading screenshot to Cloudinary...`);
        console.log(`📊 Screenshot buffer size: ${(screenshotBuffer.length / 1024 / 1024).toFixed(2)} MB`);
        
        let uploadResult;
        try {
            uploadResult = await uploadBufferToCloudinary(screenshotBuffer, publicId);
        } catch (uploadError) {
            // If upload fails due to size, try with viewport-only screenshot as fallback
            if (uploadError.message && uploadError.message.includes('too large') && fullPage) {
                console.warn(`⚠️ Full page screenshot too large, trying viewport-only screenshot...`);
                
                const viewportScreenshotBuffer = await page.screenshot({
                    fullPage: false,
                    type: 'jpeg',
                    quality: 70  // Lower quality for fallback
                });
                
                console.log(`📊 Viewport screenshot buffer size: ${(viewportScreenshotBuffer.length / 1024 / 1024).toFixed(2)} MB`);
                uploadResult = await uploadBufferToCloudinary(viewportScreenshotBuffer, `${publicId}_viewport`);
                console.log(`✅ Fallback viewport screenshot uploaded successfully`);
            } else {
                throw uploadError;
            }
        }

        console.log(`✅ Screenshot captured and uploaded successfully for ${url}`);
        
        return {
            url: uploadResult.imageUrl,
            publicId: uploadResult.publicId,
            size: uploadResult.size
        };

    } catch (error) {
        console.error(`❌ Screenshot capture failed for ${url}:`, error.message);
        throw new Error(`Screenshot capture failed: ${error.message}`);
    } finally {
        // Clean up resources
        try {
            if (page) await page.close();
            if (context) await context.close();
            if (browser) await browser.close();
        } catch (cleanupError) {
            console.warn('Cleanup warning:', cleanupError.message);
        }
    }
}

/**
 * Upload screenshot buffer to Cloudinary
 * @param {Buffer} buffer - Screenshot buffer
 * @param {string} publicId - Cloudinary public ID
 * @returns {Object} Upload result with URL and metadata
 */
async function uploadBufferToCloudinary(buffer, publicId) {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream({
            folder: 'techops-screenshots/vrt',
            resource_type: 'image',
            public_id: publicId,
            format: 'jpg',
            quality: 'auto:good',
            fetch_format: 'auto',
            // Add transformations to resize large images
            transformation: [
                {
                    // Limit width to 1920px (maintains aspect ratio)
                    width: 1920,
                    crop: 'limit'
                },
                {
                    // Limit height to 10000px for very long pages
                    height: 10000,
                    crop: 'limit'
                },
                {
                    // Compress quality further if needed
                    quality: 'auto:good'
                }
            ],
            // Additional upload parameters for large images
            chunk_size: 6000000, // 6MB chunks for large files
            timeout: 120000      // 2 minute timeout for large uploads
        }, (error, result) => {
            if (error) {
                console.error('Cloudinary upload error:', error);
                return reject(error);
            }
            resolve({
                publicId: result.public_id,
                imageUrl: result.secure_url,
                size: result.bytes,
                width: result.width,
                height: result.height,
                meta: result
            });
        });

        uploadStream.end(buffer);
    });
}

/**
 * Batch process screenshot captures with controlled concurrency
 * @param {Array} urls - Array of URLs to capture
 * @param {Object} baseOptions - Base options for screenshot capture
 * @param {number} batchSize - Number of concurrent screenshots (default: 3)
 * @param {number} batchDelay - Delay between batches in ms (default: 1000)
 * @returns {Array} Array of results with success/failure status
 */
export async function batchCaptureScreenshots(urls, baseOptions = {}, batchSize = 3, batchDelay = 1000) {
    const results = [];
    
    console.log(`📊 Starting batch screenshot capture: ${urls.length} URLs, batch size: ${batchSize}`);
    
    for (let i = 0; i < urls.length; i += batchSize) {
        const batch = urls.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(urls.length / batchSize);
        
        console.log(`📸 Processing batch ${batchNumber}/${totalBatches} (${batch.length} URLs)`);
        
        const batchPromises = batch.map(async (urlData) => {
            try {
                const url = typeof urlData === 'string' ? urlData : urlData.weblink || urlData.url;
                const options = {
                    ...baseOptions,
                    type: urlData.type || 'page'
                };
                
                const screenshot = await captureAndUploadScreenshot(url, options);
                
                return {
                    url,
                    type: urlData.type || 'page',
                    success: true,
                    screenshot
                };
            } catch (error) {
                console.error(`❌ Batch screenshot failed for ${urlData}:`, error.message);
                return {
                    url: typeof urlData === 'string' ? urlData : urlData.weblink || urlData.url,
                    type: urlData.type || 'page',
                    success: false,
                    error: error.message
                };
            }
        });
        
        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults.map(r => r.value || r.reason));
        
        // Add delay between batches to prevent overwhelming the server
        if (i + batchSize < urls.length && batchDelay > 0) {
            console.log(`⏳ Waiting ${batchDelay}ms before next batch...`);
            await new Promise(resolve => setTimeout(resolve, batchDelay));
        }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Batch capture completed: ${successCount}/${results.length} successful`);
    
    return results;
}

export { uploadBufferToCloudinary }; 