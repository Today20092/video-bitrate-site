# Video Bitrate Calculator - Astro Edition

A modern video bitrate calculator built with Astro, Tailwind CSS, and vanilla JavaScript for static deployment on GitHub Pages.

## Tech Stack

- **Framework**: Astro 5.x (Static Site Generation)
- **Styling**: Tailwind CSS 4
- **Components**: Material Web Components 3
- **Runtime**: Vanilla JavaScript client script
- **Deployment**: GitHub Pages

## Project Structure

```
├── src/
│   ├── pages/
│   │   └── index.astro          # Main page
│   ├── layouts/
│   │   └── Layout.astro         # Base layout template
│   ├── scripts/
│   │   └── app.js               # Application logic
│   └── styles/
│       └── globals.css          # Tailwind directives and custom styles
├── public/
│   ├── favicon.svg              # Site favicon
│   ├── manifest.json            # PWA manifest
│   ├── og-image.svg             # Social preview image
│   ├── robots.txt               # Crawl directives
│   ├── sitemap.xml              # Crawl index
│   └── sw.js                    # Service Worker
├── dist/                        # Build output (auto-generated)
├── astro.config.mjs             # Astro configuration
```

## Development

### Install Dependencies
```bash
npm install
```

### Local Development
```bash
npm run dev
```
Opens dev server at `http://localhost:3000`

### Build for Production
```bash
npm run build
```
Generates static site in `dist/` folder

### Preview Build
```bash
npm run preview
```

## Deployment

### GitHub Pages Setup

1. **Ensure GitHub Pages is enabled** in your repository settings (Settings → Pages)
2. **Set deployment source** to "GitHub Actions"
3. **Push to main branch**
4. GitHub Actions will automatically build and deploy to `https://today20092.github.io/video-bitrate-site`

The deployment workflow is configured in `.github/workflows/deploy.yml`

### Manual Deployment

```bash
npm run build
# dist/ folder now contains the static site ready for deployment
```

## Configuration

### Site URL
Update `astro.config.mjs` if deploying to a different URL:
```javascript
site: 'https://today20092.github.io/video-bitrate-site/',
base: '/video-bitrate-site/',
```

### Tailwind CSS
Tailwind v4 is configured through `src/styles/globals.css` and the Vite plugin in `astro.config.mjs`.

## Features

- ✨ Fully static with a single vanilla JS client script
- 📱 Mobile responsive with Tailwind CSS
- 🎨 Material Design 3 components
- 🚀 Fast builds with Astro
- 🔧 PWA ready with Service Worker, manifest, and favicon
- 📊 CSV export capability
- 🌙 Dark mode support
