(() => {
  const DATA = window.PARQIS_DATA;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const inr = (n) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };

  const FREE_DELIVERY_MIN = 499;
  const DELIVERY_FEE = 30;

  const ICON = {
    play: `<svg viewBox="0 0 64 72" fill="none"><path d="M57.6 30.7629C61.8667 33.2263 61.8667 39.3826 57.6 41.846L14.4 66.7885C10.1333 69.2519 4.79999 66.1738 4.79999 61.247L4.79999 11.3619C4.79999 6.43513 10.1333 3.357 14.4 5.8204L57.6 30.7629Z" fill="rgba(255,255,255,0.22)" stroke="rgba(255,255,255,0.45)" stroke-width="2.5" stroke-linejoin="round"/></svg>`,
    right: `<svg viewBox="0 0 24 24" class="ic"><path d="m9 18 6-6-6-6"/></svg>`,
    left: `<svg viewBox="0 0 24 24" class="ic"><path d="m15 18-6-6 6-6"/></svg>`,
    bag: `<svg viewBox="0 0 24 24" class="ic"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>`,
  };

  // ---------- Toast ----------
  const toastEl = $("#toast");
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1800);
  }

  // ---------- Image skeleton → loaded ----------
  function markLoaded(img) {
    const done = () => img.classList.add("loaded");
    if (img.complete && img.naturalWidth) done();
    else {
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    }
  }

  // ---------- Overlays (search, cart): open/close with transitions + scroll lock ----------
  const openOverlays = new Set();
  function openOverlay(node, focusEl) {
    node.hidden = false;
    openOverlays.add(node);
    document.documentElement.classList.add("is-locked");
    requestAnimationFrame(() => requestAnimationFrame(() => node.classList.add("is-open")));
    if (focusEl) setTimeout(() => focusEl.focus({ preventScroll: true }), 60);
  }
  function closeOverlay(node) {
    if (node.hidden) return;
    node.classList.remove("is-open");
    openOverlays.delete(node);
    setTimeout(() => {
      if (!node.classList.contains("is-open")) node.hidden = true;
      if (!openOverlays.size) document.documentElement.classList.remove("is-locked");
    }, 300);
  }
  $$(".overlay").forEach((ov) => ov.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeOverlay(ov);
  }));

  // ---------- Cart ----------
  // Each line: { id, t, img, m, p, c, qty }; id is the variant image URL (unique per variant).
  let cart = store.get("parqis-cart-v2", []);
  if (!Array.isArray(cart)) cart = [];
  const cartBadge = $("#cartBadge");
  const cartModal = $("#cart");

  function saveCart() {
    store.set("parqis-cart-v2", cart);
    const count = cart.reduce((n, l) => n + l.qty, 0);
    cartBadge.hidden = count === 0;
    cartBadge.textContent = count > 99 ? "99+" : count;
    cartBadge.classList.remove("bump");
    void cartBadge.offsetWidth;
    cartBadge.classList.add("bump");
    $$(".cart-btn").forEach((b) => b.classList.toggle("added", cart.some((l) => l.id === b.dataset.id)));
    if (!cartModal.hidden) renderCart();
  }

  function toggleInCart(p) {
    const i = cart.findIndex((l) => l.id === p.img);
    if (i >= 0) { cart.splice(i, 1); toast("Removed from cart"); }
    else { cart.push({ id: p.img, t: p.t, img: p.img, m: p.m, p: p.p, c: p.c, qty: 1 }); toast("Added to cart"); }
    saveCart();
  }

  function renderCart() {
    const items = $("#cartItems");
    const foot = $("#cartSummary");
    const count = cart.reduce((n, l) => n + l.qty, 0);
    $("#cartCount").textContent = count ? `(${count} item${count > 1 ? "s" : ""})` : "";

    if (!cart.length) {
      items.innerHTML = `<div class="cart-empty">${ICON.bag}<strong>Your cart is empty</strong><p>Tap the cart button on any product to add it here.</p><button class="primary-btn" data-close>Continue shopping</button></div>`;
      foot.innerHTML = "";
      return;
    }

    items.innerHTML = "";
    cart.forEach((l) => {
      const row = el("div", "line");
      row.innerHTML = `
        <img src="${esc(l.img)}" alt="" loading="lazy" />
        <div>
          <p class="line__title">${esc(l.t)}</p>
          <p class="line__meta">${esc(l.m)}</p>
          <p class="line__price">${inr(l.p * l.qty)} ${l.c > l.p ? `<s>${inr(l.c * l.qty)}</s>` : ""}</p>
          <div class="line__actions">
            <div class="qty">
              <button type="button" data-act="dec" aria-label="Decrease quantity">&minus;</button>
              <span aria-live="polite">${l.qty}</span>
              <button type="button" data-act="inc" aria-label="Increase quantity">+</button>
            </div>
            <button type="button" class="link-btn" data-act="remove">Remove</button>
          </div>
        </div>`;
      markLoaded($("img", row));
      row.addEventListener("click", (e) => {
        const act = e.target.closest("[data-act]")?.dataset.act;
        if (!act) return;
        if (act === "inc") l.qty = Math.min(10, l.qty + 1);
        if (act === "dec") l.qty -= 1;
        if (act === "remove" || l.qty < 1) cart = cart.filter((x) => x !== l);
        saveCart();
      });
      items.appendChild(row);
    });

    const subtotal = cart.reduce((s, l) => s + l.p * l.qty, 0);
    const mrp = cart.reduce((s, l) => s + Math.max(l.c, l.p) * l.qty, 0);
    const delivery = subtotal >= FREE_DELIVERY_MIN ? 0 : DELIVERY_FEE;
    const short = FREE_DELIVERY_MIN - subtotal;
    foot.innerHTML = `
      <div class="sum">
        <div><span>Total MRP</span><span>${inr(mrp)}</span></div>
        <div class="save"><span>Discount</span><span>&minus;${inr(mrp - subtotal)}</span></div>
        <div><span>Delivery</span><span>${delivery ? inr(delivery) : "Free"}</span></div>
        <div class="total"><span>Total</span><span>${inr(subtotal + delivery)}</span></div>
      </div>
      ${short > 0 ? `<p class="hint">Add ${inr(short)} more for free delivery</p>` : ""}
      <button type="button" class="primary-btn" id="checkoutBtn">Place order</button>`;
    $("#checkoutBtn").addEventListener("click", () => toast("Checkout isn't part of this clone"));
  }

  function openCart() { renderCart(); openOverlay(cartModal, $(".icon-btn", cartModal)); }

  // ---------- Section renderers ----------
  const timers = [];
  const resizeHooks = [];

  function renderBanner(sec) {
    const wrap = el("section", "banner");
    const track = el("div", "banner__track");
    const dots = el("div", "banner__dots");
    sec.slides.forEach((src, i) => {
      const slide = el("div", "banner__slide");
      const img = el("img");
      img.src = src; img.alt = ""; img.loading = i < 3 ? "eager" : "lazy";
      markLoaded(img);
      slide.appendChild(img);
      track.appendChild(slide);
    });
    wrap.append(track, dots);

    // Slides per view comes from CSS (1 / 2 / 3 depending on width).
    const slideStep = () => {
      const [a, b] = track.children;
      return b ? b.offsetLeft - a.offsetLeft : track.clientWidth;
    };
    const positions = () => {
      const perView = Math.max(1, Math.round((track.clientWidth + 1) / slideStep()));
      return Math.max(1, sec.slides.length - perView + 1);
    };
    let idx = 0;
    let count = 0;
    const setDot = (i) => [...dots.children].forEach((d, j) => d.classList.toggle("is-active", j === i));
    const buildDots = () => {
      const n = positions();
      if (n === count) return;
      count = n;
      dots.innerHTML = "";
      if (n > 1) for (let i = 0; i < n; i++) dots.appendChild(el("span"));
      idx = Math.min(idx, n - 1);
      setDot(idx);
    };
    requestAnimationFrame(buildDots);
    resizeHooks.push(buildDots);

    track.addEventListener("scroll", () => {
      const i = Math.min(count - 1, Math.round(track.scrollLeft / slideStep()));
      if (i !== idx) { idx = i; setDot(i); }
    }, { passive: true });

    if (sec.slides.length > 1) {
      let paused = false;
      wrap.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") paused = true; });
      wrap.addEventListener("pointerleave", () => (paused = false));
      wrap.addEventListener("touchstart", () => (paused = true), { passive: true });
      wrap.addEventListener("touchend", () => setTimeout(() => (paused = false), 3000), { passive: true });
      timers.push(setInterval(() => {
        if (paused || document.hidden || count < 2) return;
        const next = (idx + 1) % count;
        track.scrollTo({ left: next * slideStep(), behavior: next === 0 ? "auto" : "smooth" });
      }, (sec.rot || 5) * 1000));
    }
    return wrap;
  }

  function productCard(p) {
    const card = el("article", "card");
    card.innerHTML = `
      <div class="card__media">
        <img class="card__img" src="${esc(p.img)}" alt="${esc(p.t)}" loading="lazy" width="109" height="128" />
        <button type="button" class="cart-btn" data-id="${esc(p.img)}" aria-label="Add ${esc(p.t)} to cart">
          <img src="assets/add-to-cart.svg" alt="" width="13" height="13" />
        </button>
      </div>
      <div class="card__info">
        <p class="card__title">${esc(p.t)}<br>${esc(p.m)}</p>
        <p class="card__price">${inr(p.p)} ${p.c > p.p ? `<s>${inr(p.c)}</s> <span class="off">${p.d}% OFF</span>` : ""}</p>
      </div>`;
    markLoaded($(".card__img", card));
    const btn = $(".cart-btn", card);
    if (cart.some((l) => l.id === p.img)) btn.classList.add("added");
    btn.addEventListener("click", (e) => { e.stopPropagation(); toggleInCart(p); });
    return card;
  }

  function renderRow(sec) {
    const s = el("section", "row-section");
    s.innerHTML = `<div class="row-head"><h3>${esc(sec.title)}</h3><button type="button" class="view-more" aria-expanded="false"><span>View more</span>${ICON.right}</button></div>`;
    const row = el("div", "row scroll-x");
    sec.products.forEach((p) => row.appendChild(productCard(p)));

    const wrap = el("div", "row-wrap");
    const prev = el("button", "row-arrow row-arrow--prev", ICON.left);
    const next = el("button", "row-arrow row-arrow--next", ICON.right);
    prev.setAttribute("aria-label", "Scroll left");
    next.setAttribute("aria-label", "Scroll right");
    const page = (dir) => row.scrollBy({ left: dir * row.clientWidth * 0.85, behavior: "smooth" });
    prev.addEventListener("click", () => page(-1));
    next.addEventListener("click", () => page(1));
    const syncArrows = () => {
      prev.disabled = row.scrollLeft <= 2;
      next.disabled = row.scrollLeft + row.clientWidth >= row.scrollWidth - 2;
    };
    row.addEventListener("scroll", syncArrows, { passive: true });
    requestAnimationFrame(syncArrows);
    resizeHooks.push(syncArrows);

    // "View more" expands the row into a wrapped grid in place
    const more = $(".view-more", s);
    more.addEventListener("click", () => {
      const open = s.classList.toggle("is-expanded");
      more.setAttribute("aria-expanded", open);
      $("span", more).textContent = open ? "View less" : "View more";
      row.scrollLeft = 0;
      if (!open) s.scrollIntoView({ block: "nearest", behavior: "smooth" });
      requestAnimationFrame(syncArrows);
    });

    wrap.append(prev, row, next);
    s.appendChild(wrap);
    return s;
  }

  function trendTile(item, big) {
    const a = el("article", "trend " + (big ? "trend--big" : "trend--small"));
    a.tabIndex = 0;
    a.setAttribute("role", "button");
    a.setAttribute("aria-label", "Play video" + (item.text ? ": " + item.text : ""));
    a.innerHTML = `
      <img src="${esc(item.img)}" alt="" loading="lazy" />
      ${item.badge ? `<div class="trend__badge" style="background:${esc(item.badgeBg)}">${esc(item.badge)}</div>` : ""}
      <div class="trend__play">${ICON.play}</div>
      ${big && item.text ? `<div class="trend__foot"><p>${esc(item.text)}</p><span class="explore-btn">Explore${ICON.right}</span></div>` : ""}`;
    markLoaded($("img", a));
    const play = () => openVideo(item.video);
    a.addEventListener("click", play);
    a.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); play(); } });
    return a;
  }

  function renderTrends(sec) {
    const s = el("section", "trends");
    s.id = "trends-section";
    const [first, ...rest] = sec.items;
    s.appendChild(trendTile(first, true));
    const col = el("div", "trends__col");
    rest.forEach((it) => col.appendChild(trendTile(it, false)));
    s.appendChild(col);
    return s;
  }

  // ---------- Video modal ----------
  const modal = $("#videoModal");
  const video = $("#videoEl");
  function openVideo(src) {
    if (!src) return;
    video.src = src;
    modal.hidden = false;
    document.documentElement.classList.add("is-locked");
    video.play().catch(() => {});
  }
  function closeVideo() {
    video.pause();
    video.removeAttribute("src");
    video.load();
    modal.hidden = true;
    if (!openOverlays.size) document.documentElement.classList.remove("is-locked");
  }
  $("#videoClose").addEventListener("click", closeVideo);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeVideo(); });

  // ---------- Search ----------
  const searchModal = $("#search");
  const searchInput = $("#searchInput");
  const results = $("#searchResults");
  const meta = $("#searchMeta");

  // Every product across every tab, de-duplicated by variant image.
  const catalog = [];
  const seen = new Set();
  DATA.tabs.forEach((t) => t.sections.forEach((s) => (s.products || []).forEach((p) => {
    if (seen.has(p.img)) return;
    seen.add(p.img);
    catalog.push({ ...p, hay: (p.t + " " + p.m + " " + t.label + " " + s.title).toLowerCase() });
  })));

  const chipLabels = [...new Set(["Kurta", "Hoodie", "Bodycon", "Co-ord", "Crop Top", "Sweatshirt", ...DATA.tabs.flatMap((t) => t.subs.map((s) => s.label))])].slice(0, 12);
  $("#searchChips").innerHTML = chipLabels.map((l) => `<button type="button" class="chip">${esc(l)}</button>`).join("");
  $("#searchChips").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    searchInput.value = chip.textContent;
    runSearch();
    searchInput.focus();
  });

  function runSearch() {
    const q = searchInput.value.trim().toLowerCase();
    results.innerHTML = "";
    if (!q) { meta.textContent = ""; return; }
    const words = q.replace(/[^a-z0-9\s-]/g, " ").split(/\s+/)
      .map((w) => (w.length > 3 ? w.replace(/(es|s)$/, "") : w)) // "hoodies" → "hoodi", "kurtas" → "kurta"
      .filter((w) => w.length > 1);
    const hits = catalog.filter((p) => words.every((w) => p.hay.includes(w)));
    if (!hits.length) {
      meta.textContent = "";
      results.innerHTML = `<div class="empty" style="grid-column:1/-1"><strong>No results for “${esc(searchInput.value.trim())}”</strong>Try a broader word like “top”, “suit” or “sweatshirt”.</div>`;
      return;
    }
    meta.textContent = `${hits.length} product${hits.length > 1 ? "s" : ""} for “${searchInput.value.trim()}”`;
    const frag = document.createDocumentFragment();
    hits.slice(0, 60).forEach((p) => frag.appendChild(productCard(p)));
    results.appendChild(frag);
  }
  let searchTimer;
  searchInput.addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(runSearch, 120); });
  $("#searchBtn").addEventListener("click", () => openOverlay(searchModal, searchInput));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!modal.hidden) return closeVideo();
      [...openOverlays].forEach(closeOverlay);
    }
    if (e.key === "/" && !openOverlays.size && !/input|textarea/i.test(document.activeElement.tagName)) {
      e.preventDefault();
      openOverlay(searchModal, searchInput);
    }
  });

  // ---------- Tabs ----------
  const tabsEl = $("#tabs");
  const pill = $("#tabPill");
  const subsEl = $("#subs");
  const content = $("#content");

  DATA.tabs.forEach((t, i) => {
    const b = el("button", "tab", esc(t.label));
    b.type = "button";
    b.setAttribute("role", "tab");
    b.addEventListener("click", () => selectTab(i));
    tabsEl.appendChild(b);
  });

  let pillPlaced = false;
  function movePill(btn) {
    if (!pillPlaced) pill.style.transition = "none";
    pill.style.width = btn.offsetWidth + "px";
    pill.style.transform = `translateX(${btn.offsetLeft}px)`;
    if (!pillPlaced) {
      void pill.offsetWidth; // flush so the first placement doesn't animate
      pill.style.transition = "";
      pillPlaced = true;
    }
  }

  function selectTab(i) {
    const tab = DATA.tabs[i];
    const btns = $$(".tab", tabsEl);
    btns.forEach((b, j) => { b.classList.toggle("is-active", j === i); b.setAttribute("aria-selected", j === i); });
    movePill(btns[i]);
    if (tabsEl.scrollWidth > tabsEl.clientWidth) btns[i].scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });

    subsEl.innerHTML = "";
    tab.subs.forEach((s) => {
      const b = el("button", "sub");
      b.type = "button";
      b.innerHTML = `<img src="${esc(s.icon)}" alt="" width="70" height="70" /><p>${esc(s.label)}</p>`;
      b.addEventListener("click", () => {
        openOverlay(searchModal, searchInput);
        searchInput.value = s.label.replace(/^Men's\s+/i, "");
        runSearch();
      });
      subsEl.appendChild(b);
    });

    timers.splice(0).forEach(clearInterval);
    resizeHooks.length = 0;
    content.innerHTML = "";
    const frag = document.createDocumentFragment();
    tab.sections.forEach((sec) => {
      if (sec.type === "banner") frag.appendChild(renderBanner(sec));
      else if (sec.type === "row") frag.appendChild(renderRow(sec));
      else if (sec.type === "trends") frag.appendChild(renderTrends(sec));
    });
    content.appendChild(frag);
    store.set("parqis-tab", i);
  }

  // ---------- Header height → keeps the festive background seamless ----------
  const header = $("#header");
  const syncHeader = () => document.documentElement.style.setProperty("--header-h", header.offsetHeight + "px");
  if ("ResizeObserver" in window) new ResizeObserver(syncHeader).observe(header);

  // ---------- Bottom nav ↔ header nav ----------
  const nav = $(".bottom-nav");
  const navHome = nav.parentNode;
  const navSlot = $("#desktopNavSlot");
  const desktopMQ = window.matchMedia("(min-width: 1024px)");
  const placeNav = () => {
    if (desktopMQ.matches) navSlot.appendChild(nav);
    else navHome.insertBefore(nav, toastEl);
    syncHeader();
  };
  placeNav();
  desktopMQ.addEventListener("change", placeNav);

  nav.addEventListener("click", (e) => {
    const item = e.target.closest("[data-nav]");
    if (!item) return;
    e.preventDefault();
    const where = item.dataset.nav;
    if (where === "cart") return openCart();
    [...openOverlays].forEach(closeOverlay);
    if (where === "home") return window.scrollTo({ top: 0, behavior: "smooth" });
    if (where === "categories") {
      $("#top").scrollIntoView({ behavior: "smooth" });
      return toast("Pick a category to browse it");
    }
    if (where === "trends") {
      const t = $("#trends-section");
      if (!t) return toast("No trends in this tab yet");
      const y = t.getBoundingClientRect().top + window.scrollY - header.offsetHeight - 16;
      return window.scrollTo({ top: y, behavior: "smooth" });
    }
  });

  $$("[data-soon]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); toast(a.dataset.soon + " is coming soon"); }));

  let resizeRaf;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      const active = $(".tab.is-active", tabsEl);
      if (active) movePill(active);
      syncHeader();
      resizeHooks.forEach((fn) => fn());
    });
  });
  // Re-measure once web fonts settle (tab widths change slightly)
  document.fonts?.ready.then(() => { const a = $(".tab.is-active", tabsEl); if (a) movePill(a); syncHeader(); });

  const saved = store.get("parqis-tab", 0);
  selectTab(saved >= 0 && saved < DATA.tabs.length ? saved : 0);
  saveCart();
  cartBadge.classList.remove("bump");
})();
