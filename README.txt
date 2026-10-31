# Ishaan Raj portfolio redesign

## Files
- `index.html` — home page
- `projects.html` — project gallery
- `about.html` — about page
- `contact.html` — contact page
- `styles.css` — shared responsive design
- `script.js` — mobile navigation, reveal animations, PWA install prompt, service worker registration

## Install on your existing GitHub Pages site
1. Download and unzip this folder.
2. Back up your current `index.html` and `styles.css`.
3. Upload the four HTML files, `styles.css`, and `script.js` to the same root folder of your website.
4. Keep your existing `manifest.json`, `sw.js`, favicon files, and project image files in the site root.
5. Confirm that `/projects.html`, `/about.html`, and `/contact.html` load after publishing.

The design reuses your existing project URLs and image filenames. It does not require a build step or new packages.

## Notes
- The contact page uses `ishaan@zenithish.com`; update that address if you prefer a different public contact email.
- Your existing service worker may cache old pages/styles. If changes do not appear, update its cache version or clear the site cache in the browser.
- The project image names are retained from the original code.
