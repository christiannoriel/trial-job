import { Component } from '@theme/component';
import { QuantitySelectorUpdateEvent } from '@theme/events';
import { morph } from '@theme/morph';
import { StandardEvents, ProductSelectEvent } from '@shopify/events';

/**
 * @typedef {object} QuantityTiersRefs
 * @property {HTMLInputElement[]} inputs - The tier radio inputs (name="quantity").
 */

/**
 * Bundle quantity picker rendered inside the product form.
 *
 * The radios submit natively as `quantity`; this component only enhances them:
 * - exposes `getValue()` so product-form.js can read the quantity (it is the form's `quantitySelector` ref)
 * - dispatches QuantitySelectorUpdateEvent so the sticky add-to-cart bar stays in sync
 * - appends the selected tier's total to the add to cart button label
 * - refreshes tier prices after a variant change, keeping the shopper's selection
 *
 * @extends {Component<QuantityTiersRefs>}
 */
class QuantityTiersComponent extends Component {
  requiredRefs = ['inputs'];

  /** @type {AbortController | undefined} */
  #abortController;

  connectedCallback() {
    super.connectedCallback();

    this.#abortController = new AbortController();
    const { signal } = this.#abortController;
    this.closest('.shopify-section, dialog')?.addEventListener(StandardEvents.productSelect, this.#onProductSelect, {
      signal,
    });

    this.#ensureSelection();
    this.#sync();
  }

  updatedCallback() {
    super.updatedCallback();
    this.#ensureSelection();
    this.#sync();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#abortController?.abort();
  }

  /**
   * Quantity of the selected tier. Read by product-form.js through `refs.quantitySelector`.
   * @returns {number}
   */
  getValue() {
    return Number(this.#selectedInput?.value) || 1;
  }

  /**
   * Bound with `on:change` on the fieldset. The framework re-targets the event to the fieldset,
   * so read the checked radio rather than `event.target`.
   */
  handleChange() {
    this.#sync();
  }

  get #selectedInput() {
    return this.refs.inputs.find((input) => input.checked);
  }

  /** Without a merchant default, select the first available tier so the button total is never empty. */
  #ensureSelection() {
    if (this.#selectedInput) return;

    const firstEnabled = this.refs.inputs.find((input) => !input.disabled);
    if (firstEnabled) firstEnabled.checked = true;
  }

  #sync() {
    this.dispatchEvent(new QuantitySelectorUpdateEvent(this.getValue()));
    this.#renderButtonTotal();
  }

  /**
   * Shows " - $96.00" after the add to cart label. The span is created on demand because the
   * button markup is shared with other contexts and is re-morphed on every variant change.
   */
  #renderButtonTotal() {
    const button = this.closest('product-form-component')?.querySelector('[ref="addToCartButton"]');
    if (!(button instanceof HTMLButtonElement)) return;

    let totalElement = button.querySelector('.add-to-cart-total');
    const text = button.disabled ? '' : this.#selectedInput?.dataset.buttonTotal ?? '';

    if (!text) {
      totalElement?.remove();
      return;
    }

    if (!totalElement) {
      totalElement = document.createElement('span');
      totalElement.className = 'add-to-cart-total';
      const addedFeedback = button.querySelector('.add-to-cart__added');
      if (addedFeedback) {
        addedFeedback.before(totalElement);
      } else {
        button.append(totalElement);
      }
    }

    totalElement.textContent = text;
  }

  /**
   * Re-renders tier prices for the newly selected variant and restores the shopper's tier.
   * @param {ProductSelectEvent} event
   */
  #onProductSelect = async (event) => {
    if (!(event.target instanceof Element) || event.target.closest('product-card')) return;

    const selectedQuantity = this.#selectedInput?.value;

    try {
      const { detail } = await event.promise;
      if (!detail?.html) return;

      if (detail.newProduct) {
        this.dataset.productId = detail.newProduct.id;
      } else if (detail.productId && detail.productId !== this.dataset.productId) {
        return;
      }

      const next = detail.html.querySelector(`quantity-tiers-component[data-block-id="${this.dataset.blockId}"]`);
      if (next) morph(this, next);

      const match = this.refs.inputs.find((input) => input.value === selectedQuantity && !input.disabled);
      if (match) match.checked = true;
      this.#ensureSelection();

      // product-form.js morphs the add to cart button in its own handler for this same promise.
      // Waiting a frame guarantees our total is applied after that morph, whatever the listener order.
      await new Promise((resolve) => requestAnimationFrame(resolve));
      this.#sync();
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.warn('[quantity-tiers] Variant update failed:', error);
      }
    }
  };
}

if (!customElements.get('quantity-tiers-component')) {
  customElements.define('quantity-tiers-component', QuantityTiersComponent);
}
