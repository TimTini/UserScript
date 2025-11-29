// filename: utils/simulateClick.js
class ClickSimulator {
  /**
   * Giả lập click vào element
   * @param {Element} el - phần tử đích
   * @param {Object} [opts]
   * @param {number} [opts.clientX] - toạ độ click (mặc định tâm el)
   * @param {number} [opts.clientY]
   * @param {'mouse'|'pen'|'touch'} [opts.pointerType='mouse']
   * @param {number} [opts.pointerId=1]
   */
  static click(el, opts = {}) {
    if (!(el instanceof Element)) throw new TypeError("el phải là Element");

    const { clientX, clientY, pointerType = "mouse", pointerId = 1 } = opts;
    const { x, y } = this.#coords(el, clientX, clientY);

    // down
    this.#dispatch(el, "pointerdown", { x, y, pointerType, pointerId, bubbles: true });
    this.#dispatch(el, "mousedown", { x, y, bubbles: true });

    // up
    this.#dispatch(el, "pointerup", { x, y, pointerType, pointerId, bubbles: true });
    this.#dispatch(el, "mouseup", { x, y, bubbles: true });

    // click
    this.#dispatch(el, "click", { x, y, bubbles: true });

    // focus nếu là button/input
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
    const {
      x, y,
      bubbles = true, cancelable = true,
      pointerType = "mouse", pointerId = 1,
    } = opts;

    const init = {
      bubbles, cancelable, view: window,
      clientX: x, clientY: y, screenX: x, screenY: y,
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

/**
 * Hàm tiện lợi bên ngoài
 * @param {Element} el
 * @param {Object} opts
 */
function simulateClick(el, opts) {
  return ClickSimulator.click(el, opts);
}
