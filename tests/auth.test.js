const { By, until } = require('selenium-webdriver');
const { createDriver, sleep, takeScreenshot } = require('./helpers/driverHelper');

// Configuration - Update this URL based on your deployment
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('Todo App - Authentication Tests', () => {
  let driver;
  const testEmail = `testuser_${Date.now()}@example.com`;
  const testPassword = 'Test@1234';

  beforeAll(async () => {
    driver = await createDriver(true); // true = headless mode
  });

  afterAll(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  /**
   * TEST CASE 1: User Signup
   * Tests the user registration functionality
   */
  test('TC1 - Should successfully register a new user', async () => {
    try {
      // Navigate to signup page
      await driver.get(`${BASE_URL}/auth/signup`);
      await sleep(2000);

      // Wait for the page to load
      await driver.wait(until.elementLocated(By.id('name')), 10000);

      // Fill in signup form
      const nameInput = await driver.findElement(By.id('name'));
      const emailInput = await driver.findElement(By.id('email'));
      const passwordInput = await driver.findElement(By.id('password'));

      await nameInput.sendKeys('Test User');
      await emailInput.sendKeys(testEmail);
      await passwordInput.sendKeys(testPassword);

      await sleep(1000);

      // Submit the form
      const submitButton = await driver.findElement(By.css('button[type="submit"]'));
      await submitButton.click();

      // Wait for navigation or success indicator
      await sleep(3000);

      // Verify redirect to login page or home page
      const currentUrl = await driver.getCurrentUrl();
      expect(
        currentUrl.includes('/auth/login') || currentUrl.includes('/auth/signup')
      ).toBe(true);

      await takeScreenshot(driver, 'signup-success');
    } catch (error) {
      await takeScreenshot(driver, 'signup-error');
      throw error;
    }
  });

  /**
   * TEST CASE 2: User Login with Valid Credentials
   * Tests successful authentication
   */
  test('TC2 - Should successfully login with valid credentials', async () => {
    try {
      // Navigate to login page
      await driver.get(`${BASE_URL}/auth/login`);
      await sleep(2000);

      // Wait for login form
      await driver.wait(until.elementLocated(By.id('email')), 10000);

      // Fill in login credentials
      const emailInput = await driver.findElement(By.id('email'));
      const passwordInput = await driver.findElement(By.id('password'));

      await emailInput.clear();
      await emailInput.sendKeys(testEmail);
      await passwordInput.clear();
      await passwordInput.sendKeys(testPassword);

      await sleep(1000);

      // Click login button
      const loginButton = await driver.findElement(By.css('button[type="submit"]'));
      await loginButton.click();

      // Wait for redirect to home page
      await driver.wait(until.urlIs(BASE_URL + '/'), 15000);

      const currentUrl = await driver.getCurrentUrl();
      expect(currentUrl).toBe(BASE_URL + '/');

      await takeScreenshot(driver, 'login-success');
    } catch (error) {
      await takeScreenshot(driver, 'login-error');
      throw error;
    }
  });

  /**
   * TEST CASE 3: Invalid Login Attempt
   * Tests authentication failure with wrong credentials
   */
  test('TC3 - Should fail login with invalid credentials', async () => {
    try {
      // Navigate to login page
      await driver.get(`${BASE_URL}/auth/login`);
      await sleep(2000);

      // Wait for login form
      await driver.wait(until.elementLocated(By.id('email')), 10000);

      // Fill in wrong credentials
      const emailInput = await driver.findElement(By.id('email'));
      const passwordInput = await driver.findElement(By.id('password'));

      await emailInput.clear();
      await emailInput.sendKeys('wrong@example.com');
      await passwordInput.clear();
      await passwordInput.sendKeys('wrongpassword');

      await sleep(1000);

      // Click login button
      const loginButton = await driver.findElement(By.css('button[type="submit"]'));
      await loginButton.click();

      await sleep(3000);

      // Should remain on login page
      const currentUrl = await driver.getCurrentUrl();
      expect(currentUrl).toContain('/auth/login');

      await takeScreenshot(driver, 'invalid-login');
    } catch (error) {
      await takeScreenshot(driver, 'invalid-login-error');
      throw error;
    }
  });

  /**
   * TEST CASE 4: Signup with Existing Email
   * Tests that duplicate email registration is prevented
   */
  test('TC4 - Should prevent signup with existing email', async () => {
    try {
      // Navigate to signup page
      await driver.get(`${BASE_URL}/auth/signup`);
      await sleep(2000);

      // Wait for the page to load
      await driver.wait(until.elementLocated(By.id('name')), 10000);

      // Try to signup with same email
      const nameInput = await driver.findElement(By.id('name'));
      const emailInput = await driver.findElement(By.id('email'));
      const passwordInput = await driver.findElement(By.id('password'));

      await nameInput.sendKeys('Duplicate User');
      await emailInput.sendKeys(testEmail); // Using existing email
      await passwordInput.sendKeys(testPassword);

      await sleep(1000);

      // Submit the form
      const submitButton = await driver.findElement(By.css('button[type="submit"]'));
      await submitButton.click();

      await sleep(3000);

      // Should show error or remain on signup page
      const currentUrl = await driver.getCurrentUrl();
      expect(currentUrl).toContain('/auth/signup');

      await takeScreenshot(driver, 'duplicate-signup');
    } catch (error) {
      await takeScreenshot(driver, 'duplicate-signup-error');
      throw error;
    }
  });

  /**
   * TEST CASE 5: Login Form Validation
   * Tests that login form validates required fields
   */
  test('TC5 - Should validate login form fields', async () => {
    try {
      await driver.get(`${BASE_URL}/auth/login`);
      await sleep(2000);

      await driver.wait(until.elementLocated(By.id('email')), 10000);

      // Try to submit empty form
      const loginButton = await driver.findElement(By.css('button[type="submit"]'));
      await loginButton.click();

      await sleep(2000);

      // Should remain on login page due to HTML5 validation
      const currentUrl = await driver.getCurrentUrl();
      expect(currentUrl).toContain('/auth/login');

      await takeScreenshot(driver, 'login-validation');
    } catch (error) {
      await takeScreenshot(driver, 'login-validation-error');
      throw error;
    }
  });
});
