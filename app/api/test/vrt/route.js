import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Project from '@/models/Project';
import BeforeAfterVRT from '@/models/BeforeAfterVRT';
import { captureAndUploadScreenshot } from '@/helpers/screenshot-capture';

/**
 * POST /api/test/vrt
 * Visual Regression Testing endpoint for Before After VRT and Sitemap VRT tests
 */
export async function POST(request) {
    try {
        const body = await request.json();
        console.log('VRT API request:', body);
        
        const { test_type, sitemap_config = {}, max_pages = 25, automation_id } = body;
        
        if (!test_type) {
            return NextResponse.json({
                success: false,
                error: 'Missing test_type parameter'
            }, { status: 400 });
        }

        // Connect to database
        await connectDB();
        
        // Handle Before After VRT test type
        if (test_type === 'before_after_vrt') {
            if (!automation_id) {
                return NextResponse.json({
                    success: false,
                    error: 'automation_id is required for before_after_vrt test'
                }, { status: 400 });
            }
            
            return await handleBeforeAfterVRT(automation_id);
        }
        
        // Handle regular sitemap VRT (existing logic)
        const sitemapUrls = await extractSitemapUrls(sitemap_config, body.site_url, body.project_id);
        
        console.log('Extracted sitemap URLs:', {
            pages: sitemapUrls.pages.length,
            posts: sitemapUrls.posts.length,
            total: sitemapUrls.pages.length + sitemapUrls.posts.length
        });
        
        return NextResponse.json({
            success: true,
            message: `${test_type} URLs extracted successfully`,
            data: {
                test_type,
                sitemap_urls: sitemapUrls,
                total_pages: sitemapUrls.pages.length,
                total_posts: sitemapUrls.posts.length,
                total_urls: sitemapUrls.pages.length + sitemapUrls.posts.length
            }
        }, { status: 200 });
        
    } catch (error) {
        console.error('VRT API error:', error);
        return NextResponse.json({
            success: false,
            error: 'VRT test failed',
            message: error.message
        }, { status: 500 });
    }
}

/**
 * Extract URLs from page and post sitemaps
 * @param {Object} sitemapConfig - Configuration containing sitemap URLs
 * @param {string} fallbackSiteUrl - Fallback site URL if no sitemaps configured
 * @param {string} projectId - Project ID to store URLs in
 * @returns {Object} Object containing pages and posts arrays
 */
