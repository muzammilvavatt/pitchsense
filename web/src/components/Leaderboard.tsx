"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Trophy, Target, Heart } from "lucide-react";

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
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-sm border-b border-slate-800">
                <th className="p-4 font-medium">Rank</th>
                <th className="p-4 font-medium">Pundit Alias</th>
                <th className="p-4 font-medium">
                  <div className="flex items-center gap-1"><Target size={14}/> Correct</div>
                </th>
                <th className="p-4 font-medium">
                  <div className="flex items-center gap-1"><Heart size={14}/> Likes</div>
                </th>
                <th className="p-4 font-medium text-right">Total Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {leaders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Leaderboard is empty. Start predicting!
                  </td>
                </tr>
              ) : (
                leaders.map((leader, idx) => (
                  <tr key={leader.alias} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="p-4 font-bold text-slate-500 group-hover:text-white">#{idx + 1}</td>
                    <td className="p-4 font-bold text-blue-400">{leader.alias}</td>
                    <td className="p-4 text-slate-300">{leader.correct_predictions || 0}</td>
                    <td className="p-4 text-slate-300">{leader.total_likes || 0}</td>
                    <td className="p-4 text-right font-bold text-emerald-400 text-lg">
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
