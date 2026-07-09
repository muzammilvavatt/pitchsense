"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ThumbsUp, Clock } from "lucide-react";

export default function DebateFeed() {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPredictions = async () => {
    const { data } = await supabase
      .from("predictions")
      .select(`
        id, alias, prediction, score_prediction, justification, likes, created_at,
        matches ( home_team, away_team )
      `)
      .order("created_at", { ascending: false })
      .limit(50);
    
    if (data) setPredictions(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPredictions();

    // Subscribe to realtime updates for likes
    const channel = supabase
      .channel("public:predictions")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "predictions" }, payload => {
        setPredictions(current => 
          current.map(p => p.id === payload.new.id ? { ...p, likes: payload.new.likes } : p)
        );
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "predictions" }, payload => {
        // Simple re-fetch on new insert to get the joined match data easily
        fetchPredictions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleUpvote = async (id: string, currentLikes: number) => {
    // Optimistic UI update
    setPredictions(current => current.map(p => p.id === id ? { ...p, likes: p.likes + 1 } : p));
    
    // DB update
    await supabase
      .from("predictions")
      .update({ likes: currentLikes + 1 })
      .eq("id", id);
  };

  if (loading) return <div className="text-center py-10 text-slate-400">Loading debate...</div>;

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {predictions.length === 0 ? (
        <div className="glass-card p-10 text-center text-slate-400">No predictions yet.</div>
      ) : (
        predictions.map((p) => {
          const match = p.matches || {};
          const timeAgo = new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return (
            <div key={p.id} className="glass-card p-4 md:p-5 hover:border-slate-500/50 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="flex -space-x-2 shrink-0">
                      {match.home_logo ? (
                        <img src={match.home_logo} className="w-6 h-6 md:w-8 md:h-8 rounded-full border border-slate-700 bg-slate-800 object-contain p-0.5" />
                      ) : (
                        <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[10px] md:text-xs shadow-inner z-10">
                          {match.home_team?.charAt(0)}
                        </div>
                      )}
                      {match.away_logo ? (
                        <img src={match.away_logo} className="w-6 h-6 md:w-8 md:h-8 rounded-full border border-slate-700 bg-slate-800 object-contain p-0.5" />
                      ) : (
                        <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center font-bold text-[10px] md:text-xs shadow-inner">
                          {match.away_team?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="truncate pr-2">
                      <h3 className="font-bold text-white text-sm md:text-lg truncate">
                        {match.home_team} vs {match.away_team}
                      </h3>
                      <p className="text-[10px] md:text-xs text-slate-400">Match Debate</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center text-[10px] md:text-xs text-slate-500 gap-1 shrink-0 bg-slate-900/50 px-2 py-1 rounded-full">
                  <Clock size={12} /> {timeAgo}
                </div>
              </div>
              
              <div className="text-xs md:text-sm text-slate-300 mb-3 flex flex-wrap items-center gap-1.5">
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt={p.alias} className="w-5 h-5 rounded-full object-cover border border-slate-600" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-red-600 to-rose-400 flex items-center justify-center text-[10px] font-bold text-white">
                    {p.alias.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-bold text-red-400">{p.alias}</span>
                <span className="text-slate-500">picked</span>
                <span className="font-bold text-white bg-red-950/80 border border-red-900/50 px-2 py-0.5 rounded shadow-inner">
                  {p.prediction} <span className="text-slate-400 font-normal">({p.score_prediction})</span>
                </span>
              </div>

              <p className="text-slate-200 bg-slate-900/40 p-3 md:p-4 rounded-xl border border-slate-800/80 italic mb-3 text-sm md:text-base leading-relaxed">
                "{p.justification}"
              </p>

              <div className="flex justify-end border-t border-slate-800/50 pt-3">
                <button
                  onClick={() => handleUpvote(p.id, p.likes || 0)}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-1.5 rounded-full text-sm font-medium transition-all active:scale-95 shadow-sm hover:text-rose-400"
                >
                  <ThumbsUp size={14} className="text-rose-500" /> 
                  <span>{p.likes || 0}</span>
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