async function extractSitemapUrls(sitemapConfig, fallbackSiteUrl, projectId) {
    const result = {
        pages: [],
        posts: []
    };

    try {
        // Extract page URLs
        if (sitemapConfig.page_sitemap_url) {
            console.log('Fetching page sitemap:', sitemapConfig.page_sitemap_url);
            const pageUrls = await fetchUrlsFromSitemap(sitemapConfig.page_sitemap_url);
            result.pages = pageUrls;
            console.log(`Found ${pageUrls.length} page URLs`);
        }

        // Extract post URLs
        if (sitemapConfig.post_sitemap_url) {
            console.log('Fetching post sitemap:', sitemapConfig.post_sitemap_url);
            const postUrls = await fetchUrlsFromSitemap(sitemapConfig.post_sitemap_url);
            result.posts = postUrls;
            console.log(`Found ${postUrls.length} post URLs`);
        }

        // Fallback to default sitemap if no URLs found and we have a site URL
        if (result.pages.length === 0 && result.posts.length === 0 && fallbackSiteUrl) {
            console.log('No sitemap URLs configured, trying default sitemap:', `${fallbackSiteUrl}/sitemap.xml`);
            try {
                const allUrls = await fetchUrlsFromSitemap(`${fallbackSiteUrl}/sitemap.xml`);
                // For default sitemap, we can't easily distinguish pages from posts, so put them all in pages
                result.pages = allUrls;
                console.log(`Found ${allUrls.length} URLs from default sitemap`);
            } catch (fallbackError) {
                console.log('Default sitemap also failed:', fallbackError.message);
            }
        }

    } catch (error) {
        console.error('Error extracting sitemap URLs:', error);
        throw error;
    }

    // Store URLs in project if project ID is provided
    if (projectId && (result.pages.length > 0 || result.posts.length > 0)) {
        try {
            console.log(`Storing ${result.pages.length} pages and ${result.posts.length} posts for project ${projectId}`);
            
            const project = await Project.findById(projectId);
            if (project) {
                // Determine if this is staging or live based on site URL matching
                let isStaging = false;
                let isLive = false;
                
                // Check exact matches first
                if (project.stagingSiteUrl && fallbackSiteUrl) {
                    const normalizedStaging = new URL(project.stagingSiteUrl).hostname.toLowerCase();
                    const normalizedCurrent = new URL(fallbackSiteUrl).hostname.toLowerCase();
                    isStaging = normalizedStaging === normalizedCurrent;
                }
                
                if (project.liveSiteUrl && fallbackSiteUrl) {
                    const normalizedLive = new URL(project.liveSiteUrl).hostname.toLowerCase();
                    const normalizedCurrent = new URL(fallbackSiteUrl).hostname.toLowerCase();
                    isLive = normalizedLive === normalizedCurrent;
                }
                
                // If no exact matches and we have one empty slot, try to determine by URL patterns
                if (!isStaging && !isLive && fallbackSiteUrl) {
                    const currentUrl = fallbackSiteUrl.toLowerCase();
                    const hasLiveSite = !!project.liveSiteUrl;
                    const hasStagingSite = !!project.stagingSiteUrl;
                    
                    // If project only has staging site configured, and current URL doesn't look like staging
                    if (hasStagingSite && !hasLiveSite) {
                        const looksLikeStaging = currentUrl.includes('staging') || 
                                               currentUrl.includes('dev') || 
                                               currentUrl.includes('test');
                        isLive = !looksLikeStaging;
                        isStaging = looksLikeStaging;
                    }
                    // If project only has live site configured, and current URL looks like staging  
                    else if (hasLiveSite && !hasStagingSite) {
                        const looksLikeStaging = currentUrl.includes('staging') || 
                                               currentUrl.includes('dev') || 
                                               currentUrl.includes('test');
                        isStaging = looksLikeStaging;
                        isLive = !looksLikeStaging;
                    }
                    // If project has neither, use URL patterns to decide
                    else if (!hasLiveSite && !hasStagingSite) {
                        const looksLikeStaging = currentUrl.includes('staging') || 
                                               currentUrl.includes('dev') || 
                                               currentUrl.includes('test');
                        isStaging = looksLikeStaging;
                        isLive = !looksLikeStaging;
                    }
                }
                
                // Store URLs based on determination
                if (isStaging) {
                    project.stagingSiteUrls = {
                        pages: result.pages,
                        posts: result.posts,
                        lastFetched: new Date()
                    };
                    console.log('Stored URLs in staging site URLs');
                } else {
                    project.liveSiteUrls = {
                        pages: result.pages,
                        posts: result.posts,
                        lastFetched: new Date()
                    };
                    console.log('Stored URLs in live site URLs');
                }
                
                await project.save();
                console.log('✓ Project URLs updated successfully');
            } else {
                console.warn(`Project with ID ${projectId} not found`);
            }
        } catch (storeError) {
            console.error('Error storing URLs in project:', storeError);
            // Don't throw error - just log it, continue with the response
        }
    }

    return result;
}

/**
 * Fetch URLs from a single sitemap XML file
 * @param {string} sitemapUrl - URL of the sitemap to fetch
 * @returns {Array} Array of URLs found in the sitemap
 */
async function fetchUrlsFromSitemap(sitemapUrl) {
    try {
        console.log(`Fetching sitemap: ${sitemapUrl}`);
        
        const response = await fetch(sitemapUrl);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const xmlText = await response.text();
        
        // Parse XML and extract URLs
        const urls = [];
        
        // Simple regex to extract <loc> tags - works for basic sitemaps
        const locMatches = xmlText.match(/<loc>(.*?)<\/loc>/g);
        
        if (locMatches) {
            for (const match of locMatches) {
                const url = match.replace(/<\/?loc>/g, '').trim();
                if (url && url.startsWith('http')) {
                    urls.push(url);
                }
            }
        }
        
        // Handle sitemap index files that contain references to other sitemaps
        const sitemapMatches = xmlText.match(/<sitemap>[\s\S]*?<\/sitemap>/g);
        if (sitemapMatches && urls.length === 0) {
            console.log('Found sitemap index, fetching sub-sitemaps');
            
            for (const sitemapMatch of sitemapMatches) {
                const locMatch = sitemapMatch.match(/<loc>(.*?)<\/loc>/);
                if (locMatch && locMatch[1]) {
                    const subSitemapUrl = locMatch[1].trim();
                    console.log(`Fetching sub-sitemap: ${subSitemapUrl}`);
                    
                    try {
                        const subUrls = await fetchUrlsFromSitemap(subSitemapUrl);
                        urls.push(...subUrls);
                    } catch (subError) {
                        console.error(`Failed to fetch sub-sitemap ${subSitemapUrl}:`, subError.message);
                    }
                }
            }
        }
        
        console.log(`Extracted ${urls.length} URLs from sitemap: ${sitemapUrl}`);
        return urls;
        
    } catch (error) {
        console.error(`Error fetching sitemap ${sitemapUrl}:`, error.message);
        throw error;
    }
}

