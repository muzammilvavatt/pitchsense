"use client";

import { useState, useEffect } from "react";
import { LogOut, Trophy, MessageSquare, LayoutDashboard, Palette } from "lucide-react";
import MatchHub from "./MatchHub";
import DebateFeed from "./DebateFeed";
import Leaderboard from "./Leaderboard";
import Link from "next/link";

type Tab = "hub" | "debate" | "leaderboard";

export default function Dashboard({ alias, avatarUrl, onLogout, isGuest, onLoginClick }: { alias: string, avatarUrl?: string | null, onLogout: () => void, isGuest?: boolean, onLoginClick?: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>("hub");
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);

  useEffect(() => {
    // When returning to dashboard from profile, check if avatar changed
    const storedAvatar = localStorage.getItem("pitchsense_avatar_url");
    setLocalAvatar(storedAvatar || avatarUrl || null);
  }, [avatarUrl]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="glass-card p-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-4 z-40 shadow-xl shadow-slate-900/50">
        <div className="flex w-full md:w-auto justify-between items-center">
          {isGuest ? (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 shadow-lg border-2 border-slate-700">
                <LogOut size={20} />
              </div>
              <div>
                <h2 className="font-bold text-xl leading-tight text-white tracking-wide">Guest</h2>
                <button onClick={onLoginClick} className="text-xs text-emerald-400 hover:underline mt-0.5 font-medium">Sign in to join the action!</button>
              </div>
            </div>
          ) : (
            <Link href={`/profile/${alias}`} className="flex items-center gap-3 group">
              {localAvatar ? (
                <img src={localAvatar} alt={alias} className="w-12 h-12 rounded-full object-cover border-2 border-slate-700 shadow-lg group-hover:border-blue-400 transition-colors bg-white" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-600 to-green-800 flex items-center justify-center font-bold text-white shadow-lg text-xl border-2 border-slate-700">
                  ⚽
                </div>
              )}
              <div>
                <h2 className="font-bold text-xl leading-tight text-white tracking-wide group-hover:text-blue-400 transition-colors">{alias}</h2>
                <p className="text-xs text-blue-400 group-hover:underline mt-0.5">View Profile</p>
              </div>
            </Link>
          )}
          {/* Mobile actions (Theme Toggle + Auth) */}
          <div className="md:hidden flex items-center gap-2">
            
            {isGuest ? (
              <button onClick={onLoginClick} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-md transition-colors">
                Sign In
              </button>
            ) : (
              <button onClick={onLogout} className="text-slate-400 hover:text-white p-2">
                <LogOut size={20} />
              </button>
            )}
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

        {/* Desktop actions (Auth) */}
        <div className="hidden md:flex items-center gap-2">
          
          {isGuest ? (
            <button
              onClick={onLoginClick}
              className="flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-lg shadow-md transition-all hover:scale-105"
            >
              Sign Up to Play
            </button>
          ) : (
            <button
              onClick={onLogout}
              className="flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors p-2 rounded-lg"
              title="Log Out"
            >
              <LogOut size={20} />
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="animate-fade-in">
        {activeTab === "hub" && <MatchHub alias={alias} avatarUrl={localAvatar} isGuest={isGuest} onLoginClick={onLoginClick} />}
        {activeTab === "debate" && <DebateFeed currentUserAlias={alias} currentUserAvatar={localAvatar} isGuest={isGuest} onLoginClick={onLoginClick} />}
        {activeTab === "leaderboard" && <Leaderboard />}
      </div>
    </div>
  );
}
