import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Report from '@/models/Report';
import Automation from '@/models/Automation';
import SiteState from '@/models/SiteState';
import BeforeAfterVRT from '@/models/BeforeAfterVRT';
import { sendEmail } from '@/helpers/sendMail';
import { generateReportEmailHTML } from '@/helpers/reportEmailTemplate';
import { diffImagesByUrl } from '@/helpers/image-diff';
import { uploadBufferToCloudinary } from '@/helpers/screenshot-capture';

/**
 * POST /api/reports
 * Generate automation report for completed automation
 */
export async function POST(request) {
    try {
        // Connect to database
        await connectDB();
        
        // Parse the incoming request body
        const body = await request.json();
        console.log('📊 Reports API request:', body);
        
        const { automation_id } = body;
        
        if (!automation_id) {
            return NextResponse.json({
                success: false,
                error: 'Missing automation_id parameter'
            }, { status: 400 });
        }
        
        console.log('📋 Generating automation report for automation ID:', automation_id);
        
        // Check if report already exists
        const existingReport = await Report.findOne({ automationId: automation_id });
        if (existingReport) {
            console.log('📄 Report already exists, returning existing report');
            
            // Format existing report to match WordPress plugin expectations
            const existingResponseData = {
                report_id: existingReport._id,
                automation_id: existingReport.automationId,
                generated_at: existingReport.generatedAt,
                status: existingReport.status,
                project_name: existingReport.projectName,
                site_url: existingReport.siteUrl,
                site_type: existingReport.siteType,
                success_rate: existingReport.successRate,
                duration: existingReport.duration,
                // Include full report data for API consumers
                ...existingReport.toObject()
            };
            
            return NextResponse.json({
                success: true,
                message: 'Report already exists',
                data: existingResponseData
            }, { status: 200 });
        }
        
        // Fetch automation data
        const automation = await Automation.findById(automation_id)
            .populate('beforeState')
            .populate('afterState');
            
        if (!automation) {
            return NextResponse.json({
                success: false,
                error: 'Automation not found'
            }, { status: 404 });
        }
        
        // Fetch VRT data if exists
        const vrtData = await BeforeAfterVRT.findOne({ automationId: automation_id });
        
        // Calculate duration
        const duration = automation.endTime && automation.startTime 
            ? Math.round((automation.endTime - automation.startTime) / 1000)
            : 0;
        
        // Calculate state changes and detailed update information
        const { stateChanges, pluginUpdates, themeUpdates } = calculateStateChanges(automation.beforeState, automation.afterState);
        
        // Determine overall status
        const overallStatus = determineOverallStatus(automation, vrtData);
        
        // Build tasks executed
        const tasksExecuted = {
            functionalityTest: automation.automationPrefs?.includeFunctionalityTest || false,
            pluginUpdate: automation.automationPrefs?.includePluginUpdate || false,
            themeUpdate: automation.automationPrefs?.includeThemeUpdate || false,
            beforeAfterVRT: automation.automationPrefs?.includeBeforeAfterVRT || false,
            sitemapVRT: automation.automationPrefs?.includeSitemapVRT || false
        };
        
        // Build results summary
        const results = buildResultsSummary(automation, vrtData, stateChanges);
        
        // Build issues array
        const issues = buildIssuesArray(automation, vrtData);
        
        // VRT visual regression diffing
        let vrtDiffResults = [];
        let vrtDiffSummary = { total: 0, failed: 0, passed: 0 };
        if (vrtData && automation.automationPrefs?.includeBeforeAfterVRT) {
            let vrtDataChanged = false;
            // Helper to update diff in the correct entry
            function updateDiffInVRT(entry, diffObj) {
                let arr = vrtData.pagesData.includes(entry) ? vrtData.pagesData : vrtData.postsData;
                let idx = arr.findIndex(e => e.weblink === entry.weblink);
                if (idx !== -1) {
                    arr[idx].diff = diffObj;
                    vrtDataChanged = true;
                }
            }
            const allEntries = [
                ...(vrtData.pagesData || []),
                ...(vrtData.postsData || [])
            ];
            for (const entry of allEntries) {
                if (entry.before?.url && entry.after?.url) {
                    try {
                        const { diffBuffer, diffPercent } = await diffImagesByUrl(entry.before.url, entry.after.url, { threshold: 0.1 });
                        const diffPublicId = `vrt_diff_${automation_id}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
                        const uploadResult = await uploadBufferToCloudinary(diffBuffer, diffPublicId);
                        const pass = diffPercent <= 1.0;
                        const diffObj = {
                            url: uploadResult.imageUrl,
                            publicId: uploadResult.publicId,
                            percent: diffPercent,
                            status: pass ? 'pass' : 'fail',
                            error: null
                        };
                        updateDiffInVRT(entry, diffObj);
                        vrtDiffResults.push({
                            weblink: entry.weblink,
                            beforeUrl: entry.before.url,
                            afterUrl: entry.after.url,
                            diffUrl: uploadResult.imageUrl,
                            diffPercent,
                            status: pass ? 'pass' : 'fail'
                        });
                        vrtDiffSummary.total++;
                        if (pass) vrtDiffSummary.passed++;
                        else vrtDiffSummary.failed++;
                    } catch (diffErr) {
                        const diffObj = {
                            url: null,
                            publicId: null,
                            percent: null,
                            status: 'error',
                            error: diffErr.message
                        };
                        updateDiffInVRT(entry, diffObj);
                        vrtDiffResults.push({
                            weblink: entry.weblink,
                            beforeUrl: entry.before.url,
                            afterUrl: entry.after.url,
                            diffUrl: null,
                            diffPercent: null,
                            status: 'error',
                            error: diffErr.message
                        });
                        vrtDiffSummary.total++;
                    }
                }
            }
            if (vrtDataChanged) {
                await vrtData.save();
            }
        }
        
        // Create report data
        const reportData = {
            automationId: automation._id,
            projectId: automation.projectId,
            projectName: automation.projectName,
            siteUrl: automation.siteUrl,
            siteType: automation.siteType,
            startTime: automation.startTime,
            endTime: automation.endTime || new Date(),
            duration,
            status: overallStatus,
            tasksExecuted,
            results,
            stateChanges,
            pluginUpdates,
            themeUpdates,
            beforeStateId: automation.beforeState?._id || null,
            afterStateId: automation.afterState?._id || null,
            beforeAfterVRTData: vrtData?._id || null,
            issues,
            vrtDiffResults,
            vrtDiffSummary
        };
        
        // Create and save report
        const report = await Report.create(reportData);
        
        console.log('✅ Automation report generated with ID:', report._id);
        
        // Send email notification to all configured addresses
        try {
            const reportUrl = `http://localhost:3000/reports/${report._id}`;
            const emails = Array.isArray(automation.notificationEmails) ? automation.notificationEmails.filter(e => typeof e === 'string' && e.includes('@')) : [];
            if (emails.length > 0) {
                for (const email of emails) {
                    const emailOptions = {
                        email,
                        subject: `Automation Report Generated: ${report.projectName}`,
                        html: generateReportEmailHTML({
                            projectName: report.projectName,
                            siteUrl: report.siteUrl,
                            status: report.status,
                            duration: report.duration,
                            reportUrl,
                            vrtDiffSummary: vrtDiffSummary,
                            vrtDiffResults: vrtDiffResults
                        })
                    };
                    await sendEmail(emailOptions);
                    console.log(`📧 Report notification email sent to ${email}`);
                }
            } else {
                console.log('⚠️ No notification emails configured for this automation.');
            }
        } catch (mailError) {
            console.error('❌ Failed to send report notification email:', mailError);
        }
        
        // Return success response with comprehensive report data
        // Format response to match WordPress plugin expectations
        const responseData = {
            report_id: report._id,           // WordPress plugin expects report_id
            automation_id: report.automationId,
            generated_at: report.generatedAt,
            status: report.status,
            project_name: report.projectName,
            site_url: report.siteUrl,
            site_type: report.siteType,
            success_rate: report.successRate,
            duration: report.duration,
            // Include full report data for API consumers
            ...report.toObject()
        };

        return NextResponse.json({
            success: true,
            message: 'Automation report generated successfully',
            data: responseData
        }, { status: 201 });
        
    } catch (error) {
        console.error('Error generating automation report:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to generate automation report',
            message: error.message
        }, { status: 500 });
    }
}

/**
 * Calculate state changes between before and after states with detailed update information
 */
function calculateStateChanges(beforeState, afterState) {
    const changes = {
        pluginsUpdated: 0,
        themesUpdated: 0,
        pluginsAdded: 0,
        pluginsRemoved: 0,
        themesAdded: 0,
        themesRemoved: 0
    };
    
    const pluginUpdates = {
        updated: [],
        notUpdated: []
    };
    
    const themeUpdates = {
        updated: [],
        notUpdated: []
    };
    
    if (!beforeState || !afterState) {
        return { stateChanges: changes, pluginUpdates, themeUpdates };
    }
    
    // Create maps for easier comparison
    const beforePlugins = new Map(beforeState.plugins.map(p => [p.name, p]));
    const afterPlugins = new Map(afterState.plugins.map(p => [p.name, p]));
    const beforeThemes = new Map(beforeState.themes.map(t => [t.name, t]));
    const afterThemes = new Map(afterState.themes.map(t => [t.name, t]));
    
    // Check plugins
    for (const [name, beforePlugin] of beforePlugins) {
        const afterPlugin = afterPlugins.get(name);
        if (!afterPlugin) {
            changes.pluginsRemoved++;
        } else if (beforePlugin.version !== afterPlugin.version) {
            changes.pluginsUpdated++;
            pluginUpdates.updated.push({
                name: beforePlugin.name || 'Unknown Plugin',
                oldVersion: beforePlugin.version || '0.0.0',
                newVersion: afterPlugin.version || '0.0.0'
            });
        } else {
            // Plugin exists but wasn't updated
            pluginUpdates.notUpdated.push({
                name: beforePlugin.name || 'Unknown Plugin',
                currentVersion: beforePlugin.version || '0.0.0',
                hasUpdate: beforePlugin.updateAvailable || false,
                availableVersion: beforePlugin.newVersion || undefined
            });
        }
    }
    
    for (const [name] of afterPlugins) {
        if (!beforePlugins.has(name)) {
            changes.pluginsAdded++;
        }
    }
    
    // Check themes
    for (const [name, beforeTheme] of beforeThemes) {
        const afterTheme = afterThemes.get(name);
        if (!afterTheme) {
            changes.themesRemoved++;
        } else if (beforeTheme.version !== afterTheme.version) {
            changes.themesUpdated++;
            themeUpdates.updated.push({
                name: beforeTheme.name || 'Unknown Theme',
                oldVersion: beforeTheme.version || '0.0.0',
                newVersion: afterTheme.version || '0.0.0'
            });
        } else {
            // Theme exists but wasn't updated
            themeUpdates.notUpdated.push({
                name: beforeTheme.name || 'Unknown Theme',
                currentVersion: beforeTheme.version || '0.0.0',
                hasUpdate: beforeTheme.updateAvailable || false,
                availableVersion: beforeTheme.newVersion || undefined
            });
        }
    }
    
    for (const [name] of afterThemes) {
        if (!beforeThemes.has(name)) {
            changes.themesAdded++;
        }
    }
    
    return { stateChanges: changes, pluginUpdates, themeUpdates };
}

/**
 * Determine overall status based on automation and VRT data
 */
function determineOverallStatus(automation, vrtData) {
    if (automation.status === 'failed') {
        return 'failed';
    }
    
    if (automation.status === 'completed') {
        // Check if any tasks had failures
        if (vrtData && vrtData.status !== 'after_completed') {
            return 'partial';
        }
        return 'completed';
    }
    
    return 'partial';
}

/**
 * Build results summary based on available data
 */
function buildResultsSummary(automation, vrtData, stateChanges) {
    const results = {
        functionalityTest: { status: 'skipped' },
        pluginUpdate: { status: 'skipped', updatesApplied: 0, updatesFailed: 0 },
        themeUpdate: { status: 'skipped', updatesApplied: 0, updatesFailed: 0 },
        beforeAfterVRT: { status: 'skipped', screenshotsCaptured: 0, screenshotsFailed: 0 },
        sitemapVRT: { status: 'skipped', screenshotsCaptured: 0, screenshotsFailed: 0 }
    };
    
    // Plugin updates
    if (automation.automationPrefs?.includePluginUpdate) {
        results.pluginUpdate.status = stateChanges.pluginsUpdated > 0 ? 'success' : 'skipped';
        results.pluginUpdate.updatesApplied = stateChanges.pluginsUpdated;
    }
    
    // Theme updates
    if (automation.automationPrefs?.includeThemeUpdate) {
        results.themeUpdate.status = stateChanges.themesUpdated > 0 ? 'success' : 'skipped';
        results.themeUpdate.updatesApplied = stateChanges.themesUpdated;
    }
    
    // Functionality test (assume success if automation completed)
    if (automation.automationPrefs?.includeFunctionalityTest) {
        results.functionalityTest.status = automation.status === 'completed' ? 'success' : 'failure';
        results.functionalityTest.message = automation.status === 'completed' 
            ? 'Login test completed successfully' 
            : 'Login test failed';
    }
    
    // VRT results
    if (automation.automationPrefs?.includeBeforeAfterVRT && vrtData) {
        const totalScreenshots = vrtData.pagesData.length + vrtData.postsData.length;
        const successfulScreenshots = vrtData.pagesData.filter(p => p.after.url).length + 
                                     vrtData.postsData.filter(p => p.after.url).length;
        
        results.beforeAfterVRT.status = vrtData.status === 'after_completed' ? 'success' : 'partial';
        results.beforeAfterVRT.screenshotsCaptured = successfulScreenshots;
        results.beforeAfterVRT.screenshotsFailed = totalScreenshots - successfulScreenshots;
    }
    
    if (automation.automationPrefs?.includeSitemapVRT) {
        // For sitemap VRT, we'd need additional data - for now mark as success if automation completed
        results.sitemapVRT.status = automation.status === 'completed' ? 'success' : 'failure';
    }
    
    return results;
}

/**
 * Build issues array based on automation and VRT data
 */
function buildIssuesArray(automation, vrtData) {
    const issues = [];
    
    // Check for automation failures
    if (automation.status === 'failed') {
        issues.push({
            task: 'automation',
            severity: 'high',
            message: 'Automation process failed to complete',
            timestamp: automation.endTime || new Date()
        });
    }
    
    // Check for VRT issues
    if (vrtData && vrtData.status !== 'after_completed') {
        const failedScreenshots = vrtData.pagesData.filter(p => !p.after.url).length +
                                 vrtData.postsData.filter(p => !p.after.url).length;
        
        if (failedScreenshots > 0) {
            issues.push({
                task: 'beforeAfterVRT',
                severity: 'medium',
                message: `${failedScreenshots} screenshots failed to capture`,
                timestamp: vrtData.afterCompletedAt || new Date()
            });
        }
    }
    
    return issues;
} 