const { test, expect } = require('../fixtures');
const { waitForAndVerifyHighlightedSentence } = require('../helpers');
const { SidePanelControls } = require('../pages/SidePanelControls');
const { SidePanelTextPane } = require('../pages/SidePanelTextPane');

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
    
    // Initialize Page Objects
    const controls = new SidePanelControls(sidePanelPage);
    const textPane = new SidePanelTextPane(sidePanelPage);
    
    // Select text on main page - use second paragraph after second h2
    await page.bringToFront();
    const textToSelect = page.locator('h2').nth(1).locator('~ p').nth(1);
    await textToSelect.click({ clickCount: 3 });
    await page.waitForTimeout(500);
    
    // Start playback (keep content page active so extension can query it)
    await controls.clickPlay();

    // switch to side panel
    await sidePanelPage.bringToFront();
    
    // Verify playback started - wait for playing controls to appear
    await controls.waitForPlaybackStarted();
    console.log('✓ Playback started');
    
    // Verify text pane contains the selected text
    await textPane.waitForText();
    const displayedText = await textPane.getAllText();
    expect(displayedText).toContain('The extension provides several useful features.');
    expect(displayedText).toContain('First, it highlights each sentence as it is being read.');
    expect(displayedText).toContain('Second, it allows users to pause and resume playback at any time.');
    expect(displayedText).toContain('Third, users can navigate between sentences using next and previous buttons.');
    console.log('✓ Text displayed in pane');
    await sidePanelPage.waitForTimeout(1000);

    // Test Pause
    await controls.clickPause();
    await sidePanelPage.waitForTimeout(1000);
    
    // Verify pause button changed to play icon
    expect(await controls.isPaused()).toBe(true);
    console.log('✓ Paused');
    
    // Test Resume
    await controls.clickPause();
    await sidePanelPage.waitForTimeout(1000);
    
    expect(await controls.isPlaying()).toBe(true);
    console.log('✓ Resumed');
    
    // Wait for a sentence to finish and verify highlighting exists
    await sidePanelPage.waitForTimeout(3000);
    
    // Verify sentences are displayed
    await textPane.waitForSentencesVisible();
    
    const initialSentence = await waitForAndVerifyHighlightedSentence(sidePanelPage, 'The extension provides several useful features.');
    console.log(`✓ Initial sentence: "${initialSentence}"`);
    
    // Test Next sentence
    await controls.clickNext();
    const nextSentence = await waitForAndVerifyHighlightedSentence(sidePanelPage, 'First, it highlights each sentence as it is being read.');
    console.log(`✓ Next sentence: "${nextSentence}"`);
    
    // Test Previous sentence
    await controls.clickPrevious();
    const prevSentence = await waitForAndVerifyHighlightedSentence(sidePanelPage, 'The extension provides several useful features.');
    console.log(`✓ Previous sentence: "${prevSentence}"`);
    
    // Test Next again to move forward
    await controls.clickNext();
    const afterNext = await waitForAndVerifyHighlightedSentence(sidePanelPage, 'First, it highlights each sentence as it is being read.');
    console.log(`✓ Navigated back to next sentence: "${afterNext}"`);
    
    // Test Next one more time
    await controls.clickNext();
    const thirdSentence = await waitForAndVerifyHighlightedSentence(sidePanelPage, 'Second, it allows users to pause and resume playback at any time.');
    console.log(`✓ Third sentence: "${thirdSentence}"`);
    
    // Test Stop
    await controls.clickStop();
    await sidePanelPage.waitForTimeout(1000);
    
    // Verify main controls are visible again
    await controls.waitForPlaybackStopped();
    console.log('✓ Stopped');
  });
});