/**
 * Handle Before After VRT test by finding reference screenshots and capturing comparison screenshots
 * @param {string} automationId - Automation ID to find VRT document
 * @returns {NextResponse} JSON response with VRT test results
 */
async function handleBeforeAfterVRT(automationId) {
    try {
        console.log('🔍 Handling Before After VRT for automation:', automationId);
        
        // Find the BeforeAfterVRT document for this automation
        const vrtDocument = await BeforeAfterVRT.findOne({ automationId });
        
        if (!vrtDocument) {
            return NextResponse.json({
                success: false,
                error: 'No reference screenshots found for this automation. Before After VRT requires reference screenshots to be captured first.'
            }, { status: 404 });
        }
        
        console.log(`📸 Found VRT document with ${vrtDocument.pagesData.length} pages and ${vrtDocument.postsData.length} posts`);
        
        // Check if before screenshots were completed
        if (vrtDocument.status !== 'before_completed') {
            return NextResponse.json({
                success: false,
                error: `Reference screenshots not ready. Current status: ${vrtDocument.status}`
            }, { status: 400 });
        }
        
        // Update status to indicate after processing has started
        vrtDocument.status = 'after_pending';
        await vrtDocument.save();
        
        // Process after screenshot capture (BLOCKING - wait for completion)
        console.log('🔄 Starting after screenshot capture (blocking process)...');
        await processAfterScreenshots(vrtDocument._id);
        console.log('✅ After screenshot capture completed - sending response');
        
        // Fetch updated document to get final results
        const updatedVrtDocument = await BeforeAfterVRT.findById(vrtDocument._id);
        
        // Return response after processing is complete
        return NextResponse.json({
            success: true,
            message: 'Before After VRT test completed successfully',
            data: {
                test_type: 'before_after_vrt',
                automation_id: automationId,
                vrt_document_id: vrtDocument._id,
                screenshots_captured: {
                    pages: updatedVrtDocument.pagesData.length,
                    posts: updatedVrtDocument.postsData.length,
                    total: updatedVrtDocument.pagesData.length + updatedVrtDocument.postsData.length
                },
                status: updatedVrtDocument.status,
                before_completed_at: updatedVrtDocument.beforeCompletedAt,
                after_completed_at: updatedVrtDocument.afterCompletedAt
            }
        }, { status: 200 });
        
    } catch (error) {
        console.error('Error in handleBeforeAfterVRT:', error);
        return NextResponse.json({
            success: false,
            error: 'Before After VRT processing failed',
            message: error.message
        }, { status: 500 });
    }
}

/**
 * Process after screenshots capture (background process)
 * @param {string} vrtDocumentId - VRT document ID
 */
