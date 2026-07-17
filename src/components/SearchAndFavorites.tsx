import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, Heart, History, Sparkles, X, Loader2 } from "lucide-react";
import { GeocodingResult } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface SearchAndFavoritesProps {
  onCitySelect: (city: GeocodingResult) => void;
  selectedCity: GeocodingResult | null;
}

export function getCountryFlagEmoji(countryCode?: string): string {
  if (!countryCode) return "📍";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  try {
    return String.fromCodePoint(...codePoints);
  } catch {
    return "📍";
  }
}

export default function SearchAndFavorites({ onCitySelect, selectedCity }: SearchAndFavoritesProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<GeocodingResult[]>([]);
  const [history, setHistory] = useState<GeocodingResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Default suggestions if search is empty
  const defaultPresets: GeocodingResult[] = [
    { id: 2643743, name: "London", latitude: 51.50853, longitude: -0.12574, country: "United Kingdom", country_code: "GB", admin1: "England" },
    { id: 5128581, name: "New York", latitude: 40.71427, longitude: -74.00597, country: "United States", country_code: "US", admin1: "New York" },
    { id: 1850147, name: "Tokyo", latitude: 35.6895, longitude: 139.6917, country: "Japan", country_code: "JP", admin1: "Tokyo" },
    { id: 2147714, name: "Sydney", latitude: -33.86785, longitude: 151.20732, country: "Australia", country_code: "AU", admin1: "New South Wales" },
    { id: 2988507, name: "Paris", latitude: 48.85341, longitude: 2.3488, country: "France", country_code: "FR", admin1: "Île-de-France" },
  ];

  // Load favorites and history on mount
  useEffect(() => {
    const storedFavs = localStorage.getItem("weather_favs");
    if (storedFavs) {
      try { setFavorites(JSON.parse(storedFavs)); } catch (e) { console.error(e); }
    } else {
      // Seed with London
      setFavorites([defaultPresets[0]]);
    }

    const storedHist = localStorage.getItem("weather_history");
    if (storedHist) {
      try { setHistory(JSON.parse(storedHist)); } catch (e) { console.error(e); }
    }
  }, []);

  // Sync favorites
  const toggleFavorite = (city: GeocodingResult) => {
    let updated: GeocodingResult[];
    if (favorites.some((f) => f.id === city.id)) {
      updated = favorites.filter((f) => f.id !== city.id);
    } else {
      updated = [...favorites, city];
    }
    setFavorites(updated);
    localStorage.setItem("weather_favs", JSON.stringify(updated));
  };

  const isFavorite = selectedCity ? favorites.some((f) => f.id === selectedCity.id) : false;

  // Search API fetch with debounce
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data && data.results) {
          setSuggestions(data.results);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.error("Geocoding fetch error:", err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (city: GeocodingResult) => {
    onCitySelect(city);
    setShowDropdown(false);
    setQuery("");

    // Add to history
    const isAlreadyInHistory = history.some((h) => h.id === city.id);
    let updatedHist = history;
    if (!isAlreadyInHistory) {
      updatedHist = [city, ...history.slice(0, 5)];
      setHistory(updatedHist);
      localStorage.setItem("weather_history", JSON.stringify(updatedHist));
    }
  };

  const clearHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory([]);
    localStorage.removeItem("weather_history");
  };

  return (
    <div className="relative w-full flex flex-col gap-4" id="search-favorites-panel">
      {/* Search Input Bar */}
      <div className="relative flex items-center gap-2" ref={dropdownRef}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          <input
            id="city-search-input"
            type="text"
            className="w-full pl-11 pr-10 py-3 bg-white/70 backdrop-blur-md rounded-2xl border border-gray-250/50 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-gray-800 placeholder-gray-400 font-sans text-sm"
            placeholder="Search for any city (e.g. Sydney, New York, Munich)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
          />
          {query && (
            <button
              id="clear-search-btn"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Favorite Current Toggle Button */}
        {selectedCity && (
          <button
            id="toggle-fav-btn"
            onClick={() => toggleFavorite(selectedCity)}
            className={`p-3 rounded-2xl border transition-all duration-300 flex items-center justify-center shadow-sm cursor-pointer ${
              isFavorite
                ? "bg-rose-50 border-rose-200 text-rose-500 hover:bg-rose-100"
                : "bg-white/80 border-gray-250/45 text-gray-400 hover:text-rose-500 hover:bg-white hover:border-rose-100"
            }`}
            title={isFavorite ? "Remove from Favorites" : "Bookmark this City"}
          >
            <Heart className={`w-5 h-5 ${isFavorite ? "fill-rose-500" : ""}`} />
          </button>
        )}

        {/* Autocomplete Suggestions Dropdown */}
        <AnimatePresence>
          {showDropdown && (
            <motion.div
              id="search-suggestions-dropdown"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute left-0 right-0 top-full mt-2 bg-white/95 backdrop-blur-xl rounded-2xl border border-gray-200/80 shadow-xl z-50 overflow-hidden max-h-[380px] overflow-y-auto"
            >
              {loading && (
                <div className="flex items-center justify-center py-8 text-gray-500 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  <span className="text-sm font-medium">Searching satellite index...</span>
                </div>
              )}

              {!loading && query && suggestions.length === 0 && (
                <div className="px-5 py-6 text-center text-gray-500 text-sm">
                  No matching cities found. Try spelling it differently or search a region.
                </div>
              )}

              {/* Autocomplete Results */}
              {!loading && suggestions.length > 0 && (
                <div className="py-2">
                  <div className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Matching Locations
                  </div>
                  {suggestions.map((city) => (
                    <button
                      key={city.id}
                      onClick={() => handleSelect(city)}
                      className="w-full px-4 py-3 hover:bg-blue-50/50 flex items-center gap-3 text-left transition-all cursor-pointer group"
                    >
                      <span className="text-xl shrink-0">{getCountryFlagEmoji(city.country_code)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors truncate">
                          {city.name}
                        </div>
                        <div className="text-xs text-gray-400 truncate">
                          {city.admin1 ? `${city.admin1}, ` : ""}{city.country || ""}
                        </div>
                      </div>
                      <MapPin className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                  ))}
                </div>
              )}

              {/* History & Presets if input is empty */}
              {!query && (
                <div className="py-2">
                  {/* Recent Searches */}
                  {history.length > 0 && (
                    <div className="border-b border-gray-100 pb-2 mb-2">
                      <div className="px-4 py-1.5 flex items-center justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        <span className="flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Recent Searches</span>
                        <button onClick={clearHistory} className="text-blue-500 hover:text-blue-600 hover:underline normal-case text-[11px] font-normal cursor-pointer">
                          Clear All
                        </button>
                      </div>
                      {history.map((city) => (
                        <button
                          key={`hist-${city.id}`}
                          onClick={() => handleSelect(city)}
                          className="w-full px-4 py-2.5 hover:bg-slate-50 flex items-center gap-3 text-left transition-all cursor-pointer"
                        >
                          <span className="text-lg shrink-0">{getCountryFlagEmoji(city.country_code)}</span>
                          <span className="text-sm font-medium text-gray-700 truncate">{city.name}</span>
                          <span className="text-xs text-gray-400 ml-auto truncate max-w-[120px]">{city.country}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Smart Preset Recommendations */}
                  <div>
                    <div className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Featured Benchmarks
                    </div>
                    {defaultPresets.map((city) => (
                      <button
                        key={`preset-${city.id}`}
                        onClick={() => handleSelect(city)}
                        className="w-full px-4 py-2.5 hover:bg-slate-50 flex items-center gap-3 text-left transition-all cursor-pointer group"
                      >
                        <span className="text-lg group-hover:scale-110 transition-transform shrink-0">{getCountryFlagEmoji(city.country_code)}</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold text-gray-700 group-hover:text-blue-500 transition-colors">{city.name}</span>
                          <span className="text-xs text-gray-400 ml-2">({city.country})</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Favorites Pill List */}
      {favorites.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar" id="favorites-bar">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider shrink-0 mr-1">Bookmarked:</span>
          {favorites.map((city) => (
            <button
              key={`fav-pill-${city.id}`}
              onClick={() => onCitySelect(city)}
              className={`px-3 py-1.5 rounded-full border text-xs font-medium flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-sm ${
                selectedCity?.id === city.id
                  ? "bg-blue-600 border-blue-600 text-white shadow-blue-100"
                  : "bg-white/80 border-gray-200/50 text-gray-700 hover:border-gray-300 hover:bg-white"
              }`}
            >
              <span>{getCountryFlagEmoji(city.country_code)}</span>
              <span>{city.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
