import React from "react";
import {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Snowflake,
  Wind,
  Droplets,
  LucideProps
} from "lucide-react";

export interface WeatherMeta {
  description: string;
  icon: React.ComponentType<LucideProps>;
  background: string; // Tailwind gradient classes
  themeColor: string; // Primaries for badges/charts
}

export function getWeatherMeta(code: number, isDay: boolean = true): WeatherMeta {
  // WMO Weather Interpretation Codes (WMOCode)
  switch (code) {
    case 0:
      return {
        description: isDay ? "Clear Sky" : "Clear Night",
        icon: Sun,
        background: isDay 
          ? "from-amber-100 via-sky-100 to-sky-200 text-amber-900" 
          : "from-slate-900 via-indigo-950 to-slate-900 text-indigo-100",
        themeColor: "amber-500"
      };
    case 1:
    case 2:
      return {
        description: isDay ? "Mainly Clear" : "Partly Cloudy",
        icon: CloudSun,
        background: isDay 
          ? "from-sky-100 via-blue-50 to-indigo-100 text-sky-900" 
          : "from-slate-900 via-slate-950 to-slate-900 text-indigo-100",
        themeColor: "sky-400"
      };
    case 3:
      return {
        description: "Overcast",
        icon: Cloud,
        background: isDay 
          ? "from-slate-200 via-slate-100 to-sky-100 text-slate-800" 
          : "from-slate-950 via-slate-900 to-slate-950 text-slate-200",
        themeColor: "slate-400"
      };
    case 45:
    case 48:
      return {
        description: "Foggy Conditions",
        icon: CloudFog,
        background: "from-slate-300 via-slate-200 to-slate-300 text-slate-800",
        themeColor: "slate-500"
      };
    case 51:
    case 53:
    case 55:
      return {
        description: "Light Drizzle",
        icon: CloudRain,
        background: "from-blue-50 via-sky-100 to-slate-200 text-blue-900",
        themeColor: "blue-400"
      };
    case 56:
    case 57:
      return {
        description: "Freezing Drizzle",
        icon: CloudSnow,
        background: "from-sky-200 via-cyan-100 to-slate-200 text-cyan-900",
        themeColor: "cyan-400"
      };
    case 61:
    case 63:
      return {
        description: "Moderate Rain",
        icon: CloudRain,
        background: "from-blue-100 via-indigo-50 to-slate-200 text-indigo-950",
        themeColor: "blue-500"
      };
    case 65:
      return {
        description: "Heavy Rain",
        icon: CloudRain,
        background: "from-indigo-900 via-slate-800 to-slate-900 text-indigo-100",
        themeColor: "indigo-600"
      };
    case 66:
    case 67:
      return {
        description: "Freezing Rain",
        icon: CloudSnow,
        background: "from-sky-300 via-indigo-100 to-slate-200 text-indigo-950",
        themeColor: "cyan-500"
      };
    case 71:
    case 73:
      return {
        description: "Snowfall",
        icon: Snowflake,
        background: "from-slate-100 via-sky-50 to-sky-100 text-sky-950",
        themeColor: "sky-300"
      };
    case 75:
      return {
        description: "Heavy Snowfall",
        icon: Snowflake,
        background: "from-sky-100 via-white to-sky-100 text-slate-900",
        themeColor: "blue-300"
      };
    case 77:
      return {
        description: "Snow Grains",
        icon: Snowflake,
        background: "from-sky-150 via-slate-100 to-sky-100 text-slate-800",
        themeColor: "sky-200"
      };
    case 80:
    case 81:
    case 82:
      return {
        description: "Passing Showers",
        icon: CloudRain,
        background: "from-sky-200 via-blue-100 to-slate-200 text-sky-950",
        themeColor: "blue-500"
      };
    case 85:
    case 86:
      return {
        description: "Snow Showers",
        icon: Snowflake,
        background: "from-cyan-100 via-blue-50 to-slate-100 text-cyan-900",
        themeColor: "cyan-300"
      };
    case 95:
      return {
        description: "Thunderstorms",
        icon: CloudLightning,
        background: "from-slate-850 via-indigo-950 to-slate-900 text-amber-100",
        themeColor: "amber-400"
      };
    case 96:
    case 99:
      return {
        description: "Severe Thunderstorm with Hail",
        icon: CloudLightning,
        background: "from-purple-950 via-slate-900 to-indigo-950 text-amber-200",
        themeColor: "red-400"
      };
    default:
      return {
        description: "Overcast Clouds",
        icon: Cloud,
        background: "from-slate-200 via-slate-100 to-slate-200 text-slate-800",
        themeColor: "slate-400"
      };
  }
}

export function getWindDirection(deg: number): string {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(((deg % 360) / 45)) % 8;
  return directions[index];
}

export interface UVRating {
  rating: string;
  color: string;
  text: string;
}

export function getUVRating(uv: number): UVRating {
  if (uv <= 2) return { rating: "Low", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", text: "Minimal protection required. Safe for outdoor plan." };
  if (uv <= 5) return { rating: "Moderate", color: "bg-amber-500/10 text-amber-600 border-amber-500/20", text: "SPF 15+ recommended. Seek shade near midday." };
  if (uv <= 7) return { rating: "High", color: "bg-orange-500/10 text-orange-600 border-orange-500/20", text: "Sun protection mandatory. Wear hat & sunglasses." };
  if (uv <= 10) return { rating: "Very High", color: "bg-red-500/10 text-red-600 border-red-500/20", text: "Avoid midday sun. Generous SPF 30+ sunscreen." };
  return { rating: "Extreme", color: "bg-purple-500/10 text-purple-600 border-purple-500/20", text: "Extreme sunburn risk. Stay indoors if possible." };
}

export function formatFriendlyDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric"
  });
}

export function formatDayName(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }
  
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) {
    return "Tomorrow";
  }

  return date.toLocaleDateString("en-US", { weekday: "short" });
}

export function celsiusToFahrenheit(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}
