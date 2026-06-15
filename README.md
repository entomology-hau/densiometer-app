# Mobile Forest Overstory Density

Static, offline-capable GitHub Pages web app for estimating forest overstory density directly from an upward-facing mobile phone image.

The app does **not** require a spherical densiometer or an image of a densiometer. It uses a phone image as the sampling surface and reports:

1. **96-dot densiometer-equivalent overstory density**: automatic classification of 96 sample dots as sky openings or canopy. The density is calculated as `100 - sky_opening_dots * (100 / 96)`.
2. **Pixel-area canopy closure**: automatic classification of all sampled pixels inside the selected circular field of view.

Images are loaded with the **Add photo** button, which opens an in-app source chooser: **Take photo** uses the camera-specific file input, while **Choose from photos/files** uses the normal file picker. This is more reliable on Android browsers than relying on a single native picker to expose both options. After selection, the image is placed into a fixed square analysis window. Pinch directly on the image to zoom and drag to reposition the photo underneath the centred analysis overlay. The horizontal and vertical sliders provide the same repositioning control and auto-zoom slightly when required so the crop can move in both directions. The image panel reports the current transformed-image pixel area inside the circular field of view and the approximate original-photo pixel area represented at the selected zoom. The pixel classifier includes optional negative-image analysis and a sky-opening sensitivity slider. Negative mode inverts the image display and reverses the threshold direction, while the sensitivity slider makes sky-opening selection stricter or more permissive without changing the raw image.

All processing is local in the browser. No image data is uploaded.

## Version 1.7 mobile UI and position-control adjustment

This build keeps the Android fixed-square analysis window from v1.6 and restores the key v1.5 mobile optimisations. Mobile layout has been tightened for field use, including a bottom quick-action bar, a larger image-first workflow after a photo is loaded, compact image controls beside the image, a mobile-only photo-position panel directly under the image, safe-area spacing and smaller mobile analysis images on coarse-pointer or lower-memory devices.

The horizontal and vertical photo-position sliders now visibly move the selected crop. If a photo exactly fills the square window at 100% zoom, moving a position slider automatically raises the zoom slightly so there is image area available to pan under the fixed 96-dot overlay. Pinch-and-drag interaction on the image uses the same transform logic.

## Deploy on GitHub Pages

1. Create a GitHub repository.
2. Copy all files in this folder to the repository root.
3. Commit and push.
4. In the repository, open **Settings → Pages**.
5. Select **Deploy from a branch**, then choose the `main` branch and `/ (root)`.
6. Open the GitHub Pages URL once while online. After the first load, the service worker caches the app for offline use.

## Field use

Use a consistent protocol if readings will be compared among plots, dates or treatments:

- Use the same phone, lens, focal length and image aspect ratio.
- Use **Add photo** and choose either **Take photo** or **Choose from photos/files**.
- Prefer the widest available lens or a fisheye adapter.
- Hold the phone level and point the camera vertically upward.
- Fix exposure and focus where the camera app allows it.
- Avoid direct sun glare and wet lens surfaces.
- Use the same circular region of interest, zoom and photo position protocol for all images.
- Keep negative-image mode, classifier mode and sky-opening sensitivity consistent within a dataset unless calibration indicates otherwise.
- Take four readings around the reference point or reference tree and average them.
- Record lens, cloud cover, phenological stage, zoom setting, photo position and any manual dot corrections.

## Interpretation

This app is designed to replicate the counting logic of a spherical densiometer, not the optical geometry of its curved mirror. A normal phone lens usually has a narrower and differently projected field of view than a spherical densiometer. For formal comparability with historic densiometer datasets, calibrate the phone-image output against local densiometer readings or use a standard hemispherical photography protocol.

## Files

- `index.html` — app interface.
- `app.js` — image analysis, 96-dot sampling, pixel classification, CSV export.
- `style.css` — layout and mobile-friendly styling.
- `sw.js` — offline service worker.
- `manifest.webmanifest` — installable web app metadata.
- `icons/` — local app icons.
- `.nojekyll` — keeps GitHub Pages from applying Jekyll processing.
