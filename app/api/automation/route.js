import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Automation from '@/models/Automation';
import Project from '@/models/Project';
import BeforeAfterVRT from '@/models/BeforeAfterVRT';
import { captureAndUploadScreenshot } from '@/helpers/screenshot-capture';

/**
 * POST /api/automation
 * Receives automation requests and creates automation records
 */
export async function POST(request) {
    try {
        // Connect to database
        await connectDB();
        
        // Parse the incoming request body
        const body = await request.json();

        
        // Validate required fields
        if (!body.project_details?.project_name || !body.site_info?.site_url) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields: project_name and site_url are required'
            }, { status: 400 });
        }

        // Find or create project
        const projectName = body.project_details.project_name;
        const siteUrl = body.site_info.site_url;
        const siteType = body.project_details.site_type || 'staging';
        let providedProjectId = body.project_id; // Check if project ID is provided

        let project;

        // If project ID is provided, try to find and link to existing project
        if (providedProjectId) {
            console.log('Linking to existing project:', providedProjectId);
            project = await Project.findById(providedProjectId);
            
            if (project) {
                console.log('✓ Found existing project to link:', project.name);
                
                // Update the appropriate site URL based on site type
                const updateData = {};
                if (siteType === 'staging' && !project.stagingSiteUrl) {
                    updateData.stagingSiteUrl = siteUrl;
                    updateData.stagingSiteMap = {
                        pageSitemapUrl: body.sitemap_config?.page_sitemap_url || null,
                        postSitemapUrl: body.sitemap_config?.post_sitemap_url || null
                    };
                    console.log('Linking staging site to existing project');
                } else if (siteType === 'live' && !project.liveSiteUrl) {
                    updateData.liveSiteUrl = siteUrl;
                    updateData.liveSiteMap = {
                        pageSitemapUrl: body.sitemap_config?.page_sitemap_url || null,
                        postSitemapUrl: body.sitemap_config?.post_sitemap_url || null
                    };
                    console.log('Linking live site to existing project');
                } else {
                    // Site URL already exists for this type, just update sitemap
                    if (siteType === 'staging') {
                        updateData.stagingSiteMap = {
                            pageSitemapUrl: body.sitemap_config?.page_sitemap_url || project.stagingSiteMap?.pageSitemapUrl || null,
                            postSitemapUrl: body.sitemap_config?.post_sitemap_url || project.stagingSiteMap?.postSitemapUrl || null
                        };
                    } else {
                        updateData.liveSiteMap = {
                            pageSitemapUrl: body.sitemap_config?.page_sitemap_url || project.liveSiteMap?.pageSitemapUrl || null,
                            postSitemapUrl: body.sitemap_config?.post_sitemap_url || project.liveSiteMap?.postSitemapUrl || null
                        };
                    }
                    console.log('Updating sitemap configuration for existing site');
                }
                
                // Apply updates if any
                if (Object.keys(updateData).length > 0) {
                    project = await Project.findByIdAndUpdate(providedProjectId, updateData, { new: true });
                    console.log('✓ Updated project with new site info');
                }
            } else {
                console.warn('Project ID provided but not found:', providedProjectId);
                // Fall back to normal logic
                providedProjectId = null;
            }
        }

        // If no project ID provided or project not found, use original logic
        if (!project) {
            // Find project by site URL only (ignore name)
            const projectQuery = {};
            if (siteType === 'staging') {
                projectQuery.stagingSiteUrl = siteUrl;
            } else {
                projectQuery.liveSiteUrl = siteUrl;
            }

            project = await Project.findOne(projectQuery);
            
            if (!project) {
                // No project found with this site URL, create new one
                const projectData = {
                    name: projectName
                };
                
                if (siteType === 'staging') {
                    projectData.stagingSiteUrl = siteUrl;
                    projectData.stagingSiteMap = {
                        pageSitemapUrl: body.sitemap_config?.page_sitemap_url || null,
                        postSitemapUrl: body.sitemap_config?.post_sitemap_url || null
                    };

                } else {
                    projectData.liveSiteUrl = siteUrl;
                    projectData.liveSiteMap = {
                        pageSitemapUrl: body.sitemap_config?.page_sitemap_url || null,
                        postSitemapUrl: body.sitemap_config?.post_sitemap_url || null
                    };

                }
                
                // console.log('About to create project with data:', JSON.stringify(projectData, null, 2));
                project = await Project.create(projectData);
                // console.log('✓ Created new project:', project._id);
                // console.log('Project after creation:', JSON.stringify(project.toObject(), null, 2));
            } else {
                // Update existing project with sitemap data and ensure sitemap fields exist
                const updateData = {};

                
                // Update sitemap data if provided
                if (siteType === 'staging') {
                    updateData.stagingSiteMap = {
                        pageSitemapUrl: body.sitemap_config?.page_sitemap_url || project.stagingSiteMap?.pageSitemapUrl || null,
                        postSitemapUrl: body.sitemap_config?.post_sitemap_url || project.stagingSiteMap?.postSitemapUrl || null
                    };
                } else {
                    updateData.liveSiteMap = {
                        pageSitemapUrl: body.sitemap_config?.page_sitemap_url || project.liveSiteMap?.pageSitemapUrl || null,
                        postSitemapUrl: body.sitemap_config?.post_sitemap_url || project.liveSiteMap?.postSitemapUrl || null
                    };
                }
                
                // Only update if there are changes to make
                if (Object.keys(updateData).length > 0) {
                    // console.log('About to update project with data:', JSON.stringify(updateData, null, 2));
                    project = await Project.findByIdAndUpdate(project._id, updateData, { new: true });
                    // console.log('Project after update:', JSON.stringify(project.toObject(), null, 2));
                }
                console.log('✓ Found existing project by site URL:', project._id);
            }
        }

        // Extract site name from URL
        const siteName = new URL(siteUrl).hostname;

        // Create automation record
        const automationData = {
            siteUrl,
            projectId: project._id,
            projectName,
            siteType,
            status: 'pending',
            
            automationPrefs: {
                includeFunctionalityTest: body.automation_preferences?.include_functionality_test || false,
                includePluginUpdate: body.automation_preferences?.include_plugin_update || false,
                includeThemeUpdate: body.automation_preferences?.include_theme_update || false,
                includeBeforeAfterVRT: body.automation_preferences?.include_before_after_vrt || false,
                includeSitemapVRT: body.automation_preferences?.include_sitemap_vrt || false,
                automationFrequency: body.automation_preferences?.automation_frequency || 'manual',
                automationTime: body.automation_preferences?.automation_time || '02:00'
            },
            
            siteInfo: {
                siteName,
                wordpressVersion: body.site_info?.wordpress_version || null,
                adminEmail: null, // Not provided in current data
                isMultisite: false, // Not provided in current data
                activeTheme: null, // Not provided in current data
                activeThemeVersion: null // Not provided in current data
            },
            
            config: {
                timeout: parseInt(body.platform_config?.timeout) || 30000,
                headless: body.platform_config?.headless !== false, // Default to true
                screenshotFull: body.platform_config?.screenshot_full !== false // Default to true
            },
            
            sitemapConfig: {
                pageSitemapUrl: body.sitemap_config?.page_sitemap_url || null,
                postSitemapUrl: body.sitemap_config?.post_sitemap_url || null
            },
            
            startTime: body.timestamp ? new Date(body.timestamp) : new Date(),
            notificationEmails: Array.isArray(body.notification_emails) ? body.notification_emails : []
        };

        // console.log('About to create automation with data:', JSON.stringify(automationData, null, 2));
        const automation = await Automation.create(automationData);
        // console.log('Automation after creation:', JSON.stringify(automation.toObject(), null, 2));

        // Handle Before After VRT reference screenshots
        if (automationData.automationPrefs.includeBeforeAfterVRT) {
            console.log('✓ Before After VRT enabled - initiating reference screenshot capture');
            
            try {
                // Capture reference screenshots (blocking)
                await captureReferenceScreenshots(automation._id, project, siteUrl, projectName);
                console.log('✅ Reference screenshots completed successfully');
            } catch (error) {
                console.error('Reference screenshot capture failed:', error);
                // Continue anyway, don't fail the automation
            }
        }

        // Return success response with automation data
        return NextResponse.json({
            success: true,
            message: 'Automation created successfully',
            data: {
                automationId: automation._id,
                projectId: project._id,
                project_name: projectName,
                site_url: siteUrl,
                site_type: siteType,
                status: automation.status,
                tasks: {
                    functionality_test: automationData.automationPrefs.includeFunctionalityTest,
                    plugin_update: automationData.automationPrefs.includePluginUpdate,
                    theme_update: automationData.automationPrefs.includeThemeUpdate,
                    before_after_vrt: automationData.automationPrefs.includeBeforeAfterVRT,
                    sitemap_vrt: automationData.automationPrefs.includeSitemapVRT
                },
                timestamp: automation.startTime
            }
        }, { status: 201 });

    } catch (error) {
        console.error('Error processing automation request:', error);
        console.error('Full error:', error.stack);
        
        return NextResponse.json({
            success: false,
            error: 'Failed to process automation request',
            message: error.message
        }, { status: 500 });
    }
}

