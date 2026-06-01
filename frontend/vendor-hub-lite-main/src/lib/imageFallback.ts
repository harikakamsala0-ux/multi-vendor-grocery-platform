import type { SyntheticEvent } from "react";

/** Always loads — used when primary product URL fails (404, hotlink, etc.). */
export const PRODUCT_IMAGE_FALLBACK =
  "https://picsum.photos/seed/freshcart-fallback/800/600";

export function handleProductImageError(e: SyntheticEvent<HTMLImageElement>): void {
  const el = e.currentTarget;
  if (el.src.includes("picsum.photos/seed/freshcart-fallback")) {
    el.onerror = null;
    return;
  }
  el.onerror = null;
  el.src = PRODUCT_IMAGE_FALLBACK;
}
