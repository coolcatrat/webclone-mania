# webclone mania

## Parqis homepage clone

A static HTML/CSS/JS recreation of the [parqis.com](https://parqis.com/) mobile storefront homepage.

**What's in it**
- Festive header with address, search, wishlist and profile; the light-string artwork tiles across any screen width
- ALL / ETHNIC / WESTERN / MEN tabs with a sliding glass pill and per-tab category bubbles
- Auto-rotating banner carousels with swipe and dot indicators
- Product rows with price, MRP and % off; **View more** expands a row into a full grid
- **Search** across every product in every tab (press `/` to open it); category bubbles open a search too
- **Cart drawer** with quantities, MRP/discount/delivery breakdown and a free-delivery hint (saved in `localStorage`)
- "Trends" video tiles that play the reel in a modal player

Product data, banners and images are real: `data.js` is a snapshot of the site's public homepage API, and images are loaded from Parqis's CDN.

### Run it

```bash
python -m http.server 5173
```

Then open http://localhost:5173.

### Responsive behaviour
The layout is fluid rather than stuck at fixed sizes: cards, type, spacing and bubbles scale continuously with the screen, and content sits in a centred container (max 1440px) while the header and background run full width.

| Width | Layout |
|---|---|
| under 640px | Original mobile design: one banner per view, floating bottom nav, rows bleed to the screen edge |
| 640px+ | Two banners per view, three-across trends grid |
| 1024px+ | One-row header with search and nav built in, hover arrows on product rows |
| 1200px+ | Three banners per view, up to 7 cards per row |

Search opens full screen on phones and as a panel on larger screens; the cart is a bottom sheet on phones and a side drawer elsewhere.

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