/**
 * Capture reference screenshots for Before After VRT test (non-blocking)
 * @param {string} automationId - Automation ID to link screenshots
 * @param {Object} project - Project document
 * @param {string} siteUrl - Site URL
 * @param {string} projectName - Project name
 */
async function captureReferenceScreenshots(automationId, project, siteUrl, projectName) {
    try {
        console.log('🔄 Starting reference screenshot capture for automation:', automationId);
        
        // Get sitemap URLs from project
        const isStaging = siteUrl && project.stagingSiteUrl && 
            new URL(siteUrl).hostname.toLowerCase() === new URL(project.stagingSiteUrl).hostname.toLowerCase();
        
        let siteUrls = isStaging ? project.stagingSiteUrls : project.liveSiteUrls;
        
        // If no sitemap URLs found in project, try to extract them from automation config
        if (!siteUrls || (!siteUrls.pages?.length && !siteUrls.posts?.length)) {
            console.log('⚠ No sitemap URLs found in project, attempting to extract from automation config...');
            
            // Find the automation to get sitemap config
            const automation = await Automation.findById(automationId);
            if (!automation || !automation.sitemapConfig || 
                (!automation.sitemapConfig.pageSitemapUrl && !automation.sitemapConfig.postSitemapUrl)) {
                console.warn('⚠ No sitemap URLs configured in automation - cannot capture reference screenshots');
                return;
            }
            
            try {
                // Extract sitemap URLs directly from automation config
                const extractedUrls = { pages: [], posts: [] };
                
                // Extract page URLs if configured
                if (automation.sitemapConfig.pageSitemapUrl) {
                    console.log('Fetching page sitemap:', automation.sitemapConfig.pageSitemapUrl);
                    try {
                        const response = await fetch(automation.sitemapConfig.pageSitemapUrl);
                        if (response.ok) {
                            const xmlText = await response.text();
                            const locMatches = xmlText.match(/<loc>(.*?)<\/loc>/g);
                            if (locMatches) {
                                const pageUrls = locMatches.map(match => match.replace(/<\/?loc>/g, '').trim())
                                    .filter(url => url && url.startsWith('http'));
                                extractedUrls.pages = pageUrls;
                                console.log(`Found ${pageUrls.length} page URLs`);
                            }
                        }
                    } catch (pageError) {
                        console.error('Failed to fetch page sitemap:', pageError.message);
                    }
                }
                
                // Extract post URLs if configured
                if (automation.sitemapConfig.postSitemapUrl) {
                    console.log('Fetching post sitemap:', automation.sitemapConfig.postSitemapUrl);
                    try {
                        const response = await fetch(automation.sitemapConfig.postSitemapUrl);
                        if (response.ok) {
                            const xmlText = await response.text();
                            const locMatches = xmlText.match(/<loc>(.*?)<\/loc>/g);
                            if (locMatches) {
                                const postUrls = locMatches.map(match => match.replace(/<\/?loc>/g, '').trim())
                                    .filter(url => url && url.startsWith('http'));
                                extractedUrls.posts = postUrls;
                                console.log(`Found ${postUrls.length} post URLs`);
                            }
                        }
                    } catch (postError) {
                        console.error('Failed to fetch post sitemap:', postError.message);
                    }
                }
                
                // Fallback to default sitemap if no URLs found
                if (extractedUrls.pages.length === 0 && extractedUrls.posts.length === 0) {
                    console.log('No URLs from specific sitemaps, trying default sitemap:', `${siteUrl}/sitemap.xml`);
                    try {
                        const response = await fetch(`${siteUrl}/sitemap.xml`);
                        if (response.ok) {
                            const xmlText = await response.text();
                            const locMatches = xmlText.match(/<loc>(.*?)<\/loc>/g);
                            if (locMatches) {
                                const allUrls = locMatches.map(match => match.replace(/<\/?loc>/g, '').trim())
                                    .filter(url => url && url.startsWith('http'));
                                extractedUrls.pages = allUrls;
                                console.log(`Found ${allUrls.length} URLs from default sitemap`);
                            }
                        }
                    } catch (defaultError) {
                        console.error('Default sitemap also failed:', defaultError.message);
                    }
                }
                
                if (extractedUrls.pages.length === 0 && extractedUrls.posts.length === 0) {
                    console.warn('⚠ No URLs extracted from any sitemap - cannot capture reference screenshots');
                    return;
                }
                
                // Store extracted URLs in project for future use
                const updateData = {};
                if (isStaging) {
                    updateData.stagingSiteUrls = {
                        pages: extractedUrls.pages,
                        posts: extractedUrls.posts,
                        lastFetched: new Date()
                    };
                } else {
                    updateData.liveSiteUrls = {
                        pages: extractedUrls.pages,
                        posts: extractedUrls.posts,
                        lastFetched: new Date()
                    };
                }
                
                await Project.findByIdAndUpdate(project._id, updateData);
                console.log(`✅ Extracted and stored ${extractedUrls.pages.length} pages and ${extractedUrls.posts.length} posts`);
                
                // Use the extracted URLs
                siteUrls = {
                    pages: extractedUrls.pages,
                    posts: extractedUrls.posts,
                    lastFetched: new Date()
                };
                
            } catch (extractError) {
                console.error('❌ Failed to extract sitemap URLs:', extractError.message);
                return;
            }
        }
        
        // Prepare pages and posts data structure
        const pagesData = (siteUrls.pages || []).map(url => ({
            weblink: url,
            before: { url: null, publicId: null },
            after: { url: null, publicId: null }
        }));
        
        const postsData = (siteUrls.posts || []).map(url => ({
            weblink: url,
            before: { url: null, publicId: null },
            after: { url: null, publicId: null }
        }));
        
        // Create BeforeAfterVRT document
        const vrtDocument = await BeforeAfterVRT.create({
            automationId,
            siteUrl,
            projectName,
            projectId: project._id,
            pagesData,
            postsData,
            status: 'before_pending'
        });
        
        console.log(`📸 Created VRT document with ${pagesData.length} pages and ${postsData.length} posts`);
        
        // Process screenshot capture (blocking)
        await processBeforeScreenshots(vrtDocument._id, pagesData, postsData);
            
    } catch (error) {
        console.error('Error in captureReferenceScreenshots:', error);
    }
}

