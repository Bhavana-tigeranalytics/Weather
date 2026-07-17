import React, { useState, useEffect } from "react";
import { GeocodingResult, WeatherData, WeatherRecommendations } from "./types";
import SearchAndFavorites from "./components/SearchAndFavorites";
import WeatherDashboard from "./components/WeatherDashboard";
import ForecastSection from "./components/ForecastSection";
import IntelligencePanel from "./components/IntelligencePanel";
import { getWeatherMeta } from "./utils/weatherHelpers";
import { CloudLightning, Info, Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [selectedCity, setSelectedCity] = useState<GeocodingResult | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [recommendations, setRecommendations] = useState<WeatherRecommendations | null>(null);
  const [isCelsius, setIsCelsius] = useState(true);

  // Loaders
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [recsLoading, setRecsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Errors
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [recsError, setRecsError] = useState<string | null>(null);

  // Default City on startup if nothing is selected or saved
  const DEFAULT_CITY: GeocodingResult = {
    id: 2643743,
    name: "London",
    latitude: 51.50853,
    longitude: -0.12574,
    country: "United Kingdom",
    country_code: "GB",
    admin1: "England"
  };

  // Sync initial city selection from favorites or default
  useEffect(() => {
    const storedLast = localStorage.getItem("weather_last_searched");
    if (storedLast) {
      try {
        setSelectedCity(JSON.parse(storedLast));
        return;
      } catch (e) {
        console.error(e);
      }
    }
    setSelectedCity(DEFAULT_CITY);
  }, []);

  // Fetch Weather Forecast when City changes
  useEffect(() => {
    if (!selectedCity) return;

    const fetchWeather = async () => {
      setWeatherLoading(true);
      setWeatherError(null);
      setWeatherData(null);
      setRecommendations(null);
      setRecsError(null);

      try {
        // Save to last searched
        localStorage.setItem("weather_last_searched", JSON.stringify(selectedCity));

        const res = await fetch(`/api/weather?lat=${selectedCity.latitude}&lon=${selectedCity.longitude}`);
        if (!res.ok) {
          throw new Error("Unable to retrieve satellite weather indexes.");
        }
        const data = await res.json();
        setWeatherData(data);

        // Fetch AI recommendations immediately
        fetchAIRecommendations(selectedCity, data);
      } catch (err: any) {
        console.error("Fetch weather error:", err);
        setWeatherError(err.message || "Failed to retrieve live forecasting data.");
      } finally {
        setWeatherLoading(false);
      }
    };

    fetchWeather();
  }, [selectedCity]);

  // Fetch Recommendations helper
  const fetchAIRecommendations = async (city: GeocodingResult, weather: WeatherData) => {
    setRecsLoading(true);
    setRecsError(null);
    try {
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: city.name,
          weatherData: weather
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to draft recommendations");
      }

      const data = await res.json();
      setRecommendations(data);
    } catch (err: any) {
      console.error("Fetch recs error:", err);
      setRecsError(err.message || "Unable to draft AI weather recommendations. Ensure GEMINI_API_KEY is configured.");
    } finally {
      setRecsLoading(false);
    }
  };

  // Pull refresh trigger
  const handleRefresh = async () => {
    if (!selectedCity || !weatherData) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/weather?lat=${selectedCity.latitude}&lon=${selectedCity.longitude}`);
      const data = await res.json();
      setWeatherData(data);
      await fetchAIRecommendations(selectedCity, data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Determine current ambient weather theme class
  const isDay = weatherData?.current?.is_day !== 0;
  const weatherCode = weatherData?.current?.weather_code ?? 0;
  const meta = weatherData ? getWeatherMeta(weatherCode, isDay) : null;

  return (
    <div 
      className={`min-h-screen bg-gradient-to-tr transition-colors duration-1000 p-4 md:p-8 flex flex-col gap-6 ${
        meta 
          ? meta.background + " bg-opacity-35" 
          : "from-slate-100 via-sky-50 to-indigo-100 text-slate-800"
      }`}
      id="app-root-container"
    >
      
      {/* Outer Content Sizer Wrapper */}
      <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
        
        {/* Top Header Row with responsive branding and unit toggle */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-gray-250/35" id="app-header">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-md shadow-blue-100 flex items-center justify-center">
              <CloudLightning className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2">
                Weather Intelligence
                <span className="hidden md:inline-flex items-center gap-1 text-[10px] bg-indigo-100 text-indigo-700 font-bold uppercase px-2 py-0.5 rounded-full">
                  <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500 animate-spin-slow" /> AI Planning Enabled
                </span>
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                Live Open-Meteo Satellite Feeds & Customized Recommendation Synthesis
              </p>
            </div>
          </div>

          {/* Unit Toggle controls (C/F) */}
          <div className="flex items-center bg-white/70 backdrop-blur-md rounded-2xl p-1 border border-gray-200/50 shadow-sm" id="metric-switch">
            <button
              onClick={() => setIsCelsius(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isCelsius 
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-100" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Celsius (°C)
            </button>
            <button
              onClick={() => setIsCelsius(false)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                !isCelsius 
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-100" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Fahrenheit (°F)
            </button>
          </div>
        </header>

        {/* Global Autocomplete Search bar component */}
        <section id="search-component">
          <SearchAndFavorites 
            onCitySelect={(city) => setSelectedCity(city)} 
            selectedCity={selectedCity} 
          />
        </section>

        {/* Main Dashboard Layout with Animated Transitions */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard-main-content">
          
          {/* LEFT PANEL: CURRENT WEATHER & BENTO METRICS (5 cols on large) */}
          <section className="lg:col-span-5 flex flex-col gap-6" id="left-telemetry-panel">
            
            {/* Telemetry Loader State */}
            {weatherLoading && (
              <div className="bg-white/60 backdrop-blur-md rounded-3xl p-16 flex flex-col items-center justify-center border border-gray-200/50 shadow-sm">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                <h3 className="text-base font-bold text-gray-800">Reading Satellite Data...</h3>
                <p className="text-xs text-gray-400 max-w-xs mt-1.5 text-center leading-relaxed">
                  Establishing links with European Meteorological orbits for real-time micro-climate metrics.
                </p>
              </div>
            )}

            {/* Error State */}
            {weatherError && !weatherLoading && (
              <div className="bg-white/60 backdrop-blur-md rounded-3xl p-8 border border-red-200/40 text-center shadow-sm">
                <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-gray-800">Satellite Disconnection</h3>
                <p className="text-xs text-red-600 mt-2 max-w-sm mx-auto">{weatherError}</p>
                <button
                  onClick={() => selectedCity && setSelectedCity({ ...selectedCity })}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-sm"
                >
                  Reconnect Sensors
                </button>
              </div>
            )}

            {/* Weather dashboard data */}
            {!weatherLoading && !weatherError && weatherData && selectedCity && (
              <WeatherDashboard
                weatherData={weatherData}
                city={selectedCity}
                isCelsius={isCelsius}
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
              />
            )}
          </section>

          {/* RIGHT PANEL: 7-DAY FORECAST & AI INTELLIGENCE SYSTEM (7 cols on large) */}
          <section className="lg:col-span-7 flex flex-col gap-6" id="right-intelligence-panel">
            
            {/* Forecast Panel (Stacked daily timeline) */}
            {!weatherLoading && !weatherError && weatherData && (
              <ForecastSection 
                daily={weatherData.daily} 
                isCelsius={isCelsius} 
              />
            )}

            {/* AI Planning Recommendations Panel */}
            {!weatherLoading && !weatherError && weatherData && selectedCity && (
              <IntelligencePanel
                city={selectedCity}
                weatherData={weatherData}
                recommendations={recommendations}
                recLoading={recsLoading}
                recError={recsError}
                onRegenerateRecs={() => fetchAIRecommendations(selectedCity, weatherData)}
              />
            )}
          </section>

        </main>

        {/* Footer info card */}
        <footer className="text-center py-6 mt-6 border-t border-gray-200/30 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 gap-4" id="app-footer">
          <div className="flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            <span>Open-Meteo feeds refresh hourly. Timezone normalized automatically.</span>
          </div>
          <div>
            <span>Developed via Google AI Studio Build Framework</span>
          </div>
        </footer>

      </div>
    </div>
  );
}
