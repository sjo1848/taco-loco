const STATIC_PRODUCT_ASSET = /^\/products\/[a-z0-9][a-z0-9._-]*\.(?:avif|jpeg|jpg|png|webp)$/i;

export function resolveStaticProductAsset(imageKey: string | null | undefined) {
  return imageKey && STATIC_PRODUCT_ASSET.test(imageKey) ? imageKey : null;
}
