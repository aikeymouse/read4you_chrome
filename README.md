# Read4You Chrome Extension

A Chrome extension designed for people with weak vision to listen to web content. Select text on any webpage or PDF file and play it as audio using Google Translate's text-to-speech API with accessible controls and high contrast mode.

## Features

### 🎯 Core Features
- 🔊 Convert selected text to speech with sentence-by-sentence playback
- 📄 Read full articles using Mozilla Readability
- 📑 Extract and read PDF documents using PDF.js
- ⏯️ Playback controls: Play, Pause, Stop, Previous/Next sentence
- 🌍 Multi-language support: 10 languages with customizable selection
- 🎨 High contrast mode for better visibility
- 📏 Adjustable text size (10-36px)
- 🔄 Auto-scroll to current sentence
- 💾 Persistent side panel (doesn't close when clicking away)

### ♿ Accessibility Features
- Large circular buttons (140x140px) for easy clicking
- High contrast mode with black background and white text
- 24px font size by default (adjustable up to 36px)
- Visual sentence highlighting during playback
- Color-coded status messages (green for success, red for errors)
- Stable layout (no jumping when messages appear)
- Customizable language selection with native language announcements
- Auto-saves all preferences (language selection, current language, contrast mode)

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked"
5. Select the `src` folder from this repository

## Usage

### Opening the Extension
- Click the Read4You icon in Chrome's toolbar to open the side panel

### Playing Selected Text (Web Pages Only)
1. Select any text on a webpage
2. Click the "▶️" (Play) button in the side panel
3. The text will be read aloud with sentence highlighting

### Reading Full Articles/PDFs
1. Navigate to any article or PDF
2. Click the "📖" (Read Article) button in the side panel
3. The entire article/PDF will be extracted and read aloud

### Playback Controls (During Reading)
- **⏮️ Previous**: Go to previous sentence
- **⏸️ Pause/▶️ Resume**: Pause or resume playback
- **⏭️ Next**: Go to next sentence  
- **⏹️ Stop**: Stop playback and return to main controls

### Accessibility Controls
- **Language Selector** (top-right): 
  - **Left-click**: Cycle through your selected languages
  - **Right-click**: Open language selection dialog to choose which languages appear in the cycle
  - Default enabled languages: English, Russian, German
  - Language announcements spoken in native language (e.g., "Español", "Français", "中文")
- **◐ High Contrast**: Toggle black/white high contrast mode (saves preference)
- **A−**: Decrease text size
- **A+**: Increase text size

## Repository Structure

```
read4you_chrome/
├── src/                    # Extension source files
│   ├── manifest.json       # Extension configuration
│   ├── background.js       # Service worker handling audio playback
│   ├── offscreen.html      # Offscreen document for audio API
│   ├── offscreen.js        # Audio queue management
│   ├── content.js          # Content script for text selection
│   ├── sidepanel.html      # Side panel interface
│   ├── popup.js            # Side panel functionality
│   ├── popup.css           # Side panel styling
│   ├── pdf.js              # PDF.js library (non-minified)
│   ├── pdf.worker.js       # PDF.js worker
│   ├── readability.js      # Mozilla Readability library
│   └── icons/              # Extension icons (16x16, 48x48, 128x128)
├── LICENSE                 # CC BY-NC-ND 4.0 License
└── README.md               # This file
```

## Permissions

- `activeTab`: Access the currently active tab
- `contextMenus`: Create right-click menu items
- `scripting`: Inject content scripts for text extraction
- `offscreen`: Create offscreen document for audio playback
- `sidePanel`: Display persistent side panel
- `storage`: Save user preferences (high contrast mode, language selection, enabled languages)
- `host_permissions`: Access all URLs for text selection and PDF reading

## Technical Details

- **Manifest Version**: 3
- **TTS API**: Google Translate TTS (`https://translate.google.com/translate_tts?tl=${language}&q=${text}&client=tw-ob`)
- **Character Limit**: 200 characters per TTS request (sentences auto-split)
- **Supported Languages**: 
  - English (English)
  - Russian (Русский)
  - German (Deutsch)
  - Spanish (Español)
  - French (Français)
  - Italian (Italiano)
  - Portuguese (Português)
  - Chinese (中文)
  - Japanese (日本語)
  - Korean (한국어)
- **Default Enabled Languages**: English, Russian, German
- **PDF Processing**: PDF.js v3.11.174 (non-minified)
- **Article Extraction**: Mozilla Readability.js

### Language Selection
- Right-click language toggle to customize which languages appear in the cycle
- Language selection saved to Chrome storage
- Language announcements spoken in native language without affecting text display
- Minimum one language must be selected

### Smart Sentence Splitting
- Handles abbreviations (e.g., i.e., etc., Dr., Mr., Mrs., Ms.)
- Splits long sentences at commas, semicolons, or word boundaries
- Ensures each chunk stays under 200 characters for TTS API

### Text Cleanup
- Adds proper spacing between concatenated headings
- Fixes missing periods between sentences
- Normalizes whitespace

## Design Choices

### Why Side Panel?
- Stays open while browsing (doesn't close on click-away)
- More screen space than popup
- Better for accessibility - larger controls

### Why Offscreen Document?
- Manifest V3 service workers can't use Audio API
- Offscreen documents provide persistent audio context
- Better audio queue management

### Why Large Buttons?
- Designed for users with weak vision
- 140x140px circular buttons with 64px emoji icons
- Easy to click even with reduced motor control

## Known Limitations

- PDF selection reading disabled (use "Read Full Article" instead)
- Local PDFs (file://) may have access restrictions
- Google TTS voice and speed cannot be customized
- Language must be selected manually (no auto-detection)

## Future Enhancements

- [ ] Auto-detect language from text content
- [ ] Playback speed control
- [ ] Keyboard shortcuts for all controls
- [ ] Word-by-word highlighting option
- [ ] Save reading position
- [ ] Reading history
- [ ] Custom color themes beyond high contrast
- [ ] More language options

## Contributing

Contributions, issues, and feature requests are welcome!

## License

This work is licensed under the Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License (CC BY-NC-ND 4.0).

You are free to share and use this extension for non-commercial purposes with proper attribution. See the [LICENSE](LICENSE) file for details.

## Author

Copyright (c) 2025 aikeymouse

