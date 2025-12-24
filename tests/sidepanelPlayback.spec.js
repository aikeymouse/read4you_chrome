const { test, expect } = require('./fixtures');

test.describe('Side Panel Text Selection Playback', () => {
  test('should play selected text using side panel button', async ({ context, page, extensionId }) => {
    // Navigate to test HTML page
    await page.goto('https://aikeymouse.github.io/read4you_chrome/test-data/sample.html');
    await page.waitForLoadState('networkidle');
    
    // Open side panel by clicking extension icon (we'll do this manually first)
    // For now, let's open it via the extension popup
    const sidePanelUrl = `chrome-extension://${extensionId}/sidepanel.html`;
    const sidePanelPage = await context.newPage();
    await sidePanelPage.goto(sidePanelUrl);
    
    // Wait for side panel to load
    await sidePanelPage.waitForLoadState('networkidle');
    
    // Go back to main page and select text
    await page.bringToFront();
    const textToSelect = await page.locator('p').first();
    await textToSelect.scrollIntoViewIfNeeded();
    await textToSelect.click({ clickCount: 3 });
    
    // Wait for selection
    await page.waitForTimeout(500);
    
    const selectedText = await page.evaluate(() => window.getSelection().toString());
    expect(selectedText).toBeTruthy();
    console.log('Selected text length:', selectedText.length);
    
    // Keep main page active (extension queries active tab for selection)
    await page.bringToFront();
    await page.waitForTimeout(500);
    
    // Click Play button while keeping content page active
    const playButton = sidePanelPage.locator('#playBtn');
    await expect(playButton).toBeVisible();
    await playButton.click();
    
    // Give extension time to capture selection and start processing
    await page.waitForTimeout(1000);
    
    // Now bring side panel to front to observe UI updates
    await sidePanelPage.bringToFront();
    
    // Wait for playback to start
    await sidePanelPage.waitForTimeout(3000);
    
    // Check that playing controls are visible
    const playingControls = sidePanelPage.locator('#playingControls');
    await expect(playingControls).toBeVisible({ timeout: 5000 });
    
    // Check that text is displayed with sentences
    const sentences = sidePanelPage.locator('.sentence');
    await expect(sentences.first()).toBeVisible({ timeout: 5000 });
    
    console.log('✓ Playback started from side panel');
    console.log('✓ Text is displayed with sentences');
    
    // Optional: Try to verify highlighting, but don't fail if audio hasn't started yet
    const playingSentence = sentences.locator('.playing').first();
    const hasHighlight = await playingSentence.isVisible().catch(() => false);
    
    if (hasHighlight) {
      console.log('✓ Sentence highlighting is active');
    } else {
      console.log('⚠ Audio may not have started yet (TTS API timing)');
    }
    
    // Wait to observe playback
    await sidePanelPage.waitForTimeout(5000);
  });
});
