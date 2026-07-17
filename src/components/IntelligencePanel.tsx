import React, { useState, useEffect, useRef } from "react";
import { WeatherData, GeocodingResult, WeatherRecommendations, ChatMessage } from "../types";
import { 
  Sparkles, 
  Shirt, 
  Flame, 
  Heart, 
  Car, 
  MessageSquare, 
  Send, 
  Loader2, 
  CheckSquare, 
  Square,
  Compass,
  AlertCircle,
  HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface IntelligencePanelProps {
  city: GeocodingResult;
  weatherData: WeatherData;
  recommendations: WeatherRecommendations | null;
  recLoading: boolean;
  recError: string | null;
  onRegenerateRecs: () => void;
}

export default function IntelligencePanel({
  city,
  weatherData,
  recommendations,
  recLoading,
  recError,
  onRegenerateRecs
}: IntelligencePanelProps) {
  const [activeTab, setActiveTab] = useState<"recs" | "chat">("recs");
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Suggested quick prompts for the weather assistant
  const quickPrompts = [
    { text: "Should I mow the lawn or water the garden tomorrow?", label: "Gardening & Lawn" },
    { text: "I have an outdoor wedding this weekend, what is the risk of rain?", label: "Event Planning" },
    { text: "Suggest a 1-day outdoor sports and weekend itinerary.", label: "Weekend Itinerary" },
    { text: "I'm sensitive to pollen and humidity. How is the air safety this week?", label: "Health & Allergy" },
  ];

  // Checklist tracking for recommendations
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const toggleCheckItem = (key: string) => {
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (activeTab === "chat") {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  // Handle send message to AI Weather Assistant
  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputText).trim();
    if (!prompt) return;

    if (!textToSend) setInputText("");
    setChatError(null);

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setChatLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: city.name,
          weatherData: weatherData,
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content }))
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to communicate with AI");
      }

      const data = await response.json();
      
      const assistantMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: data.reply || "I'm sorry, I couldn't synthesize a response.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error("Chat error:", err);
      setChatError(err.message || "Something went wrong while contacting the server.");
    } finally {
      setChatLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setChatError(null);
  };

  return (
    <div className="w-full flex flex-col gap-5" id="intelligence-panel-container">
      {/* Tab controls */}
      <div className="flex bg-slate-100 rounded-2xl p-1 shadow-inner self-start" id="intelligence-tabs">
        <button
          onClick={() => setActiveTab("recs")}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "recs"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Planning Recommendations
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "chat"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Interactive Weather AI
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* TAB 1: RECOMMENDATIONS */}
        {activeTab === "recs" && (
          <motion.div
            key="recs-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-5"
          >
            {/* Loading state */}
            {recLoading && (
              <div className="bg-white/60 backdrop-blur-md rounded-3xl p-12 flex flex-col items-center justify-center border border-gray-200/50 text-center shadow-sm">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                <h3 className="text-base font-bold text-gray-800">Synthesizing AI Intelligence...</h3>
                <p className="text-xs text-gray-400 max-w-sm mt-1.5">
                  Gemini is digesting current barometer, UV indices, and precipitation probabilities to draft bespoke advice.
                </p>
              </div>
            )}

            {/* Error state */}
            {recError && !recLoading && (
              <div className="bg-red-50/50 border border-red-200/60 rounded-3xl p-6 text-center">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-red-800">Intelligence Blocked</h3>
                <p className="text-xs text-red-600 mt-1 max-w-md mx-auto">{recError}</p>
                <button
                  onClick={onRegenerateRecs}
                  className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm"
                >
                  Retry Analysis
                </button>
              </div>
            )}

            {/* Success state - Cards */}
            {!recLoading && !recError && recommendations && (
              <div className="flex flex-col gap-5">
                {/* Fallback Mode Indicator Banner */}
                {recommendations.isFallback && (
                  <div className="bg-amber-50/70 backdrop-blur-md border border-amber-200/50 rounded-2xl p-4 flex gap-3 shadow-sm text-xs text-amber-900 leading-relaxed" id="fallback-notification">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-bold text-amber-950 flex items-center gap-1.5">
                        Automated Rule-Based Mode Active
                      </h4>
                      <p className="mt-1 text-amber-800">
                        The weather analysis is running on local micro-climate algorithms. To unlock advanced, highly personalized conversational planning and fully creative recommendations, you can configure your <strong className="font-bold">GEMINI_API_KEY</strong>:
                      </p>
                      <ol className="list-decimal list-inside mt-1.5 space-y-0.5 text-[11px] text-amber-900 bg-white/40 p-2.5 rounded-xl border border-amber-200/20 font-medium">
                        <li>Click <strong className="font-bold">Settings &gt; Secrets</strong> in the top right menu panel of AI Studio.</li>
                        <li>Add a secret named <strong className="font-serif">GEMINI_API_KEY</strong> with your Google AI Studio API key.</li>
                        <li>The app will automatically switch to fully dynamic cognitive intelligence!</li>
                      </ol>
                    </div>
                  </div>
                )}

                {/* Punchy AI overall summary bubble */}
                <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/15 flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-blue-500 text-white shrink-0 mt-0.5 shadow-sm">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-blue-700">Weather Intelligence Alert</h4>
                    <p className="text-sm font-medium text-gray-700 mt-1 leading-snug">
                      "{recommendations.summary}"
                    </p>
                  </div>
                </div>

                {/* 4-Bento category cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="intelligence-bento">
                  
                  {/* Category 1: Clothing */}
                  <div className="bg-white/60 backdrop-blur-md border border-gray-200/50 rounded-2xl p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-orange-50 text-orange-600 border border-orange-100">
                        <Shirt className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-800">{recommendations.clothing.title}</h3>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      {recommendations.clothing.advice}
                    </p>
                    {recommendations.clothing.items && recommendations.clothing.items.length > 0 && (
                      <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-slate-100">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Suggested Packing/Gear Checklist:</div>
                        {recommendations.clothing.items.map((item, i) => {
                          const itemKey = `clothing-${i}-${item}`;
                          const isChecked = !!checkedItems[itemKey];
                          return (
                            <button
                              key={itemKey}
                              onClick={() => toggleCheckItem(itemKey)}
                              className="flex items-center gap-2 text-left text-xs text-gray-600 hover:text-gray-800 cursor-pointer group"
                            >
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-orange-500 shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-gray-300 group-hover:text-orange-400 shrink-0" />
                              )}
                              <span className={isChecked ? "line-through text-gray-400" : ""}>{item}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Category 2: Activities */}
                  <div className="bg-white/60 backdrop-blur-md border border-gray-200/50 rounded-2xl p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                        <Flame className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-800">{recommendations.activities.title}</h3>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      {recommendations.activities.advice}
                    </p>
                    
                    {/* Do / Don't columns */}
                    <div className="grid grid-cols-2 gap-3 mt-2 pt-2 border-t border-slate-100">
                      <div>
                        <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1.5">✓ High Viability</div>
                        <ul className="flex flex-col gap-1 text-[11px] text-gray-600 list-inside list-disc">
                          {recommendations.activities.doList?.map((d, i) => (
                            <li key={i}>{d}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-1.5">✗ Postpone/Avoid</div>
                        <ul className="flex flex-col gap-1 text-[11px] text-gray-600 list-inside list-disc">
                          {recommendations.activities.dontList?.map((d, i) => (
                            <li key={i}>{d}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Category 3: Health */}
                  <div className="bg-white/60 backdrop-blur-md border border-gray-200/50 rounded-2xl p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                        <Heart className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-800">{recommendations.health.title}</h3>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      {recommendations.health.advice}
                    </p>
                    {recommendations.health.warnings && recommendations.health.warnings.length > 0 && (
                      <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-slate-100">
                        {recommendations.health.warnings.map((warn, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-gray-600 bg-rose-50/40 p-2 rounded-lg border border-rose-100/30">
                            <span className="text-rose-500 font-bold shrink-0">•</span>
                            <span>{warn}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Category 4: Travel */}
                  <div className="bg-white/60 backdrop-blur-md border border-gray-200/50 rounded-2xl p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                        <Car className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-800">{recommendations.travel.title}</h3>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      {recommendations.travel.advice}
                    </p>
                    {recommendations.travel.tips && recommendations.travel.tips.length > 0 && (
                      <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-slate-100">
                        {recommendations.travel.tips.map((tip, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                            <span className="text-blue-500 shrink-0">→</span>
                            <span>{tip}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 2: INTERACTIVE CHATBOT */}
        {activeTab === "chat" && (
          <motion.div
            key="chat-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-4 bg-white/60 backdrop-blur-md border border-gray-200/50 rounded-3xl p-5 shadow-sm min-h-[460px] max-h-[580px]"
            id="weather-chatbot-panel"
          >
            {/* Chat header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-150/60">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <div>
                  <h3 className="text-sm font-bold text-gray-800">{city.name} Weather Assistant</h3>
                  <p className="text-[10px] text-gray-400">
                    {recommendations?.isFallback ? "Rule-Based Mode Active" : "Powered by Gemini • Knows weekly forecast telemetry"}
                  </p>
                </div>
              </div>
              <button
                onClick={clearChat}
                className="text-xs text-blue-500 hover:text-blue-600 hover:underline cursor-pointer font-medium"
              >
                Clear Conversation
              </button>
            </div>

            {/* Scrollable conversation stream */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 min-h-[220px]">
              {messages.length === 0 && (
                <div className="my-auto py-8 text-center flex flex-col items-center justify-center">
                  <div className="p-3 bg-blue-50 rounded-2xl text-blue-500 mb-3 border border-blue-100 shadow-sm">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-700">Ask the Weather Assistant</h4>
                  <p className="text-xs text-gray-400 max-w-xs mt-1 leading-relaxed">
                    Have questions about outdoor plans, wedding safety, packing lists, or garden schedules in {city.name}?
                  </p>

                  {/* Suggestion Bubbles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-5 w-full max-w-md px-2">
                    {quickPrompts.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(prompt.text)}
                        className="p-2.5 rounded-xl border border-gray-250/30 bg-white/70 hover:bg-blue-50/50 hover:border-blue-200/50 transition-all text-left text-xs font-medium text-gray-600 hover:text-blue-600 flex items-start gap-1.5 cursor-pointer shadow-inner"
                      >
                        <HelpCircle className="w-3.5 h-3.5 shrink-0 text-blue-500 mt-0.5" />
                        <span>{prompt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[85%] ${
                    msg.role === "user" ? "self-end items-end" : "self-start items-start"
                  }`}
                >
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-xs font-sans leading-relaxed shadow-sm ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-slate-100 text-gray-800 rounded-bl-none border border-slate-200/50"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="whitespace-pre-line prose max-w-none">
                        {msg.content}
                      </div>
                    ) : (
                      <span>{msg.content}</span>
                    )}
                  </div>
                  <span className="text-[9px] text-gray-450 mt-1 px-1 font-mono">{msg.timestamp}</span>
                </div>
              ))}

              {chatLoading && (
                <div className="self-start flex items-center gap-2 bg-slate-100 rounded-2xl px-4 py-2.5 text-xs text-gray-500 border border-slate-200/50">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                  <span>AI Assistant is writing...</span>
                </div>
              )}

              {chatError && (
                <div className="self-center bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-2 text-xs text-center max-w-sm mt-2">
                  {chatError}
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Message input bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2 pt-2 border-t border-gray-150/60"
            >
              <input
                id="assistant-chat-input"
                type="text"
                className="flex-1 bg-slate-50 border border-gray-200 focus:border-blue-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-gray-800 placeholder-gray-400 font-sans"
                placeholder={`Ask about ${city.name}'s weather plans...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={chatLoading}
              />
              <button
                id="submit-chat-btn"
                type="submit"
                disabled={chatLoading || !inputText.trim()}
                className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl transition-all shadow-sm shrink-0 cursor-pointer flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
