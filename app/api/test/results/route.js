import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import TestResult from '@/models/TestResult';

export const dynamic = 'force-dynamic'; // Disable static optimization for this route
export const maxDuration = 60; // Set maximum duration to 60 seconds

export async function GET() {
  try {
    await connectDB();
    
    // Set timeout for database operations
    const timeout = 30000; // 30 seconds
    
    // Run queries in parallel for better performance
    const [results, total, passed, failed] = await Promise.all([
      TestResult.find({})
        .sort({ timestamp: -1 })
        .limit(10)
        .lean()
        .maxTimeMS(timeout),
      TestResult.countDocuments().maxTimeMS(timeout),
      TestResult.countDocuments({ type: 'Success' }).maxTimeMS(timeout),
      TestResult.countDocuments({ type: 'Failure' }).maxTimeMS(timeout)
    ]);

    // Prepare stats
    const stats = {
      total,
      passed,
      failed
    };

    // Get latest test result info
    const lastRun = results.length > 0 ? {
      success: results[0].type === 'Success',
      timestamp: results[0].timestamp,
      imageUrl: results[0].imageUrl,
      publicId: results[0].publicId,
      size: results[0].size,
      error: results[0].type === 'Failure' ? 'Login form submission failed' : null
    } : null;

    return NextResponse.json({
      lastRun,
      results,
      stats
    }, {
      headers: {
        // Add cache control headers
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Test results API error:', error);
    
    // Handle specific error types
    if (error.name === 'MongooseError' && error.message.includes('timeout')) {
      return NextResponse.json({
        error: 'Request timed out. Please try again.',
        lastRun: null,
        results: [],
        stats: { total: 0, passed: 0, failed: 0 }
      }, { 
        status: 504,
        headers: {
          'Retry-After': '5'
        }
      });
    }
    
    return NextResponse.json({
      error: 'Failed to fetch test results. Please try again later.',
      lastRun: null,
      results: [],
      stats: { total: 0, passed: 0, failed: 0 }
    }, { status: 500 });
  }
}