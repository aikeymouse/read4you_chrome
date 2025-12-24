# Read4You Chrome Extension - E2E Tests

This directory contains end-to-end tests for the Read4You Chrome extension using Playwright.

## Setup

Install dependencies:

```bash
npm install
npx playwright install chromium
```

## Running Tests

Run all tests in headless mode:
```bash
npm test
```

Run tests with browser UI visible:
```bash
npm run test:headed
```

Run tests in debug mode:
```bash
npm run test:debug
```

## Test Structure

- `fixtures.js` - Custom Playwright fixtures for loading the Chrome extension
- `contextMenu.spec.js` - Tests right-click context menu "Play selected text"
- `sidepanelPlayback.spec.js` - Tests side panel Play button functionality
- `pdfReading.spec.js` - Tests PDF extraction and reading
- `playbackControls.spec.js` - Tests pause/resume/next/prev/stop controls

## Test Data

Tests use sample documents hosted on GitHub Pages (from `/docs/test-data/`):
- `sample.html` - HTML page with structured content for testing text selection
- `sample.pdf` - PDF version for testing PDF reading functionality

URLs used in tests:
- HTML: https://aikeymouse.github.io/read4you_chrome/test-data/sample.html
- PDF: https://aikeymouse.github.io/read4you_chrome/test-data/sample.pdf

## Test Output

- `test-results/` - Screenshots and traces from failed tests
- `playwright-report/` - HTML test report

View the last test report:
```bash
npx playwright show-report
```

## Notes

- Tests use sample documents hosted on GitHub Pages at `/docs/test-data/`
- Extension loads from `../src` directory
- All tests run sequentially to avoid conflicts
- Tests open side panel in a new tab for easier automation
- No external dependencies on Wikipedia or other third-party sites
- GitHub Pages must be enabled for tests to work (see `/docs/README.md`)
