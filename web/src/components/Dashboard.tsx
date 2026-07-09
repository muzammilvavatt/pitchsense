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
      <header className="glass-card p-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-4 z-40 shadow-xl shadow-slate-900/50">
        <div className="flex w-full md:w-auto justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center font-bold text-white shadow-lg">
              {alias.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight text-white">{alias}</h2>
              <p className="text-xs text-emerald-400 font-medium">Verified Pundit</p>
            </div>
          </div>
          {/* Mobile logout button */}
          <button
            onClick={onLogout}
            className="md:hidden text-slate-400 hover:text-red-400 transition-colors p-2 bg-slate-800/50 rounded-full"
            title="Log Out"
          >
            <LogOut size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="w-full md:w-auto flex bg-slate-900/60 p-1 rounded-xl border border-slate-700/50 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveTab("hub")}
            className={`flex items-center justify-center flex-1 md:flex-none gap-2 px-3 md:px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "hub" ? "bg-slate-700 text-white shadow-md shadow-black/20" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <LayoutDashboard size={16} className={activeTab === "hub" ? "text-blue-400" : ""} /> Hub
          </button>
          <button
            onClick={() => setActiveTab("debate")}
            className={`flex items-center justify-center flex-1 md:flex-none gap-2 px-3 md:px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "debate" ? "bg-slate-700 text-white shadow-md shadow-black/20" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <MessageSquare size={16} className={activeTab === "debate" ? "text-emerald-400" : ""} /> Debate
          </button>
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`flex items-center justify-center flex-1 md:flex-none gap-2 px-3 md:px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "leaderboard" ? "bg-slate-700 text-white shadow-md shadow-black/20" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Trophy size={16} className={activeTab === "leaderboard" ? "text-yellow-400" : ""} /> Ranks
          </button>
        </div>

        {/* Desktop logout button */}
        <button
          onClick={onLogout}
          className="hidden md:flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors p-2 rounded-lg"
          title="Log Out"
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
