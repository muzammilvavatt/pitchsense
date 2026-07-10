"use client";

import { useState, useEffect } from "react";
import { LogOut, Trophy, MessageSquare, LayoutDashboard, User } from "lucide-react";
import MatchHub from "./MatchHub";
import DebateFeed from "./DebateFeed";
import Leaderboard from "./Leaderboard";
import Link from "next/link";

type Tab = "hub" | "debate" | "leaderboard" | "profile";

export default function Dashboard({ alias, avatarUrl, onLogout, isGuest, onLoginClick }: { alias: string, avatarUrl?: string | null, onLogout: () => void, isGuest?: boolean, onLoginClick?: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>("hub");
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);

  useEffect(() => {
    // When returning to dashboard from profile, check if avatar changed
    const storedAvatar = localStorage.getItem("pitchsense_avatar_url");
    setLocalAvatar(storedAvatar || avatarUrl || null);
  }, [avatarUrl]);

  const navItems = [
    { id: "hub", label: "Hub", icon: LayoutDashboard, color: "text-blue-400" },
    { id: "debate", label: "Debate", icon: MessageSquare, color: "text-emerald-400" },
    { id: "leaderboard", label: "Ranks", icon: Trophy, color: "text-yellow-400" },
  ];

  return (
    <div className="min-h-screen text-slate-200">
      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-40 premium-glass p-4 flex justify-between items-center">
        <h1 className="text-2xl font-black italic tracking-tighter bg-gradient-to-br from-emerald-400 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">PitchSense</h1>
        {isGuest ? (
          <button onClick={onLoginClick} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-md transition-colors">
            Sign In
          </button>
        ) : (
          <Link href={`/profile/${alias}`}>
            {localAvatar ? (
              <img src={localAvatar} alt={alias} className="w-8 h-8 rounded-full object-cover border-2 border-slate-700 bg-white" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-green-800 flex items-center justify-center font-bold text-white text-xs border-2 border-slate-700">⚽</div>
            )}
          </Link>
        )}
      </header>

      <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row gap-6 p-4 md:p-6 md:h-screen md:overflow-hidden">
        
        {/* Left Sidebar (Desktop Only) */}
        <aside className="hidden md:flex flex-col w-64 shrink-0 space-y-6">
          <div className="premium-glass rounded-2xl p-6">
            {isGuest ? (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-500 shadow-lg border-2 border-slate-700 mb-3">
                  <User size={28} />
                </div>
                <h2 className="font-bold text-xl text-white tracking-wide">Guest</h2>
                <button onClick={onLoginClick} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg transition-colors">
                  Sign Up to Play
                </button>
              </div>
            ) : (
              <Link href={`/profile/${alias}`} className="group block text-center">
                {localAvatar ? (
                  <img src={localAvatar} alt={alias} className="w-20 h-20 mx-auto rounded-full object-cover border-4 border-slate-800 shadow-lg group-hover:border-blue-500 transition-colors bg-white mb-3" />
                ) : (
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-600 to-green-800 flex items-center justify-center font-bold text-white shadow-lg text-3xl border-4 border-slate-800 mb-3">⚽</div>
                )}
                <h2 className="font-bold text-xl leading-tight text-white tracking-wide group-hover:text-blue-400 transition-colors">{alias}</h2>
                <p className="text-xs text-slate-400 group-hover:text-blue-400 mt-1 transition-colors">View Profile</p>
              </Link>
            )}
          </div>

          <nav className="premium-glass rounded-2xl overflow-hidden flex flex-col p-3 gap-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as Tab)}
                className={`flex items-center gap-4 px-5 py-3.5 rounded-xl text-[15px] font-semibold transition-all ${
                  activeTab === item.id ? "bg-slate-800 text-white shadow-sm border border-slate-700/50" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 border border-transparent"
                }`}
              >
                <item.icon size={20} className={activeTab === item.id ? item.color : ""} /> {item.label}
              </button>
            ))}
          </nav>
          
          <div className="mt-auto">
            {!isGuest && (
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 font-bold transition-colors p-3 rounded-lg border border-transparent hover:border-red-500/20"
              >
                <LogOut size={18} /> Sign Out
              </button>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto hide-scrollbar pb-24 md:pb-0 relative">
          <div className="animate-fade-in w-full max-w-2xl mx-auto">
            {activeTab === "hub" && <MatchHub alias={alias} avatarUrl={localAvatar} isGuest={isGuest} onLoginClick={onLoginClick} />}
            {activeTab === "debate" && <DebateFeed currentUserAlias={alias} currentUserAvatar={localAvatar} isGuest={isGuest} onLoginClick={onLoginClick} />}
            {activeTab === "leaderboard" && <Leaderboard />}
          </div>
        </main>

        {/* Right Sidebar (Desktop Only) */}
        <aside className="hidden lg:flex flex-col w-80 shrink-0 space-y-6 overflow-y-auto hide-scrollbar pb-6">
          <Leaderboard compact={true} />
          
          {/* Add a quick pitch for PitchSense */}
          <div className="premium-glass rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <h3 className="font-black text-lg mb-2 text-white flex items-center gap-2"><Trophy size={18} className="text-emerald-400" /> About PitchSense</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Predict scores, debate with AI analysts, and climb the ranks. Only matches kicking off within 24 hours appear in the Hub.
            </p>
          </div>
        </aside>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 premium-glass flex justify-around p-2 z-50 rounded-t-3xl border-b-0">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as Tab)}
            className={`flex flex-col items-center justify-center w-16 py-1 rounded-xl transition-all ${
              activeTab === item.id ? "text-white" : "text-slate-500"
            }`}
          >
            <div className={`p-1.5 rounded-full mb-1 transition-all ${activeTab === item.id ? 'bg-slate-800 scale-110' : ''}`}>
              <item.icon size={22} className={activeTab === item.id ? item.color : ""} />
            </div>
            <span className={`text-[10px] font-bold ${activeTab === item.id ? "opacity-100" : "opacity-0 h-0 overflow-hidden"} transition-all`}>{item.label}</span>
          </button>
        ))}
        {!isGuest && (
          <Link href={`/profile/${alias}`} className={`flex flex-col items-center justify-center w-16 py-1 rounded-xl transition-all text-slate-500`}>
            <div className={`p-1 rounded-full mb-1 border-2 transition-all border-transparent`}>
               {localAvatar ? (
                  <img src={localAvatar} alt={alias} className="w-[22px] h-[22px] rounded-full object-cover bg-white" />
                ) : (
                  <div className="w-[22px] h-[22px] rounded-full bg-gradient-to-br from-emerald-600 to-green-800 flex items-center justify-center text-[10px] text-white">⚽</div>
                )}
            </div>
          </Link>
        )}
      </nav>
    </div>
  );
}
