const { test, expect } = require('../fixtures');

test.describe('Playback Controls', () => {
  test('should pause, resume, and navigate sentences', async ({ context, page, extensionId }) => {
    // Navigate to test HTML page
    await page.goto('https://aikeymouse.github.io/read4you_chrome/test-data/sample.html');
    await page.waitForLoadState('networkidle');
    
    // Open side panel
    const sidePanelUrl = `chrome-extension://${extensionId}/sidepanel.html`;
    const sidePanelPage = await context.newPage();
    await sidePanelPage.goto(sidePanelUrl);
    await sidePanelPage.waitForLoadState('networkidle');
    
    // Select text on main page - use second paragraph after second h2
    await page.bringToFront();
    const textToSelect = page.locator('h2').nth(1).locator('~ p').nth(1);
    await textToSelect.click({ clickCount: 3 });
    await page.waitForTimeout(500);

    // 4 sentences to be read:
    // The extension provides several useful features. 
    // First, it highlights each sentence as it is being read.
    // Second, it allows users to pause and resume playback at any time.
    // Third, users can navigate between sentences using next and previous buttons.
    
    // Start playback (keep content page active so extension can query it)
    await sidePanelPage.locator('#playBtn').click();
    await sidePanelPage.waitForTimeout(2000);

    // switch to side panel
    await sidePanelPage.bringToFront();
    
    // Verify playback started
    const playingControls = sidePanelPage.locator('#playingControls');
    await expect(playingControls).toBeVisible({ timeout: 5000 });
    
    console.log('✓ Playback started');
    
    // Test Pause
    const pauseBtn = sidePanelPage.locator('#pauseBtn');
    await pauseBtn.click();
    await sidePanelPage.waitForTimeout(1000);
    
    // Verify pause button changed to play icon
    const pauseBtnText = await pauseBtn.textContent();
    expect(pauseBtnText).toBe('▶️');
    console.log('✓ Paused');
    
    // Test Resume
    await pauseBtn.click();
    await sidePanelPage.waitForTimeout(1000);
    
    const resumeBtnText = await pauseBtn.textContent();
    expect(resumeBtnText).toBe('⏸️');
    console.log('✓ Resumed');
    
    // Wait for a sentence to finish and verify highlighting exists
    await sidePanelPage.waitForTimeout(3000);
    
    // Verify sentences are displayed
    const sentences = sidePanelPage.locator('.sentence');
    await expect(sentences.first()).toBeVisible({ timeout: 5000 });
    
    // Get current highlighted sentence before next
    const getCurrentHighlightedText = async () => {
      const playingSentence = sidePanelPage.locator('.sentence.playing').first();
      await playingSentence.waitFor({ state: 'visible', timeout: 5000 });
      const text = await playingSentence.textContent();
      return text.trim();
    };
    
    const initialSentence = await getCurrentHighlightedText();
    expect(initialSentence).toBe('The extension provides several useful features.');
    console.log(`✓ Initial sentence: "${initialSentence}"`);
    
    // Test Next sentence
    const nextBtn = sidePanelPage.locator('#nextSentenceBtn');
    await nextBtn.click();
    await sidePanelPage.waitForTimeout(1000);
    
    const nextSentence = await getCurrentHighlightedText();
    expect(nextSentence).toBe('First, it highlights each sentence as it is being read.');
    console.log(`✓ Next sentence: "${nextSentence}"`);
    
    // Test Previous sentence
    const prevBtn = sidePanelPage.locator('#prevSentenceBtn');
    await prevBtn.click();
    await sidePanelPage.waitForTimeout(1000);
    
    const prevSentence = await getCurrentHighlightedText();
    expect(prevSentence).toBe('The extension provides several useful features.');
    console.log(`✓ Previous sentence: "${prevSentence}"`);
    
    // Test Next again to move forward
    await nextBtn.click();
    await sidePanelPage.waitForTimeout(1000);
    
    const afterNext = await getCurrentHighlightedText();
    expect(afterNext).toBe('First, it highlights each sentence as it is being read.');
    console.log(`✓ Navigated back to next sentence: "${afterNext}"`);
    
    // Test Next one more time
    await nextBtn.click();
    await sidePanelPage.waitForTimeout(1000);
    
    const thirdSentence = await getCurrentHighlightedText();
    expect(thirdSentence).toBe('Second, it allows users to pause and resume playback at any time.');
    console.log(`✓ Third sentence: "${thirdSentence}"`);
    
    // Test Stop
    const stopBtn = sidePanelPage.locator('#stopBtn');
    await stopBtn.click();
    await sidePanelPage.waitForTimeout(1000);
    
    // Verify main controls are visible again
    const mainControls = sidePanelPage.locator('#mainControls');
    await expect(mainControls).toBeVisible({ timeout: 5000 });
    
    console.log('✓ Stopped');
  });
});