async function processAfterScreenshots(vrtDocumentId) {
    try {
        console.log('📸 Processing after screenshots for VRT document:', vrtDocumentId);
        
        const vrtDocument = await BeforeAfterVRT.findById(vrtDocumentId);
        if (!vrtDocument) {
            console.error('VRT document not found:', vrtDocumentId);
            return;
        }
        
        // Debug: Log the document structure
        console.log('📋 VRT Document pages count:', vrtDocument.pagesData?.length || 0);
        console.log('📋 VRT Document posts count:', vrtDocument.postsData?.length || 0);
        
        // Debug: Log first few pages to check structure
        if (vrtDocument.pagesData?.length > 0) {
            console.log('📋 First page data:', JSON.stringify(vrtDocument.pagesData[0], null, 2));
        }
        
        // Ensure pagesData and postsData exist and have proper structure
        const pagesData = vrtDocument.pagesData || [];
        const postsData = vrtDocument.postsData || [];
        
        // Combine all URLs for processing (same URLs as before)
        const allUrls = [
            ...pagesData.map(page => ({ 
                weblink: page.weblink, 
                type: 'page',
                before: page.before,
                after: page.after
            })),
            ...postsData.map(post => ({ 
                weblink: post.weblink, 
                type: 'post',
                before: post.before,
                after: post.after
            }))
        ];
        
        console.log(`📊 Total URLs to capture (after): ${allUrls.length}`);
        
        // Debug: Log URLs to verify they're not undefined
        allUrls.forEach((urlData, index) => {
            if (!urlData.weblink) {
                console.error(`❌ URL ${index} is undefined:`, JSON.stringify(urlData, null, 2));
            }
        });
        
        // Filter out any undefined URLs
        const validUrls = allUrls.filter(urlData => urlData.weblink && typeof urlData.weblink === 'string');
        
        if (validUrls.length !== allUrls.length) {
            console.warn(`⚠️ Filtered out ${allUrls.length - validUrls.length} invalid URLs`);
        }
        
        console.log(`📊 Valid URLs to process: ${validUrls.length}`);
        
        // Process screenshots one by one (sequential processing)
        const results = [];
        
        for (let i = 0; i < validUrls.length; i++) {
            const urlData = validUrls[i];
            console.log(`📸 Processing after screenshot ${i + 1}/${validUrls.length}: ${urlData.weblink}`);
            
            try {
                console.log(`📸 Capturing after screenshot for: ${urlData.weblink}`);
                const screenshot = await captureAfterScreenshot(urlData.weblink, vrtDocumentId, urlData.type);
                
                results.push({
                    weblink: urlData.weblink,
                    type: urlData.type,
                    success: true,
                    screenshot
                });
                
                console.log(`✅ After screenshot ${i + 1}/${validUrls.length} completed successfully`);
                
            } catch (error) {
                console.error(`❌ After screenshot ${i + 1}/${validUrls.length} failed for ${urlData.weblink}:`, error.message);
                results.push({
                    weblink: urlData.weblink,
                    type: urlData.type,
                    success: false,
                    error: error.message
                });
            }
            
            // Delay between each screenshot for stability
            if (i < validUrls.length - 1) {
                console.log(`⏳ Waiting 2 seconds before next screenshot...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        // Update VRT document with after results
        await updateVRTDocumentWithAfterResults(vrtDocumentId, results);
        
        console.log('✅ After screenshot capture completed');
        
    } catch (error) {
        console.error('Error in processAfterScreenshots:', error);
    }
}

/**
 * Capture a single "after" screenshot and upload to Cloudinary
 * @param {string} url - URL to capture
 * @param {string} vrtDocumentId - VRT document ID for organization
 * @param {string} type - 'page' or 'post' for categorization
 * @returns {Object} Screenshot data with Cloudinary URL and public ID
 */
async function captureAfterScreenshot(url, vrtDocumentId, type = 'page') {
    console.log(`📸 Capturing after screenshot for: ${url}`);
    
    try {
        const screenshot = await captureAndUploadScreenshot(url, {
            phase: 'after',
            documentId: vrtDocumentId,
            type,
            fullPage: true,
            timeout: 30000
        });
        
        return {
            url: screenshot.url,
            publicId: screenshot.publicId
        };
    } catch (error) {
        console.error(`❌ After screenshot capture failed for ${url}:`, error.message);
        throw error;
    }
}

/**
 * Update VRT document with after screenshot results
 * @param {string} vrtDocumentId - VRT document ID
 * @param {Array} results - After screenshot results
 */
async function updateVRTDocumentWithAfterResults(vrtDocumentId, results) {
    try {
        const vrtDocument = await BeforeAfterVRT.findById(vrtDocumentId);
        if (!vrtDocument) {
            console.error('VRT document not found:', vrtDocumentId);
            return;
        }
        
        // Update pages data with after screenshots
        results.filter(r => r.type === 'page' && r.success).forEach(result => {
            const pageIndex = vrtDocument.pagesData.findIndex(p => p.weblink === result.weblink);
            if (pageIndex !== -1) {
                vrtDocument.pagesData[pageIndex].after = result.screenshot;
            }
        });
        
        // Update posts data with after screenshots
        results.filter(r => r.type === 'post' && r.success).forEach(result => {
            const postIndex = vrtDocument.postsData.findIndex(p => p.weblink === result.weblink);
            if (postIndex !== -1) {
                vrtDocument.postsData[postIndex].after = result.screenshot;
            }
        });
        
        // Update status and completion time
        vrtDocument.status = 'after_completed';
        vrtDocument.afterCompletedAt = new Date();
        
        await vrtDocument.save();
        
        const successCount = results.filter(r => r.success).length;
        const totalCount = results.length;
        
        console.log(`✅ Updated VRT document: ${successCount}/${totalCount} after screenshots captured`);
        
        // TODO: Trigger comparison process here
        // await startComparisonProcess(vrtDocumentId);
        
    } catch (error) {
        console.error('Error updating VRT document with after results:', error);
    }
} 