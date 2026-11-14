# Print Studio

Personalize a ceramic mug, insulated tumbler, T-shirt, tote bag, or acrylic keychain. The storefront supports product options, templates, blank designs, and an editor with product previews.

## Cloud preview

Open this private repository in GitHub Codespaces and run `python3 -m http.server 8000 --bind 0.0.0.0`. Open forwarded port 8000. There are no package dependencies.

## Buyer flow

1. Open a product from the landing page or catalog and select its options.
2. Start blank or choose a template. Add text, upload an image, and edit each print surface. Use guides and compare the product views.
3. Review the design, then add it to the cart. Preview, copy, update, or save a line for later.
4. Apply the sample promo code `STUDIO10`. Enter test delivery details. Select shipping, optionally add a gift message and design review, then place a test order.
5. Export the order artwork from the confirmation page.

Drafts, cart contents, and test orders are saved in browser storage. The preview maps the saved artwork onto generated product photographs. The photographs represent sample finishes and dimensions. Preview mapping and printable exports use the same artwork document. The physical dimensions, material options, shipping, and tax values are demo specifications. Live payments, printer specifications, and fulfillment require provider integration. SVG exports require production validation and printer-supplied templates.
