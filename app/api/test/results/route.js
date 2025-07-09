import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import TestResult from '@/models/TestResult';

export async function GET() {
  try {
    await connectDB();
    // Get last 10 test results from DB, newest first
    const results = await TestResult.find({})
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    // Prepare stats
    const stats = {
      total: await TestResult.countDocuments(),
      passed: await TestResult.countDocuments({ type: 'Success' }),
      failed: await TestResult.countDocuments({ type: 'Failure' })
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
    });
  } catch (error) {
    return NextResponse.json({
      error: error.message,
      lastRun: null,
      results: [],
      stats: { total: 0, passed: 0, failed: 0 }
    }, { status: 500 });
  }
}