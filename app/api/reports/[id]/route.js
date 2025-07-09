import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Report from '@/models/Report';

/**
 * GET /api/reports/[id]
 * Retrieve a specific automation report by report ID
 */
export async function GET(request, { params }) {
    try {
        // Connect to database
        await connectDB();
        
        // Await params for Next.js 15 compatibility
        const { id } = await params;
        
        if (!id) {
            return NextResponse.json({
                success: false,
                error: 'Missing report ID parameter'
            }, { status: 400 });
        }
        
        // Find report by ID with populated related data
        const report = await Report.findById(id)
            .populate('projectId', 'name stagingSiteUrl liveSiteUrl')
            .populate('beforeStateId')
            .populate('afterStateId')
            .populate('beforeAfterVRTData');
            
        if (!report) {
            return NextResponse.json({
                success: false,
                error: 'Report not found'
            }, { status: 404 });
        }
        
        return NextResponse.json({
            success: true,
            data: report
        }, { status: 200 });
        
    } catch (error) {
        console.error('Error retrieving report:', error);
        
        // Handle invalid ObjectId format
        if (error.name === 'CastError') {
            return NextResponse.json({
                success: false,
                error: 'Invalid report ID format'
            }, { status: 400 });
        }
        
        return NextResponse.json({
            success: false,
            error: 'Failed to retrieve report',
            message: error.message
        }, { status: 500 });
    }
} 