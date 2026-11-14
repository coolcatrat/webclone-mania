(() => {
  const DATA = window.PARQIS_DATA;
  const $ = (sel, root = document) => root.querySelector(sel);
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

  const PLAY_SVG = `<svg viewBox="0 0 64 72" fill="none"><path d="M57.6 30.7629C61.8667 33.2263 61.8667 39.3826 57.6 41.846L14.4 66.7885C10.1333 69.2519 4.79999 66.1738 4.79999 61.247L4.79999 11.3619C4.79999 6.43513 10.1333 3.357 14.4 5.8204L57.6 30.7629Z" fill="rgba(255,255,255,0.22)" stroke="rgba(255,255,255,0.45)" stroke-width="2.5" stroke-linejoin="round"/></svg>`;
  const CHEVRON = `<svg viewBox="0 0 24 24" class="ic"><path d="m9 18 6-6-6-6"/></svg>`;

  // ---------- Toast ----------
  const toastEl = $("#toast");
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1800);
  }

  // ---------- Cart ----------
  let cart = store.get("parqis-cart", []);
  const cartBadge = $("#cartBadge");
  function renderCartBadge() {
    cartBadge.hidden = cart.length === 0;
    cartBadge.textContent = cart.length;
  }
  renderCartBadge();

  // ---------- Image load fade ----------
  function markLoaded(img) {
    const done = () => img.classList.add("loaded");
    if (img.complete && img.naturalWidth) done();
    else img.addEventListener("load", done, { once: true });
  }

  // ---------- Section renderers ----------
  const timers = [];

  function renderBanner(sec) {
    const wrap = el("section", "banner");
    const track = el("div", "banner__track");
    const dots = el("div", "banner__dots");
    sec.slides.forEach((src, i) => {
      const slide = el("div", "banner__slide");
      const img = el("img");
      img.src = src; img.alt = ""; img.loading = i === 0 ? "eager" : "lazy";
      markLoaded(img);
      slide.appendChild(img);
      track.appendChild(slide);
      dots.appendChild(el("span", i === 0 ? "is-active" : ""));
    });
    wrap.append(track, dots);

    let idx = 0;
    const setDot = (i) => [...dots.children].forEach((d, j) => d.classList.toggle("is-active", j === i));
    track.addEventListener("scroll", () => {
      const i = Math.round(track.scrollLeft / track.clientWidth);
      if (i !== idx) { idx = i; setDot(i); }
    }, { passive: true });

    if (sec.slides.length > 1) {
      let paused = false;
      wrap.addEventListener("pointerenter", () => (paused = true));
      wrap.addEventListener("pointerleave", () => (paused = false));
      wrap.addEventListener("touchstart", () => (paused = true), { passive: true });
      wrap.addEventListener("touchend", () => setTimeout(() => (paused = false), 3000), { passive: true });
      timers.push(setInterval(() => {
        if (paused || document.hidden) return;
        const next = (idx + 1) % sec.slides.length;
        track.scrollTo({ left: next * track.clientWidth, behavior: next === 0 ? "auto" : "smooth" });
      }, (sec.rot || 5) * 1000));
    }
    return wrap;
  }

  function productCard(p) {
    const card = el("article", "card");
    card.innerHTML = `
      <div class="card__media">
        <img class="card__img" src="${esc(p.img)}" alt="${esc(p.t)}" loading="lazy" />
        <button type="button" class="cart-btn" aria-label="Add ${esc(p.t)} to cart">
          <img src="assets/add-to-cart.svg" alt="" width="13" height="13" />
        </button>
      </div>
      <div class="card__info">
        <p class="card__title">${esc(p.t)}<br>${esc(p.m)}</p>
        <p class="card__price">${inr(p.p)} ${p.c > p.p ? `<s>${inr(p.c)}</s> <span class="off">${p.d}% OFF</span>` : ""}</p>
      </div>`;
    markLoaded($(".card__img", card));
    const btn = $(".cart-btn", card);
    const key = p.img;
    if (cart.includes(key)) btn.classList.add("added");
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (cart.includes(key)) {
        cart = cart.filter((k) => k !== key);
        toast("Removed from cart");
      } else {
        cart.push(key);
        toast("Added to cart");
      }
      store.set("parqis-cart", cart);
      document.querySelectorAll(".cart-btn").forEach((b) => {
        const img = b.closest(".card").querySelector(".card__img").getAttribute("src");
        b.classList.toggle("added", cart.includes(img));
      });
      renderCartBadge();
    });
    return card;
  }

  function renderRow(sec) {
    const s = el("section", "row-section");
    s.innerHTML = `<div class="row-head"><h3>${esc(sec.title)}</h3><button class="view-more">View more <b>&gt;</b></button></div>`;
    const row = el("div", "row scroll-x");
    sec.products.forEach((p) => row.appendChild(productCard(p)));
    s.appendChild(row);
    return s;
  }

  function trendTile(item, big) {
    const a = el("article", "trend " + (big ? "trend--big" : "trend--small"));
    a.innerHTML = `
      <img src="${esc(item.img)}" alt="" loading="lazy" />
      ${item.badge ? `<div class="trend__badge" style="background:${esc(item.badgeBg)}">${esc(item.badge)}</div>` : ""}
      <div class="trend__play">${PLAY_SVG}</div>
      ${big && item.text ? `<div class="trend__foot"><p>${esc(item.text)}</p><button class="explore-btn">Explore${CHEVRON}</button></div>` : ""}`;
    markLoaded($("img", a));
    a.addEventListener("click", () => openVideo(item.video));
    return a;
  }

  function renderTrends(sec) {
    const s = el("section", "trends");
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
    video.play().catch(() => {});
  }
  function closeVideo() {
    video.pause();
    video.removeAttribute("src");
    video.load();
    modal.hidden = true;
  }
  $("#videoClose").addEventListener("click", closeVideo);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeVideo(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) closeVideo(); });

  // ---------- Tabs ----------
  const tabsEl = $("#tabs");
  const pill = $("#tabPill");
  const subsEl = $("#subs");
  const content = $("#content");

  DATA.tabs.forEach((t, i) => {
    const b = el("button", "tab", esc(t.label));
    b.addEventListener("click", () => selectTab(i));
    tabsEl.appendChild(b);
  });

  function movePill(btn) {
    pill.style.width = btn.offsetWidth + "px";
    pill.style.transform = `translateX(${btn.offsetLeft}px)`;
  }

  function selectTab(i) {
    const tab = DATA.tabs[i];
    const btns = [...tabsEl.querySelectorAll(".tab")];
    btns.forEach((b, j) => b.classList.toggle("is-active", j === i));
    movePill(btns[i]);
    btns[i].scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });

    subsEl.innerHTML = "";
    tab.subs.forEach((s) => {
      const b = el("button", "sub");
      b.innerHTML = `<img src="${esc(s.icon)}" alt="${esc(s.label)}" width="70" height="70" /><p>${esc(s.label)}</p>`;
      subsEl.appendChild(b);
    });

    timers.splice(0).forEach(clearInterval);
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

  window.addEventListener("resize", () => {
    const active = tabsEl.querySelector(".tab.is-active");
    if (active) movePill(active);
  });

  // ---------- Header height → aligns the festive background seam ----------
  const header = $("#header");
  const syncHeader = () => document.documentElement.style.setProperty("--header-h", header.offsetHeight + "px");
  syncHeader();
  window.addEventListener("resize", syncHeader);

  // ---------- Misc no-op links ----------
  $("#searchBtn").addEventListener("click", () => toast("Search is not part of this clone"));
  document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach((a) =>
    a.addEventListener("click", (e) => { e.preventDefault(); toast((a.textContent.replace(/\d+/g, "").trim() || a.getAttribute("aria-label")) + " — coming soon"); })
  );

  const saved = store.get("parqis-tab", 0);
  selectTab(saved >= 0 && saved < DATA.tabs.length ? saved : 0);
})();
