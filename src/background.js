// Background service worker for Read4You extension

let selectedText = '';
let creating = null;
let currentTabId = null;
let playbackTimeout = null;

// Create context menu when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'text-to-voice',
    title: 'Play selected text',
    contexts: ['selection']
  });
});

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Clear selection when tab changes
chrome.tabs.onActivated.addListener((activeInfo) => {
  if (currentTabId !== activeInfo.tabId) {
    selectedText = '';
    currentTabId = activeInfo.tabId;
  }
});

// Clear selection when navigating to a new URL in the same tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tabId === currentTabId) {
    selectedText = '';
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'text-to-voice' && info.selectionText) {
    playText(info.selectionText);
  }
});

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'playText') {
    playText(request.text, request.sentences, request.language, request.isAnnouncement, request.startIndex);
    sendResponse({ success: true });
  } else if (request.action === 'stopAudio') {
    stopAudio();
    sendResponse({ success: true });
  } else if (request.action === 'getSelectedText') {
    sendResponse({ text: selectedText });
  } else if (request.action === 'setSelectedText') {
    selectedText = request.text;
    sendResponse({ success: true });
  } else if (request.action === 'captureSelection') {
    // Capture selection from the tab
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        const tab = tabs[0];
        
        // Skip chrome://, chrome-extension://, and other restricted URLs
        if (tab.url.startsWith('chrome://') || 
            tab.url.startsWith('chrome-extension://') ||
            tab.url.startsWith('edge://') ||
            tab.url.startsWith('about:')) {
          sendResponse({ text: selectedText || '' });
          return;
        }
        
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            func: () => window.getSelection().toString().trim()
          });
          
          let text = '';
          if (results) {
            for (const result of results) {
              if (result.result) {
                text = result.result;
                break;
              }
            }
          }
          
          if (text) {
            selectedText = text;
          }
          sendResponse({ text: text || selectedText || '' });
        } catch (error) {
          console.error('Error capturing selection:', error);
          sendResponse({ text: selectedText || '' });
        }
      } else {
        sendResponse({ text: selectedText || '' });
      }
    });
    return true; // Keep message channel open for async response
  }
  return true;
});

// Create offscreen document for audio playback
async function setupOffscreenDocument(path) {
  const offscreenUrl = chrome.runtime.getURL(path);
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl]
  });

  if (existingContexts.length > 0) {
    return;
  }

  if (creating) {
    await creating;
  } else {
    creating = chrome.offscreen.createDocument({
      url: path,
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Playing text-to-speech audio'
    });
    await creating;
    creating = null;
  }
}

// Function to split text into sentences
function splitIntoSentences(text) {
  // Replace common abbreviations temporarily to avoid splitting on them
  const tempText = text
    .replace(/\be\.g\./gi, 'E_G_TEMP')
    .replace(/\bi\.e\./gi, 'I_E_TEMP')
    .replace(/\betc\./gi, 'ETC_TEMP')
    .replace(/\bDr\./g, 'DR_TEMP')
    .replace(/\bMr\./g, 'MR_TEMP')
    .replace(/\bMrs\./g, 'MRS_TEMP')
    .replace(/\bMs\./g, 'MS_TEMP');
  
  // Split by . ! or ? followed by space or end of string
  const sentences = tempText.split(/([.!?]+(?:\s+|$))/);
  
  const result = [];
  for (let i = 0; i < sentences.length; i += 2) {
    if (sentences[i]) {
      let sentence = (sentences[i] + (sentences[i + 1] || '')).trim();
      
      // Restore abbreviations
      sentence = sentence
        .replace(/E_G_TEMP/g, 'e.g.')
        .replace(/I_E_TEMP/g, 'i.e.')
        .replace(/ETC_TEMP/g, 'etc.')
        .replace(/DR_TEMP/g, 'Dr.')
        .replace(/MR_TEMP/g, 'Mr.')
        .replace(/MRS_TEMP/g, 'Mrs.')
        .replace(/MS_TEMP/g, 'Ms.');
      
      if (sentence) {
        // Google TTS has a character limit (~200 chars), split long sentences
        if (sentence.length > 200) {
          // Split by commas, semicolons, or other natural breaks
          const chunks = sentence.split(/([,;:]\s+)/);
          let currentChunk = '';
          
          for (let j = 0; j < chunks.length; j += 2) {
            const part = chunks[j] + (chunks[j + 1] || '');
            if ((currentChunk + part).length > 200 && currentChunk) {
              result.push(currentChunk.trim());
              currentChunk = part;
            } else {
              currentChunk += part;
            }
          }
          
          // If current chunk is still too long, split by words
          if (currentChunk.length > 200) {
            const words = currentChunk.split(' ');
            let wordChunk = '';
            for (const word of words) {
              if ((wordChunk + ' ' + word).length > 200 && wordChunk) {
                result.push(wordChunk.trim());
                wordChunk = word;
              } else {
                wordChunk += (wordChunk ? ' ' : '') + word;
              }
            }
            if (wordChunk.trim()) {
              result.push(wordChunk.trim());
            }
          } else if (currentChunk.trim()) {
            result.push(currentChunk.trim());
          }
        } else {
          result.push(sentence);
        }
      }
    }
  }
  
  return result.length > 0 ? result : [text];
}

// Function to play text as audio
async function playText(text, sentences, language = 'en', isAnnouncement = false, startIndex = 0) {
  if (!text || text.trim() === '') {
    console.log('No text to play');
    return;
  }

  try {
    // ALWAYS stop any currently playing audio first
    await stopAudio();
    
    // Clear any pending playback timeout
    if (playbackTimeout) {
      clearTimeout(playbackTimeout);
      playbackTimeout = null;
    }
    
    // Small delay to ensure offscreen document stopped previous playback
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await setupOffscreenDocument('offscreen.html');
    
    // Split text into sentences if not already provided
    const sentenceArray = sentences || splitIntoSentences(text.trim());
    
    // Create URLs for each sentence with the specified language
    const urls = sentenceArray.map(sentence => {
      // Normalize whitespace: replace multiple spaces/tabs/newlines with single space
      const normalizedSentence = sentence.replace(/\s+/g, ' ').trim();
      const encodedText = encodeURIComponent(normalizedSentence);
      return `https://translate.google.com/translate_tts?tl=${language}&q=${encodedText}&client=tw-ob`;
    });

    // Send message to offscreen document to play audio queue
    // Use a small delay to ensure offscreen document is ready
    playbackTimeout = setTimeout(() => {
      playbackTimeout = null;
      chrome.runtime.sendMessage({
        target: 'offscreen',
        action: 'playAudio',
        urls: urls,
        isAnnouncement: isAnnouncement,
        startIndex: startIndex
      }).catch(error => {
        console.error('Error sending message to offscreen:', error);
      });
    }, 100);
  } catch (error) {
    console.error('Error setting up audio playback:', error);
  }
}

// Function to stop currently playing audio
async function stopAudio() {
  // Clear any pending playback timeout
  if (playbackTimeout) {
    clearTimeout(playbackTimeout);
    playbackTimeout = null;
  }
  
  try {
    const offscreenUrl = chrome.runtime.getURL('offscreen.html');
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [offscreenUrl]
    });

    if (existingContexts.length > 0) {
      chrome.runtime.sendMessage({
        target: 'offscreen',
        action: 'stopAudio'
      }).catch(error => {
        console.log('No audio to stop');
      });
    }
  } catch (error) {
    console.log('No audio to stop');
  }
}
