# ChatGPT Waiting Favicon

Chrome extension that changes the ChatGPT tab favicon while ChatGPT is responding or uploading files.

## What It Does

- Changes the favicon to a yellow waiting icon while ChatGPT is generating a response.
- Changes the favicon to the same yellow waiting icon while a file upload is running.
- Plays a short sound when the response or upload finishes.
- Changes the favicon to a green done icon until you view the tab.
- Restores the original favicon after you focus the completed ChatGPT tab.
- Runs only on `chatgpt.com` and `chat.openai.com`.

## Install Locally

1. Open `chrome://extensions/`.
2. Enable Developer mode.
3. Click **Load unpacked**.
4. Select this repository folder.
5. Reload any open ChatGPT tabs.

## Privacy

- No external network requests.
- No analytics.
- No storage.
- No access outside ChatGPT domains.
- Uses Chrome's offscreen document permission only for local audio playback.

## Notes

ChatGPT's DOM changes over time. If detection stops working, update `isGenerating()` or `isUploading()` in `content.js`.

## License

MIT
