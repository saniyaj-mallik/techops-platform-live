import { chromium } from 'playwright';

async function runLoginTest(config) {
  let browser = null;
  let context = null;
  let page = null;
  let screenshotBase64 = null;
  let resultType = 'Success';

  try {
    console.log('🚀 Starting login test...');
    
    // Launch browser with optimized configuration
    browser = await chromium.launch({
      headless: config.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--single-process',
        '--disable-extensions'
      ],
      timeout: 60000
    });

    // Create context with reasonable viewport and user agent
    context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      bypassCSP: true,
      ignoreHTTPSErrors: true
    });

    page = await context.newPage();
    page.setDefaultTimeout(config.timeout);

    console.log(`📍 Navigating to: ${config.url}`);
    try {
      await page.goto(config.url, {
        waitUntil: 'networkidle',
        timeout: config.timeout
      });
    } catch (navError) {
      console.warn('⚠️ NetworkIdle failed, trying with domcontentloaded...');
      await page.goto(config.url, {
        waitUntil: 'domcontentloaded',
        timeout: config.timeout
      });
    }

    console.log('⏳ Waiting for login form to load...');
    await page.waitForSelector(config.selectors.username, { state: 'visible', timeout: config.timeout });
    
    console.log('📝 Filling in credentials...');
    await page.fill(config.selectors.username, config.username);
    await page.fill(config.selectors.password, config.password);
    
    console.log('🔐 Submitting login form...');
    await page.click(config.selectors.submitButton);

    console.log('⏳ Waiting for dashboard to load...');
    
    // More reliable dashboard detection
    try {
      // First try URL-based detection
      await page.waitForURL('**/wp-admin/**', { timeout: config.timeout / 2 });
      console.log('✅ URL indicates successful login');
    } catch (urlError) {
      // Fallback to visual indicators
      console.log('⚠️ URL detection failed, checking for dashboard elements...');
      let dashboardFound = false;
      
      for (const selector of config.selectors.dashboardIndicators) {
        try {
          await page.waitForSelector(selector, { 
            state: 'visible',
            timeout: config.timeout / 2
          });
          dashboardFound = true;
          console.log(`✅ Dashboard indicator found: ${selector}`);
          break;
        } catch (selectorError) {
          console.log(`⚠️ Dashboard indicator not found: ${selector}`);
        }
      }

      if (!dashboardFound) {
        throw new Error('Could not detect WordPress dashboard');
      }
    }

    console.log('✅ Login test passed - WordPress Dashboard loaded successfully!');
    
    // Hide any cookie notices or popups before screenshot
    await page.addStyleTag({
      content: `
        .cookie-banner, .cookie-notice, .gdpr-banner, 
        .privacy-notice, .consent-banner, .popup-overlay { 
          display: none !important; 
        }
      `
    });

    // Wait a bit for any animations to complete
    await page.waitForTimeout(1000);

    const buffer = await page.screenshot({ 
      fullPage: config.screenshots.fullPage,
      type: 'jpeg',
      quality: 80
    });
    screenshotBase64 = buffer.toString('base64');
    resultType = 'Success';
    
    return { success: true, screenshotBase64, resultType };
  } catch (error) {
    console.error('❌ Login test failed');
    console.error('Error details:', error.message);
    
    try {
      // Attempt to capture error state
      const buffer = await page?.screenshot({ 
        fullPage: config.screenshots.fullPage,
        type: 'jpeg',
        quality: 80
      });
      screenshotBase64 = buffer.toString('base64');
      resultType = 'Failure';
    } catch (screenshotError) {
      console.error('Failed to capture error screenshot:', screenshotError.message);
    }
    
    return { 
      success: false, 
      screenshotBase64, 
      resultType,
      error: error.message 
    };
  } finally {
    console.log('🧹 Cleaning up browser resources...');
    try {
      if (page) await page.close();
      if (context) await context.close();
      if (browser) await browser.close();
    } catch (cleanupError) {
      console.warn('Cleanup warning:', cleanupError.message);
    }
  }
}

export default runLoginTest;