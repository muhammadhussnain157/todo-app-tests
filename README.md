# Todo App - Selenium Tests

Automated test suite for the Todo Next.js application using Selenium WebDriver

## 📝 Test Cases

### Authentication Tests (5 tests)
- **TC1**: User Signup
- **TC2**: Valid Login
- **TC3**: Invalid Login
- **TC4**: Duplicate Email Prevention
- **TC5**: Form Validation

### Todo Management Tests (9 tests)
- **TC6**: Create Todo
- **TC7**: Mark as Complete
- **TC8**: Mark as Important
- **TC9**: Delete Todo
- **TC10**: Navigate to Important Page
- **TC11**: Navigate to Pending Page
- **TC12**: Create Multiple Todos
- **TC13**: Todo Persistence
- **TC14**: Authentication Redirect

**Total: 14 Test Cases**

## 🛠️ Tech Stack

- **Selenium WebDriver**: Browser automation
- **Jest**: Testing framework
- **Docker**: Containerized test execution
- **Chrome Headless**: Browser for testing


## 🚀 Running Tests

### Local Execution

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run with custom URL
TEST_BASE_URL=http://13.235.97.7:3001 npm test
```

### Docker Execution

```bash
# Build test image
docker build -f Dockerfile.test -t todo-tests .

# Run tests in container
docker run -e TEST_BASE_URL=http://13.235.97.7:3001 todo-tests npm test
```

## 🔧 Configuration

Set the `TEST_BASE_URL` environment variable to point to your deployed application:

```bash
export TEST_BASE_URL=http://your-app-url:3001
```

## 📊 Test Results

Test results are generated in JUnit XML format at `test-results/junit.xml` for Jenkins integration.

## 🤝 Integration with Jenkins

This repository is designed to work with the main application repository:
- **App Repo**: https://github.com/muhammadhussnain157/todoNextJs.git
- **Test Repo**: https://github.com/muhammadhussnain157/todo-app-tests.git

Jenkins pulls both repositories, deploys the app, and runs these tests automatically.

## 📧 Email Notifications

After each test run, Jenkins sends an email with:
- Build status
- Test summary (passed/failed/skipped)
- Detailed test results
- Deployment URL
