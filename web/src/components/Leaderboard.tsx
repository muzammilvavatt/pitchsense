"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Trophy, Target, Heart, Brain, Crosshair } from "lucide-react";
import Link from "next/link";

export default function Leaderboard() {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      const { data } = await supabase
        .from("leaderboard")
        .select("*")
        .order("total_score", { ascending: false });
      
      if (data) setLeaders(data);
      setLoading(false);
    }
    fetchLeaderboard();
  }, []);

  if (loading) return <div className="text-center py-10 text-slate-400">Loading rankings...</div>;

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
                    <Link href={`/profile/${leader.alias}`} className="font-bold text-rose-400 text-lg">
                      {leader.alias}
                    </Link>
                  </div>
                  <div className="font-black text-red-500 text-xl">{leader.total_score || 0} pts</div>
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
                      <Link href={`/profile/${leader.alias}`} className="text-rose-400 hover:text-rose-300 hover:underline transition-colors">
                        {leader.alias}
                      </Link>
                    </td>
                    <td className="p-4 text-slate-300">{leader.correct_predictions || 0}</td>
                    <td className="p-4 font-bold text-purple-400">{leader.mastermind_predictions || 0}</td>
                    <td className="p-4 font-bold text-orange-400">{leader.sniper_predictions || 0}</td>
                    <td className="p-4 text-slate-300">{leader.total_likes || 0}</td>
                    <td className="p-4 text-right font-black text-red-500 text-xl">
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
