// filename: userscript/manga-grid.user.js
// ==UserScript==
// @name         Manga Grid 5-per-row (no distortion) + Soft Border + Auto Aspect
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Gom ảnh thành lưới 5 cột, giữ tỉ lệ. Sửa lệch hàng khi ảnh kích thước khác nhau bằng khung đồng bộ chiều cao (object-fit: contain/cover, auto aspect).
// @match        *://*.manga18fx.com/*
// @match        *://manhwaclub.net/*
// @match        *://www.manhwahub.net/*
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(() => {
    "use strict";

    /* ===== Cấu hình ===== */
    const CONFIG = {
        columns: 5,
        gapPx: 8,
        uniformHeight: true, // BẬT để hết lệch hàng
        fitMode: "contain", // "contain": không crop (có viền letterbox) | "cover": lấp kín (có crop)
        autoAspect: true, // Tự đo aspect từ ảnh → đồng nhất khung
        defaultAspect: 3 / 4, // fallback khi chưa đo được
        clampAspectMin: 0.55, // kẹp tỷ lệ W/H trong khoảng hợp lý để tránh khung quá dị
        clampAspectMax: 0.85,

        containerSelCandidates: [
            ".read-content", // manga18fx
            ".reading-content", // manhwaclub
            ".read-container .reading-content",
        ],
        itemSel: ":scope > .page-break",
        imgSel: "img, .wp-manga-chapter-img",
    };

    /* ===== CSS ===== */
    const baseCss = `
  .tm-gallery{
    --mg-border: rgba(0,0,0,.12);
    --mg-shadow: rgba(0,0,0,.08);
    --tm-fit: contain;                     /* sẽ gán runtime theo CONFIG.fitMode */
    --tm-aspect: 0.75;                     /* sẽ gán runtime theo đo thực tế */
    display:grid !important;
    grid-template-columns: repeat(${CONFIG.columns}, minmax(0,1fr)) !important;
    gap:${CONFIG.gapPx}px !important;
    align-items:start !important;
  }
  @media (prefers-color-scheme: dark){
    .tm-gallery{ --mg-border: rgba(255,255,255,.14); --mg-shadow: rgba(0,0,0,.4); }
  }
  .tm-gallery .page-break{
    margin:0 !important;
    box-sizing:border-box !important;
    border:1px solid var(--mg-border) !important;
    border-radius:8px !important;
    box-shadow: 0 1px 6px var(--mg-shadow) !important;
    background: color-mix(in oklab, Canvas 92%, transparent) !important;
    overflow:hidden !important;
    transition: box-shadow .2s ease, transform .2s ease;
  }
  .tm-gallery .page-break:hover{
    transform: translateY(-1px);
    box-shadow: 0 4px 14px var(--mg-shadow) !important;
  }
  .tm-gallery img{
    width:100% !important;
    height:auto !important;          /* mặc định giữ tỉ lệ ảnh */
    min-height:0 !important;
    display:block !important;
    background: transparent !important;
  }

  /* Đồng bộ chiều cao bằng aspect-ratio (không méo ảnh) */
  .tm-gallery.uniform .page-break{
    aspect-ratio: var(--tm-aspect) !important;   /* mọi khung cùng tỉ lệ → hết lệch */
    position:relative !important;
    background: color-mix(in oklab, Canvas 92%, transparent) !important; /* nền cho letterbox khi contain */
  }
  .tm-gallery.uniform img{
    position:absolute !important; inset:0 !important;
    width:100% !important; height:100% !important;
    object-fit: var(--tm-fit) !important; /* contain/cover */
    object-position: center top !important; /* ưu tiên phần trên của trang dài */
    background: inherit !important;
  }`;

    if (typeof GM_addStyle === "function") GM_addStyle(baseCss);
    else {
        const style = document.createElement("style");
        style.textContent = baseCss;
        document.head.appendChild(style);
    }
    GM_addStyle(`
  .tm-gallery{
    width:100vw !important; max-width:100vw !important;
    margin-left:calc(50% - 50vw) !important;
    margin-right:calc(50% - 50vw) !important;
  }
`);
    /* ===== Helpers ===== */
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
    const once = (fn) => {
        let done = false;
        return (...a) => !done && ((done = true), fn(...a));
    };
    const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

    function pickFirstExisting(selectors) {
        for (const s of selectors) {
            const el = document.querySelector(s);
            if (el) return el;
        }
        return null;
    }

    function waitForContainer(timeoutMs = 20000) {
        const found = pickFirstExisting(CONFIG.containerSelCandidates);
        if (found) return Promise.resolve(found);
        return new Promise((resolve, reject) => {
            const mo = new MutationObserver(() => {
                const f = pickFirstExisting(CONFIG.containerSelCandidates);
                if (f) {
                    mo.disconnect();
                    resolve(f);
                }
            });
            mo.observe(document.documentElement, { childList: true, subtree: true });
            setTimeout(() => {
                mo.disconnect();
                reject(new Error("timeout"));
            }, timeoutMs);
        });
    }

    function ensureGallery(root) {
        let gal = $("#tm-gallery", root);
        if (!gal) {
            gal = document.createElement("div");
            gal.id = "tm-gallery";
            gal.className = "tm-gallery";
            root.prepend(gal);
        }
        gal.classList.toggle("uniform", !!CONFIG.uniformHeight);
        gal.style.gridTemplateColumns = `repeat(${CONFIG.columns}, minmax(0,1fr))`;
        gal.style.setProperty("--tm-fit", CONFIG.fitMode);
        gal.style.setProperty("--tm-aspect", String(CONFIG.defaultAspect));
        return gal;
    }

    function normalizeImg(img) {
        if (!img) return;
        img.setAttribute("loading", "eager");
        const ds = img.getAttribute("data-src");
        if (ds && !img.getAttribute("src")) img.setAttribute("src", ds);
        img.style.width = "";
        img.style.height = "";
        img.style.minHeight = "";
    }

    function moveOnePage(pb, gal) {
        if (!pb || !gal || pb.parentElement === gal) return;
        normalizeImg(pb.querySelector(CONFIG.imgSel));
        gal.appendChild(pb);
    }

    function moveAll(root, gal) {
        const list = $$(CONFIG.itemSel, root);
        for (const pb of list) moveOnePage(pb, gal);
    }

    function imagesIn(gal) {
        return $$(".page-break " + CONFIG.imgSel, gal);
    }

    function whenImageReady(img) {
        return new Promise((res) => {
            if (img.complete && img.naturalWidth && img.naturalHeight) return res(img);
            const onReady = () => {
                if (img.naturalWidth && img.naturalHeight) {
                    cleanup();
                    res(img);
                }
            };
            const cleanup = () => {
                img.removeEventListener("load", onReady);
                img.removeEventListener("error", onReady);
            };
            img.addEventListener("load", onReady, { once: true });
            img.addEventListener("error", onReady, { once: true });
            // fallback sau 2s
            setTimeout(onReady, 2000);
        });
    }

    async function autoSetAspect(gal) {
        if (!CONFIG.uniformHeight || !CONFIG.autoAspect) return;
        const imgs = imagesIn(gal);
        if (!imgs.length) return;

        // Đợi một nhóm ảnh sẵn sàng (không cần tất cả)
        const sample = imgs.slice(0, Math.min(18, imgs.length));
        await Promise.all(sample.map(whenImageReady));

        const ratios = imgs
            .map((i) => (i.naturalWidth && i.naturalHeight ? i.naturalWidth / i.naturalHeight : null))
            .filter((v) => v && isFinite(v))
            .sort((a, b) => a - b);

        const median = ratios.length ? ratios[Math.floor(ratios.length / 2)] : CONFIG.defaultAspect;

        const ar = clamp(median, CONFIG.clampAspectMin, CONFIG.clampAspectMax);
        gal.style.setProperty("--tm-aspect", String(ar));
        // console.debug("[MangaGrid] aspect =", ar, "from", ratios.length, "images");
    }

    function observe(root, gal) {
        const debounced = (() => {
            let t;
            return () => {
                clearTimeout(t);
                t = setTimeout(() => autoSetAspect(gal), 120);
            };
        })();

        const mo = new MutationObserver((muts) => {
            let changed = false;
            for (const m of muts) {
                for (const n of m.addedNodes) {
                    if (!(n instanceof HTMLElement)) continue;
                    if (n.matches?.(".page-break") && n.parentElement === root) {
                        moveOnePage(n, gal);
                        changed = true;
                    }
                }
            }
            if (changed) {
                // Quét lại con trực tiếp (site có thể append theo cụm)
                moveAll(root, gal);
                debounced();
            }
        });
        mo.observe(root, { childList: true });
        return mo;
    }

    /* ===== Start ===== */
    const start = once(async () => {
        try {
            const root = await waitForContainer(20000);
            const gal = ensureGallery(root);
            moveAll(root, gal);
            await autoSetAspect(gal); // đo lần đầu → hết lệch ngay
            observe(root, gal); // theo dõi thêm ảnh mới
            console.log("[MangaGrid] applied:", location.hostname);
        } catch (e) {
            console.warn("[MangaGrid] init failed:", e);
        }
    });

    if (document.readyState === "complete" || document.readyState === "interactive") start();
    else window.addEventListener("DOMContentLoaded", start, { once: true });
})();
