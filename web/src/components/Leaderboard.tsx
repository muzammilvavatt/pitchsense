"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Trophy, Target, Heart, Brain, Crosshair } from "lucide-react";
import Link from "next/link";
import { getPrestigeBadge, PrestigeBadge } from "@/lib/badges";

interface LeaderboardRow {
  alias: string;
  avatar_url?: string;
  total_score: number;
  correct_predictions: number;
  mastermind_predictions: number;
  sniper_predictions: number;
  total_likes: number;
}

export default function Leaderboard({ compact = false }: { compact?: boolean }) {
  const [leaders, setLeaders] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userBadges, setUserBadges] = useState<Record<string, PrestigeBadge | null>>({});

  useEffect(() => {
    async function fetchLeaderboard() {
      let query = supabase
        .from("leaderboard")
        .select("*")
        .order("total_score", { ascending: false });
        
      if (compact) {
        query = query.limit(5);
      }
      
      const { data } = await query;
      
      if (data) setLeaders(data);
      setLoading(false);
    }
    async function fetchBadges() {
      const { data } = await supabase.from('prize_winners').select('alias, rank');
      if (data) {
        const aliasRanks: Record<string, { rank: number }[]> = {};
        data.forEach(row => {
          if (!aliasRanks[row.alias]) aliasRanks[row.alias] = [];
          aliasRanks[row.alias].push({ rank: row.rank });
        });
        const badges: Record<string, PrestigeBadge | null> = {};
        Object.keys(aliasRanks).forEach(alias => {
          badges[alias] = getPrestigeBadge(aliasRanks[alias]);
        });
        setUserBadges(badges);
      }
    }

    fetchBadges();
    fetchLeaderboard();

    // Subscribe to realtime changes on predictions table to auto-update likes on the leaderboard
    const channelName = `public:predictions_leaderboard_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "predictions" }, () => {
        fetchLeaderboard();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) return <div className="text-center py-10 text-slate-400">Loading rankings...</div>;

  if (compact) {
    return (
      <div className="bento-card rounded-2xl overflow-hidden">
        <div className="bg-[#AEFC00]/10 p-4 border-b border-[var(--border-lime)] flex items-center gap-2">
          <Trophy className="text-[#AEFC00]" size={15} />
          <h3 className="font-bold text-sm text-white uppercase tracking-wider">Top Pundits</h3>
        </div>
        <div className="flex flex-col divide-y divide-slate-800/50">
          {leaders.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">No predictions yet.</div>
          ) : (
            leaders.map((leader, idx) => (
              <Link key={leader.alias} href={`/profile/${leader.alias}`} className="flex items-center justify-between p-3 hover:bg-[var(--bg-card-hover)] transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-[var(--text-muted)] text-xs w-5 text-center">#{idx + 1}</span>
                  {leader.avatar_url ? (
                    <img src={leader.avatar_url} alt={leader.alias} className="w-7 h-7 rounded-xl object-cover border border-[var(--border-medium)] bg-white" />
                  ) : (
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#AEFC00]/30 to-[#3B82F6]/20 flex items-center justify-center font-bold text-white text-xs border border-[var(--border-lime)]">⚽</div>
                  )}
                  <span className={`font-semibold text-sm truncate max-w-[90px] ${userBadges[leader.alias]?.colorClass || 'text-[var(--text-primary)]'}`}>
                    {leader.alias}
                  </span>
                </div>
                <div className="font-black text-[#AEFC00] text-sm">{leader.total_score || 0}</div>
              </Link>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-[#AEFC00] flex items-center justify-center shadow-[0_0_15px_rgba(174,252,0,0.3)]">
          <Trophy className="text-black" size={20} />
        </div>
        <h2 className="font-black text-2xl text-white tracking-tight">Top Pundits</h2>
      </div>
      
      {/* List */}
      <div className="flex flex-col gap-3">
        {leaders.length === 0 ? (
          <div className="bento-card rounded-3xl p-10 text-center">
            <p className="text-[var(--text-muted)] font-medium">Leaderboard is empty. Start predicting!</p>
          </div>
        ) : (
          leaders.map((leader, idx) => (
            <div key={leader.alias} className="bento-card rounded-3xl p-4 md:p-5 flex flex-col md:flex-row items-center gap-4 transition-all hover:scale-[1.01] hover:border-[var(--border-lime)] relative overflow-hidden group">
              {/* Highlight for Top 3 */}
              {idx < 3 && (
                <div className={`absolute top-0 left-0 w-1 h-full ${idx === 0 ? 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]' : idx === 1 ? 'bg-slate-300 shadow-[0_0_10px_rgba(203,213,225,0.8)]' : 'bg-amber-600 shadow-[0_0_10px_rgba(217,119,6,0.8)]'}`} />
              )}
              
              <div className="flex items-center w-full md:w-auto md:flex-1 gap-4">
                {/* Rank */}
                <div className={`font-black text-xl md:text-2xl w-8 text-center shrink-0 ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'text-[var(--text-muted)]'}`}>
                  #{idx + 1}
                </div>
                
                {/* User */}
                <Link href={`/profile/${leader.alias}`} className="flex items-center gap-3 group/link flex-1 min-w-0">
                  <div className="relative shrink-0">
                    {leader.avatar_url ? (
                      <img src={leader.avatar_url} alt={leader.alias} className="w-12 h-12 md:w-14 md:h-14 rounded-2xl object-cover border-2 border-[var(--border-subtle)] group-hover/link:border-[#AEFC00] transition-colors bg-black/40" />
                    ) : (
                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-[#AEFC00]/20 to-[#3B82F6]/20 flex items-center justify-center font-bold text-white text-xl border-2 border-[var(--border-subtle)] group-hover/link:border-[#AEFC00] transition-colors">
                        ⚽
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className={`font-bold text-lg md:text-xl truncate block group-hover/link:underline ${userBadges[leader.alias]?.colorClass || 'text-white'}`}>
                      {leader.alias} {userBadges[leader.alias]?.emoji}
                    </span>
                    <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      {leader.total_score || 0} PTS
                    </span>
                  </div>
                </Link>

                {/* Score (Mobile) */}
                <div className="md:hidden font-black text-2xl text-[#AEFC00]">
                  {leader.total_score || 0}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto shrink-0 overflow-x-auto hide-scrollbar pb-1 md:pb-0">
                <div className="flex flex-col items-center bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-2xl px-3 py-2 min-w-[64px]">
                  <Target size={14} className="text-[#AEFC00] mb-1" />
                  <span className="font-bold text-sm text-white">{leader.correct_predictions || 0}</span>
                </div>
                <div className="flex flex-col items-center bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-2xl px-3 py-2 min-w-[64px]">
                  <Brain size={14} className="text-purple-400 mb-1" />
                  <span className="font-bold text-sm text-white">{leader.mastermind_predictions || 0}</span>
                </div>
                <div className="flex flex-col items-center bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-2xl px-3 py-2 min-w-[64px]">
                  <Crosshair size={14} className="text-orange-400 mb-1" />
                  <span className="font-bold text-sm text-white">{leader.sniper_predictions || 0}</span>
                </div>
                <div className="flex flex-col items-center bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-2xl px-3 py-2 min-w-[64px]">
                  <Heart size={14} className="text-pink-400 mb-1" />
                  <span className="font-bold text-sm text-white">{leader.total_likes || 0}</span>
                </div>
              </div>
              
              {/* Score (Desktop) */}
              <div className="hidden md:flex items-center justify-end w-24 shrink-0 font-black text-3xl text-[#AEFC00]">
                {leader.total_score || 0}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

