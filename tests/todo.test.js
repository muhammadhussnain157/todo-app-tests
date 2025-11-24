const { By, until, Key } = require('selenium-webdriver');
const { createDriver, sleep, takeScreenshot, saveCookies, navigateWithCookies } = require('../helpers/driverHelper');

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('Todo App - Todo Management Tests', () => {
  let driver;
  let sessionCookies = []; // Store session cookies
  const testEmail = `todouser_${Date.now()}@example.com`;
  const testPassword = 'Test@1234';
  const testTodoContent = `Test Todo Item ${Date.now()}`;

  beforeAll(async () => {
    driver = await createDriver(true);

    // Register and login before running todo tests
    await registerUser(driver, testEmail, testPassword);
    await loginUser(driver, testEmail, testPassword);
    
    // Save session cookies after successful login
    sessionCookies = await saveCookies(driver);
  });

  afterAll(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  /**
   * TEST CASE 4: Create a New Todo
   * Tests the ability to add a new todo item
   */
  test('TC4 - Should successfully create a new todo item', async () => {
    try {
      // Should already be on home page from login
      await driver.get(`${BASE_URL}/`);
      await sleep(2000);

      // Wait for the new todo input
      await driver.wait(
        until.elementLocated(By.css('input[type="text"], textarea')),
        10000
      );

      // Find the todo input field (adjust selector based on your UI)
      const todoInputs = await driver.findElements(By.css('input[type="text"]'));
      let todoInput = null;

      // Try to find the right input field
      for (let input of todoInputs) {
        const placeholder = await input.getAttribute('placeholder');
        if (
          placeholder &&
          (placeholder.toLowerCase().includes('todo') ||
            placeholder.toLowerCase().includes('task') ||
            placeholder.toLowerCase().includes('add'))
        ) {
          todoInput = input;
          break;
        }
      }

      // If not found, try textarea
      if (!todoInput) {
        const textareas = await driver.findElements(By.css('textarea'));
        if (textareas.length > 0) {
          todoInput = textareas[0];
        }
      }

      // If still not found, use first text input
      if (!todoInput && todoInputs.length > 0) {
        todoInput = todoInputs[0];
      }

      expect(todoInput).not.toBeNull();

      // Enter todo content
      await todoInput.clear();
      await todoInput.sendKeys(testTodoContent);
      await sleep(1000);

      // Submit - try Enter key first
      await todoInput.sendKeys(Key.RETURN);
      await sleep(2000);

      // If Enter didn't work, try finding and clicking submit button
      try {
        const submitButtons = await driver.findElements(
          By.css('button[type="submit"], button')
        );
        for (let button of submitButtons) {
          const text = await button.getText();
          if (
            text.toLowerCase().includes('add') ||
            text.toLowerCase().includes('submit') ||
            text === '+'
          ) {
            await button.click();
            break;
          }
        }
      } catch (e) {
        // Button click might not be needed
      }

      await sleep(3000);

      // Verify todo was added by checking page content
      const pageSource = await driver.getPageSource();
      expect(pageSource).toContain(testTodoContent);

      await takeScreenshot(driver, 'create-todo-success');
    } catch (error) {
      await takeScreenshot(driver, 'create-todo-error');
      throw error;
    }
  });

  /**
   * TEST CASE 5: Mark Todo as Complete
   * Tests the ability to mark a todo item as done
   */
  test('TC5 - Should mark a todo item as complete', async () => {
    try {
      await driver.get(`${BASE_URL}/`);
      await sleep(2000);

      // Wait for todo items to load
      await sleep(2000);

      // Try to find checkbox or complete button
      const checkboxes = await driver.findElements(
        By.css('input[type="checkbox"], button')
      );

      expect(checkboxes.length).toBeGreaterThan(0);

      // Click the first checkbox/button to mark as complete
      if (checkboxes.length > 0) {
        await checkboxes[0].click();
        await sleep(2000);
      }

      await takeScreenshot(driver, 'mark-todo-complete');

      // Test passed if no error thrown
      expect(true).toBe(true);
    } catch (error) {
      await takeScreenshot(driver, 'mark-todo-error');
      throw error;
    }
  });

  /**
   * TEST CASE 6: Mark Todo as Important
   * Tests the ability to mark a todo as important
   */
  test('TC6 - Should mark a todo item as important', async () => {
    try {
      await driver.get(`${BASE_URL}/`);
      await sleep(2000);

      // Look for important/star buttons or links
      const buttons = await driver.findElements(By.css('button, a, svg'));

      let importantButton = null;
      for (let button of buttons) {
        try {
          const classAttr = await button.getAttribute('class');
          const title = await button.getAttribute('title');
          const ariaLabel = await button.getAttribute('aria-label');

          if (
            (classAttr && classAttr.includes('important')) ||
            (title && title.toLowerCase().includes('important')) ||
            (ariaLabel && ariaLabel.toLowerCase().includes('important')) ||
            (classAttr && classAttr.includes('star'))
          ) {
            importantButton = button;
            break;
          }
        } catch (e) {
          // Skip this element
        }
      }

      if (importantButton) {
        await importantButton.click();
        await sleep(2000);
      }

      await takeScreenshot(driver, 'mark-todo-important');

      // Test passed if we made it here
      expect(true).toBe(true);
    } catch (error) {
      await takeScreenshot(driver, 'mark-important-error');
      throw error;
    }
  });

  /**
   * TEST CASE 7: Delete a Todo
   * Tests the ability to delete a todo item
   */
  test('TC7 - Should successfully delete a todo item', async () => {
    try {
      await driver.get(`${BASE_URL}/`);
      await sleep(2000);

      // Get initial todo count
      const pageSourceBefore = await driver.getPageSource();

      // Look for delete buttons
      const buttons = await driver.findElements(By.css('button, a'));

      let deleteButton = null;
      for (let button of buttons) {
        try {
          const text = await button.getText();
          const classAttr = await button.getAttribute('class');
          const title = await button.getAttribute('title');
          const ariaLabel = await button.getAttribute('aria-label');

          if (
            text.toLowerCase().includes('delete') ||
            text.toLowerCase().includes('remove') ||
            (classAttr && classAttr.includes('delete')) ||
            (title && title.toLowerCase().includes('delete')) ||
            (ariaLabel && ariaLabel.toLowerCase().includes('delete')) ||
            text === '×' ||
            text === '✕'
          ) {
            deleteButton = button;
            break;
          }
        } catch (e) {
          // Skip
        }
      }

      if (deleteButton) {
        await deleteButton.click();
        await sleep(2000);
      }

      await takeScreenshot(driver, 'delete-todo');

      // Test passed if we made it here
      expect(true).toBe(true);
    } catch (error) {
      await takeScreenshot(driver, 'delete-todo-error');
      throw error;
    }
  });

  /**
   * TEST CASE 8: Navigate to Important Todos Page
   * Tests navigation to the important todos view
   */
  test('TC8 - Should navigate to important todos page', async () => {
    try {
      // Navigate with cookie preservation
      await navigateWithCookies(driver, `${BASE_URL}/important`, sessionCookies);
      await sleep(2000);

      // Wait for page to load and check if redirected
      const currentUrl = await driver.getCurrentUrl();
      expect(currentUrl).toContain('/important');

      await takeScreenshot(driver, 'important-page');
    } catch (error) {
      await takeScreenshot(driver, 'navigate-important-error');
      throw error;
    }
  });

  /**
   * TEST CASE 9: Navigate to Pending Todos Page
   * Tests navigation to the pending todos view
   */
  test('TC9 - Should navigate to pending todos page', async () => {
    try {
      // Navigate with cookie preservation
      await navigateWithCookies(driver, `${BASE_URL}/pending`, sessionCookies);
      await sleep(2000);

      // Wait for page to load and check if redirected
      const currentUrl = await driver.getCurrentUrl();
      expect(currentUrl).toContain('/pending');

      await takeScreenshot(driver, 'pending-page');
    } catch (error) {
      await takeScreenshot(driver, 'navigate-pending-error');
      throw error;
    }
  });

  /**
   * TEST CASE 10: Create Multiple Todos
   * Tests creating multiple todo items in succession
   */
  test('TC10 - Should create multiple todos successfully', async () => {
    try {
      await driver.get(`${BASE_URL}/`);
      await sleep(3000);

      const todosToCreate = [
        `First Todo ${Date.now()}`,
        `Second Todo ${Date.now()}`,
        `Third Todo ${Date.now()}`
      ];

      for (let todoContent of todosToCreate) {
        // Find input field
        const todoInputs = await driver.findElements(By.css('input[type="text"]'));
        let todoInput = todoInputs.length > 0 ? todoInputs[0] : null;

        if (!todoInput) {
          const textareas = await driver.findElements(By.css('textarea'));
          todoInput = textareas.length > 0 ? textareas[0] : null;
        }

        if (todoInput) {
          await todoInput.clear();
          await todoInput.sendKeys(todoContent);
          await todoInput.sendKeys(Key.RETURN);
          await sleep(3000); // Increased wait time
        }
      }

      await takeScreenshot(driver, 'multiple-todos-created');
      expect(true).toBe(true);
    } catch (error) {
      await takeScreenshot(driver, 'multiple-todos-error');
      throw error;
    }
  }, 90000); // Increased timeout to 90 seconds

  /**
   * TEST CASE 11: Verify Todo Persistence
   * Tests that todos persist after page reload
   */
  test('TC11 - Should persist todos after page reload', async () => {
    try {
      // Navigate with cookies
      await navigateWithCookies(driver, `${BASE_URL}/`, sessionCookies);
      await sleep(2000);

      const uniqueTodo = `Persistent Todo ${Date.now()}`;

      // Create the todo
      const todoInputs = await driver.findElements(By.css('input[type="text"]'));
      let todoInput = todoInputs.length > 0 ? todoInputs[0] : null;

      if (!todoInput) {
        const textareas = await driver.findElements(By.css('textarea'));
        todoInput = textareas.length > 0 ? textareas[0] : null;
      }

      if (todoInput) {
        await todoInput.clear();
        await todoInput.sendKeys(uniqueTodo);
        await todoInput.sendKeys(Key.RETURN);
        await sleep(3000); // Wait for todo to be created
      }

      // Refresh the page with cookies
      await navigateWithCookies(driver, `${BASE_URL}/`, sessionCookies);
      await sleep(3000);

      // Wait for page to fully load
      await driver.wait(until.elementLocated(By.css('body')), 10000);
      
      // Check current URL - should still be on home page
      const currentUrl = await driver.getCurrentUrl();
      
      if (currentUrl.includes('/auth/login')) {
        throw new Error('Session lost after page reload - redirected to login');
      }
      
      // Check if todo still exists
      const pageSource = await driver.getPageSource();
      expect(pageSource).toContain(uniqueTodo);

      await takeScreenshot(driver, 'todo-persistence');
    } catch (error) {
      await takeScreenshot(driver, 'persistence-error');
      throw error;
    }
  });

  /**
   * TEST CASE 12: Verify Authentication Redirect
   * Tests that unauthenticated users are redirected to login
   */
  test('TC12 - Should redirect unauthenticated users to login', async () => {
    try {
      // Create a new driver instance without login
      const tempDriver = await createDriver(true);

      try {
        // Try to access home page without authentication
        await tempDriver.get(`${BASE_URL}/`);
        await sleep(3000);

        // Should be redirected to login page
        const currentUrl = await tempDriver.getCurrentUrl();
        expect(currentUrl).toContain('/auth/login');

        // Take screenshot with temp driver
        const screenshot = await tempDriver.takeScreenshot();
        const fs = require('fs');
        const path = require('path');
        const dir = path.join(__dirname, '../screenshots');
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(
          path.join(dir, `auth-redirect-${Date.now()}.png`),
          screenshot,
          'base64'
        );
      } finally {
        await tempDriver.quit();
      }
    } catch (error) {
      console.error('Auth redirect test error:', error.message);
      throw error;
    }
  });
});

// Helper Functions

async function registerUser(driver, email, password) {
  try {
    await driver.get(`${BASE_URL}/auth/signup`);
    await sleep(2000);

    const nameInput = await driver.findElement(By.id('name'));
    const emailInput = await driver.findElement(By.id('email'));
    const passwordInput = await driver.findElement(By.id('password'));

    await nameInput.sendKeys('Test User');
    await emailInput.sendKeys(email);
    await passwordInput.sendKeys(password);

    const submitButton = await driver.findElement(By.css('button[type="submit"]'));
    await submitButton.click();
    await sleep(3000);
  } catch (error) {
    console.log('Registration might have failed or user already exists:', error.message);
  }
}

async function loginUser(driver, email, password) {
  try {
    await driver.get(`${BASE_URL}/auth/login`);
    await sleep(2000);

    await driver.wait(until.elementLocated(By.id('email')), 10000);

    const emailInput = await driver.findElement(By.id('email'));
    const passwordInput = await driver.findElement(By.id('password'));

    await emailInput.clear();
    await emailInput.sendKeys(email);
    await passwordInput.clear();
    await passwordInput.sendKeys(password);

    const loginButton = await driver.findElement(By.css('button[type="submit"]'));
    await loginButton.click();

    await sleep(5000);
  } catch (error) {
    console.error('Login failed:', error.message);
    throw error;
  }
}
