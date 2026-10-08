import { Component } from '@theme/component';

/**
 * @typedef {object} ScrollCarouselRefs
 * @property {HTMLElement} track - The scroll-snap list.
 * @property {HTMLButtonElement} previousButton
 * @property {HTMLButtonElement} nextButton
 */

const DRAG_THRESHOLD = 6;

/**
 * Progressive enhancement for a CSS scroll-snap list.
 *
 * Native overflow scrolling already covers touch, trackpads and RTL. This adds:
 * - previous/next buttons that page by the visible width and reflect start/end state
 * - ArrowLeft/ArrowRight/Home/End moving focus between items when focus is inside the track
 * - click-and-drag scrolling for mouse users, without swallowing taps on links
 *
 * @extends {Component<ScrollCarouselRefs>}
 */
class ScrollCarouselComponent extends Component {
  requiredRefs = ['track', 'previousButton', 'nextButton'];

  /** @type {AbortController | undefined} */
  #abortController;
  /** @type {ResizeObserver | undefined} */
  #resizeObserver;
  #frame = 0;
  /** @type {{ pointerId: number, startX: number, startScroll: number, dragging: boolean } | null} */
  #drag = null;

  connectedCallback() {
    super.connectedCallback();
    this.#setup();
  }

  updatedCallback() {
    super.updatedCallback();
    this.#setup();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#teardown();
  }

  /** Scrolls back one page. */
  previous() {
    this.#page(-1);
  }

  /** Scrolls forward one page. */
  next() {
    this.#page(1);
  }

  #setup() {
    this.#teardown();

    const { track } = this.refs;
    this.#abortController = new AbortController();
    const { signal } = this.#abortController;

    track.addEventListener('scroll', this.#scheduleUpdate, { passive: true, signal });
    track.addEventListener('keydown', this.#onKeydown, { signal });
    track.addEventListener('pointerdown', this.#onPointerDown, { signal });
    track.addEventListener('pointermove', this.#onPointerMove, { signal });
    track.addEventListener('pointerup', this.#onPointerEnd, { signal });
    track.addEventListener('pointercancel', this.#onPointerEnd, { signal });
    track.addEventListener('click', this.#onClickCapture, { capture: true, signal });
    track.addEventListener('dragstart', (event) => event.preventDefault(), { signal });

    this.#resizeObserver = new ResizeObserver(this.#scheduleUpdate);
    this.#resizeObserver.observe(track);

    this.#updateControls();
  }

  #teardown() {
    this.#abortController?.abort();
    this.#resizeObserver?.disconnect();
    cancelAnimationFrame(this.#frame);
    this.#drag = null;
    delete this.dataset.dragging;
  }

  get #isRtl() {
    return getComputedStyle(this).direction === 'rtl';
  }

  get #scrollBehavior() {
    return matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  }

  get #items() {
    return /** @type {HTMLElement[]} */ (Array.from(this.refs.track.children));
  }

  /** @param {1 | -1} direction - 1 is forward in reading order. */
  #page(direction) {
    const button = direction > 0 ? this.refs.nextButton : this.refs.previousButton;
    if (button.getAttribute('aria-disabled') === 'true') return;

    const { track } = this.refs;
    const physical = this.#isRtl ? -direction : direction;
    track.scrollBy({ left: physical * track.clientWidth, behavior: this.#scrollBehavior });
  }

  #scheduleUpdate = () => {
    cancelAnimationFrame(this.#frame);
    this.#frame = requestAnimationFrame(() => this.#updateControls());
  };

  #updateControls() {
    const { track, previousButton, nextButton } = this.refs;
    const overflowing = track.scrollWidth - track.clientWidth > 1;

    previousButton.hidden = !overflowing;
    nextButton.hidden = !overflowing;
    if (!overflowing) return;

    // scrollLeft runs negative in RTL, so compare magnitudes.
    const offset = Math.abs(track.scrollLeft);
    previousButton.setAttribute('aria-disabled', String(offset <= 1));
    nextButton.setAttribute('aria-disabled', String(offset + track.clientWidth >= track.scrollWidth - 1));
  }

  /**
   * Moves focus to the first focusable element of a neighbouring item; the browser then
   * scrolls it into view and scroll snap aligns it.
   * @param {KeyboardEvent} event
   */
  #onKeydown = (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (!(event.target instanceof HTMLElement)) return;
    if (event.target.matches('input, textarea, select, [contenteditable="true"]')) return;

    const items = this.#items;
    const current = items.findIndex((item) => item.contains(/** @type {Node} */ (event.target)));
    if (current === -1) return;

    const forwardKey = this.#isRtl ? 'ArrowLeft' : 'ArrowRight';
    const backKey = this.#isRtl ? 'ArrowRight' : 'ArrowLeft';

    /** @type {number | undefined} */
    let targetIndex;
    if (event.key === forwardKey) targetIndex = Math.min(current + 1, items.length - 1);
    else if (event.key === backKey) targetIndex = Math.max(current - 1, 0);
    else if (event.key === 'Home') targetIndex = 0;
    else if (event.key === 'End') targetIndex = items.length - 1;
    if (targetIndex === undefined || targetIndex === current) return;

    // Skip deliberately unfocusable duplicates, e.g. a card's image link (tabindex="-1").
    const focusable = items[targetIndex]?.querySelector(
      ':is(a[href], button:not([disabled]), input:not([disabled]), [tabindex]):not([tabindex="-1"])'
    );
    if (!(focusable instanceof HTMLElement)) return;

    event.preventDefault();
    focusable.focus();
  };

  /** @param {PointerEvent} event */
  #onPointerDown = (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    if (this.refs.track.scrollWidth <= this.refs.track.clientWidth) return;

    this.#drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScroll: this.refs.track.scrollLeft,
      dragging: false,
    };
  };

