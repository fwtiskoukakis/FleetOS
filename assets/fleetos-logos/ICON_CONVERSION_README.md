# App Icon Setup Instructions

The app icon has been configured to use the new FleetOS logo, but **Expo requires PNG files for app icons, not SVG**.

## Steps to Complete Icon Setup:

1. **Convert SVG to PNG:**
   - You need to convert the SVG icon files (`icon-32.svg`, `icon-48.svg`, `icon-64.svg`, `icon-128.svg`, `icon-192.svg`) to PNG format
   - Use an online converter like:
     - https://svgtopng.com
     - https://convertio.co/svg-png/
     - Or any SVG to PNG converter
   - Or use a tool like ImageMagick: `convert icon-192.svg icon-192.png`

2. **Recommended PNG sizes:**
   - `icon-192.png` - 192x192px (for app icon and Android adaptive icon)
   - The app.json has been updated to reference `./assets/fleetos-logos/icon-192.png`

3. **After conversion:**
   - Place the PNG files in `./assets/fleetos-logos/` directory
   - The app icon should automatically use the new logo on next build

## Alternative: Use Existing Logo

If you prefer to keep using the existing logo, the current `./assets/logo.png` will continue to work.

## Note for Production Builds

After converting to PNG, you'll need to rebuild the app for the new icon to appear:
- For development: `npx expo start --clear`
- For production: `eas build --platform android` or `eas build --platform ios`

