// filename: utils/simulateHover.js
/**
 * Class giả lập hover thật trên element.
 * - Gửi đầy đủ sự kiện pointer/mouse: pointerover → pointerenter → mouseover → mouseenter → mousemove
 * - Khi rời: mouseout → mouseleave → pointerout → pointerleave
 * - Hữu ích cho test, framework hiện đại (React/Vue/Angular/Svelte)
 * - Lưu ý: không thể cưỡng bức CSS :hover, chỉ có thể thêm class/attr phụ trợ
 */
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

  static async hoverFor(el, ms, optsEnter = {}, optsLeave = {}) {
    this.enter(el, optsEnter);
    await new Promise(r => setTimeout(r, ms));
    this.leave(el, optsLeave);
  }

  static addCssHover(el) { el?.setAttribute("data-js-hover", ""); }
  static removeCssHover(el) { el?.removeAttribute("data-js-hover"); }

  // ===== Helpers =====
  static #coords(el, cx, cy) {
    const r = el.getBoundingClientRect();
    return {
      x: Number.isFinite(cx) ? cx : Math.floor(r.left + r.width / 2),
      y: Number.isFinite(cy) ? cy : Math.floor(r.top + r.height / 2)
    };
  }

  static #dispatch(target, type, opts) {
    const {
      x, y, relatedTarget = null,
      bubbles = true, cancelable = true,
      pointerType = "mouse", pointerId = 1
    } = opts;

    const init = {
      bubbles, cancelable, view: window,
      clientX: x, clientY: y, relatedTarget,
      screenX: x, screenY: y
    };

    let ev;
    if (type.startsWith("pointer") && typeof PointerEvent === "function") {
      ev = new PointerEvent(type, { ...init, pointerType, pointerId, isPrimary: true });
    } else {
      ev = new MouseEvent(type, init);
    }

    target.dispatchEvent(ev);
  }
}


// hover vào nút trong 1 giây
// HoverSimulator.hoverFor(document.querySelector("button"), 1000);
// // hover ngay lập tức
// simulateHover(btn, "enter");

// // rời khỏi
// simulateHover(btn, "leave");

// // hover trong 1 giây rồi rời
// simulateHover(btn, "hoverFor", { ms: 1000 });