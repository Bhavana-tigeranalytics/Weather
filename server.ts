import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded Gemini AI instance
let aiClient: GoogleGenAI | null = null;

function getGeminiAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("GEMINI_API_KEY is not configured in secrets. Please set it in Settings > Secrets.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// 1. Geocoding Proxy API: Search cities by name
app.get("/api/search", async (req, res) => {
  const { q } = req.query;
  if (!q || typeof q !== "string") {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=10&language=en&format=json`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Geocoding API responded with status ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    console.error("Geocoding proxy error:", err);
    res.status(500).json({ error: err.message || "Failed to search cities" });
  }
});

// 2. Weather Forecast Proxy API: Fetch detailed forecast
app.get("/api/weather", async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: "Parameters 'lat' and 'lon' are required" });
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,rain_sum,showers_sum,snowfall_sum,precipitation_hours,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant&timezone=auto`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Forecast API responded with status ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    console.error("Forecast proxy error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch weather data" });
  }
});

// 3. AI Weather Intelligence Recommendations Endpoint (using Structured JSON response)
app.post("/api/recommendations", async (req, res) => {
  const { city, weatherData } = req.body;
  if (!city || !weatherData) {
    return res.status(400).json({ error: "Fields 'city' and 'weatherData' are required" });
  }

  // Check if GEMINI_API_KEY is missing or dummy
  const apiKey = process.env.GEMINI_API_KEY;
  const isKeyMissing = !apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "";

  if (isKeyMissing) {
    // Generate fallback algorithmic recommendations
    const currentTemp = weatherData.current?.temperature_2m ?? 20;
    const apparentTemp = weatherData.current?.apparent_temperature ?? 20;
    const weatherCode = weatherData.current?.weather_code ?? 0;
    const humidity = weatherData.current?.relative_humidity_2m ?? 50;
    const windSpeed = weatherData.current?.wind_speed_10m ?? 10;
    const rainProb = weatherData.daily?.precipitation_probability_max?.[0] ?? 0;
    const hasPrecipitation = weatherCode >= 51 || rainProb > 40;

    let clothingTitle = "Clothing & Protective Gear";
    let clothingAdvice = "The ambient thermal conditions are highly comfortable. Standard casual apparel, layered sportswear, or light breathable fabrics will keep you comfortable throughout the day.";
    let clothingItems = ["High UV Sunglasses", "Light breathable cotton shirts", "All-day walking trainers"];

    if (currentTemp < 10) {
      clothingAdvice = "The current conditions are quite cold. It is critical to bundle up in layers with proper thermal insulation, protecting your extremities and hands.";
      clothingItems = ["Heavy insulated winter coat", "Warm wool beanie or cap", "Insulated gloves or mittens", "Fleece or thermal base layers"];
    } else if (currentTemp < 18) {
      clothingAdvice = "Cool atmospheric temperatures are dominant. A light fleece sweater, knit cardigan, or softshell jacket is perfect for general outdoor movement.";
      clothingItems = ["Light utility sweater or jacket", "Full-length denims or trousers", "Comfortable close-toed shoes"];
    } else if (currentTemp > 28) {
      clothingAdvice = "Warm to hot thermal indexes are active. Keep apparel exceptionally light, loose-fitting, and light-colored to facilitate proper perspiration cooling.";
      clothingItems = ["Wide-brimmed protective sun hat", "Generous broad-spectrum SPF 30+ sunscreen", "Polarized UV sunglasses", "Linen shorts or airy wear"];
    }

    if (hasPrecipitation) {
      clothingAdvice += " Damp conditions are expected; wear a waterproof outer shell or carry wind-resistant gear.";
      clothingItems.push("Windproof travel umbrella", "Water-resistant windbreaker");
    }

    // Activities
    let activitiesTitle = "Outdoor & Sports Activities";
    let activitiesAdvice = "Atmospheric stability index is high. Excellent day for outdoor sports, scenic park walking, or taking weekend road itineraries.";
    let doList = ["Scenic trail jogging & walking", "Casual park picnics", "Outdoor historical sightseeing"];
    let dontList = ["Extended indoor-only plans", "Postponing travel plans"];

    if (hasPrecipitation) {
      activitiesAdvice = "Due to incoming moisture or drizzle, outdoor surfaces may be slippery. We recommend shifting physical plans to covered areas.";
      doList = ["Museum and art gallery touring", "Cozy library or local coffee shop reading", "Indoor climbing gym sessions"];
      dontList = ["Lawn mowing & gardening", "Trail mountain biking", "Outdoor wedding ceremonies or events"];
    } else if (currentTemp > 32) {
      activitiesAdvice = "Significant solar thermal heating is active. Restrict intense aerobic strain during midday peak solar exposure.";
      doList = ["Shaded early-morning walks", "Indoor climate-controlled swimming", "Air-conditioned entertainment venues"];
      dontList = ["Midday road-cycling or sprints", "Long high-altitude hikes without shade", "Heavy heavy lifting outdoors"];
    } else if (currentTemp < 5) {
      activitiesAdvice = "Freezing or low temperatures are present. Focus on warm-up routines and keep stationary exposure minimal.";
      doList = ["Brisk paced walk (well-layered)", "Cozy local indoor bistro visits", "Ice skating or snow activities"];
      dontList = ["Stationary park sitting", "Extended outdoor photography", "Sailing or coastal marine trips"];
    }

    // Health
    let healthTitle = "Health & Well-being Alerts";
    let healthAdvice = "No major biological or respiratory warnings are active. General outdoor exposure is highly safe.";
    let warnings = [
      "Keep standard hydration levels active.",
      "Apply light SPF protection if spending over 45 minutes in direct sunlight."
    ];

    if (currentTemp > 28) {
      healthAdvice = "Heat fatigue indices are active. Keep cellular hydration high and watch for body thermal regulation signals.";
      warnings = [
        "Ingest 1-2 extra cups of fresh mineral water per hour.",
        "Take regular physical breaks in shaded or air-conditioned spots.",
        "Shield skin from peak UV radiation burns."
      ];
    } else if (currentTemp < 8) {
      healthAdvice = "Cold air can trigger bronchial constriction and stiffen joint cartilage.";
      warnings = [
        "Warm up muscles with gentle stretches before leaving home.",
        "Cover neck and chest with a scarf to pre-warm inhaled air.",
        "Keep fingers and toes insulated to maintain comfortable circulation."
      ];
    }

    // Travel
    let travelTitle = "Transit & Travel Planning";
    let travelAdvice = "Excellent atmospheric visibility and dry tarmac indices. Driving friction is highly optimal.";
    let tips = [
      "No major flight or highway disruptions are expected due to weather.",
      "Check tire air pressures for standard city cruising."
    ];

    if (hasPrecipitation) {
      travelAdvice = "Wet roads compromise kinetic braking friction. Drive defensively, double your braking gaps, and look out for standing pools.";
      tips = [
        "Keep windshield wipers fully functional and select defogger modes.",
        "Reduce speed to prevent hydroplaning on cloverleaf exits.",
        "Verify light-rail or bus schedules for minor rain-induced delays."
      ];
    } else if (windSpeed > 30) {
      travelAdvice = "Sustained high-velocity crosswinds are active. Drive high-profile vehicles with extra vigilance.";
      tips = [
        "Maintain dual-hand control on the steering wheel.",
        "Give wide berths to semi-trucks on elevated highway overpasses."
      ];
    }

    let summary = `Enjoy a pleasant, dry day in ${city} with temperatures peaking near ${Math.round(currentTemp)}°C. Perfect for local exploration.`;
    if (hasPrecipitation) {
      summary = `Expect wet or damp periods in ${city} today. Carrying a travel umbrella and planning cozy indoor visits is highly recommended.`;
    } else if (currentTemp > 30) {
      summary = `Sun-drenched, hot weather locks over ${city}. Seek shade, stay fully hydrated, and wear high-grade solar protection.`;
    } else if (currentTemp < 8) {
      summary = `Chilly climate anchors over ${city}. Bundle up in warm winter wear and enjoy local indoor warm spots.`;
    }

    return res.json({
      clothing: { title: clothingTitle, advice: clothingAdvice, items: clothingItems },
      activities: { title: activitiesTitle, advice: activitiesAdvice, doList, dontList },
      health: { title: healthTitle, advice: healthAdvice, warnings },
      travel: { title: travelTitle, advice: travelAdvice, tips },
      summary: summary,
      isFallback: true
    });
  }

  try {
    const ai = getGeminiAI();
    const prompt = `
Analyze the following weather data for the city of "${city}" and provide extremely practical, smart, and hyper-personalized planning recommendations.

Current Weather:
- Temperature: ${weatherData.current?.temperature_2m}°C
- Apparent Temperature: ${weatherData.current?.apparent_temperature}°C
- Humidity: ${weatherData.current?.relative_humidity_2m}%
- Weather Code: ${weatherData.current?.weather_code}
- Wind Speed: ${weatherData.current?.wind_speed_10m} km/h
- Cloud Cover: ${weatherData.current?.cloud_cover}%

7-Day Forecast summaries:
- Max Temperatures: ${weatherData.daily?.temperature_2m_max?.join(", ")} °C
- Min Temperatures: ${weatherData.daily?.temperature_2m_min?.join(", ")} °C
- Rain/Precipitation probability max: ${weatherData.daily?.precipitation_probability_max?.join(", ")}%
- UV Index max: ${weatherData.daily?.uv_index_max?.join(", ")}

Generate specific planning recommendations following the requested response schema exactly. Be objective, helpful, precise, and distinct in recommendations.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an advanced AI Weather Intelligence Engine. Synthesize the provided current weather and 7-day forecast data into actionable clothing, activities, health, and commute/travel insights. Use friendly, clean, objective tone.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            clothing: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Card title (e.g., 'Clothing & Protective Gear')" },
                advice: { type: Type.STRING, description: "Main tactical recommendation paragraph" },
                items: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-4 direct bullet points of specific garments or objects (e.g. sunscreen, umbrella, windbreaker)" }
              },
              required: ["title", "advice", "items"]
            },
            activities: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Card title (e.g., 'Outdoor & Sports Activities')" },
                advice: { type: Type.STRING, description: "Main activity viability suggestion" },
                doList: { type: Type.ARRAY, items: { type: Type.STRING }, description: "2-3 highly optimal activities based on weather" },
                dontList: { type: Type.ARRAY, items: { type: Type.STRING }, description: "2-3 outdoor activities to postpone/avoid" }
              },
              required: ["title", "advice", "doList", "dontList"]
            },
            health: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Card title (e.g., 'Health & Well-being Alerts')" },
                advice: { type: Type.STRING, description: "Overall wellness assessment" },
                warnings: { type: Type.ARRAY, items: { type: Type.STRING }, description: "2-3 health notes (e.g., hydration levels, pollen/allergen, joint comfort, heat/cold warnings)" }
              },
              required: ["title", "advice", "warnings"]
            },
            travel: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Card title (e.g., 'Transit & Travel Planning')" },
                advice: { type: Type.STRING, description: "Commuting and driving conditions outlook" },
                tips: { type: Type.ARRAY, items: { type: Type.STRING }, description: "2-3 practical tips for commuting or road trips during this weather" }
              },
              required: ["title", "advice", "tips"]
            },
            summary: {
              type: Type.STRING,
              description: "A short, punchy summary statement about the overall intelligence forecast (e.g. 'Excellent day for outdoor exploration with light protection, but expect wet conditions starting Thursday.')"
            }
          },
          required: ["clothing", "activities", "health", "travel", "summary"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty recommendation response from Gemini");
    }
    const parsed = JSON.parse(text);
    parsed.isFallback = false;
    res.json(parsed);
  } catch (err: any) {
    console.error("Recommendations API error:", err);
    res.status(500).json({ error: err.message || "Failed to generate recommendations" });
  }
});

// 4. Conversational Weather AI Chat Endpoint
app.post("/api/chat", async (req, res) => {
  const { city, weatherData, messages } = req.body;
  if (!city || !weatherData || !messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Fields 'city', 'weatherData', and 'messages' array are required" });
  }

  // Check if GEMINI_API_KEY is missing or dummy
  const apiKey = process.env.GEMINI_API_KEY;
  const isKeyMissing = !apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "";

  if (isKeyMissing) {
    const lastUserMessage = messages[messages.length - 1]?.content?.toLowerCase() || "";
    let reply = "";

    if (lastUserMessage.includes("rain") || lastUserMessage.includes("wet") || lastUserMessage.includes("precipitation") || lastUserMessage.includes("shower") || lastUserMessage.includes("umbrella")) {
      const prob = weatherData.daily?.precipitation_probability_max?.[0] ?? 0;
      reply = `**Precipitation Outlook for ${city}**:\n\nThe current satellite weather index reports a peak rain probability of **${prob}%** for today. if this exceeds 40%, we highly advise carrying a compact windbreaker or umbrella and looking out for minor street puddles.\n\n*To unlock fully responsive natural-language AI interactions and complex event planning algorithms, configure your real \`GEMINI_API_KEY\` inside the Settings > Secrets panel on the top right!*`;
    } else if (lastUserMessage.includes("wear") || lastUserMessage.includes("cloth") || lastUserMessage.includes("jacket") || lastUserMessage.includes("garment") || lastUserMessage.includes("shirt")) {
      const temp = weatherData.current?.temperature_2m ?? 20;
      reply = `**Apparel Recommendations for ${city}**:\n\nWith a temperature reading of **${temp}°C**, we suggest wearing comfortable, airy fabrics. If it feels cooler or gets below 15°C tonight, layering on a light knit sweater, denim outer shell, or soft windbreaker is highly recommended.\n\n*To unlock fully responsive natural-language AI interactions and complex event planning algorithms, configure your real \`GEMINI_API_KEY\` inside the Settings > Secrets panel on the top right!*`;
    } else if (lastUserMessage.includes("outdoor") || lastUserMessage.includes("activity") || lastUserMessage.includes("sport") || lastUserMessage.includes("wedding") || lastUserMessage.includes("jog") || lastUserMessage.includes("garden")) {
      const cloud = weatherData.current?.cloud_cover ?? 50;
      const wind = weatherData.current?.wind_speed_10m ?? 10;
      reply = `**Outdoor Suitability Index for ${city}**:\n\nLooking at the telemetry (Cloud Cover: **${cloud}%**, Wind Speed: **${wind} km/h**), conditions are highly moderate. If you're doing major gardening or event hosting, keep an eye on immediate hourly wind gusts. For cardio and jogs, it is currently very comfortable!\n\n*To unlock fully responsive natural-language AI interactions and complex event planning algorithms, configure your real \`GEMINI_API_KEY\` inside the Settings > Secrets panel on the top right!*`;
    } else if (lastUserMessage.includes("hello") || lastUserMessage.includes("hi") || lastUserMessage.includes("hey") || lastUserMessage.includes("who are you")) {
      reply = `Hello! I am the **${city} Weather Intelligence Assistant**.\n\nI can help you review current atmospheric indicators, packing guides, sport viability, and travel safety tips for **${city}** using rule-based metrics.\n\n*To unlock fully responsive natural-language AI interactions and complex event planning algorithms, configure your real \`GEMINI_API_KEY\` inside the Settings > Secrets panel on the top right!*`;
    } else {
      reply = `Currently in **${city}**, the telemetry indicates **${weatherData.current?.temperature_2m}°C** (feels like **${weatherData.current?.apparent_temperature}°C**) with wind speeds of **${weatherData.current?.wind_speed_10m} km/h** and **${weatherData.current?.relative_humidity_2m}%** relative humidity.\n\nIf you have questions about packing lists, specific sports viability, or travel tips for this exact forecast, feel free to ask!\n\n*Note: The Weather Assistant is running in Rule-Based Fallback Mode because the \`GEMINI_API_KEY\` secret is unconfigured. Set it up in Settings > Secrets to activate conversational Gemini intelligence.*`;
    }

    return res.json({ reply });
  }

  try {
    const ai = getGeminiAI();

    // Limit chat context to last 10 messages to save tokens
    const recentMessages = messages.slice(-10);

    const contextPrompt = `
You are a highly capable Weather Intelligence Chat Assistant. You have access to real-time weather analytics and 7-day forecasting for "${city}".

WeatherData Context:
- Current Temperature: ${weatherData.current?.temperature_2m}°C (feels like ${weatherData.current?.apparent_temperature}°C)
- Humidity: ${weatherData.current?.relative_humidity_2m}%
- Weather Code: ${weatherData.current?.weather_code}
- Wind Speed: ${weatherData.current?.wind_speed_10m} km/h
- Weekly Max Temps: ${weatherData.daily?.temperature_2m_max?.join(", ")} °C
- Weekly Min Temps: ${weatherData.daily?.temperature_2m_min?.join(", ")} °C
- Precipitation Probability Max: ${weatherData.daily?.precipitation_probability_max?.join(", ")}%
- UV Index Max: ${weatherData.daily?.uv_index_max?.join(", ")}

Your goal is to answer the user's questions about weather-related concerns, planning events (like weddings, jogs, gardening, travel), clothing choices, or safety alerts for this city.
Provide highly specific answers using the exact weather data details above rather than general statements.
Keep your answer clear, friendly, and concise (under 2-3 paragraphs). Use markdown formatting for readability.
`;

    // Map frontend messages format to standard Gemini parts/contents
    const contents = recentMessages.map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: contextPrompt,
      }
    });

    const reply = response.text;
    res.json({ reply });
  } catch (err: any) {
    console.error("Chat API error:", err);
    res.status(500).json({ error: err.message || "Failed to communicate with Weather AI assistant" });
  }
});

// Serving compiled static production builds or mounting Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Weather Intelligence server running on port ${PORT}`);
  });
}

startServer();
