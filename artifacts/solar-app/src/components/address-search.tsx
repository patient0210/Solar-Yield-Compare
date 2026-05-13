import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, MapPin, X } from "lucide-react";

interface GeoResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface AddressSearchProps {
  onSelect: (lat: number, lng: number, label: string) => void;
}

export default function AddressSearch({ onSelect }: AddressSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setIsLoading(true);
    setError(null);
    setResults([]);
    setOpen(false);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&accept-language=ko`,
        { headers: { "Accept-Language": "ko" } }
      );
      if (!res.ok) throw new Error("네트워크 오류");
      const data: GeoResult[] = await res.json();
      if (data.length === 0) {
        setError("검색 결과가 없습니다. 다른 주소를 입력해 보세요.");
      } else {
        setResults(data);
        setOpen(true);
      }
    } catch {
      setError("주소 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      search();
    }
  };

  const handleSelect = (r: GeoResult) => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    const shortName = r.display_name.split(",").slice(0, 3).join(", ");
    setSelected(shortName);
    setQuery("");
    setResults([]);
    setOpen(false);
    onSelect(lat, lng, shortName);
  };

  const clearSelected = () => {
    setSelected(null);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-2" ref={containerRef}>
      {selected ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/8 border border-primary/20 text-sm">
          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="flex-1 text-foreground text-xs leading-snug line-clamp-2">{selected}</span>
          <button
            onClick={clearSelected}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            aria-label="선택 해제"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : null}

      <div className="flex gap-2">
        <Input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="주소 또는 장소명 입력"
          className="flex-1 text-sm"
          disabled={isLoading}
        />
        <Button
          variant="outline"
          size="icon"
          onClick={search}
          disabled={isLoading || !query.trim()}
          className="shrink-0"
          aria-label="주소 검색"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </Button>
      </div>

      {error && (
        <p className="text-xs text-destructive px-1">{error}</p>
      )}

      {open && results.length > 0 && (
        <div className="relative z-50">
          <ul className="absolute top-0 left-0 right-0 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
            {results.map((r, i) => {
              const parts = r.display_name.split(",");
              const main = parts.slice(0, 2).join(",").trim();
              const sub = parts.slice(2, 4).join(",").trim();
              return (
                <li key={i}>
                  <button
                    className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors flex items-start gap-2 border-b border-border/50 last:border-0"
                    onClick={() => handleSelect(r)}
                  >
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{main}</div>
                      {sub && (
                        <div className="text-xs text-muted-foreground truncate mt-0.5">{sub}</div>
                      )}
                      <div className="text-[10px] text-muted-foreground/70 mt-0.5 font-mono">
                        {parseFloat(r.lat).toFixed(4)}, {parseFloat(r.lon).toFixed(4)}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
