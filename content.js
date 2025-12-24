// Content script for Read4You extension

let lastSelectedText = '';

// Listen for text selection
document.addEventListener('mouseup', () => {
  const selectedText = window.getSelection().toString().trim();
  
  if (selectedText) {
    lastSelectedText = selectedText;
    // Store the selected text in background script
    chrome.runtime.sendMessage({
      action: 'setSelectedText',
      text: selectedText
    }).catch(() => {
      // Ignore errors if background script is not ready
    });
  }
});

// Also capture selection on keyup (for keyboard selection)
document.addEventListener('keyup', () => {
  const selectedText = window.getSelection().toString().trim();
  
  if (selectedText) {
    lastSelectedText = selectedText;
    chrome.runtime.sendMessage({
      action: 'setSelectedText',
      text: selectedText
    }).catch(() => {
      // Ignore errors if background script is not ready
    });
  }
});

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSelection') {
    // First try current selection, then fall back to last selected
    const currentSelection = window.getSelection().toString().trim();
    sendResponse({ text: currentSelection || lastSelectedText });
  }
  return true;
});