/**
 * Process before screenshots capture (background process)
 * @param {string} vrtDocumentId - VRT document ID
 * @param {Array} pagesData - Pages to capture
 * @param {Array} postsData - Posts to capture
 */
async function processBeforeScreenshots(vrtDocumentId, pagesData, postsData) {
    try {
        console.log('📸 Processing before screenshots for VRT document:', vrtDocumentId);
        
        // Combine all URLs for processing
        const allUrls = [
            ...pagesData.map(page => ({ ...page, type: 'page' })),
            ...postsData.map(post => ({ ...post, type: 'post' }))
        ];
        
        console.log(`📊 Total URLs to capture: ${allUrls.length}`);
        
        // Process screenshots one by one (sequential processing)
        const results = [];
        
        for (let i = 0; i < allUrls.length; i++) {
            const urlData = allUrls[i];
            console.log(`📸 Processing screenshot ${i + 1}/${allUrls.length}: ${urlData.weblink}`);
            
            try {
                // Use helper function directly with proper options
                const screenshot = await captureAndUploadScreenshot(urlData.weblink, {
                    phase: 'before',
                    documentId: vrtDocumentId,
                    type: urlData.type,
                    fullPage: true,
                    timeout: 30000
                });
                
                results.push({
                    weblink: urlData.weblink,
                    type: urlData.type,
                    success: true,
                    screenshot: {
                        url: screenshot.url,
                        publicId: screenshot.publicId
                    }
                });
                
                console.log(`✅ Screenshot ${i + 1}/${allUrls.length} completed successfully`);
                
            } catch (error) {
                console.error(`❌ Screenshot ${i + 1}/${allUrls.length} failed for ${urlData.weblink}:`, error.message);
                results.push({
                    weblink: urlData.weblink,
                    type: urlData.type,
                    success: false,
                    error: error.message
                });
            }
            
            // Delay between each screenshot for stability
            if (i < allUrls.length - 1) {
                console.log(`⏳ Waiting 2 seconds before next screenshot...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        // Update VRT document with results
        await updateVRTDocumentWithResults(vrtDocumentId, results, 'before');
        
        console.log('✅ Before screenshot capture completed');
        
    } catch (error) {
        console.error('Error in processBeforeScreenshots:', error);
    }
}

/**
 * Capture a single screenshot and upload to Cloudinary
 * @param {string} url - URL to capture
 * @param {string} phase - 'before' or 'after'
 * @param {string} vrtDocumentId - VRT document ID for organization
 * @returns {Object} Screenshot data with Cloudinary URL and public ID
 */
async function captureScreenshot(url, phase, vrtDocumentId) {
    console.log(`📸 Capturing ${phase} screenshot for: ${url}`);
    
    try {
        const screenshot = await captureAndUploadScreenshot(url, {
            phase,
            documentId: vrtDocumentId,
            type: 'page', // Default to page, can be overridden by caller
            fullPage: true,
            timeout: 30000
        });
        
        return {
            url: screenshot.url,
            publicId: screenshot.publicId
        };
    } catch (error) {
        console.error(`❌ Screenshot capture failed for ${url}:`, error.message);
        throw error;
    }
}

/**
 * Update VRT document with screenshot results
 * @param {string} vrtDocumentId - VRT document ID
 * @param {Array} results - Screenshot results
 * @param {string} phase - 'before' or 'after'
 */
async function updateVRTDocumentWithResults(vrtDocumentId, results, phase) {
    try {
        const vrtDocument = await BeforeAfterVRT.findById(vrtDocumentId);
        if (!vrtDocument) {
            console.error('VRT document not found:', vrtDocumentId);
            return;
        }
        
        // Update pages data
        results.filter(r => r.type === 'page' && r.success).forEach(result => {
            const pageIndex = vrtDocument.pagesData.findIndex(p => p.weblink === result.weblink);
            if (pageIndex !== -1) {
                vrtDocument.pagesData[pageIndex][phase] = result.screenshot;
            }
        });
        
        // Update posts data
        results.filter(r => r.type === 'post' && r.success).forEach(result => {
            const postIndex = vrtDocument.postsData.findIndex(p => p.weblink === result.weblink);
            if (postIndex !== -1) {
                vrtDocument.postsData[postIndex][phase] = result.screenshot;
            }
        });
        
        // Update status and completion time
        if (phase === 'before') {
            vrtDocument.status = 'before_completed';
            vrtDocument.beforeCompletedAt = new Date();
        } else {
            vrtDocument.status = 'after_completed';
            vrtDocument.afterCompletedAt = new Date();
        }
        
        await vrtDocument.save();
        
        const successCount = results.filter(r => r.success).length;
        const totalCount = results.length;
        
        console.log(`✅ Updated VRT document: ${successCount}/${totalCount} ${phase} screenshots captured`);
        
    } catch (error) {
        console.error('Error updating VRT document:', error);
    }
} 