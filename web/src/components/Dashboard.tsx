"use client";

import { useState } from "react";
import { LogOut, Trophy, MessageSquare, LayoutDashboard } from "lucide-react";
import MatchHub from "./MatchHub";
import DebateFeed from "./DebateFeed";
import Leaderboard from "./Leaderboard";

type Tab = "hub" | "debate" | "leaderboard";

export default function Dashboard({ alias, avatarUrl, onLogout }: { alias: string, avatarUrl?: string | null, onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>("hub");

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="glass-card p-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-4 z-40 shadow-xl shadow-slate-900/50">
        <div className="flex w-full md:w-auto justify-between items-center">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt={alias} className="w-12 h-12 rounded-full object-cover border-2 border-slate-700 shadow-lg" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-400 flex items-center justify-center font-bold text-white shadow-lg text-lg">
                {alias.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="font-bold text-xl leading-tight text-white tracking-wide">{alias}</h2>
            </div>
          </div>
          {/* Mobile logout button */}
          <div className="md:hidden">
            <button onClick={onLogout} className="text-slate-400 hover:text-white p-2">
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="w-full md:w-auto flex bg-slate-900/60 p-1 rounded-xl border border-slate-700/50 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveTab("hub")}
            className={`flex items-center justify-center flex-1 md:flex-none gap-2 px-3 md:px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "hub" ? "bg-slate-800 text-white shadow-md border border-slate-700" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <LayoutDashboard size={16} className={activeTab === "hub" ? "text-blue-400" : ""} /> Hub
          </button>
          <button
            onClick={() => setActiveTab("debate")}
            className={`flex items-center justify-center flex-1 md:flex-none gap-2 px-3 md:px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "debate" ? "bg-slate-800 text-white shadow-md border border-slate-700" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <MessageSquare size={16} className={activeTab === "debate" ? "text-emerald-400" : ""} /> Debate
          </button>
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`flex items-center justify-center flex-1 md:flex-none gap-2 px-3 md:px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "leaderboard" ? "bg-slate-800 text-white shadow-md border border-slate-700" : "text-slate-400 hover:text-slate-200"
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
        {activeTab === "hub" && <MatchHub alias={alias} avatarUrl={avatarUrl} />}
        {activeTab === "debate" && <DebateFeed />}
        {activeTab === "leaderboard" && <Leaderboard />}
      </div>
    </div>
  );
}
