/**
 * Page Object for Side Panel Text Display
 */
class SidePanelTextPane {
  constructor(page) {
    this.page = page;
    this.sentences = page.locator('.sentence');
    this.playingSentence = page.locator('.sentence.playing');
  }

  async waitForSentencesVisible(timeout = 5000) {
    await this.sentences.first().waitFor({ state: 'visible', timeout });
  }

  async getHighlightedSentenceText() {
    const text = await this.playingSentence.first().textContent();
    return text.trim();
  }

  async waitForSentenceHighlighted(expectedText, timeout = 5000) {
    const playingSentence = this.page.locator('.sentence.playing').first();
    await playingSentence.waitFor({ state: 'visible', timeout });
    const text = await playingSentence.textContent();
    return text.trim();
  }

  async getAllText() {
    const textDisplay = this.page.locator('#textContent');
    const text = await textDisplay.textContent();
    return text.trim();
  }

  async waitForText(timeout = 5000) {
    const textDisplay = this.page.locator('#textContent');
    await textDisplay.waitFor({ state: 'visible', timeout });
    // Wait for text display to have non-empty content
    await this.page.waitForFunction(() => {
      const element = document.querySelector('#textContent');
      return element && element.textContent.trim().length > 0;
    }, { timeout });
  }
}

module.exports = { SidePanelTextPane };
