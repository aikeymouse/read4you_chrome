// Popup script for Read4You extension

let currentSentences = [];
let currentSentenceIndex = -1;
let currentTextSize = 24; // Default text size in pixels (max size)
let isManualNavigation = false; // Flag to track manual sentence navigation
let isPlayingSequence = false; // Flag to track if we're playing a sequence
let lastKnownTabId = null; // Track the last known tab ID
let lastKnownIsPDF = false; // Track the last known PDF state
let isPaused = false; // Track pause state
let isHighContrast = false; // Track high contrast mode
let currentLanguage = 'en'; // Default language
let enabledLanguages = ['en', 'ru', 'de']; // Languages available in the toggle cycle

const languages = [
  { code: 'en', name: 'EN', fullName: 'English' },
  { code: 'ru', name: 'RU', fullName: 'Русский' },
  { code: 'de', name: 'DE', fullName: 'Deutsch' },
  { code: 'es', name: 'ES', fullName: 'Español' },
  { code: 'fr', name: 'FR', fullName: 'Français' },
  { code: 'it', name: 'IT', fullName: 'Italiano' },
  { code: 'pt', name: 'PT', fullName: 'Português' },
  { code: 'zh', name: 'ZH', fullName: '中文' },
  { code: 'ja', name: 'JA', fullName: '日本語' },
  { code: 'ko', name: 'KO', fullName: '한국어' }
];

