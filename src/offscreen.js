// Offscreen document script for audio playback (Read4You)
let currentAudio = null;
let audioQueue = [];
let isPlaying = false;
let currentSentenceIndex = 0;
let startSentenceIndex = 0; // The starting index in the full document
let playbackTimeout = null;
let isAnnouncement = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.target !== 'offscreen') {
    return;
  }

  if (request.action === 'playAudio') {
    playAudioQueue(request.urls, request.isAnnouncement || false, request.startIndex || 0);
    sendResponse({ success: true });
  } else if (request.action === 'stopAudio') {
    stopAudio();
    sendResponse({ success: true });
  }
  
  return true;
});

function playAudioQueue(urls, announcement = false, startIndex = 0) {
  console.log('[Offscreen] playAudioQueue called with', urls.length, 'URLs', 'isAnnouncement:', announcement, 'startIndex:', startIndex);
  
  // Stop any currently playing audio first
  stopAudio();
  
  // Clear any pending playback timeout
  if (playbackTimeout) {
    clearTimeout(playbackTimeout);
    playbackTimeout = null;
  }
  
  // Small delay to ensure previous audio is fully stopped
  playbackTimeout = setTimeout(() => {
    playbackTimeout = null;
    console.log('[Offscreen] Starting new playback session');
    // Set up the queue
    audioQueue = [...urls];
    isPlaying = true;
    currentSentenceIndex = 0;
    startSentenceIndex = startIndex;
    isAnnouncement = announcement;
    
    // Start playing the first sentence
    playNextInQueue();
  }, 50);
}

function playNextInQueue() {
  // Double check that we should still be playing
  if (!isPlaying || audioQueue.length === 0) {
    console.log('[Offscreen] Playback ended. isPlaying:', isPlaying, 'queue length:', audioQueue.length);
    isPlaying = false;
    currentAudio = null;
    // Notify that playback has ended (skip for announcements)
    if (!isAnnouncement) {
      chrome.runtime.sendMessage({
        target: 'popup',
        action: 'playbackEnded'
      }).catch(() => {});
    }
    isAnnouncement = false;
    return;
  }

  const url = audioQueue.shift();
  console.log('[Offscreen] Playing sentence', startSentenceIndex + currentSentenceIndex, 'Queue remaining:', audioQueue.length);
  
  // Small delay between requests to avoid rate limiting (especially for rapid sequential playback)
  const delayMs = currentSentenceIndex > 0 ? 250 : 0;
  
  setTimeout(() => {
    // Check again if we should still be playing after delay
    if (!isPlaying) {
      console.log('[Offscreen] Playback stopped during delay');
      return;
    }
    
    currentAudio = new Audio(url);
    
    // Flag to prevent double error handling
    let errorHandled = false;
    
    // Set up event handlers BEFORE playing
    currentAudio.onended = () => {
      console.log('[Offscreen] Audio ended for sentence', currentSentenceIndex);
      // Only play next sentence if still supposed to be playing
      if (isPlaying && !errorHandled) {
        currentSentenceIndex++;
        playNextInQueue();
      } else {
        console.log('[Offscreen] Not continuing - isPlaying:', isPlaying, 'errorHandled:', errorHandled);
      }
    };

    currentAudio.onerror = (error) => {
      console.error('[Offscreen] Audio playback error:', error);
      console.error('[Offscreen] Failed URL:', url);
      if (errorHandled) {
        console.log('[Offscreen] Error already handled, skipping');
        return;
      }
      errorHandled = true;
      // Continue to next sentence on error
      if (isPlaying) {
        console.log('[Offscreen] Skipping failed sentence, continuing to next');
        currentSentenceIndex++;
        playNextInQueue();
      }
    };
    
    // Notify which sentence is now playing (skip for announcements)
    if (!isAnnouncement) {
      chrome.runtime.sendMessage({
        target: 'popup',
        action: 'sentenceStarted',
        index: startSentenceIndex + currentSentenceIndex
      }).catch(() => {});
    }
    
    // Start playing
    currentAudio.play().catch(error => {
      console.error('[Offscreen] Error starting audio:', error);
      console.error('[Offscreen] Failed URL:', url);
      if (errorHandled) {
        console.log('[Offscreen] Error already handled, skipping');
        return;
      }
      errorHandled = true;
      // Continue to next sentence on error
      if (isPlaying) {
        console.log('[Offscreen] Skipping failed sentence, continuing to next');
        currentSentenceIndex++;
        playNextInQueue();
      }
    });
  }, delayMs);
}

function stopAudio() {
  console.log('[Offscreen] stopAudio called');
  isPlaying = false;
  audioQueue = [];
  
  // Clear any pending playback timeout
  if (playbackTimeout) {
    clearTimeout(playbackTimeout);
    playbackTimeout = null;
  }
  
  if (currentAudio) {
    // Remove all event listeners to prevent them from firing
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio.onloadeddata = null;
    currentAudio.oncanplay = null;
    
    // Pause and reset the audio
    try {
      currentAudio.pause();
    } catch (e) {
      // Ignore errors if audio is already stopped
    }
    
    try {
      currentAudio.currentTime = 0;
    } catch (e) {
      // Ignore errors if audio cannot be reset
    }
    
    // Set src to empty to stop any loading
    currentAudio.src = '';
    currentAudio.load(); // Force the audio to reset
    currentAudio = null;
  }
}
