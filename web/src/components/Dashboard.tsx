"use client";

import { useState } from "react";
import { LogOut, Trophy, MessageSquare, LayoutDashboard } from "lucide-react";
import MatchHub from "./MatchHub";
import DebateFeed from "./DebateFeed";
import Leaderboard from "./Leaderboard";

type Tab = "hub" | "debate" | "leaderboard";

export default function Dashboard({ alias, onLogout }: { alias: string, onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>("hub");

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="glass-card p-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center font-bold text-white">
            {alias.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-bold text-lg leading-tight">{alias}</h2>
            <p className="text-xs text-slate-400">Verified User</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-800/50 p-1 rounded-lg border border-slate-700">
          <button
            onClick={() => setActiveTab("hub")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "hub" ? "bg-slate-700 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            <LayoutDashboard size={16} /> Match Hub
          </button>
          <button
            onClick={() => setActiveTab("debate")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "debate" ? "bg-slate-700 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            <MessageSquare size={16} /> Live Debate
          </button>
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "leaderboard" ? "bg-slate-700 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            <Trophy size={16} /> Leaderboard
          </button>
        </div>

        <button
          onClick={onLogout}
          className="text-slate-400 hover:text-red-400 transition-colors p-2"
          title="Change Alias"
        >
          <LogOut size={20} />
        </button>
      </header>

      {/* Main Content Area */}
      <div className="animate-fade-in">
        {activeTab === "hub" && <MatchHub alias={alias} />}
        {activeTab === "debate" && <DebateFeed />}
        {activeTab === "leaderboard" && <Leaderboard />}
      </div>
    </div>
  );
}
