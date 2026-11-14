# Print Studio

Customize a photo card or a blank mug, review the proof, and place a test order.

## Run in the cloud

Open this repository in GitHub Codespaces. In its terminal, run `python3 -m http.server 8000 --bind 0.0.0.0`. Open the forwarded port 8000 in your browser. Keep the forwarded port private. The storefront has no package dependencies.

## Test the buyer flow

1. Choose Sunday Photo Card and apply a name, greeting, and back message.
2. Select a photo layer, replace it, and preview both sides. Select your paper and corner style in Options.
3. Review the proof and add the card to your cart. Test Edit item, Copy & edit, and Save for later.
4. Apply `STUDIO10`, enter sample delivery details, and calculate shipping. Try both speeds and toggle design review.
5. Place a test order. Export the artwork for each side from the confirmation page. Repeat with the blank mug to check wrap previews.

Drafts, cart items, and test orders are stored in browser storage. Shipping and taxes are sample calculations. Mug views are illustrative, and SVG export needs validation against the production printer's specification. Test checkout collects no payment credentials. Live deployment requires a server-side order store, full-resolution asset storage, payment provider, real shipping and tax quotes, and a fulfillment integration.
