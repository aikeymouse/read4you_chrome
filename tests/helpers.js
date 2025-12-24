/**
 * Wait for a specific sentence to be highlighted and verify its text matches expected value
 * @param {Page} page - The Playwright page object
 * @param {string} expectedText - The expected sentence text
 * @param {number} timeout - Timeout in milliseconds (default: 5000)
 * @returns {Promise<string>} The trimmed text content of the highlighted sentence
 */
async function waitForAndVerifyHighlightedSentence(page, expectedText, timeout = 5000) {
  const { expect } = require('@playwright/test');
  const playingSentence = page.locator('.sentence.playing').first();
  await playingSentence.waitFor({ state: 'visible', timeout });
  const text = await playingSentence.textContent();
  const trimmedText = text.trim();
  expect(trimmedText).toBe(expectedText);
  return trimmedText;
}

module.exports = {
  waitForAndVerifyHighlightedSentence
};
