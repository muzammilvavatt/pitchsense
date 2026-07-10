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
    const channel = supabase
      .channel("public:predictions_leaderboard")
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
      <div className="glass-card overflow-hidden">
        <div className="bg-slate-800/80 p-3 border-b border-slate-700 flex items-center gap-2">
          <Trophy className="text-yellow-400" size={16} />
          <h3 className="font-bold text-sm">Top Pundits</h3>
        </div>
        <div className="flex flex-col divide-y divide-slate-800/50">
          {leaders.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">No predictions yet.</div>
          ) : (
            leaders.map((leader, idx) => (
              <Link key={leader.alias} href={`/profile/${leader.alias}`} className="flex items-center justify-between p-3 hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-500 text-xs w-4">#{idx + 1}</span>
                  {leader.avatar_url ? (
                    <img src={leader.avatar_url} alt={leader.alias} className="w-6 h-6 rounded-full object-cover border border-slate-700 bg-white" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-600 to-green-800 flex items-center justify-center font-bold text-white text-xs border border-slate-700">⚽</div>
                  )}
                  <span className={`font-semibold text-sm truncate max-w-[100px] ${userBadges[leader.alias]?.colorClass || 'text-slate-200'}`}>
                    {leader.alias}
                  </span>
                </div>
                <div className="font-bold text-emerald-400 text-sm">{leader.total_score || 0}</div>
              </Link>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="glass-card overflow-hidden">
        <div className="bg-slate-800/80 p-4 border-b border-slate-700 flex items-center gap-2">
          <Trophy className="text-yellow-400" size={20} />
          <h3 className="font-bold text-lg">Top Pundits</h3>
        </div>
        
        {/* Mobile View (Cards) */}
        <div className="md:hidden flex flex-col divide-y divide-slate-800/50">
          {leaders.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Leaderboard is empty. Start predicting!</div>
          ) : (
            leaders.map((leader, idx) => (
              <div key={leader.alias} className="p-4 flex flex-col gap-3 bg-slate-900/20">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="font-black text-slate-500 text-lg">#{idx + 1}</span>
                    <Link href={`/profile/${leader.alias}`} className="flex items-center gap-2 group-hover:opacity-80 transition-opacity">
                      {leader.avatar_url ? (
                        <img src={leader.avatar_url} alt={leader.alias} className="w-10 h-10 rounded-full object-cover border border-slate-700 bg-white" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-green-800 flex items-center justify-center font-bold text-white text-lg border border-slate-700">
                          ⚽
                        </div>
                      )}
                      <span className={`font-bold text-lg group-hover:underline ${userBadges[leader.alias]?.colorClass || 'text-blue-400'}`}>
                        {leader.alias} {userBadges[leader.alias]?.emoji}
                      </span>
                    </Link>
                  </div>
                  <div className="font-black text-emerald-400 text-xl">{leader.total_score || 0} pts</div>
                </div>
                <div className="grid grid-cols-4 gap-2 bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                  <div className="text-center">
                    <div className="text-xs text-slate-500 mb-1"><Target size={14} className="mx-auto"/></div>
                    <div className="font-bold text-slate-300">{leader.correct_predictions || 0}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-purple-400 mb-1"><Brain size={14} className="mx-auto"/></div>
                    <div className="font-bold text-purple-400">{leader.mastermind_predictions || 0}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-orange-400 mb-1"><Crosshair size={14} className="mx-auto"/></div>
                    <div className="font-bold text-orange-400">{leader.sniper_predictions || 0}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-pink-400 mb-1"><Heart size={14} className="mx-auto text-pink-400"/></div>
                    <div className="font-bold text-slate-300">{leader.total_likes || 0}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View (Table) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-sm border-b border-slate-800">
                <th className="p-4 font-medium">Rank</th>
                <th className="p-4 font-medium">Pundit Alias</th>
                <th className="p-4 font-medium">
                  <div className="flex items-center gap-1"><Target size={14}/> Correct</div>
                </th>
                <th className="p-4 font-medium">
                  <div className="flex items-center gap-1 text-purple-400"><Brain size={14}/> Mastermind (4x)</div>
                </th>
                <th className="p-4 font-medium">
                  <div className="flex items-center gap-1 text-orange-400"><Crosshair size={14}/> Sniper (3x)</div>
                </th>
                <th className="p-4 font-medium">
                  <div className="flex items-center gap-1 text-pink-400"><Heart size={14}/> Likes</div>
                </th>
                <th className="p-4 font-medium text-right">Total Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {leaders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Leaderboard is empty. Start predicting!
                  </td>
                </tr>
              ) : (
                leaders.map((leader, idx) => (
                  <tr key={leader.alias} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="p-4 font-bold text-slate-500 group-hover:text-white">#{idx + 1}</td>
                    <td className="p-4 font-bold">
                      <Link href={`/profile/${leader.alias}`} className="flex items-center gap-2 group/link">
                        {leader.avatar_url ? (
                          <img src={leader.avatar_url} alt={leader.alias} className="w-6 h-6 rounded-full object-cover border border-slate-600 group-hover/link:border-blue-400 transition-colors" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-600 to-green-800 flex items-center justify-center font-bold text-white text-[10px]">
                            ⚽
                          </div>
                        )}
                        <span className={`group-hover/link:underline transition-colors ${userBadges[leader.alias]?.colorClass || 'text-blue-400 group-hover/link:text-blue-300'}`}>
                          {leader.alias} {userBadges[leader.alias]?.emoji}
                        </span>
                      </Link>
                    </td>
                    <td className="p-4 text-slate-300">{leader.correct_predictions || 0}</td>
                    <td className="p-4 font-bold text-purple-400">{leader.mastermind_predictions || 0}</td>
                    <td className="p-4 font-bold text-orange-400">{leader.sniper_predictions || 0}</td>
                    <td className="p-4 text-slate-300">{leader.total_likes || 0}</td>
                    <td className="p-4 text-right font-black text-emerald-400 text-xl">
                      {leader.total_score || 0}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