  /** @param {PointerEvent} event */
  #onPointerMove = (event) => {
    const drag = this.#drag;
    if (!drag || event.pointerId !== drag.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    if (!drag.dragging) {
      if (Math.abs(deltaX) < DRAG_THRESHOLD) return;
      drag.dragging = true;
      this.dataset.dragging = '';
      this.refs.track.setPointerCapture(event.pointerId);
    }

    this.refs.track.scrollLeft = drag.startScroll - deltaX;
  };

  /** @param {PointerEvent} event */
  #onPointerEnd = (event) => {
    const drag = this.#drag;
    if (!drag || event.pointerId !== drag.pointerId) return;

    if (drag.dragging) {
      // Leave the flag set until the click that follows pointerup has been suppressed.
      requestAnimationFrame(() => {
        delete this.dataset.dragging;
        this.#snapToNearest();
        this.#drag = null;
      });
    } else {
      this.#drag = null;
    }
  };

  /**
   * A drag ends with a click on whatever is under the pointer; cancel it so dragging
   * across a product card doesn't open the product.
   * @param {MouseEvent} event
   */
  #onClickCapture = (event) => {
    if (!this.#drag?.dragging) return;
    event.preventDefault();
    event.stopPropagation();
  };

  /** Restores alignment after a drag (snapping is turned off while dragging). */
  #snapToNearest() {
    const { track } = this.refs;
    const trackRect = track.getBoundingClientRect();
    const rtl = this.#isRtl;

    let closest = Infinity;
    for (const item of this.#items) {
      const rect = item.getBoundingClientRect();
      const distance = rtl ? rect.right - trackRect.right : rect.left - trackRect.left;
      if (Math.abs(distance) < Math.abs(closest)) closest = distance;
    }

    if (Number.isFinite(closest) && Math.abs(closest) > 1) {
      track.scrollBy({ left: closest, behavior: this.#scrollBehavior });
    }
  }
}

if (!customElements.get('scroll-carousel-component')) {
  customElements.define('scroll-carousel-component', ScrollCarouselComponent);
}
