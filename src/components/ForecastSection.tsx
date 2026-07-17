import React, { useState } from "react";
import { DailyWeather } from "../types";
import { 
  getWeatherMeta, 
  formatDayName, 
  formatFriendlyDate, 
  celsiusToFahrenheit,
  getUVRating
} from "../utils/weatherHelpers";
import { 
  Calendar, 
  Droplet, 
  Sun, 
  Wind, 
  Sunrise, 
  Sunset, 
  TrendingUp, 
  Eye, 
  Sparkles,
  ChevronRight,
  ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ForecastSectionProps {
  daily: DailyWeather;
  isCelsius: boolean;
}

export default function ForecastSection({ daily, isCelsius }: ForecastSectionProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  if (!daily || !daily.time || daily.time.length === 0) {
    return null;
  }

  const formatTemp = (val: number) => {
    if (isCelsius) return `${Math.round(val)}°`;
    return `${celsiusToFahrenheit(val)}°`;
  };

  // Pre-calculate SVG path coordinates for temperature trend lines
  const tempsMax = daily.temperature_2m_max;
  const highestTemp = Math.max(...tempsMax);
  const lowestTemp = Math.min(...tempsMax);
  const tempDiff = highestTemp - lowestTemp === 0 ? 1 : highestTemp - lowestTemp;
  
  // Create coordinate points for the SVG (width 600, height 80)
  const svgPoints = tempsMax.map((temp, index) => {
    const x = (index / (tempsMax.length - 1)) * 540 + 30;
    // Normalize y to be between 15 and 65
    const y = 65 - ((temp - lowestTemp) / tempDiff) * 45;
    return { x, y, temp };
  });

  const pathString = svgPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div className="w-full flex flex-col gap-6" id="forecast-panel">
      {/* Forecast Card Wrapper */}
      <div className="bg-white/60 backdrop-blur-md border border-gray-200/50 rounded-3xl p-6 shadow-sm">
        
        {/* Panel Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-bold text-gray-800">7-Day Intel Forecast</h2>
          </div>
          <span className="text-xs text-gray-400 font-medium bg-slate-100 px-2.5 py-1 rounded-full">
            Micro-climate tracking: Active
          </span>
        </div>

        {/* 1. Interactive Temperature Trend Viz (SVG) */}
        <div className="mb-6 bg-slate-50/50 rounded-2xl p-4 border border-slate-100 hidden md:block">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-500" /> Max Temperature Trajectory
            </span>
            <span className="text-xs text-gray-400">Peak: {formatTemp(highestTemp)}</span>
          </div>

          <div className="relative w-full h-[90px] mt-2">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 600 80">
              {/* Soft grid horizontal helper lines */}
              <line x1="10" y1="20" x2="590" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
              <line x1="10" y1="65" x2="590" y2="65" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />

              {/* Connecting trend path line */}
              <path
                d={pathString}
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Glowing gradient under the trend line */}
              <path
                d={`${pathString} L ${svgPoints[svgPoints.length - 1].x} 78 L ${svgPoints[0].x} 78 Z`}
                fill="url(#area-gradient)"
                opacity="0.1"
              />

              {/* Interactive nodes and temperatures labels */}
              {svgPoints.map((point, i) => (
                <g key={`point-${i}`}>
                  {/* Outer pulsing shadow ring */}
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="6"
                    fill="#3b82f6"
                    opacity="0.18"
                    className="animate-pulse"
                  />
                  {/* Point node */}
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill="#3b82f6"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  {/* Temperature label text */}
                  <text
                    x={point.x}
                    y={point.y - 10}
                    textAnchor="middle"
                    className="text-[10px] font-bold fill-gray-600 font-mono"
                  >
                    {formatTemp(point.temp)}
                  </text>
                  {/* Day Label under node */}
                  <text
                    x={point.x}
                    y={75}
                    textAnchor="middle"
                    className="text-[9px] font-semibold fill-gray-400 font-sans"
                  >
                    {formatDayName(daily.time[i])}
                  </text>
                </g>
              ))}

              {/* Definitions of gradients */}
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="50%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
                <linearGradient id="area-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* 2. 7-day Stacked List */}
        <div className="flex flex-col gap-2">
          {daily.time.map((timeStr, index) => {
            const isExpanded = expandedIndex === index;
            const weatherCode = daily.weather_code[index];
            const maxTemp = daily.temperature_2m_max[index];
            const minTemp = daily.temperature_2m_min[index];
            const rainProb = daily.precipitation_probability_max?.[index] ?? 0;
            const uvIdx = daily.uv_index_max?.[index] ?? 0;
            const uvDetails = getUVRating(uvIdx);
            const maxWind = daily.wind_speed_10m_max?.[index] ?? 0;

            const meta = getWeatherMeta(weatherCode, true);
            const IconComponent = meta.icon;

            return (
              <div 
                key={timeStr}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isExpanded 
                    ? "bg-slate-50/75 border-slate-200/80 shadow-inner" 
                    : "bg-white/40 border-gray-100 hover:bg-slate-50/40 hover:border-gray-200"
                }`}
              >
                {/* Main Header Row */}
                <button
                  onClick={() => setExpandedIndex(isExpanded ? null : index)}
                  className="w-full flex items-center justify-between p-4 text-left cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Icon container */}
                    <div className={`p-2 rounded-xl bg-gradient-to-br ${meta.background} border border-white/25 shadow-sm shrink-0`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-gray-850 flex items-center gap-1.5">
                        <span>{formatDayName(timeStr)}</span>
                        {index === 0 && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-extrabold uppercase rounded">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 font-medium truncate mt-0.5">
                        {meta.description}
                      </div>
                    </div>
                  </div>

                  {/* Right hand values */}
                  <div className="flex items-center gap-6 shrink-0">
                    {/* Precipitation Probability tag */}
                    <div className="hidden sm:flex items-center gap-1 text-xs text-gray-500 font-semibold bg-gray-100/70 px-2 py-1 rounded-md">
                      <Droplet className={`w-3.5 h-3.5 ${rainProb > 40 ? "text-blue-500 fill-blue-500" : "text-gray-400"}`} />
                      <span>{rainProb}%</span>
                    </div>

                    {/* Temperatures High / Low */}
                    <div className="text-right font-mono min-w-[70px]">
                      <span className="text-sm font-bold text-gray-800">{formatTemp(maxTemp)}</span>
                      <span className="text-xs text-gray-400 ml-1.5">{formatTemp(minTemp)}</span>
                    </div>

                    {/* Collapse icon */}
                    <div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded Details Section */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-slate-200/40 grid grid-cols-2 md:grid-cols-4 gap-3.5 text-xs">
                        
                        {/* Detail 1: Date */}
                        <div className="bg-white/80 p-2.5 rounded-xl border border-slate-100">
                          <div className="text-gray-400 uppercase tracking-wide text-[9px] font-bold">Calendar Date</div>
                          <div className="font-semibold text-gray-700 mt-1">{formatFriendlyDate(timeStr)}</div>
                        </div>

                        {/* Detail 2: Sun horizon times */}
                        <div className="bg-white/80 p-2.5 rounded-xl border border-slate-100 flex flex-col justify-between">
                          <div className="text-gray-400 uppercase tracking-wide text-[9px] font-bold">Horizon times</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="flex items-center gap-0.5 text-gray-600 font-semibold">
                              <Sunrise className="w-3 h-3 text-amber-500" /> 
                              {daily.sunrise?.[index] ? daily.sunrise[index].split("T")[1] : "N/A"}
                            </span>
                            <span className="text-gray-300">|</span>
                            <span className="flex items-center gap-0.5 text-gray-600 font-semibold">
                              <Sunset className="w-3 h-3 text-indigo-400" /> 
                              {daily.sunset?.[index] ? daily.sunset[index].split("T")[1] : "N/A"}
                            </span>
                          </div>
                        </div>

                        {/* Detail 3: UV safety info */}
                        <div className="bg-white/80 p-2.5 rounded-xl border border-slate-100">
                          <div className="text-gray-400 uppercase tracking-wide text-[9px] font-bold">Solar UV Index</div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="font-bold text-gray-700">{uvIdx} max</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${uvDetails.color}`}>
                              {uvDetails.rating}
                            </span>
                          </div>
                        </div>

                        {/* Detail 4: Peak Wind */}
                        <div className="bg-white/80 p-2.5 rounded-xl border border-slate-100">
                          <div className="text-gray-400 uppercase tracking-wide text-[9px] font-bold">Max Wind speed</div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Wind className="w-3.5 h-3.5 text-sky-400" />
                            <span className="font-semibold text-gray-700">{maxWind} km/h</span>
                          </div>
                        </div>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
