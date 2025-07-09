import { chromium } from 'playwright';

// Accept config as argument for flexibility
async function runLoginTest(config) {
  console.log('🔧 Test Configuration:', {
    url: config.url,
    headless: config.headless,
    timeout: config.timeout,
    username: config.username,
    selectors: config.selectors
  });

  let browser;
  let page;
  let screenshotBase64 = null;
  let resultType = 'Success';

  try {
    console.log('🌐 Launching browser...');
    browser = await chromium.launch({ 
      headless: config.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
    console.log('✓ Browser launched successfully');

    console.log('📄 Creating new page...');
    page = await browser.newPage();
    page.setDefaultTimeout(config.timeout);
    console.log(`✓ Page created with timeout: ${config.timeout}ms`);

    // Listen for console messages
    page.on('console', msg => console.log('Browser console:', msg.text()));
    
    // Listen for network errors
    page.on('pageerror', err => console.error('Page error:', err.message));
    
    // Listen for request failures
    page.on('requestfailed', request => 
      console.error('Failed request:', request.url(), request.failure().errorText)
    );

    console.log(`🚀 Navigating to: ${config.url}`);
    const response = await page.goto(config.url);
    console.log(`📡 Navigation status: ${response.status()} ${response.statusText()}`);
    
    if (!response.ok()) {
      throw new Error(`Navigation failed: ${response.status()} ${response.statusText()}`);
    }

    console.log('🔍 Checking for login form...');
    console.log(`Looking for username field with selector: ${config.selectors.username}`);
    const usernameField = await page.waitForSelector(config.selectors.username);
    if (!usernameField) {
      throw new Error('Username field not found');
    }
    console.log('✓ Username field found');

    console.log('📝 Filling in credentials...');
    await page.fill(config.selectors.username, config.username);
    console.log('✓ Username entered');

    const passwordField = await page.waitForSelector(config.selectors.password);
    if (!passwordField) {
      throw new Error('Password field not found');
    }
    console.log('✓ Password field found');
    await page.fill(config.selectors.password, config.password);
    console.log('✓ Password entered');

    console.log('🔍 Looking for submit button...');
    const submitButton = await page.waitForSelector(config.selectors.submitButton);
    if (!submitButton) {
      throw new Error('Submit button not found');
    }
    console.log('✓ Submit button found');

    console.log('🔐 Clicking submit button...');
    await page.click(config.selectors.submitButton);
    console.log('✓ Submit button clicked');

    console.log('⏳ Waiting for dashboard indicators...');
    console.log('Dashboard selectors:', config.selectors.dashboardIndicators);
    
    try {
      await Promise.race([
        ...config.selectors.dashboardIndicators.map(async (selector, index) => {
          console.log(`Checking dashboard indicator ${index + 1}: ${selector}`);
          return page.waitForSelector(selector);
        }),
        page.waitForURL('**/wp-admin/index.php'),
      ]);
      console.log('✅ Dashboard detected - login successful!');
    } catch (dashboardError) {
      console.error('❌ Dashboard detection failed:', dashboardError.message);
      // Get current URL to help debug redirect issues
      console.log('Current URL:', page.url());
      throw dashboardError;
    }

    console.log('📸 Taking success screenshot...');
    const buffer = await page.screenshot({ fullPage: config.screenshots.fullPage });
    screenshotBase64 = buffer.toString('base64');
    resultType = 'Success';
    console.log('✅ Login test completed successfully');
    
    return { success: true, screenshotBase64, resultType };
  } catch (error) {
    console.error('❌ Login test failed');
    console.error('Detailed error:', {
      message: error.message,
      stack: error.stack
    });

    try {
      if (page) {
        console.log('📸 Taking failure screenshot...');
        console.log('Current URL:', await page.url());
        console.log('Page content:', await page.content());
        const buffer = await page.screenshot({ fullPage: config.screenshots.fullPage });
        screenshotBase64 = buffer.toString('base64');
        resultType = 'Failure';
      }
    } catch (screenshotError) {
      console.error('Failed to capture error screenshot:', screenshotError.message);
    }
    
    return { 
      success: false, 
      screenshotBase64, 
      resultType,
      error: {
        message: error.message,
        stack: error.stack
      }
    };
  } finally {
    console.log('🧹 Cleaning up...');
    if (browser) {
      await browser.close();
      console.log('✓ Browser closed');
    }
  }
}

export default runLoginTest;