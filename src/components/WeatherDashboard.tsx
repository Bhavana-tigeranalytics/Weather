import React from "react";
import { WeatherData, GeocodingResult } from "../types";
import { 
  getWeatherMeta, 
  getWindDirection, 
  getUVRating, 
  celsiusToFahrenheit 
} from "../utils/weatherHelpers";
import { 
  Thermometer, 
  Droplets, 
  Wind, 
  Compass, 
  Sun, 
  Cloud, 
  Sunrise, 
  Sunset, 
  Gauge, 
  Navigation,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { motion } from "motion/react";
import { getCountryFlagEmoji } from "./SearchAndFavorites";

interface WeatherDashboardProps {
  weatherData: WeatherData;
  city: GeocodingResult;
  isCelsius: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function WeatherDashboard({ 
  weatherData, 
  city, 
  isCelsius, 
  onRefresh, 
  isRefreshing 
}: WeatherDashboardProps) {
  const current = weatherData.current;
  const daily = weatherData.daily;
  const isDay = current.is_day !== 0;

  const meta = getWeatherMeta(current.weather_code, isDay);
  const IconComponent = meta.icon;

  const tempMax = daily?.temperature_2m_max?.[0] ?? current.temperature_2m;
  const tempMin = daily?.temperature_2m_min?.[0] ?? current.temperature_2m;
  const uvIndex = daily?.uv_index_max?.[0] ?? 0;
  const uvDetails = getUVRating(uvIndex);

  // Formatting values based on preference
  const formatTemp = (val: number) => {
    if (isCelsius) return `${Math.round(val)}°C`;
    return `${celsiusToFahrenheit(val)}°F`;
  };

  const windDirName = getWindDirection(current.wind_direction_10m);

  // Simple sunrise/sunset formatting from API (standard ISO, e.g., "2026-07-16T05:43")
  const formatTime = (isoString?: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  const sunriseTime = formatTime(daily?.sunrise?.[0]);
  const sunsetTime = formatTime(daily?.sunset?.[0]);

  return (
    <div className="w-full flex flex-col gap-6" id="weather-dashboard-panel">
      {/* Current Condition Hero Card with Dynamic Weather-Dependent Backdrop */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-br ${meta.background} border border-white/20 shadow-lg`}
        id="weather-hero-card"
      >
        {/* Abstract absolute glowing shapes for ambient premium feel */}
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />

        {/* Card Header Info */}
        <div className="flex justify-between items-start relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-3xl" role="img" aria-label="Country flag">
                {getCountryFlagEmoji(city.country_code)}
              </span>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-inherit">
                {city.name}
              </h1>
            </div>
            <p className="text-xs md:text-sm font-medium opacity-80 mt-1">
              {city.admin1 ? `${city.admin1}, ` : ""}{city.country}
            </p>
          </div>
          
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md hover:bg-white/30 transition-all text-inherit disabled:opacity-50 cursor-pointer"
            title="Refresh weather telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Hero Temp & Icon Layout */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mt-8 relative z-10">
          <div className="flex items-center gap-5">
            {/* Animated weather visual container */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="p-4 rounded-2xl bg-white/15 backdrop-blur-lg border border-white/20 shadow-inner shrink-0"
            >
              <IconComponent className="w-14 h-14 md:w-18 md:h-18 stroke-[1.5]" />
            </motion.div>
            
            <div>
              <div className="text-5xl md:text-7xl font-extrabold tracking-tighter">
                {formatTemp(current.temperature_2m)}
              </div>
              <div className="text-sm md:text-base font-semibold tracking-wide uppercase opacity-90 mt-1 flex items-center gap-1.5">
                <span>{meta.description}</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-current" />
                <span>Feels like {formatTemp(current.apparent_temperature)}</span>
              </div>
            </div>
          </div>

          {/* Quick Stats on Hero Panel */}
          <div className="grid grid-cols-2 gap-4 shrink-0 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 md:min-w-[240px]">
            <div>
              <div className="text-[11px] uppercase tracking-wider font-semibold opacity-70">Daily Range</div>
              <div className="text-sm md:text-base font-bold mt-0.5">
                {formatTemp(tempMin)} – {formatTemp(tempMax)}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider font-semibold opacity-70">Wind Rate</div>
              <div className="text-sm md:text-base font-bold mt-0.5 flex items-center gap-1">
                <span>{current.wind_speed_10m} <span className="text-xs font-normal">km/h</span></span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Bento Grid layout for detailed weather telemetry */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4" id="weather-bento-grid">
        
        {/* Card 1: Apparent / Feels Like */}
        <div className="p-4 rounded-2xl bg-white/60 backdrop-blur-md border border-gray-200/50 shadow-sm flex flex-col justify-between min-h-[130px]">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Thermal Index</span>
            <Thermometer className="w-4 h-4 text-orange-500" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-gray-800">
              {formatTemp(current.apparent_temperature)}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              {current.apparent_temperature > current.temperature_2m 
                ? "Higher humidity makes it feel warmer." 
                : "Wind cooling or lower humidity feels cooler."}
            </p>
          </div>
        </div>

        {/* Card 2: Humidity with visual progress circle */}
        <div className="p-4 rounded-2xl bg-white/60 backdrop-blur-md border border-gray-200/50 shadow-sm flex flex-col justify-between min-h-[130px]">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Moisture / Humidity</span>
            <Droplets className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-800">{current.relative_humidity_2m}%</span>
            </div>
            {/* Elegant tiny bar */}
            <div className="w-full h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-1000" 
                style={{ width: `${current.relative_humidity_2m}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">
              Dew point index is moderate.
            </p>
          </div>
        </div>

        {/* Card 3: Wind details with active compass indicator */}
        <div className="p-4 rounded-2xl bg-white/60 backdrop-blur-md border border-gray-200/50 shadow-sm flex flex-col justify-between min-h-[130px]">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Wind Velocity</span>
            <Wind className="w-4 h-4 text-sky-500" />
          </div>
          <div className="mt-2 flex items-center gap-3">
            {/* Dynamic Compass needle rotation */}
            <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center border border-sky-100 shrink-0">
              <Navigation 
                className="w-5 h-5 text-sky-500 transition-all duration-1000" 
                style={{ transform: `rotate(${current.wind_direction_10m}deg)` }} 
              />
            </div>
            <div>
              <div className="text-lg font-bold text-gray-800">
                {current.wind_speed_10m} <span className="text-xs font-normal text-gray-500">km/h</span>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Bearing: {current.wind_direction_10m}° ({windDirName})
              </p>
            </div>
          </div>
        </div>

        {/* Card 4: UV Index alert bar */}
        <div className="p-4 rounded-2xl bg-white/60 backdrop-blur-md border border-gray-200/50 shadow-sm flex flex-col justify-between min-h-[130px] col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Solar UV Index</span>
            <Sun className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-800">{uvIndex}</span>
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${uvDetails.color}`}>
                {uvDetails.rating}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
              {uvDetails.text}
            </p>
          </div>
        </div>

        {/* Card 5: Cloud Cover & Barometer */}
        <div className="p-4 rounded-2xl bg-white/60 backdrop-blur-md border border-gray-200/50 shadow-sm flex flex-col justify-between min-h-[130px]">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Atmosphere</span>
            <Gauge className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] text-gray-400 uppercase">Clouds</div>
              <div className="text-base font-bold text-gray-800">{current.cloud_cover}%</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-400 uppercase">Pressure</div>
              <div className="text-base font-bold text-gray-800 shrink-0">{Math.round(current.pressure_msl)} <span className="text-[9px] font-normal">hPa</span></div>
            </div>
          </div>
          <p className="text-[10px] text-gray-400">
            {current.cloud_cover > 70 ? "Sky is overcast." : current.cloud_cover > 30 ? "Sky is partly cloudy." : "Mainly pristine clear."}
          </p>
        </div>

        {/* Card 6: Sunrise & Sunset times */}
        <div className="p-4 rounded-2xl bg-white/60 backdrop-blur-md border border-gray-200/50 shadow-sm flex flex-col justify-between min-h-[130px]">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Solar Horizon</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="flex items-center gap-1.5">
              <Sunrise className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <div className="text-[9px] text-gray-400 uppercase">Sunrise</div>
                <div className="text-xs font-semibold text-gray-700">{sunriseTime}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Sunset className="w-5 h-5 text-indigo-400 shrink-0" />
              <div>
                <div className="text-[9px] text-gray-400 uppercase">Sunset</div>
                <div className="text-xs font-semibold text-gray-700">{sunsetTime}</div>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 leading-none text-center">
            Daylight duration: ~14.5 hours
          </p>
        </div>

      </div>
    </div>
  );
}
