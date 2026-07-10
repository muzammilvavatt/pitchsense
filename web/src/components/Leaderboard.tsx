"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Trophy, Target, Brain, Crosshair, Heart, Crown, Medal, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getPrestigeBadge, PrestigeBadge } from "@/lib/badges";
import { resolveAvatar } from "@/lib/avatar";

interface LeaderboardRow {
  alias: string;
  avatar_url?: string;
  total_score: number;
  correct_predictions: number;
  mastermind_predictions: number;
  sniper_predictions: number;
  total_likes: number;
}

const RANK_CONFIG = [
  {
    icon: Crown,
    color: "#FFD700",
    glow: "rgba(255,215,0,0.3)",
    bg: "from-yellow-400/20 to-yellow-600/5",
    border: "border-yellow-400/60",
    label: "Champion",
    podiumH: "h-28",
    order: "order-2",
  },
  {
    icon: Medal,
    color: "#C0C0C0",
    glow: "rgba(192,192,192,0.25)",
    bg: "from-slate-300/15 to-slate-400/5",
    border: "border-slate-300/50",
    label: "Runner Up",
    podiumH: "h-20",
    order: "order-1",
  },
  {
    icon: Medal,
    color: "#CD7F32",
    glow: "rgba(205,127,50,0.25)",
    bg: "from-amber-600/15 to-amber-700/5",
    border: "border-amber-600/50",
    label: "3rd Place",
    podiumH: "h-14",
    order: "order-3",
  },
];

