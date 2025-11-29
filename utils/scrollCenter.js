// filename: utils/scrollCenter.js
/**
 * Cuộn phần tử vào *giữa* vùng nhìn thấy (viewport hoặc container scrollable).
 * - Mặc định: cuộn mượt, canh giữa theo cả trục Y/X.
 * - Hỗ trợ container scrollable tuỳ chọn; nếu không truyền → dùng window/document.
 * - Có thể bù trừ header cố định (offset).
 */
class ScrollCenter {
  /**
   * @param {Element} el - phần tử cần đưa vào giữa
   * @param {Object} [opts]
   * @param {('smooth'|'auto'|'instant')} [opts.behavior='smooth']
   * @param {Element|Window|null} [opts.root=null] - container scrollable; null → auto tìm; Window → viewport
   * @param {number} [opts.offsetY=0] - bù trừ theo trục Y (ví dụ: chiều cao header fixed)
   * @param {number} [opts.offsetX=0] - bù trừ theo trục X
   * @param {('both'|'y'|'x')} [opts.axis='both'] - trục cần cuộn
   */
  static toCenter(el, opts = {}) {
    if (!(el instanceof Element)) throw new TypeError('el phải là Element');
    const {
      behavior = 'smooth',
      root = null,
      offsetY = 0,
      offsetX = 0,
      axis = 'both',
    } = opts;

    const scroller = root ?? this.#nearestScrollable(el) ?? window;

    if (scroller === window) {
      const elRect = el.getBoundingClientRect();
      const targetY = elRect.top + elRect.height / 2 - window.innerHeight / 2 - offsetY;
      const targetX = elRect.left + elRect.width / 2 - window.innerWidth / 2 - offsetX;
      const dy = axis === 'x' ? 0 : targetY;
      const dx = axis === 'y' ? 0 : targetX;
      window.scrollBy({ top: dy, left: dx, behavior });
      return;
    }

    // Container scrollable cụ thể
    const rootRect = scroller.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    const relTop = elRect.top - rootRect.top;   // vị trí tương đối trong container
    const relLeft = elRect.left - rootRect.left;

    const targetScrollTop = scroller.scrollTop + (relTop + elRect.height / 2) - (rootRect.height / 2) - offsetY;
    const targetScrollLeft = scroller.scrollLeft + (relLeft + elRect.width / 2) - (rootRect.width / 2) - offsetX;

    scroller.scrollTo({
      top: axis === 'x' ? scroller.scrollTop : targetScrollTop,
      left: axis === 'y' ? scroller.scrollLeft : targetScrollLeft,
      behavior,
    });
  }

  /**
   * Phiên bản nhanh gọn dùng native API (nếu đủ), có bù trừ offset sau đó.
   * Lưu ý: scrollIntoView({block:'center'}) rất tương thích hiện nay.
   */
  static toCenterNative(el, { behavior = 'smooth', offsetY = 0, offsetX = 0, axis = 'both' } = {}) {
    el.scrollIntoView({ behavior, block: 'center', inline: 'center' });
    // Bù trừ nhẹ để trừ header cố định
    if (offsetY || offsetX) {
      window.requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const dy = axis === 'x' ? 0 : (rect.top + rect.height / 2) - (window.innerHeight / 2) - offsetY;
        const dx = axis === 'y' ? 0 : (rect.left + rect.width / 2) - (window.innerWidth / 2) - offsetX;
        window.scrollBy({ top: dy, left: dx, behavior });
      });
    }
  }

  // ===== Helpers =====
  static #nearestScrollable(el) {
    let p = el.parentElement;
    while (p && p !== document.documentElement) {
      const style = getComputedStyle(p);
      const overflowY = style.overflowY;
      const overflowX = style.overflowX;
      const canScrollY = (overflowY === 'auto' || overflowY === 'scroll') && p.scrollHeight > p.clientHeight;
      const canScrollX = (overflowX === 'auto' || overflowX === 'scroll') && p.scrollWidth > p.clientWidth;
      if (canScrollY || canScrollX) return p;
      p = p.parentElement;
    }
    return null; // rơi về window
  }
}
