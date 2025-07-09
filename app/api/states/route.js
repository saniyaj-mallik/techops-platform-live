import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import SiteState from '@/models/SiteState';
import Automation from '@/models/Automation';

/**
 * POST /api/states
 * Receives plugin and theme state information before automation starts
 */
export async function POST(request) {
    try {
        // Connect to database
        await connectDB();
        
        // console.log('=== NEW STATE SUBMISSION ===');
        // Parse the incoming request body
        const body = await request.json();
        

        // Normalize the data structure (handle both formats)
        const normalizedPlugins = body.plugins?.map(plugin => ({
            file: plugin.file || null,
            name: plugin.name,
            version: plugin.version || plugin.current_version,
            active: plugin.active,
            updateAvailable: plugin.update_available || plugin.updateAvailable || false,
            newVersion: plugin.new_version || plugin.newVersion || null,
            author: plugin.author || null,
            description: plugin.description || null
        })) || [];
        
        const normalizedThemes = body.themes?.map(theme => ({
            slug: theme.slug || null,
            name: theme.name,
            version: theme.version || theme.current_version,
            active: theme.active,
            updateAvailable: theme.update_available || theme.updateAvailable || false,
            newVersion: theme.new_version || theme.newVersion || null,
            author: theme.author || null,
            description: theme.description || null
        })) || [];

        // Extract site name from URL if not provided
        const siteName = body.site_name || new URL(body.site_url).hostname;

        // Calculate summary statistics
        const pluginUpdateCount = normalizedPlugins.filter(p => p.updateAvailable).length;
        const themeUpdateCount = normalizedThemes.filter(t => t.updateAvailable).length;
        const activeTheme = normalizedThemes.find(t => t.active)?.name || null;

        // Validate required fields
        if (!body.stateType) {
            return NextResponse.json({
                success: false,
                error: 'Missing required field: stateType (must be "before" or "after")'
            }, { status: 400 });
        }

        if (!['before', 'after'].includes(body.stateType)) {
            return NextResponse.json({
                success: false,
                error: 'Invalid stateType. Must be "before" or "after"'
            }, { status: 400 });
        }

        // Create site state record
        const siteStateData = {
            siteUrl: body.site_url,
            siteName,
            plugins: normalizedPlugins,
            themes: normalizedThemes,
            stateType: body.stateType,  // Required field
            wordpressVersion: body.wordpress_version || null,
            phpVersion: body.php_version || null,
            isMultisite: body.is_multisite || false,
            activeTheme,
            pluginUpdateCount,
            themeUpdateCount,
            timestamp: body.timestamp ? new Date(body.timestamp) : new Date()
        };

        // Add automationId if provided
        if (body.automationId) {
            siteStateData.automationId = body.automationId;
        }

        const siteState = await SiteState.create(siteStateData);

        // If this is a 'before' state and we have an automationId, update the automation
        if (body.stateType === 'before' && body.automationId) {
            try {
                await Automation.findByIdAndUpdate(body.automationId, {
                    beforeState: siteState._id
                });
                // console.log('✓ Updated automation beforeState:', body.automationId);
            } catch (error) {
                console.error('⚠ Failed to update automation beforeState:', error.message);
            }
        }

        // If this is an 'after' state and we have an automationId, update the automation
        if (body.stateType === 'after' && body.automationId) {
            try {
                await Automation.findByIdAndUpdate(body.automationId, {
                    afterState: siteState._id,
                    status: 'completed',
                    endTime: new Date()
                });
                // console.log('✓ Updated automation afterState and marked completed:', body.automationId);
            } catch (error) {
                console.error('⚠ Failed to update automation afterState:', error.message);
            }
        }

        

        // Return success response
        // Build response data
        const responseData = {
            stateId: siteState._id,
            site_url: body.site_url,
            site_name: siteName,
            plugins_count: normalizedPlugins.length,
            themes_count: normalizedThemes.length,
            plugin_updates_available: pluginUpdateCount,
            theme_updates_available: themeUpdateCount,
            active_theme: activeTheme,
            wordpress_version: body.wordpress_version,
            php_version: body.php_version,
            timestamp: siteState.timestamp
        };

        // Add automationId to response if it was provided
        if (body.automationId) {
            responseData.automationId = body.automationId;
        }

        // Add stateType to response if it was provided
        if (body.stateType) {
            responseData.stateType = body.stateType;
        }

        return NextResponse.json({
            success: true,
            message: 'State information received and saved successfully',
            data: responseData
        }, { status: 200 });

    } catch (error) {
        console.error('Error processing state information:', error);
        console.error('Full error:', error.stack);
        
        return NextResponse.json({
            success: false,
            error: 'Failed to process state information',
            message: error.message
        }, { status: 500 });
    }
}

