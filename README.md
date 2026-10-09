# Product page build - Horizon trial task

Product page (desktop and mobile) and the "Shop the routine" product carousel from the
Figma design, built on Shopify's Horizon theme (v4.2.0).

I only had view access to the Figma file, with no edit or Dev Mode access, so I couldn't
inspect exact spacing, font sizes or colour values. I built the page by eye from the desktop
and mobile frames, comparing screenshots of my build with the design at the same scale.

## Links

| | |
| --- | --- |
| Store preview | https://chris-trial-job.myshopify.com/products/pre-swim-saltwater-chlorine-hair-protectant?preview_theme_id=193246855460 |
| Storefront password | `chris` |
| Theme | "Trial Job - Live" (`#193246855460`, published) |
| Theme Customizer | https://admin.shopify.com/store/chris-trial-job/themes/193246855460/editor?previewPath=%2Fproducts%2Fpre-swim-saltwater-chlorine-hair-protectant%3Fview%3D__DEFAULT__&section=template--28673525711140__main |
| Repo | https://github.com/christiannoriel/trial-job/ (branch [`feature/develop`](https://github.com/christiannoriel/trial-job/commits/feature/develop)) |

## Time spent

About 8 hours from start to finish.

## What was built

### Product page (`templates/product.json`)

| Design element | How it's built | Files |
| --- | --- | --- |
| Gallery: large first image + 2-column grid (desktop), swipe carousel with thumbnails and a peek of the next image (mobile) | Horizon's media gallery, plus a new "Slides per view on mobile" setting (1–1.5; 1.1 matches the design) | `blocks/_product-media-gallery.liquid`, `snippets/product-media-gallery-content.liquid` |
| Stars + "(290)" | Horizon review block, plus a new "compact" count format | `blocks/review.liquid` |
| Title, subtitle, price | Horizon text and price blocks; subtitle from `custom.subtitle` | — |
| Afterpay line | New static block (see app notes below) | `blocks/custom-installments-message.liquid` |
| Benefit checklist, "Suitable For", "Use it" | New feature list block, 2 styles, fed by list metafields | `blocks/custom-feature-list.liquid` |
| Buy 1 / Buy 2 / Buy 3 tiers + "Add to cart – $total" | New bundle tier picker inside Horizon's product form | `blocks/custom-quantity-tiers.liquid`, `blocks/_custom-quantity-tier.liquid`, `assets/custom-quantity-tiers.js`, `blocks/buy-buttons.liquid` |
| Guarantee line, trust icons | Horizon group/icon/text blocks; new shield, rabbit, Australia and check-circle icons | `snippets/icon.liquid`, `blocks/icon.liquid` |
| UGC video row | New video carousel block using Horizon's deferred video player. Videos come from the product's `custom.product_videos` metafield, or from video blocks when it's empty; each is a Shopify video or a YouTube (incl. Shorts) / Vimeo link | `blocks/custom-video-carousel.liquid`, `blocks/_custom-video-carousel-item.liquid`, `snippets/custom-video-carousel-item.liquid` |
| Accordion | Horizon accordion (plus icon), rows fed by rich text metafields | — |

### "Shop the routine" carousel (`sections/custom-product-carousel.liquid`)

- Merchant setup in the theme editor: pick products by hand or choose a collection, product
  count, columns, heading/eyebrow as text blocks, mobile layout (grid as designed, or carousel),
  rating/description/button toggles, star colour, background, padding.
- Shared carousel: `snippets/custom-scroll-carousel.liquid` + `assets/custom-scroll-carousel.js`, also used by
  the UGC video row.
  - Touch and trackpad: native CSS scroll snap (momentum and RTL handled by the browser).
  - Mouse: previous/next buttons (disabled at the ends), click-and-drag that doesn't
    trigger a link when you let go.
  - Keyboard: buttons are tabbable; ←/→ move focus to the next or previous card, Home/End to
    the first or last card. RTL reverses the arrow keys.
  - Respects `prefers-reduced-motion`.
- Card: `snippets/custom-carousel-product-card.liquid`. Single-variant products add to cart with
  Horizon's own product form (cart drawer, cart count and fly-to-cart animation all work).
  Products with options show "Choose options" and link to the product page.
- Responsive: 4 per row desktop (setting), 3 on tablet, 2×2 grid on mobile (or 1.6 per view as a carousel).

### Settings and data

- Theme settings: colours, Instrument Sans, button radius and uppercase buttons (`config/settings_data.json`).
- Product metafields (namespace `custom`): `subtitle`, `benefits`, `suitable_for`, `use_it`
  (lists), and `what_it_does`, `why_it_works`, `how_to_use`, `ingredients` (rich text).
  Standard `reviews.rating` / `reviews.rating_count` definitions enabled.
