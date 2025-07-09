import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import TestResult from '@/models/TestResult';
import { uploadImageToCloudinary } from '@/helpers/cloudinary-upload';
import runLoginTest from '@/scripts/login-test.js';

export async function POST(request) {
  try {
    await connectDB();
    const { headless = true, ...body } = await request.json();
    // Run the Playwright login test directly (no child process)
    const logs = [];
    let resultJson = null;
    try {
      resultJson = await runLoginTest({
        url: body.url,
        username: body.username,
        password: body.password,
        timeout: body.timeout ?? 30000,
        headless,
        selectors: body.selectors ?? {
          username: '#user_login',
          password: '#user_pass',
          submitButton: '#wp-submit',
          dashboardIndicators: ['#wpadminbar', '.welcome-panel', '#dashboard-widgets-wrap'],
        },
        screenshots: body.screenshots ?? { fullPage: true },
      });
      logs.push({ type: 'info', message: 'Login test executed', timestamp: new Date().toISOString() });
    } catch (testError) {
      logs.push({ type: 'error', message: 'Login test error: ' + testError.message, timestamp: new Date().toISOString() });
    }
    let dbResult = null;
    if (resultJson && resultJson.screenshotBase64) {
      try {
        const uploadResult = await uploadImageToCloudinary(resultJson.screenshotBase64, `login-${resultJson.resultType.toLowerCase()}`);
        dbResult = await TestResult.create({
          type: resultJson.resultType,
          imageUrl: uploadResult.imageUrl,
          publicId: uploadResult.publicId,
          timestamp: new Date(),
          size: uploadResult.size,
          meta: { cloudinary: uploadResult.meta }
        });
        return NextResponse.json({
          success: resultJson.success,
          imageUrl: uploadResult.imageUrl,
          publicId: uploadResult.publicId,
          dbId: dbResult._id,
          logs,
        });
      } catch (cloudError) {
        logs.push({ type: 'error', message: 'Cloudinary upload error: ' + cloudError.message, timestamp: new Date().toISOString() });
        return NextResponse.json({ success: false, error: cloudError.message, logs });
      }
    } else {
      logs.push({ type: 'error', message: 'No screenshot data found. resultJson: ' + JSON.stringify(resultJson), timestamp: new Date().toISOString() });
      return NextResponse.json({ success: false, error: 'No screenshot data', logs, debug: { resultJson } });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}