function StatPill({ icon: Icon, value, color }: { icon: any; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl bg-black/20 border border-white/5 min-w-[52px]">
      <Icon size={13} style={{ color }} />
      <span className="text-xs font-black text-white">{value}</span>
    </div>
  );
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

      if (compact) query = query.limit(5);

      const { data } = await query;
      if (data) setLeaders(data);
      setLoading(false);
    }

    async function fetchBadges() {
      const { data } = await supabase.from("prize_winners").select("alias, rank");
      if (data) {
        const aliasRanks: Record<string, { rank: number }[]> = {};
        data.forEach((row) => {
          if (!aliasRanks[row.alias]) aliasRanks[row.alias] = [];
          aliasRanks[row.alias].push({ rank: row.rank });
        });
        const badges: Record<string, PrestigeBadge | null> = {};
        Object.keys(aliasRanks).forEach((alias) => {
          badges[alias] = getPrestigeBadge(aliasRanks[alias]);
        });
        setUserBadges(badges);
      }
    }

    fetchBadges();
    fetchLeaderboard();

    const channelName = `public:predictions_leaderboard_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "predictions" }, () => {
        fetchLeaderboard();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  /* ── COMPACT (sidebar) ── */
  if (compact) {
    if (loading) return <div className="p-4 text-center text-xs text-[var(--text-muted)]">Loading…</div>;
    return (
      <div className="bento-card rounded-2xl overflow-hidden">
        <div className="bg-[#AEFC00]/10 p-4 border-b border-[var(--border-lime)] flex items-center gap-2">
          <Trophy className="text-[#AEFC00]" size={15} />
          <h3 className="font-bold text-sm text-white uppercase tracking-wider">Top Pundits</h3>
        </div>
        <div className="flex flex-col divide-y divide-[var(--border-subtle)]">
          {leaders.length === 0 ? (
            <div className="p-4 text-center text-xs text-[var(--text-muted)]">No predictions yet.</div>
          ) : (
            leaders.map((leader, idx) => (
              <Link key={leader.alias} href={`/profile/${leader.alias}`}
                className="flex items-center justify-between p-3 hover:bg-[var(--bg-card-hover)] transition-colors group">
                <div className="flex items-center gap-2.5">
                  <span className={`font-black text-xs w-5 text-center ${
                    idx === 0 ? "text-yellow-400" : idx === 1 ? "text-slate-300" : idx === 2 ? "text-amber-500" : "text-[var(--text-muted)]"
                  }`}>#{idx + 1}</span>
                  <img
                    src={resolveAvatar(leader.avatar_url, leader.alias)}
                    alt={leader.alias}
                    className="w-7 h-7 rounded-lg object-cover border border-[var(--border-medium)] bg-black/40"
                  />
                  <span className={`font-semibold text-sm truncate max-w-[90px] ${userBadges[leader.alias]?.colorClass || "text-[var(--text-primary)]"}`}>
                    {leader.alias}
                  </span>
                </div>
                <span className="font-black text-[#AEFC00] text-sm">{leader.total_score || 0}</span>
              </Link>
            ))
          )}
        </div>
      </div>
    );
  }

  /* ── FULL PAGE ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2">
        <div className="w-2 h-2 rounded-full bg-[#AEFC00] animate-bounce [animation-delay:0ms]" />
        <div className="w-2 h-2 rounded-full bg-[#AEFC00] animate-bounce [animation-delay:150ms]" />
        <div className="w-2 h-2 rounded-full bg-[#AEFC00] animate-bounce [animation-delay:300ms]" />
      </div>
    );
  }

  const top3 = leaders.slice(0, 3);
  const rest = leaders.slice(3);

  return (
    <div className="max-w-3xl mx-auto space-y-10 pb-10">

      {/* ── PAGE TITLE ── */}
      <div className="flex items-center gap-4 px-1">
        <div className="w-12 h-12 rounded-2xl bg-[#AEFC00] flex items-center justify-center shadow-[0_0_24px_rgba(174,252,0,0.35)]">
          <Trophy className="text-black" size={22} />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-none">Leaderboard</h1>
          <p className="text-sm text-[var(--text-muted)] font-medium mt-0.5">Who's the sharpest pundit?</p>
        </div>
      </div>

      {leaders.length === 0 ? (
        <div className="bento-card rounded-3xl p-14 text-center">
          <Trophy size={40} className="text-[var(--text-muted)] mx-auto mb-4 opacity-30" />
          <p className="text-[var(--text-muted)] font-semibold">No predictions yet. Be the first!</p>
        </div>
      ) : (
        <>
          {/* ── PODIUM (Top 3) ── */}
          {top3.length >= 2 && (
            <div className="flex items-end justify-center gap-3 md:gap-5 px-2">
              {[
                { data: top3[1], cfg: RANK_CONFIG[1], rank: 2 },
                { data: top3[0], cfg: RANK_CONFIG[0], rank: 1 },
                { data: top3[2], cfg: RANK_CONFIG[2], rank: 3 },
              ].filter(p => p.data).map(({ data: leader, cfg, rank }) => {
                const RankIcon = cfg.icon;
                return (
                  <Link
                    key={leader.alias}
                    href={`/profile/${leader.alias}`}
                    className={`${cfg.order} flex flex-col items-center gap-3 group flex-1 max-w-[160px] md:max-w-[200px]`}
                  >
                    {/* Avatar + crown */}
                    <div className="relative">
                      <div
                        className="w-16 h-16 md:w-20 md:h-20 rounded-3xl overflow-hidden border-2 transition-transform duration-200 group-hover:scale-105"
                        style={{ borderColor: cfg.color, boxShadow: `0 0 20px ${cfg.glow}` }}
                      >
                        <img
                          src={resolveAvatar(leader.avatar_url, leader.alias)}
                          alt={leader.alias}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div
                        className="absolute -top-3 -right-3 w-7 h-7 rounded-xl flex items-center justify-center border border-black/30"
                        style={{ backgroundColor: cfg.color, boxShadow: `0 0 12px ${cfg.glow}` }}
                      >
                        <RankIcon size={14} className="text-black" />
                      </div>
                    </div>

                    {/* Name + badge */}
                    <div className="text-center">
                      <p className={`font-black text-sm md:text-base leading-tight truncate max-w-[120px] ${userBadges[leader.alias]?.colorClass || "text-white"}`}>
                        {leader.alias} {userBadges[leader.alias]?.emoji}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: cfg.color }}>
                        {cfg.label}
                      </p>
                    </div>

                    {/* Score + podium block */}
                    <div
                      className={`w-full rounded-2xl bg-gradient-to-b ${cfg.bg} border ${cfg.border} flex flex-col items-center justify-start pt-4 pb-3 ${cfg.podiumH}`}
                    >
                      <span className="font-black text-2xl md:text-3xl" style={{ color: cfg.color }}>
                        {leader.total_score || 0}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-white/40 mt-0.5">pts</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* ── RANKED LIST (4th onwards) ── */}
          {rest.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] px-1">Full Rankings</p>
              <div className="flex flex-col gap-2">
                {rest.map((leader, i) => {
                  const rank = i + 4;
                  return (
                    <Link
                      key={leader.alias}
                      href={`/profile/${leader.alias}`}
                      className="bento-card rounded-2xl px-4 py-3 flex items-center gap-4 hover:border-[var(--border-lime)] hover:bg-[var(--bg-card-hover)] transition-all group"
                    >
                      {/* Rank */}
                      <span className="font-black text-base text-[var(--text-muted)] w-8 text-center shrink-0">
                        #{rank}
                      </span>

                      {/* Avatar */}
                      <img
                        src={resolveAvatar(leader.avatar_url, leader.alias)}
                        alt={leader.alias}
                        className="w-10 h-10 rounded-2xl object-cover border border-[var(--border-medium)] bg-black/40 shrink-0 group-hover:border-[#AEFC00]/50 transition-colors"
                      />

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-sm md:text-base truncate ${userBadges[leader.alias]?.colorClass || "text-white"}`}>
                          {leader.alias} {userBadges[leader.alias]?.emoji}
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)] font-semibold uppercase tracking-wider">
                          {leader.total_score || 0} pts
                        </p>
                      </div>

                      {/* Mini Stats */}
                      <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                        <StatPill icon={Target} value={leader.correct_predictions || 0} color="#AEFC00" />
                        <StatPill icon={Brain} value={leader.mastermind_predictions || 0} color="#a78bfa" />
                        <StatPill icon={Crosshair} value={leader.sniper_predictions || 0} color="#fb923c" />
                        <StatPill icon={Heart} value={leader.total_likes || 0} color="#f472b6" />
                      </div>

                      {/* Score */}
                      <span className="font-black text-xl text-[#AEFC00] shrink-0 ml-2">
                        {leader.total_score || 0}
                      </span>

                      <ChevronRight size={16} className="text-[var(--text-muted)] group-hover:text-[#AEFC00] transition-colors shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* If top3 < 3 leaders, show them in the ranked list instead */}
          {top3.length < 2 && (
            <div className="flex flex-col gap-2">
              {leaders.map((leader, i) => (
                <Link
                  key={leader.alias}
                  href={`/profile/${leader.alias}`}
                  className="bento-card rounded-2xl px-4 py-3 flex items-center gap-4 hover:border-[var(--border-lime)] transition-all group"
                >
                  <span className={`font-black text-base w-8 text-center shrink-0 ${
                    i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-500" : "text-[var(--text-muted)]"
                  }`}>#{i + 1}</span>
                  <img
                    src={resolveAvatar(leader.avatar_url, leader.alias)}
                    alt={leader.alias}
                    className="w-10 h-10 rounded-2xl object-cover border border-[var(--border-medium)] bg-black/40 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm md:text-base truncate ${userBadges[leader.alias]?.colorClass || "text-white"}`}>
                      {leader.alias} {userBadges[leader.alias]?.emoji}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] font-semibold">{leader.total_score || 0} pts</p>
                  </div>
                  <span className="font-black text-xl text-[#AEFC00]">{leader.total_score || 0}</span>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
