# Lumora Rush
Glide. Grow. Outshine the void. A free offline cosmic runner with 50 levels.

## Deploy to Vercel
1. Unzip this folder.
2. Push it to GitHub and import the repo on vercel.com, OR run `npx vercel --prod` inside the folder.
3. Framework preset: **Other**. Build command: none. Output directory: leave empty (root).

## Local test
for local host
`npx serve .` 
or `python3 -m http.server` then open http://localhost:8000

## Notes
- Works offline after the first load (service worker). Bump `CACHE` in `sw.js` when you update files.
- All rights reserved by LAKhan @2026
