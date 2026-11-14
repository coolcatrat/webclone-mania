"""Re-pull the live homepage data from parqis.com and rewrite data.js.

Usage:  python scripts/fetch_data.py
"""
import json
import pathlib
import urllib.request

BASE = "https://parqis.com/backend/api"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36"
OUT = pathlib.Path(__file__).resolve().parent.parent / "data.js"


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def slim_product(p):
    v = (p.get("product_variants") or [{}])[0]
    meta = " · ".join(x for x in [v.get("option1"), v.get("option2")] if x)
    return {
        "t": p["title"],
        "img": p["featuredImageUrl"],
        "m": meta,
        "p": float(p["price"]),
        "c": float(p["compareAtPrice"] or 0),
        "d": p.get("discountPercent") or 0,
    }


def slim_section(s):
    cf, t = s["config"], s["type"]
    if t == "banner_long":
        return {"type": "banner", "slides": [x["media_url"] for x in cf["slides"]], "rot": cf.get("auto_rotate_seconds", 5)}
    if t == "product_cards":
        return {"type": "row", "title": cf["heading"], "products": [slim_product(p) for p in cf["products"]]}
    if t == "trends_secondary":
        return {
            "type": "trends",
            "items": [
                {
                    "img": i.get("resolved_thumbnail_url") or i.get("thumbnail_url"),
                    "badge": i.get("promo_text", ""),
                    "badgeBg": i.get("promo_overlay_color", "#A92645"),
                    "text": i.get("secondary_text", ""),
                    "video": i["video"]["video_url"],
                }
                for i in cf["items"]
            ],
        }
    print("skipping unknown section type:", t)
    return None


def main():
    cats = get(f"{BASE}/homepage/categories")["categories"]
    tabs = []
    for c in cats:
        home = get(f"{BASE}/homepage?main_category_id={c['id']}")
        sections = [x for x in (slim_section(s) for s in home["sections"]) if x]
        tabs.append({
            "label": c["label"],
            "subs": [{"label": s["label"], "icon": s["icon_url"]} for s in c["subcategories"]],
            "sections": sections,
        })
        print(f"{c['label']}: {len(sections)} sections")
    OUT.write_text("window.PARQIS_DATA=" + json.dumps({"tabs": tabs}, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
    print("wrote", OUT)


if __name__ == "__main__":
    main()
