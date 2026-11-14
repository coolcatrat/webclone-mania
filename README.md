# webclone mania

## Parqis homepage clone

A static HTML/CSS/JS recreation of the [parqis.com](https://parqis.com/) mobile storefront homepage.

**What's in it**
- Festive header with sticky address bar, wishlist/profile icons and search
- ALL / ETHNIC / WESTERN / MEN tabs with a sliding glass pill and per-tab subcategory bubbles
- Auto-rotating banner carousels with swipe + dot indicators
- Horizontal product rows (price, MRP, % off) with add-to-cart (persisted in `localStorage`)
- "Trends" video-promo grid that opens the reel in a modal player
- Floating frosted bottom nav with a live cart count

Product data, banners and images are real: `data.js` is a snapshot of the site's public homepage API, and images are loaded from Parqis's CDN.

### Run it

```bash
python -m http.server 5173
```

Then open http://localhost:5173 (best viewed at phone width).

### Refresh the data

```bash
python scripts/fetch_data.py
```

### Files
- `index.html`: page shell
- `styles.css`: all styling
- `app.js`: rendering + interactions
- `data.js`: homepage data snapshot
- `assets/`: header background, icons, favicon
