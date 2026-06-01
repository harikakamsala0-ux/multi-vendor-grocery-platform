import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { API_BASE } from "@/lib/api";
import { toast } from "sonner";
import { ImageIcon, Loader2 } from "lucide-react";
import { handleProductImageError } from "@/lib/imageFallback";
import { resolveProductImageUrl } from "@/lib/resolveProductImage";

type Hit = {
  _id: string;
  name: string;
  price: number;
  vendor_name?: string;
  similarity_score?: number;
  match_tier?: string;
  phash_distance?: number;
  color_distance?: number;
  image?: string;
};

export function ImageSearchUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Hit[]>([]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    setLoading(true);
    setResults([]);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch(`${API_BASE}/products/search_by_image/`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Search failed");
        return;
      }
      setResults(Array.isArray(data.products) ? data.products : []);
      if (!data.products?.length) {
        const reason = data.empty_reason as string | undefined;
        const idx = Number(data.indexed_product_count);
        if (reason === "no_products") {
          toast.message("No products in the catalog yet.");
        } else if (reason === "no_fingerprints" || idx === 0) {
          toast.message(
            "No image fingerprints yet. From the backend folder run: py manage.py reindex_product_image_phash"
          );
        } else {
          toast.message(
            "No matches returned. Try another image, or run reindex with -v to see failed image URLs."
          );
        }
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-10 border-dashed">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Image-based product search</CardTitle>
        </div>
        <CardDescription>
          Upload any photo of the same kind of item (e.g. any tomato picture). We blend
          perceptual hashes with a color profile so you do not need the exact catalog photo.
          Lower total score = closer match.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void onFile(e)}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Searching…
            </>
          ) : (
            "Choose image"
          )}
        </Button>
        {results.length > 0 ? (
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
            {results.map((p) => (
              <li key={p._id} className="rounded-lg border bg-card overflow-hidden text-sm">
                <Link to={`/product/${p._id}`}>
                  <img
                    src={resolveProductImageUrl(p as Record<string, unknown>)}
                    alt=""
                    className="aspect-square w-full object-cover bg-muted"
                    onError={handleProductImageError}
                  />
                  <div className="p-2">
                    <p className="font-medium line-clamp-2">{p.name}</p>
                    <p className="text-muted-foreground">₹{p.price}</p>
                    {p.similarity_score != null ? (
                      <p className="text-[10px] text-muted-foreground">
                        score {p.similarity_score}
                        {p.match_tier ? ` · ${p.match_tier}` : ""}
                        {p.color_distance != null ? (
                          <span className="block text-[9px]">
                            color {p.color_distance} (lower = closer colors)
                          </span>
                        ) : (
                          <span className="block text-[9px]">(lower = more similar)</span>
                        )}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
