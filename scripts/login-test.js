import { chromium } from 'playwright';

// Accept config as argument for flexibility
async function runLoginTest(config) {
  const browser = await chromium.launch({ headless: config.headless });
  const page = await browser.newPage();
  page.setDefaultTimeout(config.timeout);
  let screenshotBase64 = null;
  let resultType = 'Success';
  try {
    console.log('🚀 Starting login test...');
    console.log(`📍 Navigating to: ${config.url}`);
    await page.goto(config.url);
    console.log('⏳ Waiting for login form to load...');
    await page.waitForSelector(config.selectors.username);
    console.log('📝 Filling in credentials...');
    await page.fill(config.selectors.username, config.username);
    await page.fill(config.selectors.password, config.password);
    console.log('🔐 Submitting login form...');
    await page.click(config.selectors.submitButton);
    console.log('⏳ Waiting for dashboard to load...');
    await Promise.race([
      page.waitForSelector(config.selectors.dashboardIndicators[0]),
      page.waitForSelector(config.selectors.dashboardIndicators[1]),
      page.waitForSelector(config.selectors.dashboardIndicators[2]),
      page.waitForURL('**/wp-admin/index.php'),
    ]);
    console.log('✅ Login test passed - WordPress Dashboard loaded successfully!');
    const buffer = await page.screenshot({ fullPage: config.screenshots.fullPage });
    screenshotBase64 = buffer.toString('base64');
    resultType = 'Success';
    return { success: true, screenshotBase64, resultType };
  } catch (error) {
    console.error('❌ Login test failed');
    console.error('Error details:', error.message);
    try {
      const buffer = await page.screenshot({ fullPage: config.screenshots.fullPage });
      screenshotBase64 = buffer.toString('base64');
      resultType = 'Failure';
    } catch (screenshotError) {}
    return { success: false, screenshotBase64, resultType };
  } finally {
    console.log('🧹 Cleaning up browser...');
    await browser.close();
  }
}

export default runLoginTest;