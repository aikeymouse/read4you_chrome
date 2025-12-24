# Test Data

This folder contains test documents used by the Playwright E2E tests.

## Files

- **sample.html** - HTML page with sample content for testing text selection and playback
- **sample.pdf** - PDF version of the same content for testing PDF reading functionality
- **sample.txt** - Plain text source (used to generate the PDF)

## Content Structure

All files contain the same test content with:
- Multiple paragraphs (5 total)
- Multiple sentences per paragraph
- Special cases: abbreviations (Dr., Mr.), numbers (123, 456.78), URLs (https://example.com)
- Consistent structure ideal for testing sentence-by-sentence navigation and highlighting

## Usage in Tests

Tests access these files via GitHub Pages URLs:

```javascript
// HTML page
const htmlUrl = 'https://aikeymouse.github.io/read4you_chrome/test-data/sample.html';

// PDF document
const pdfUrl = 'https://aikeymouse.github.io/read4you_chrome/test-data/sample.pdf';
```

These files are also published in the `/docs` folder for GitHub Pages hosting.

This ensures tests work in any environment with properly rendered HTML and accessible PDFs.