- Product videos: `product_video` metaobject (Title, Video, Video URL, Cover image; Draft/Active
  status, storefront access on) and a `custom.product_videos` product metafield listing those
  entries. Connected to the video carousel's Videos setting in the product template. Only Active
  entries show on the storefront.
- Test data: 6 products, "Shop the routine" collection, and automatic discounts
  (PRE-SWIM buy 2 save 15%, buy 3 save 20%, free shipping on 2+ items).
- Translations: new strings in `locales/en.default.json` / `en.default.schema.json`; the other
  locale files have the English text as placeholders so Theme Check passes.

## Connecting the app-driven pieces in a live store

| Element | In this build | In a live store | Performance |
| --- | --- | --- | --- |
| Afterpay messaging | Static text block; amount = price ÷ 4, updates on variant change | Replace with the Afterpay On-Site Messaging app block (or Klarna's) in the same position | Load the provider script async/deferred so it never blocks the buy box; keep a reserved height to avoid layout shift |
| Review stars + count | Reads the standard `reviews.rating` and `reviews.rating_count` metafields (demo values) | Judge.me, which writes to these same metafields, so stars work with no theme change. Its review widget goes below the accordion as an app block (see [Star reviews with Judge.me](#star-reviews-with-judgeme)). | Stars render server-side from metafields, with no app JavaScript above the fold |
| UGC videos | Per-product list of `product_video` metaobject entries (Shopify video or YouTube/Vimeo link); poster image first, player loaded on click | Shoppable-video app block (Tolstoy, Videowise) in the same slot, or keep the native metaobject list | Lazy posters, `preload` nothing until play, app scripts on idle or interaction |
| Bundle pricing | Display-only percentages + matching automatic discounts | Same pattern, or a Shopify Function / bundles app if tiers vary per product. Could move tier config to a metafield so it's shared with the discount. | No app JS; prices rendered in Liquid |

## Key decisions and trade-offs

### Building from the Figma file by eye

Because I couldn't inspect the Figma file, every size, gap and colour is my best match to the
frames rather than a value copied from the design. For the buy box I compared my build
against the design at the same scale, which got the add to cart buttons to 46px tall and the
tier labels and prices to 18px. The product page and carousel card buttons share one style so
they look the same. The font (Instrument Sans) is my closest match, not a confirmed spec. Some
spacing will be a few pixels off what the designer intended, and I'd check it against the real
values once I had Dev Mode access.

### Extending Horizon instead of rebuilding it

Horizon already had most of what this page needed: the media gallery, review stars, price,
accordion, video player, product form and add to cart button. I reused those and made small
extensions where the design needed something extra:

- a tier mode and a Shop Pay toggle on the buy buttons
- a compact "(290)" count format on the review block
- shield, rabbit, Australia and check-circle icons
- a "Slides per view on mobile" setting on the gallery
- a fix to the video snippet's image sizes

Everything new is in its own file with a `custom-` prefix, so it's clear what's mine and what's
Horizon's. The trade-off is that the Horizon files I edited need re-checking when Horizon releases
an update.

### Metaobjects paired with metafields for content

In most of my projects I pair metaobjects with metafields, and I did the same here. All the
product copy lives in product metafields rather than in the template:

- subtitle
- benefit checklist
- "Suitable For"
- "Use it"
- the four accordion rows

That way one product template works for every product, and the merchant edits content on the
product in the admin without touching the theme editor.

The UGC videos are a `product_video` metaobject. Each entry has a title, a Shopify video or
YouTube/Vimeo link, and a cover image. A `custom.product_videos` list metafield on each product
picks which entries show. I used a metaobject rather than a plain list metafield because:

- one list metafield can't mix uploaded videos and links
- each video needs its own cover image and an accessible title
- one entry can be reused across several products
- entries have a Draft/Active status, so a merchant can prepare videos before they go live

### Tier pricing with Shopify discounts

For the Buy 1 / Buy 2 / Buy 3 tiers I used Shopify's automatic discounts rather than a bundles
app or extra variants. On the store, these are set up as:

- buy 2, save 15%
- buy 3, save 20%
- free shipping on 2 or more

The tier picker is a set of quantity radio buttons inside Horizon's product form, so choosing
"Buy 2" adds 2 units to the cart. Each tier shows its discounted price, worked out in Liquid from
the variant price and the tier's percentage setting. Shopify then applies the real discount in
the cart and at checkout. I chose this because:

- there's no app to pay for and no extra JavaScript
- the discount is applied by Shopify itself, so it works however the customer gets to 2 or
  3 units, for example by changing the quantity in the cart drawer
- the tiers are real form fields, so they still submit if JavaScript fails, and Horizon's
  product form reads them the same way it reads its own quantity input
- variant prices stay unchanged, so reports and product feeds aren't affected

The trade-off is that each percentage lives in two places, the tier setting and the discount,
and someone has to keep them in sync by hand. With more time I'd store the tiers in a product
metafield and read it from both the theme and a Shopify Function discount.

### Star reviews with Judge.me

For reviews I'd use Judge.me. In this build the stars and "(290)" read Shopify's standard
`reviews.rating` and `reviews.rating_count` metafields, which I filled with demo values.
Judge.me writes its ratings to those same metafields, so connecting it doesn't need any theme
code changes:

1. Install Judge.me and import any existing reviews.
2. Turn on Judge.me's app embed in the theme editor under Theme settings → App embeds.
3. Check that Judge.me is syncing ratings to Shopify's metafields. The real ratings and counts
   then replace the demo values. The stars in the buy box and on the "Shop the routine" cards
   both read these metafields, so they update with no extra work.
4. Add Judge.me's review widget app block to the product page below the accordion (the product
   section accepts app blocks). This is where shoppers read and write reviews.
5. Link the stars in the buy box to the widget, so clicking them scrolls down to the reviews.

I set it up this way for performance. The stars at the top of the page are rendered by Liquid
on the server, so they appear straight away, don't shift the layout, and don't wait for
Judge.me's script. That script only powers the widget further down the page. If the store
later moved to Okendo or Yotpo, both write the same metafields, so the stars wouldn't need
changing either.

### One carousel for products and videos

I built one small scroll-snap carousel and shared it between "Shop the routine" and the UGC
video row, instead of reusing Horizon's slideshow. Horizon's slideshow is about 950 lines, made
for showing one slide at a time, and can't do the 2×2 grid the design uses on mobile. With CSS
scroll snap the browser handles swiping, momentum and right-to-left layouts. The JavaScript only
adds the previous/next buttons, mouse dragging and keyboard support.

### Mobile gallery peek

On mobile the design shows the edge of the next image beside the main one. I added a "Slides per
view on mobile" setting (1 to 1.5) to Horizon's gallery instead of hard-coding the peek, the same
way the video carousel has "Videos per view on mobile". Horizon has its own "Hint" peek, but
choosing it removes the thumbnails, and the design has both.

### Video links

YouTube and Vimeo links go in a plain text field, and the theme reads the video ID out of the
link. I didn't use Shopify's built-in video URL setting because it rejects YouTube Shorts links,
which is the usual format for UGC. Each video shows its cover image first and only loads the
player when it's clicked.

### Where I changed the design

- **Pricing mistakes in the design:** Buy 3 showed $81.60 (it should be $115.20), the button
  showed $115.20 while Buy 2 was selected, and the Afterpay line showed $14.99 (it should be
  $12.00). I used the correct figures.
- **"Save 15%" badge:** I darkened it from the design's light tan so the text is readable. Its
  contrast went from about 2.4:1 to 4.8:1, above the 4.5:1 accessibility minimum.
- **Shop Pay button:** I hid it to match the design, with a new toggle so it can be turned back on.
- **Currency:** the store is in USD, while the design implies AUD.
- **Afterpay:** this is a static text block (the price ÷ 4) rather than Afterpay's app. In a live
  store I'd replace it with Afterpay's own app block in the same position.

## ✍️ How I used AI

Facts to draw on (tool, scope, what you checked or changed):
- Tool: Claude Code (Claude Sonnet 5) in VS Code.
- Used for: reading Horizon's product form, variant-change and component code; generating the
  new blocks, snippets, section and JS; locale entries; the store data script (Admin GraphQL via
  Shopify CLI); running Theme Check.

## ✍️ What I'd improve with more time

Facts to draw on:
- Quick add modal for multi-variant products in the carousel (currently links to the PDP).
- Tier discount percentages from one source (metafield shared by theme and discount).
- Real product photography and UGC video files (the Figma file only has thumbnails).
- Automated tests: Playwright smoke test for tiers, carousel keyboard/drag, add to cart.
- Check the font choice against the Figma spec (Instrument Sans was picked by eye).

## Testing checklist

Verified in Chrome at 1440px and 390px (Playwright): no JS errors; tier click and arrow keys
update the button total; Buy 3 adds 3 units at $115.20 with the automatic discount; carousel
next/previous, arrow-key focus, mouse click and keyboard Enter add to cart; mobile shows the
2×2 grid. Still to check by hand: real devices, RTL, theme editor changes, screen readers.

- [ ] Desktop / tablet / mobile layouts against both Figma frames
- [ ] Tiers: click and arrow keys; button total updates; cart quantity and discount match at checkout
- [ ] Sticky add-to-cart bar shows the tier quantity
- [ ] Carousel: buttons, drag, swipe, ←/→/Home/End, focus visible, reduced motion, RTL
- [ ] Add to cart from a carousel card opens the cart drawer
- [ ] Theme editor: change collection/products, heading, columns, mobile layout

## Local development

```bash
shopify theme dev --store chris-trial-job.myshopify.com
shopify theme check
shopify theme push --store chris-trial-job.myshopify.com --theme 193246855460 --nodelete
```
