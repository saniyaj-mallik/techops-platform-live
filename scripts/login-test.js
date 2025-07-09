import { chromium } from 'playwright';

async function runLoginTest(config) {
  let browser = null;
  let context = null;
  let page = null;
  let screenshotBase64 = null;
  let resultType = 'Success';

  try {
    console.log('🚀 Starting login test...');
    
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process'
      ]
    });

    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    page = await context.newPage();
    page.setDefaultTimeout(config.timeout || 30000);

    console.log(`📍 Navigating to: ${config.url}`);
    await page.goto(config.url, { waitUntil: 'domcontentloaded' });

    console.log('📝 Filling login form...');
    await page.waitForSelector(config.selectors.username, { state: 'visible' });
    await page.fill(config.selectors.username, config.username);
    await page.fill(config.selectors.password, config.password);
    
    console.log('🔐 Submitting login form...');
    await page.click(config.selectors.submitButton);

    // Check for successful login
    try {
      await page.waitForURL('**/wp-admin/**', { timeout: config.timeout / 2 });
      console.log('✅ Login successful - Redirected to admin area');
      
      // Take success screenshot
      try {
        const buffer = await page.screenshot({ 
          fullPage: config.screenshots?.fullPage ?? true,
          type: 'jpeg',
          quality: 80
        });
        screenshotBase64 = buffer.toString('base64');
        resultType = 'Success';
      } catch (screenshotError) {
        console.warn('Warning: Could not capture success screenshot:', screenshotError.message);
      }
      
      return { success: true, screenshotBase64, resultType };
      
    } catch (urlError) {
      // Check for dashboard elements if URL check fails
      let dashboardFound = false;
      for (const selector of config.selectors.dashboardIndicators) {
        try {
          await page.waitForSelector(selector, { 
            state: 'visible',
            timeout: config.timeout / 2
          });
          dashboardFound = true;
          break;
        } catch (selectorError) {
          continue;
        }
      }

      if (!dashboardFound) {
        throw new Error('Login failed - Could not detect WordPress dashboard');
      }
      
      console.log('✅ Login successful - Dashboard elements detected');
      
      // Take success screenshot
      try {
        const buffer = await page.screenshot({ 
          fullPage: config.screenshots?.fullPage ?? true,
          type: 'jpeg',
          quality: 80
        });
        screenshotBase64 = buffer.toString('base64');
        resultType = 'Success';
      } catch (screenshotError) {
        console.warn('Warning: Could not capture success screenshot:', screenshotError.message);
      }
      
      return { success: true, screenshotBase64, resultType };
    }
  } catch (error) {
    console.error('❌ Login test failed:', error.message);
    
    // Try to capture error state
    try {
      if (page) {
        const buffer = await page.screenshot({ 
          fullPage: config.screenshots?.fullPage ?? true,
          type: 'jpeg',
          quality: 80
        });
        screenshotBase64 = buffer.toString('base64');
        resultType = 'Failure';
      }
    } catch (screenshotError) {
      console.warn('Warning: Could not capture error screenshot:', screenshotError.message);
    }
    
    return { 
      success: false,
      screenshotBase64,
      resultType,
      error: error.message 
    };
  } finally {
    console.log('🧹 Cleaning up...');
    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
  }
}

export default runLoginTest;