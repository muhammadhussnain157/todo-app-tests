const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

/**
 * Creates a Chrome WebDriver instance configured for headless operation
 * @param {boolean} headless - Whether to run in headless mode (default: true)
 * @returns {Promise<WebDriver>} - Configured WebDriver instance
 */
async function createDriver(headless = true) {
  const options = new chrome.Options();

  if (headless) {
    options.addArguments('--headless');
  }

  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  options.addArguments('--disable-gpu');
  options.addArguments('--window-size=1920,1080');
  options.addArguments('--disable-extensions');
  options.addArguments('--disable-software-rasterizer');
  options.addArguments('--remote-debugging-port=9222');
  
  // Enable cookie persistence
  options.addArguments('--enable-features=NetworkService,NetworkServiceInProcess');
  options.addArguments('--disable-features=VizDisplayCompositor');

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  // Set implicit wait
  await driver.manage().setTimeouts({ implicit: 10000 });
  
  // Clear any existing cookies
  await driver.manage().deleteAllCookies();

  return driver;
}

/**
 * Waits for a specified amount of time
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Takes a screenshot and saves it with a timestamp
 * @param {WebDriver} driver - WebDriver instance
 * @param {string} name - Name for the screenshot
 */
async function takeScreenshot(driver, name) {
  try {
    const screenshot = await driver.takeScreenshot();
    const fs = require('fs');
    const path = require('path');
    
    const dir = path.join(__dirname, '../screenshots');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filename = `${name}-${Date.now()}.png`;
    fs.writeFileSync(path.join(dir, filename), screenshot, 'base64');
    console.log(`Screenshot saved: ${filename}`);
  } catch (error) {
    console.error('Failed to take screenshot:', error.message);
  }
}

/**
 * Save session cookies for reuse
 * @param {WebDriver} driver - WebDriver instance
 * @returns {Promise<Array>} - Array of cookies
 */
async function saveCookies(driver) {
  try {
    const cookies = await driver.manage().getCookies();
    return cookies;
  } catch (error) {
    console.error('Failed to save cookies:', error.message);
    return [];
  }
}

/**
 * Restore session cookies
 * @param {WebDriver} driver - WebDriver instance
 * @param {Array} cookies - Array of cookies to restore
 */
async function restoreCookies(driver, cookies) {
  try {
    for (const cookie of cookies) {
      // Remove expiry if it's in the past to avoid errors
      const cookieToAdd = { ...cookie };
      delete cookieToAdd.expiry;
      await driver.manage().addCookie(cookieToAdd);
    }
  } catch (error) {
    console.error('Failed to restore cookies:', error.message);
  }
}

/**
 * Navigate with cookie preservation
 * @param {WebDriver} driver - WebDriver instance
 * @param {string} url - URL to navigate to
 * @param {Array} cookies - Optional cookies to ensure are set
 */
async function navigateWithCookies(driver, url, cookies = null) {
  if (cookies && cookies.length > 0) {
    // First visit the domain to allow cookie setting
    await driver.get(url.split('/').slice(0, 3).join('/'));
    await sleep(500);
    await restoreCookies(driver, cookies);
    await sleep(500);
  }
  await driver.get(url);
  await sleep(2000);
}

module.exports = {
  createDriver,
  sleep,
  takeScreenshot,
  saveCookies,
  restoreCookies,
  navigateWithCookies,
};
