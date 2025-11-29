// filename: userscript/beincom_auto_like.user.js
// ==UserScript==
// @name         Beincom Auto-Clicker Like Button (perf + rate limit)
// @namespace    http://tampermonkey.net/
// @version      0.6
// @description  Automates liking posts on group.beincom.com with a strict 90 clicks/minute rate limit
// @match        https://group.beincom.com/*
// @match        https://group.beincom.com/article/*
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    // ===== Utilities (Hover / Click / Scroll) =====
    class HoverSimulator {
        static enter(el, opts = {}) {
            const { from = null, clientX, clientY, pointerType = "mouse", pointerId = 1 } = opts;
            const { x, y } = this.#coords(el, clientX, clientY);
            const relatedTarget = from;
            this.#dispatch(el, "pointerover", { x, y, relatedTarget, pointerType, pointerId, bubbles: true });
            this.#dispatch(el, "pointerenter", { x, y, relatedTarget, pointerType, pointerId, bubbles: false });
            this.#dispatch(el, "mouseover", { x, y, relatedTarget, bubbles: true });
            this.#dispatch(el, "mouseenter", { x, y, relatedTarget, bubbles: false });
            this.#dispatch(el, "mousemove", { x, y, bubbles: true });
        }
        static leave(el, opts = {}) {
            const { to = null, clientX, clientY, pointerType = "mouse", pointerId = 1 } = opts;
            const { x, y } = this.#coords(el, clientX, clientY);
            const relatedTarget = to;
            this.#dispatch(el, "mouseout", { x, y, relatedTarget, bubbles: true });
            this.#dispatch(el, "mouseleave", { x, y, relatedTarget, bubbles: false });
            this.#dispatch(el, "pointerout", { x, y, relatedTarget, pointerType, pointerId, bubbles: true });
            this.#dispatch(el, "pointerleave", { x, y, relatedTarget, pointerType, pointerId, bubbles: false });
        }
        static async hoverFor(el, ms = 600, optsEnter = {}, optsLeave = {}) {
            this.enter(el, optsEnter);
            await new Promise((r) => setTimeout(r, ms));
            this.leave(el, optsLeave);
        }
        static #coords(el, cx, cy) {
            const r = el.getBoundingClientRect();
            return {
                x: Number.isFinite(cx) ? cx : Math.floor(r.left + r.width / 2),
                y: Number.isFinite(cy) ? cy : Math.floor(r.top + r.height / 2),
            };
        }
        static #dispatch(target, type, opts) {
            const { x, y, relatedTarget = null, bubbles = true, cancelable = true, pointerType = "mouse", pointerId = 1 } = opts;
            const init = { bubbles, cancelable, view: window, clientX: x, clientY: y, relatedTarget, screenX: x, screenY: y };
            const ev = type.startsWith("pointer") && typeof PointerEvent === "function" ? new PointerEvent(type, { ...init, pointerType, pointerId, isPrimary: true }) : new MouseEvent(type, init);
            target.dispatchEvent(ev);
        }
    }

    class ClickSimulator {
        static click(el, opts = {}) {
            if (!(el instanceof Element)) throw new TypeError("el phải là Element");
            const { clientX, clientY, pointerType = "mouse", pointerId = 1 } = opts;
            const { x, y } = this.#coords(el, clientX, clientY);
            this.#dispatch(el, "pointerdown", { x, y, pointerType, pointerId, bubbles: true });
            this.#dispatch(el, "mousedown", { x, y, bubbles: true });
            this.#dispatch(el, "pointerup", { x, y, pointerType, pointerId, bubbles: true });
            this.#dispatch(el, "mouseup", { x, y, bubbles: true });
            this.#dispatch(el, "click", { x, y, bubbles: true });
            if (typeof el.focus === "function") el.focus();
        }
        static #coords(el, cx, cy) {
            const r = el.getBoundingClientRect();
            return {
                x: Number.isFinite(cx) ? cx : Math.floor(r.left + r.width / 2),
                y: Number.isFinite(cy) ? cy : Math.floor(r.top + r.height / 2),
            };
        }
        static #dispatch(target, type, opts) {
            const { x, y, bubbles = true, cancelable = true, pointerType = "mouse", pointerId = 1 } = opts;
            const init = { bubbles, cancelable, view: window, clientX: x, clientY: y, screenX: x, screenY: y };
            const ev = type.startsWith("pointer") && typeof PointerEvent === "function" ? new PointerEvent(type, { ...init, pointerType, pointerId, isPrimary: true }) : new MouseEvent(type, init);
            target.dispatchEvent(ev);
        }
    }

    class ScrollCenter {
        static toCenter(el, opts = {}) {
            if (!(el instanceof Element)) throw new TypeError("el phải là Element");
            const { behavior = "smooth", root = null, offsetY = 0, offsetX = 0, axis = "both" } = opts;
            const scroller = root ?? this.#nearestScrollable(el) ?? window;
            if (scroller === window) {
                const elRect = el.getBoundingClientRect();
                const dy = axis === "x" ? 0 : elRect.top + elRect.height / 2 - window.innerHeight / 2 - offsetY;
                const dx = axis === "y" ? 0 : elRect.left + elRect.width / 2 - window.innerWidth / 2 - offsetX;
                window.scrollBy({ top: dy, left: dx, behavior });
                return;
            }
            const rootRect = scroller.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();
            const relTop = elRect.top - rootRect.top;
            const relLeft = elRect.left - rootRect.left;
            scroller.scrollTo({
                top: axis === "x" ? scroller.scrollTop : scroller.scrollTop + (relTop + elRect.height / 2) - rootRect.height / 2 - offsetY,
                left: axis === "y" ? scroller.scrollLeft : scroller.scrollLeft + (relLeft + elRect.width / 2) - rootRect.width / 2 - offsetX,
                behavior,
            });
        }
        static #nearestScrollable(el) {
            let p = el.parentElement;
            while (p && p !== document.documentElement) {
                const cs = getComputedStyle(p);
                const canY = (cs.overflowY === "auto" || cs.overflowY === "scroll") && p.scrollHeight > p.clientHeight;
                const canX = (cs.overflowX === "auto" || cs.overflowX === "scroll") && p.scrollWidth > p.clientWidth;
                if (canY || canX) return p;
                p = p.parentElement;
            }
            return null;
        }
    }

    // ===== Rate limiter nghiêm ngặt: tối đa N clicks trong bất kỳ cửa sổ 60s nào =====
    class PerMinuteLimiter {
        constructor(limit = 90, windowMs = 60_000) {
            this.limit = limit;
            this.windowMs = windowMs;
            this.timestamps = []; // lưu mốc thời gian mỗi lần "cấp phép click"
        }
        async wait() {
            // Loại bỏ mốc đã quá cửa sổ
            const now = Date.now();
            this.#prune(now);
            // Nếu đã đạt limit trong 60s qua → chờ đến khi mốc đầu tiên hết hạn
            while (this.timestamps.length >= this.limit) {
                const earliest = this.timestamps[0];
                const waitMs = Math.max(1, this.windowMs - (now - earliest));
                await new Promise((r) => setTimeout(r, waitMs));
                const now2 = Date.now();
                this.#prune(now2);
            }
            this.timestamps.push(Date.now());
        }
        #prune(now) {
            while (this.timestamps.length && now - this.timestamps[0] >= this.windowMs) {
                this.timestamps.shift();
            }
        }
        // tiện theo dõi
        get usedInWindow() {
            this.#prune(Date.now());
            return this.timestamps.length;
        }
    }

    // ===== Auto-liker =====
    class AutoLiker {
        constructor() {
            this.queue = [];
            this.seen = new WeakSet();
            this.processing = false;
            this.stopped = false;
            this.intervalId = null;
            this.mutationObserver = null;

            // Giới hạn: tối đa 90 click/phút cho thao tác thả reaction
            this.reactLimiter = new PerMinuteLimiter(90, 60_000);
        }

        start() {
            if (this.processing) return;
            this.stopped = false;
            this.scanAndEnqueue();
            this.observeMutations();
            this.intervalId = setInterval(() => this.scanAndEnqueue(), 3000);
            this.consume();
        }

        stop() {
            this.stopped = true;
            if (this.intervalId) clearInterval(this.intervalId);
            this.intervalId = null;
            if (this.mutationObserver) this.mutationObserver.disconnect();
            this.mutationObserver = null;
        }

        observeMutations() {
            this.mutationObserver = new MutationObserver((mutList) => {
                for (const m of mutList) {
                    for (const node of m.addedNodes || []) {
                        if (!(node instanceof Element)) continue;
                        this.#queryReactButtons(node).forEach((b) => this.enqueue(b));
                    }
                }
            });
            this.mutationObserver.observe(document.body, { childList: true, subtree: true });
        }

        scanAndEnqueue() {
            this.#queryReactButtons(document).forEach((b) => this.enqueue(b));
        }

        enqueue(btn) {
            if (!(btn instanceof Element)) return;
            if (this.seen.has(btn)) return;
            this.seen.add(btn);
            this.queue.push(btn);
            if (!this.processing) this.consume();
        }

        async consume() {
            if (this.processing) return;
            this.processing = true;
            try {
                while (!this.stopped && this.queue.length) {
                    const btn = this.queue.shift();
                    await this.processOne(btn);
                    await this.#idle(60);
                }
            } finally {
                this.processing = false;
            }
        }

        async processOne(reactBtn) {
            if (!reactBtn?.isConnected) return;

            ScrollCenter.toCenter(reactBtn, { behavior: "smooth", offsetY: 48 });
            await this.#randSleep(150, 750);

            HoverSimulator.hoverFor(reactBtn, 30000);
            await this.#randSleep(1000, 1500);
            const icons = this.#getAllReactIcons();
            for (const icon of icons) {
                if (!this.#isReacted(icon)) {
                    // —— Áp dụng hạn mức 90 clicks/phút CHỈ cho thao tác thả react ——
                    await this.reactLimiter.wait();
                    ClickSimulator.click(icon);
                    await this.#randSleep(100, 300);
                }
            }

            HoverSimulator.leave(reactBtn);
            await this.#randSleep(1000, 1500);
        }

        #queryReactButtons(root) {
            return Array.from(
                root.querySelectorAll(
                    "#main-container > div > section > div:nth-child(4) > div > div:nth-child(1) > div > div > div > div.mt-4.flex.flex-col.gap-y-4 > div > div > div.flex.w-full.items-center > button:nth-child(1)"
                )
            );
        }
        #getAllReactIcons() {
            return document.querySelectorAll("img[alt*=react_].absolute");
        }
        #isReacted(reactIcon) {
            return !reactIcon?.parentNode?.classList?.contains("bg-transparent");
        }

        #sleep(ms = 50) {
            return new Promise((r) => setTimeout(r, ms));
        }
        #randSleep(min, max) {
            const delay = Math.floor(Math.random() * (max - min + 1)) + min;
            return this.#sleep(delay);
        }
        #idle(timeout = 50) {
            return new Promise((r) => {
                if ("requestIdleCallback" in window) {
                    window.requestIdleCallback(() => r(), { timeout });
                } else {
                    setTimeout(r, timeout);
                }
            });
        }
    }

    // ===== Boot =====
    const liker = new AutoLiker();
    liker.start();

    // Expose nhỏ để bật/tắt và theo dõi hạn mức
    window.__beincomAutoLiker = {
        start: () => liker.start(),
        stop: () => liker.stop(),
        _qsize: () => liker.queue.length,
        _rateUsed: () => liker.reactLimiter.usedInWindow, // số click đã dùng trong 60s gần nhất
    };
})();
