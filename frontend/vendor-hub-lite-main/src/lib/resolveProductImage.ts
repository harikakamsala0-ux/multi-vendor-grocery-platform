import { PRODUCT_IMAGE_FALLBACK } from "./imageFallback";

/**
 * Curated, stable image URLs matched to product *names* (and category fallbacks).
 * Overrides random/placeholder URLs from Lorem Flickr / Picsum so cards show relevant photos.
 */

function isPlaceholderUrl(url: string | undefined): boolean {
  if (!url?.trim()) return true;
  const u = url.toLowerCase();
  return u.includes("picsum.photos") || u.includes("loremflickr.com");
}

/** Order matters: more specific patterns first. */
const NAME_RULES: Array<{ test: RegExp; url: string }> = [
  // Vegetables
  {
    test: /cherry\s+tomato|organic\s+cherry/i,
    url: "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=800&q=80",
  },
  { test: /tomato|tomatoes/i, url: "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=800&q=80" },
  {
    test: /spinach/i,
    url: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80",
  },
  {
    test: /bell\s*pepper|peppers/i,
    url: "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?auto=format&fit=crop&w=800&q=80",
  },
  {
    test: /carrot/i,
    url: "https://images.pexels.com/photos/143133/pexels-photo-143133.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  { test: /broccoli|lettuce|cabbage|kale/i, url: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80" },

  // Fruits
  {
    test: /apple|himachal/i,
    url: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=800&q=80",
  },
  {
    test: /orange|navel|citrus/i,
    url: "https://images.unsplash.com/photo-1547514701-42782101795e?auto=format&fit=crop&w=800&q=80",
  },
  {
    test: /banana/i,
    url: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=800&q=80",
  },
  {
    test: /strawberr/i,
    url: "https://images.unsplash.com/photo-1464965911861-a7d51ae9ae0c?auto=format&fit=crop&w=800&q=80",
  },
  { test: /grape/i, url: "https://images.unsplash.com/photo-1596363505729-4190a9500d21?auto=format&fit=crop&w=800&q=80" },
  { test: /kiwi/i, url: "https://images.unsplash.com/photo-1585058698351-6f2c82d0ce38?auto=format&fit=crop&w=800&q=80" },

  // Electronics
  {
    test: /headphone|noise/i,
    url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
  },
  {
    test: /speaker|bluetooth\s*speaker/i,
    url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=80",
  },
  {
    test: /laptop\s*stand|ergonomic\s*laptop/i,
    url: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80",
  },
  {
    test: /fitness\s*band|smart\s*band|oled/i,
    url: "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=800&q=80",
  },

  // Mobiles
  {
    test: /smartphone|nova|litephone|5g|iphone|android/i,
    url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80",
  },
  {
    test: /charger|usb-c|gan|wall\s*charger/i,
    url: "https://images.unsplash.com/photo-1583866828054-3b9ca3b60c4f?auto=format&fit=crop&w=800&q=80",
  },
  {
    test: /screen\s*guard|tempered|glass\s*\(2/i,
    url: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&w=800&q=80",
  },

  // Bakery
  {
    test: /sourdough|sandwich\s*bread|multigrain\s*bread|bread\s*loaf/i,
    url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80",
  },
  {
    test: /croissant/i,
    url: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80",
  },
  {
    test: /muffin/i,
    url: "https://images.unsplash.com/photo-1607958996333-41aef7caef39?auto=format&fit=crop&w=800&q=80",
  },

  // Kitchen
  {
    test: /cookware|frying\s*pan|non-?stick|stainless\s*steel\s*cook/i,
    url: "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=800&q=80",
  },
  {
    test: /chef\s*knife|knife\s*8/i,
    url: "https://images.unsplash.com/photo-1593618998160-e34014e67546?auto=format&fit=crop&w=800&q=80",
  },
  {
    test: /storage\s*container|glass\s*food|airtight/i,
    url: "https://images.unsplash.com/photo-1584990347445-1f19970458f1?auto=format&fit=crop&w=800&q=80",
  },

  // Clothes
  {
    test: /t-?shirt|cotton\s*t/i,
    url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80",
  },
  { test: /jean|denim/i, url: "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=800&q=80" },

  // Beauty
  {
    test: /serum|hyaluronic|face\s*serum/i,
    url: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80",
  },
  {
    test: /lipstick|matte\s*lip/i,
    url: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=800&q=80",
  },
];

const CATEGORY_FALLBACK: Record<string, string> = {
  Vegetables:
    "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80",
  Fruits: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=800&q=80",
  Electronics:
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
  Mobiles: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80",
  Bakery: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80",
  Kitchen: "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=800&q=80",
  Clothes: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80",
  Beauty: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80",
};

export type ProductLike = {
  name: string;
  category?: string;
  image?: string;
};

/**
 * Picks display URL: name keywords → category default → trusted stored image → global fallback.
 * Placeholder/random hosts are skipped unless nothing else matches.
 */
export function resolveProductImageUrl(product: ProductLike): string {
  const name = product.name || "";
  for (const { test, url } of NAME_RULES) {
    if (test.test(name)) return url;
  }

  const cat = product.category?.trim();
  if (cat && CATEGORY_FALLBACK[cat]) {
    const stored = product.image?.trim();
    if (!stored || isPlaceholderUrl(stored)) {
      return CATEGORY_FALLBACK[cat];
    }
  }

  const stored = product.image?.trim();
  if (stored && !isPlaceholderUrl(stored)) {
    return stored;
  }

  if (cat && CATEGORY_FALLBACK[cat]) {
    return CATEGORY_FALLBACK[cat];
  }

  if (stored) return stored;

  return PRODUCT_IMAGE_FALLBACK;
}
