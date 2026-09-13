# Static Assets operator workflow

Product images for the initial release are versioned Workers Static Assets.

1. Select and optimize the image locally before committing it.
2. Add it under `public/products/` with a stable lowercase filename.
3. Set `Product.imageKey` to the public path, for example `/products/taco-carne.jpg`.
4. Set meaningful `imageAlt` text.
5. Run the local build/runtime checks and deploy through the normal release process when authorized.

There is no self-service upload endpoint in the initial release. Image replacement is an operator-controlled repository change plus deployment.
