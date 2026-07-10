"use client";

import { useState, useEffect } from "react";
import { LogOut, Trophy, MessageSquare, LayoutDashboard, User, Zap, ChevronRight } from "lucide-react";
import MatchHub from "./MatchHub";
import DebateFeed from "./DebateFeed";
import Leaderboard from "./Leaderboard";
import Link from "next/link";

type Tab = "hub" | "debate" | "leaderboard" | "profile";

export default function Dashboard({ alias, avatarUrl, onLogout, isGuest, onLoginClick }: { alias: string, avatarUrl?: string | null, onLogout: () => void, isGuest?: boolean, onLoginClick?: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>("hub");
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);

  useEffect(() => {
    const storedAvatar = localStorage.getItem("pitchsense_avatar_url");
    setLocalAvatar(storedAvatar || avatarUrl || null);
  }, [avatarUrl]);

  const navItems = [
    { id: "hub", label: "Match Hub", icon: LayoutDashboard, desc: "Live fixtures" },
    { id: "debate", label: "Debates", icon: MessageSquare, desc: "Community picks" },
    { id: "leaderboard", label: "Rankings", icon: Trophy, desc: "Top pundits" },
  ];

  return (
    <div className="flex min-h-[calc(100vh-73px)] text-[var(--text-primary)]">

      {/* ── DESKTOP LEFT SIDEBAR ── */}
      <aside className="hidden md:flex flex-col w-72 shrink-0 sidebar-glass sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto">

        {/* User Profile Block */}
        <div className="p-6 border-b border-[var(--border-subtle)]">
          {isGuest ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-medium)] flex items-center justify-center">
                  <User size={20} className="text-[var(--text-muted)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Guest</p>
                  <p className="text-xs text-[var(--text-muted)]">Not signed in</p>
                </div>
              </div>
              <button
                onClick={onLoginClick}
                className="w-full btn-lime py-2.5 rounded-2xl text-sm"
              >
                Sign Up to Play →
              </button>
            </div>
          ) : (
            <Link href={`/profile/${alias}`} className="group flex items-center gap-3">
              {localAvatar ? (
                <img src={localAvatar} alt={alias} className="w-12 h-12 rounded-2xl object-cover border-2 border-[var(--border-lime)] group-hover:border-[#AEFC00] transition-colors bg-white" />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#AEFC00]/30 to-[#3B82F6]/20 flex items-center justify-center text-2xl border-2 border-[var(--border-lime)] group-hover:border-[#AEFC00] transition-colors">⚽</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate group-hover:text-[#AEFC00] transition-colors">{alias}</p>
                <p className="text-xs text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors flex items-center gap-1">View Profile <ChevronRight size={10} /></p>
              </div>
            </Link>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] px-3 mb-3">Navigation</p>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                activeTab === item.id
                  ? "bg-[#AEFC00] text-black shadow-lg"
                  : "text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-card-hover)]"
              }`}
            >
              <item.icon size={18} className={activeTab === item.id ? "text-black" : ""} />
              <div className="text-left flex-1">
                <div className="leading-tight">{item.label}</div>
                <div className={`text-[10px] font-normal ${activeTab === item.id ? "text-black/60" : "text-[var(--text-muted)]"}`}>{item.desc}</div>
              </div>
              {activeTab === item.id && <div className="w-1.5 h-1.5 rounded-full bg-black/40"></div>}
            </button>
          ))}
        </nav>

        {/* System Info + Logout */}
        <div className="p-4 border-t border-[var(--border-subtle)] space-y-3">
          <div className="bento-card rounded-2xl p-4 flex items-start gap-3">
            <Zap size={16} className="text-[#AEFC00] mt-0.5 shrink-0" />
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              Only matches kicking off within <span className="text-white font-semibold">24 hours</span> appear in the Hub.
            </p>
          </div>
          {!isGuest && (
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 text-[var(--text-muted)] hover:text-red-400 font-medium text-sm transition-colors py-2 rounded-xl hover:bg-red-500/10"
            >
              <LogOut size={15} /> Sign Out
            </button>
          )}
        </div>
      </aside>

      {/* ── MOBILE HEADER ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 sidebar-glass border-b border-[var(--border-subtle)]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#AEFC00] flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#050505" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16l-4-3 1.5-5h5L16 13z" />
                <path d="M8 13l-6 2" /><path d="M16 13l6 2" />
              </svg>
            </div>
            <span className="text-base font-bold text-white">PitchSense</span>
            <span className="lime-badge text-[9px]">BETA</span>
          </div>
          {isGuest ? (
            <button onClick={onLoginClick} className="btn-lime text-xs px-3 py-1.5 rounded-xl">Sign In</button>
          ) : (
            <Link href={`/profile/${alias}`}>
              {localAvatar ? (
                <img src={localAvatar} alt={alias} className="w-8 h-8 rounded-xl object-cover border-2 border-[var(--border-lime)] bg-white" />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#AEFC00]/30 to-[#3B82F6]/20 flex items-center justify-center text-base border-2 border-[var(--border-lime)]">⚽</div>
              )}
            </Link>
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 overflow-y-auto hide-scrollbar pb-20 md:pb-0 pt-[60px] md:pt-0">
        <div className="animate-fade-up max-w-3xl mx-auto p-4 md:p-8">
          {activeTab === "hub" && <MatchHub alias={alias} avatarUrl={localAvatar} isGuest={isGuest} onLoginClick={onLoginClick} />}
          {activeTab === "debate" && <DebateFeed currentUserAlias={alias} currentUserAvatar={localAvatar} isGuest={isGuest} onLoginClick={onLoginClick} />}
          {activeTab === "leaderboard" && <Leaderboard />}
        </div>
      </main>

      {/* ── DESKTOP RIGHT SIDEBAR ── */}
      <aside className="hidden lg:flex flex-col w-80 shrink-0 sidebar-glass sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto p-5 space-y-5 border-l border-[var(--border-subtle)]">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-4">Top Pundits</p>
          <Leaderboard compact={true} />
        </div>
      </aside>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 sidebar-glass border-t border-[var(--border-subtle)]">
        <div className="flex justify-around items-center px-2 py-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all ${
                activeTab === item.id
                  ? "text-black bg-[#AEFC00]"
                  : "text-[var(--text-muted)] hover:text-white"
              }`}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-bold">{item.label}</span>
            </button>
          ))}
          {!isGuest && (
            <Link
              href={`/profile/${alias}`}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-2xl text-[var(--text-muted)] hover:text-white transition-all"
            >
              {localAvatar ? (
                <img src={localAvatar} alt={alias} className="w-6 h-6 rounded-lg object-cover" />
              ) : (
                <User size={20} />
              )}
              <span className="text-[10px] font-bold">Me</span>
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
