/**
 * Page Object for Side Panel Control Buttons
 */
class SidePanelControls {
  constructor(page) {
    this.page = page;
    this.playBtn = page.locator('#playBtn');
    this.readArticleBtn = page.locator('#readArticleBtn');
    this.pauseBtn = page.locator('#pauseBtn');
    this.stopBtn = page.locator('#stopBtn');
    this.nextSentenceBtn = page.locator('#nextSentenceBtn');
    this.prevSentenceBtn = page.locator('#prevSentenceBtn');
    this.mainControls = page.locator('#mainControls');
    this.playingControls = page.locator('#playingControls');
  }

  async clickPlay() {
    await this.playBtn.click();
  }

  async clickReadArticle() {
    await this.readArticleBtn.click();
  }

  async clickPause() {
    await this.pauseBtn.click();
  }

  async clickStop() {
    await this.stopBtn.click();
  }

  async clickNext() {
    await this.nextSentenceBtn.click();
  }

  async clickPrevious() {
    await this.prevSentenceBtn.click();
  }

  async waitForPlaybackStarted(timeout = 5000) {
    await this.playingControls.waitFor({ state: 'visible', timeout });
  }

  async waitForPlaybackStopped(timeout = 5000) {
    await this.mainControls.waitFor({ state: 'visible', timeout });
  }

  async getPauseButtonText() {
    return await this.pauseBtn.textContent();
  }

  async isPaused() {
    const text = await this.getPauseButtonText();
    return text === '▶️';
  }

  async isPlaying() {
    const text = await this.getPauseButtonText();
    return text === '⏸️';
  }
}

module.exports = { SidePanelControls };
