# TypeSprint

A responsive typing practice website built with React, Vite, and plain CSS.

## Run locally

Requires a Node.js version compatible with Vite 8 (20.19+ or 22.12+).

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Features

- Timed tests: 15, 30, 60, and 120 seconds
- Word tests: 10, 25, 50, and 100 words
- Quote practice, punctuation, and numbers
- Type directly over the passage with character feedback
- Live WPM, accuracy, progress, and results
- Focus mode, Caps Lock warning, and Tab then Enter to restart
- Personal bests saved separately by test settings in localStorage
- Reading settings for font, size, spacing, contrast, and reduced motion

The timer starts on the first typed character. Timed tests add more words as needed; word and quote tests end when the full passage has been typed. WPM uses correct characters divided by five, normalized to one minute. Accuracy counts input attempts, including corrected mistakes. Preferences and records are stored locally in the browser; no account or backend is required.

## Checks

```bash
npm run lint
npm run build
npm run preview
```

Google Fonts supplies optional web fonts; system fallback fonts work without it.