document.addEventListener('DOMContentLoaded', async () => {
  const playBtn = document.getElementById('playBtn');
  const readArticleBtn = document.getElementById('readArticleBtn');
  const stopBtn = document.getElementById('stopBtn');
  const mainControls = document.getElementById('mainControls');
  const playingControls = document.getElementById('playingControls');
  const stopPlayingBtn = document.getElementById('stopPlayingBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const prevSentenceBtn = document.getElementById('prevSentenceBtn');
  const nextSentenceBtn = document.getElementById('nextSentenceBtn');
  const status = document.getElementById('status');
  const textDisplay = document.getElementById('textDisplay');
  const textContent = document.getElementById('textContent');
  const increaseTextSize = document.getElementById('increaseTextSize');
  const decreaseTextSize = document.getElementById('decreaseTextSize');
  const toggleContrast = document.getElementById('toggleContrast');
  const languageToggle = document.getElementById('languageToggle');

  // Function to show playing controls
  function showPlayingControls() {
    mainControls.style.display = 'none';
    playingControls.style.display = 'flex';
    // Disable language toggle during playback
    if (languageToggle) {
      languageToggle.disabled = true;
    }
  }

  // Function to show main controls
  function showMainControls() {
    mainControls.style.display = 'flex';
    playingControls.style.display = 'none';
    // Enable language toggle when not playing
    if (languageToggle) {
      languageToggle.disabled = false;
    }
  }



  // Check if current tab is a PDF
  async function updateButtonStates() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // If we got a valid tab, update our tracking
      if (tab && tab.url) {
        lastKnownTabId = tab.id;
        lastKnownIsPDF = tab.url.toLowerCase().endsWith('.pdf') ||
                        tab.url.includes('.pdf?') ||
                        tab.url.includes('.pdf#') ||
                        tab.title.toLowerCase().includes('.pdf');
        
        console.log('Update Button States - URL:', tab.url);
        console.log('Update Button States - Is PDF:', lastKnownIsPDF);
      } else {
        console.log('Update Button States - No valid tab, using last known state. Is PDF:', lastKnownIsPDF);
      }
      
      // Disable Play Selection for PDFs, keep it enabled for HTML
      if (lastKnownIsPDF) {
        playBtn.disabled = true;
        playBtn.title = 'Play Selection is not available for PDF files. Use Read Full Article instead.';
      } else {
        playBtn.disabled = false;
        playBtn.title = '';
      }
    } catch (error) {
      console.log('Could not check tab type:', error);
    }
  }
  
  // Initial check
  await updateButtonStates();

  // Listen for tab changes to update button states
  chrome.tabs.onActivated.addListener(async () => {
    await updateButtonStates();
  });

  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' || changeInfo.url) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab.id === tabId) {
        await updateButtonStates();
      }
    }
  });

  // Also check when window regains focus
  window.addEventListener('focus', async () => {
    await updateButtonStates();
  });

  // Listen for messages from offscreen document
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.target === 'popup') {
      if (request.action === 'sentenceStarted') {
        // Don't update highlight if we're manually navigating
        if (!isManualNavigation) {
          highlightSentence(request.index);
        }
      } else if (request.action === 'playbackEnded') {
        // If we're in a playing sequence, continue to next sentence
        if (isPlayingSequence && currentSentenceIndex < currentSentences.length - 1) {
          currentSentenceIndex++;
          highlightSentence(currentSentenceIndex);
          // Play next sentence
          chrome.runtime.sendMessage({
            action: 'playText',
            text: currentSentences[currentSentenceIndex],
            sentences: [currentSentences[currentSentenceIndex]],
            language: currentLanguage
          });
        } else {
          // Playback fully ended
          isManualNavigation = false;
          isPlayingSequence = false;
          isPaused = false;
          clearHighlights();
          // Reset pause button to pause icon
          pauseBtn.textContent = '⏸️';
          // Show main controls when playback ends
          showMainControls();
          // Re-enable both buttons when playback ends (unless PDF)
          checkAndEnableButtons();
        }
      }
    }
  });

  // DON'T capture selection automatically when popup opens
  // This prevents triggering playback when reopening during reading
  /*
  try {
    const response = await chrome.runtime.sendMessage({ action: 'captureSelection' });
    console.log('Captured selection on popup open:', response?.text);
  } catch (error) {
    console.log('Could not capture selection on open:', error);
  }
  */

  // Play button click handler
  playBtn.addEventListener('click', async () => {
    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      let selectedText = '';
      
      // Check if it's a PDF
      const isPDF = tab.url && (tab.url.startsWith('file://') && tab.url.toLowerCase().includes('.pdf')) || 
                     tab.url.includes('.pdf') ||
                     tab.title.toLowerCase().includes('.pdf');
      
      console.log('Tab URL:', tab.url);
      console.log('Is PDF:', isPDF);
      
      // First, always try to capture selection immediately
      try {
        const captureResponse = await chrome.runtime.sendMessage({ action: 'captureSelection' });
        if (captureResponse && captureResponse.text) {
          selectedText = captureResponse.text;
          console.log('Captured from immediate injection:', selectedText);
        }
      } catch (error) {
        console.log('Immediate capture failed:', error);
      }
      
      // For PDFs, ALWAYS use direct script injection first
      if (isPDF || tab.url.startsWith('file://')) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            func: () => {
              // Try to get selection from main window and all frames
              let text = '';
              
              // Try main window first
              text = window.getSelection().toString().trim();
              
              // If no text, try all iframes/embeds
              if (!text) {
                const frames = document.querySelectorAll('iframe, embed, object');
                for (const frame of frames) {
                  try {
                    const frameSelection = frame.contentWindow?.getSelection()?.toString()?.trim();
                    if (frameSelection) {
                      text = frameSelection;
                      break;
                    }
                  } catch (e) {
                    // Cross-origin frame, skip
                  }
                }
              }
              
              // If still no text, check if there's stored selection data
              if (!text && window.lastSelectedText) {
                text = window.lastSelectedText;
              }
              
              return text;
            }
          });
          
          if (results && results.length > 0) {
            for (const result of results) {
              if (result.result) {
                selectedText = result.result;
                break;
              }
            }
          }
          
          console.log('PDF text found:', selectedText);
        } catch (error) {
          console.log('Direct injection failed:', error);
        }
      }
      
      // For regular web pages, try content script first
      if (!selectedText && !isPDF) {
        try {
          const response = await chrome.tabs.sendMessage(tab.id, { action: 'getSelection' });
          if (response && response.text) {
            selectedText = response.text;
          }
        } catch (error) {
          console.log('Could not get selection from content script');
        }
      }
      
      // Try background stored text
      if (!selectedText) {
        const bgResponse = await chrome.runtime.sendMessage({ action: 'getSelectedText' });
        if (bgResponse && bgResponse.text) {
          selectedText = bgResponse.text;
        }
      }
      
      // Last resort: try direct injection for all pages
      if (!selectedText) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            func: () => window.getSelection().toString().trim()
          });
          if (results && results[0] && results[0].result) {
            selectedText = results[0].result;
          }
        } catch (error) {
          console.log('Could not execute script:', error);
        }
      }
      
      if (selectedText) {
        console.log('Final selected text:', selectedText);
        
        // Reset manual navigation flag
        isManualNavigation = false;
        
        // Disable Read Article button while playing
        readArticleBtn.disabled = true;
        
        // Show playing controls
        showPlayingControls();
        
        // Split into sentences
        const sentences = splitIntoSentences(selectedText);
        displayText(sentences);
        
        // Send text to background script to play
        await chrome.runtime.sendMessage({
          action: 'playText',
          text: selectedText,
          sentences: sentences,
          language: currentLanguage
        });
        showStatus('Playing audio...', 'success');
      } else {
        console.log('No text found');
        showStatus('No text selected. Please select text on the page first.', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showStatus('Error: ' + error.message, 'error');
    }
  });

  // Stop button click handler
  stopBtn.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ action: 'stopAudio' });
    showStatus('Audio stopped', 'info');
  });

  // Read Article button click handler
  readArticleBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Check if it's a PDF
      const isPDF = tab.url && (
        (tab.url.startsWith('file://') && tab.url.toLowerCase().includes('.pdf')) || 
        tab.url.toLowerCase().endsWith('.pdf') ||
        tab.title.toLowerCase().includes('.pdf')
      );
      
      if (isPDF) {
        showStatus('Extracting PDF text...', 'info');
        
        // For PDFs, extract text using PDF.js
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['pdf.js']
          });
          
          const pdfResults = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: async (pdfUrl) => {
              try {
                // Set worker path
                if (typeof pdfjsLib !== 'undefined') {
                  pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.js');
                  
                  // For file:// URLs, we need to fetch via background script
                  // For now, try to load directly
                  let loadingTask;
                  
                  if (pdfUrl.startsWith('file://')) {
                    // Try to get the PDF data from the embedded viewer
                    const pdfViewer = document.querySelector('embed[type="application/pdf"]');
                    if (pdfViewer && pdfViewer.src) {
                      loadingTask = pdfjsLib.getDocument(pdfViewer.src);
                    } else {
                      // Try blob URL if available
                      const embeds = document.querySelectorAll('embed, object, iframe');
                      for (const embed of embeds) {
                        if (embed.src && embed.src.startsWith('blob:')) {
                          loadingTask = pdfjsLib.getDocument(embed.src);
                          break;
                        }
                      }
                      if (!loadingTask) {
                        return { success: false, error: 'Cannot access local PDF file. Chrome security restrictions prevent direct file access.' };
                      }
                    }
                  } else {
                    // For HTTP/HTTPS URLs
                    loadingTask = pdfjsLib.getDocument({
                      url: pdfUrl,
                      withCredentials: false
                    });
                  }
                  
                  const pdf = await loadingTask.promise;
                  
                  let fullText = '';
                  
                  // Extract text from all pages
                  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    const page = await pdf.getPage(pageNum);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += pageText + '\n\n';
                  }
                  
                  return { success: true, text: fullText.trim(), pages: pdf.numPages };
                } else {
                  return { success: false, error: 'PDF.js not loaded' };
                }
              } catch (error) {
                return { success: false, error: error.message };
              }
            },
            args: [tab.url]
          });
          
          if (pdfResults && pdfResults[0] && pdfResults[0].result) {
            const result = pdfResults[0].result;
            
            if (result.success && result.text) {
              console.log('PDF text extracted:', result.pages, 'pages, length:', result.text.length);
              
              // Reset manual navigation flag
              isManualNavigation = false;
              
              // Disable Play Selection button while reading PDF
              playBtn.disabled = true;
              
              // Show playing controls
              showPlayingControls();
              
              // Split into sentences
              const sentences = splitIntoSentences(result.text);
              displayText(sentences);
              
              // Send PDF text to background script to play
              await chrome.runtime.sendMessage({
                action: 'playText',
                text: result.text,
                sentences: sentences,
                language: currentLanguage
              });
              showStatus(`Reading PDF (${result.pages} pages)...`, 'success');
            } else {
              showStatus(result.error || 'Could not extract PDF text', 'error');
            }
          } else {
            showStatus('Could not extract PDF text', 'error');
          }
        } catch (error) {
          console.error('Error reading PDF:', error);
          showStatus('Error reading PDF. Try selecting text manually.', 'error');
        }
        return;
      }
      
      showStatus('Extracting article...', 'info');
      
      // Inject Readability and extract article content
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['readability.js']
      });
      
      const articleResults = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          try {
            const documentClone = document.cloneNode(true);
            const reader = new Readability(documentClone);
            const article = reader.parse();
            
            if (article && article.textContent) {
              // Clean up the text: ensure proper spacing between sentences
              let cleanText = article.textContent
                // Add period and space when uppercase letter follows lowercase without punctuation
                .replace(/([a-z])([A-Z])/g, '$1. $2')
                // Add space after periods if followed directly by uppercase letter
                .replace(/\.([A-Z])/g, '. $1')
                // Add space after question marks if followed directly by uppercase letter
                .replace(/\?([A-Z])/g, '? $1')
                // Add space after exclamation marks if followed directly by uppercase letter
                .replace(/!([A-Z])/g, '! $1')
                // Replace multiple spaces with single space
                .replace(/\s+/g, ' ')
                // Trim whitespace
                .trim();
              
              return {
                success: true,
                text: cleanText,
                title: article.title
              };
            } else {
              return { success: false, error: 'Could not extract article content' };
            }
          } catch (error) {
            return { success: false, error: error.message };
          }
        }
      });
      
      if (articleResults && articleResults[0] && articleResults[0].result) {
        const result = articleResults[0].result;
        
        if (result.success && result.text) {
          console.log('Article extracted:', result.title);
          
          // Reset manual navigation flag
          isManualNavigation = false;
          
          // Disable Play Selection button while reading article
          playBtn.disabled = true;
          
          // Show playing controls
          showPlayingControls();
          
          // Split into sentences
          const sentences = splitIntoSentences(result.text);
          displayText(sentences);
          
          // Send article text to background script to play
          await chrome.runtime.sendMessage({
            action: 'playText',
            text: result.text,
            sentences: sentences,
            language: currentLanguage
          });
          showStatus(`Reading: ${result.title || 'Article'}`, 'success');
        } else {
          showStatus(result.error || 'Could not extract article', 'error');
        }
      } else {
        showStatus('Could not extract article content', 'error');
      }
    } catch (error) {
      console.error('Error reading article:', error);
      showStatus('Error: ' + error.message, 'error');
    }
  });

  // Stop button click handler
  stopBtn.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ action: 'stopAudio' });
    clearHighlights();
    
    // Re-enable buttons appropriately (check if PDF)
    await checkAndEnableButtons();
    
    showStatus('Audio stopped', 'info');
  });

  // Stop button in playing controls
  stopPlayingBtn.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ action: 'stopAudio' });
    clearHighlights();
    
    // Reset flags
    isManualNavigation = false;
    isPlayingSequence = false;
    isPaused = false;
    
    // Reset pause button to pause icon
    pauseBtn.textContent = '⏸️';
    
    // Show main controls
    showMainControls();
    
    // Re-enable buttons appropriately (check if PDF)
    await checkAndEnableButtons();
    
    showStatus('Audio stopped', 'info');
  });

  // Pause/Resume button
  pauseBtn.addEventListener('click', async () => {
    if (isPaused) {
      // Resume playback
      isPaused = false;
      pauseBtn.textContent = '⏸️';
      isPlayingSequence = true;
      isManualNavigation = true; // Prevent highlight jump, will reset after sentence starts
      
      // Continue playing from current sentence
      if (currentSentences[currentSentenceIndex]) {
        await chrome.runtime.sendMessage({
          action: 'playText',
          text: currentSentences[currentSentenceIndex],
          sentences: [currentSentences[currentSentenceIndex]],
          language: currentLanguage
        });
        showStatus('Resumed playback', 'info');
      }
    } else {
      // Pause playback
      isPaused = true;
      pauseBtn.textContent = '▶️';
      isPlayingSequence = false;
      
      await chrome.runtime.sendMessage({ action: 'stopAudio' });
      showStatus('Playback paused', 'info');
    }
  });

  // Previous sentence button
  prevSentenceBtn.addEventListener('click', async () => {
    if (currentSentenceIndex > 0) {
      isManualNavigation = true;
      isPlayingSequence = true;
      isPaused = false;
      pauseBtn.textContent = '⏸️';
      currentSentenceIndex--;
      highlightSentence(currentSentenceIndex);
      // Play the previous sentence
      if (currentSentences[currentSentenceIndex]) {
        await chrome.runtime.sendMessage({
          action: 'playText',
          text: currentSentences[currentSentenceIndex],
          sentences: [currentSentences[currentSentenceIndex]],
          language: currentLanguage
        });
      }
    }
  });

  // Next sentence button
  nextSentenceBtn.addEventListener('click', async () => {
    if (currentSentenceIndex < currentSentences.length - 1) {
      isManualNavigation = true;
      isPlayingSequence = true;
      isPaused = false;
      pauseBtn.textContent = '⏸️';
      currentSentenceIndex++;
      highlightSentence(currentSentenceIndex);
      // Play the next sentence
      if (currentSentences[currentSentenceIndex]) {
        await chrome.runtime.sendMessage({
          action: 'playText',
          text: currentSentences[currentSentenceIndex],
          sentences: [currentSentences[currentSentenceIndex]],
          language: currentLanguage
        });
      }
    }
  });

  // Increase text size button
  if (increaseTextSize) {
    increaseTextSize.addEventListener('click', () => {
      if (currentTextSize < 36) {
        currentTextSize += 2;
        textContent.style.fontSize = currentTextSize + 'px';
      }
    });
  }

  // Decrease text size button
  if (decreaseTextSize) {
    decreaseTextSize.addEventListener('click', () => {
      if (currentTextSize > 10) {
        currentTextSize -= 2;
        textContent.style.fontSize = currentTextSize + 'px';
      }
    });
  }

  // Toggle high contrast mode
  if (toggleContrast) {
    toggleContrast.addEventListener('click', () => {
      isHighContrast = !isHighContrast;
      document.body.classList.toggle('high-contrast', isHighContrast);
      // Save preference
      chrome.storage.local.set({ highContrast: isHighContrast });
    });
    
    // Load saved preference
    chrome.storage.local.get(['highContrast'], (result) => {
      if (result.highContrast) {
        isHighContrast = true;
        document.body.classList.add('high-contrast');
      }
    });
  }

  // Language toggle button
  if (languageToggle) {
    // Load saved language and enabled languages
    chrome.storage.local.get(['language', 'enabledLanguages'], (result) => {
      if (result.enabledLanguages) {
        enabledLanguages = result.enabledLanguages;
      }
      
      if (result.language) {
        currentLanguage = result.language;
        const lang = languages.find(l => l.code === currentLanguage);
        if (lang) {
          languageToggle.textContent = lang.name;
          languageToggle.title = `Language: ${lang.fullName}`;
        }
      }
    });

    languageToggle.addEventListener('click', () => {
      // Get only enabled languages
      const enabledLangs = languages.filter(l => enabledLanguages.includes(l.code));
      
      if (enabledLangs.length === 0) {
        showStatus('No languages enabled. Please configure languages.', 'error');
        return;
      }
      
      // Find current language index in enabled languages
      const currentIndex = enabledLangs.findIndex(l => l.code === currentLanguage);
      let nextIndex;
      
      if (currentIndex === -1) {
        // Current language not in enabled list, start from first enabled
        nextIndex = 0;
      } else {
        // Move to next language (cycle back to start if at end)
        nextIndex = (currentIndex + 1) % enabledLangs.length;
      }
      
      const nextLang = enabledLangs[nextIndex];
      
      currentLanguage = nextLang.code;
      languageToggle.textContent = nextLang.name;
      languageToggle.title = `Language: ${nextLang.fullName}`;
      
      // Save preference
      chrome.storage.local.set({ language: currentLanguage });
      
      // Play language name announcement (without highlighting text)
      chrome.runtime.sendMessage({
        action: 'playText',
        text: nextLang.fullName,
        sentences: [nextLang.fullName],
        language: nextLang.code,
        isAnnouncement: true
      }).catch(error => {
        console.log('Could not play language announcement:', error);
      });
      
      // Show status
      showStatus(`Language changed to ${nextLang.fullName}`, 'success');
    });

    // Right-click to open language selection dialog
    languageToggle.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      openLanguageDialog();
    });
  }

  // Open language selection dialog
  function openLanguageDialog() {
    const dialog = document.getElementById('languageDialog');
    const checkboxContainer = document.getElementById('languageCheckboxes');
    
    // Clear existing checkboxes
    checkboxContainer.innerHTML = '';
    
    // Create checkbox for each language
    languages.forEach(lang => {
      const item = document.createElement('div');
      item.className = 'language-checkbox-item';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `lang-${lang.code}`;
      checkbox.value = lang.code;
      checkbox.checked = enabledLanguages.includes(lang.code);
      
      const label = document.createElement('label');
      label.htmlFor = `lang-${lang.code}`;
      label.textContent = `${lang.fullName} (${lang.name})`;
      
      item.appendChild(checkbox);
      item.appendChild(label);
      
      // Allow clicking the whole item to toggle checkbox
      item.addEventListener('click', (e) => {
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
        }
      });
      
      checkboxContainer.appendChild(item);
    });
    
    dialog.style.display = 'flex';
  }

  // Close language dialog
  function closeLanguageDialog() {
    const dialog = document.getElementById('languageDialog');
    dialog.style.display = 'none';
  }

  // Save language selection
  function saveLanguageSelection() {
    const checkboxes = document.querySelectorAll('#languageCheckboxes input[type="checkbox"]');
    const selected = Array.from(checkboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.value);
    
    if (selected.length === 0) {
      showStatus('Please select at least one language', 'error');
      return;
    }
    
    enabledLanguages = selected;
    
    // Save to storage
    chrome.storage.local.set({ enabledLanguages: enabledLanguages });
    
    // If current language is not in enabled list, switch to first enabled language
    if (!enabledLanguages.includes(currentLanguage)) {
      const firstLang = languages.find(l => l.code === enabledLanguages[0]);
      if (firstLang) {
        currentLanguage = firstLang.code;
        const languageToggle = document.getElementById('languageToggle');
        if (languageToggle) {
          languageToggle.textContent = firstLang.name;
          languageToggle.title = `Language: ${firstLang.fullName}`;
        }
        chrome.storage.local.set({ language: currentLanguage });
      }
    }
    
    closeLanguageDialog();
    showStatus('Language selection saved', 'success');
  }

  // Initialize language dialog buttons
  const saveLanguagesBtn = document.getElementById('saveLanguages');
  const cancelLanguagesBtn = document.getElementById('cancelLanguages');
  
  if (saveLanguagesBtn) {
    saveLanguagesBtn.addEventListener('click', saveLanguageSelection);
  }
  
  if (cancelLanguagesBtn) {
    cancelLanguagesBtn.addEventListener('click', closeLanguageDialog);
  }

  // Close dialog when clicking outside
  const languageDialog = document.getElementById('languageDialog');
  if (languageDialog) {
    languageDialog.addEventListener('click', (e) => {
      if (e.target === languageDialog) {
        closeLanguageDialog();
      }
    });
  }

  // Helper function to split text into sentences
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

  // Helper function to check and enable buttons appropriately
  async function checkAndEnableButtons() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // If we got a valid tab, update our tracking
      if (tab && tab.url) {
        lastKnownTabId = tab.id;
        lastKnownIsPDF = tab.url.toLowerCase().endsWith('.pdf') ||
                        tab.url.includes('.pdf?') ||
                        tab.url.includes('.pdf#') ||
                        tab.title.toLowerCase().includes('.pdf');
        
        console.log('Check And Enable Buttons - URL:', tab.url);
        console.log('Check And Enable Buttons - Is PDF:', lastKnownIsPDF);
      } else {
        console.log('Check And Enable Buttons - No valid tab, using last known state. Is PDF:', lastKnownIsPDF);
      }
      
      // Always enable Read Article button
      readArticleBtn.disabled = false;
      
      // Only enable Play Selection if not PDF
      if (lastKnownIsPDF) {
        playBtn.disabled = true;
        playBtn.title = 'Play Selection is not available for PDF files. Use Read Full Article instead.';
      } else {
        playBtn.disabled = false;
        playBtn.title = '';
      }
    } catch (error) {
      // If we can't check, enable both
      playBtn.disabled = false;
      readArticleBtn.disabled = false;
    }
  }

  // Display text with sentences
  function displayText(sentences) {
    currentSentences = sentences;
    currentSentenceIndex = -1;
    
    textContent.innerHTML = '';
    textContent.style.fontSize = currentTextSize + 'px';
    
    sentences.forEach((sentence, index) => {
      const span = document.createElement('span');
      span.className = 'sentence';
      span.dataset.index = index;
      span.textContent = sentence + ' ';
      textContent.appendChild(span);
    });
    
    textDisplay.classList.add('visible');
  }

  // Highlight current sentence
  function highlightSentence(index) {
    // Remove previous highlights
    const allSentences = textContent.querySelectorAll('.sentence');
    allSentences.forEach((span, i) => {
      span.classList.remove('playing');
      if (i < index) {
        span.classList.add('played');
      } else {
        span.classList.remove('played');
      }
    });
    
    // Highlight current sentence
    if (index >= 0 && index < allSentences.length) {
      const currentSpan = allSentences[index];
      currentSpan.classList.add('playing');
      currentSentenceIndex = index;
      
      // Update navigation button states
      prevSentenceBtn.disabled = (index === 0);
      nextSentenceBtn.disabled = (index === currentSentences.length - 1);
      
      // Auto-scroll to keep current sentence visible
      currentSpan.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }

  // Clear all highlights
  function clearHighlights() {
    const allSentences = textContent.querySelectorAll('.sentence');
    allSentences.forEach(span => {
      span.classList.remove('playing', 'played');
    });
    currentSentenceIndex = -1;
  }

  // Helper function to show status messages
  function showStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type}`;
    
    // Clear status after 3 seconds
    setTimeout(() => {
      status.textContent = '';
      status.className = 'status';
    }, 3000);
  }
});
