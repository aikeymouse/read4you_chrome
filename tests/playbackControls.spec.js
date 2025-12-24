const { test, expect } = require('./fixtures');

test.describe('Playback Controls', () => {
  test('should pause, resume, and navigate sentences', async ({ context, page, extensionId }) => {
    // Navigate to test HTML page
    await page.goto('https://raw.githubusercontent.com/aikeymouse/read4you_chrome/main/tests/test-data/sample.html');
    await page.waitForLoadState('networkidle');
    
    // Open side panel
    const sidePanelUrl = `chrome-extension://${extensionId}/sidepanel.html`;
    const sidePanelPage = await context.newPage();
    await sidePanelPage.goto(sidePanelUrl);
    await sidePanelPage.waitForLoadState('networkidle');
    
    // Select text on main page
    await page.bringToFront();
    const textToSelect = await page.locator('p').first();
    await textToSelect.click({ clickCount: 3 });
    await page.waitForTimeout(500);
    
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
    
    // Wait for a sentence to finish
    await sidePanelPage.waitForTimeout(3000);
    
    // Test Next sentence
    const nextBtn = sidePanelPage.locator('#nextSentenceBtn');
    await nextBtn.click();
    await sidePanelPage.waitForTimeout(2000);
    
    console.log('✓ Next sentence');
    
    // Test Previous sentence
    const prevBtn = sidePanelPage.locator('#prevSentenceBtn');
    await prevBtn.click();
    await sidePanelPage.waitForTimeout(2000);
    
    console.log('✓ Previous sentence');
    
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
