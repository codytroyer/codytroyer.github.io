# codytroyer.github.io

Personal site hosted via **GitHub Pages**.

- Root homepage: `https://codytroyer.github.io/`
- Project pages live in subdirectories (example: `/kingshot/`)

## Repository layout

```bash
├─ index.html # Root landing page
├─ README.md # This file
└─ kingshot/ # Example project sub-site
├─ index.html
├─ style.css
└─ script.js
```

## How GitHub Pages is configured

This repository is intended to be deployed with GitHub Pages using:

- **Source:** Deploy from a branch
- **Branch:** `main`
- **Folder:** `/ (root)`

Once enabled, GitHub Pages serves:
- `index.html` at the root URL
- Any folder containing an `index.html` as a nested route (e.g., `kingshot/index.html` → `/kingshot/`)

## Local development

Because this is a static site, you can preview locally with any simple HTTP server.

### Option A: Python (most machines)
From the repo root:

```bash
python3 -m http.server 8000
```
Then open:
- http://localhost:8000/
- http://localhost:8000/kingshot/

### Option B: Node

If you have Node installed:

```bash
npx serve .
```

## Adding a new project page

To add another project under the same domain:

1. Create a new folder at the repo root, e.g. `myproject/`

2. Add:
- `myproject/index.html`
- (optional) `myproject/style.css`, `myproject/script.js`

3. Link it from the root homepage with a relative link:
```html
<a href="myproject/">My Project</a>
```

### Important: use relative paths
Because project pages are served under a path like `/myproject/`, prefer relative asset links:

✅ Good (relative to the folder):
```html
<link rel="stylesheet" href="style.css">
<script src="script.js" defer></script>
```

❌ Avoid (absolute from domain root, often breaks when reused):
```html
<link rel="stylesheet" href="/style.css">
```

