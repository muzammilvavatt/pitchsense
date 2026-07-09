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
            <div key={p.id} className="glass-card p-5 hover:border-slate-600 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {match.home_logo ? (
                        <img src={match.home_logo} className="w-8 h-8 rounded-full border border-slate-700 bg-slate-800 object-contain p-1" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs shadow-inner z-10">
                          {match.home_team?.charAt(0)}
                        </div>
                      )}
                      {match.away_logo ? (
                        <img src={match.away_logo} className="w-8 h-8 rounded-full border border-slate-700 bg-slate-800 object-contain p-1" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center font-bold text-xs shadow-inner">
                          {match.away_team?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">
                        {match.home_team} vs {match.away_team}
                      </h3>
                      <p className="text-xs text-slate-400">Match Debate</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center text-xs text-slate-500 gap-1">
                  <Clock size={12} /> {timeAgo}
                </div>
              </div>
              
              <div className="text-sm text-slate-400 mb-2">
                <span className="font-bold text-blue-400">{p.alias}</span>
                <span className="mx-2">predicted</span>
                <span className="font-bold text-white bg-slate-800 px-2 py-1 rounded text-sm">
                  {p.prediction} ({p.score_prediction})
                </span>
              </div>

              <p className="text-slate-200 bg-slate-900/50 p-3 rounded-lg border border-slate-800 italic mb-4">
                "{p.justification}"
              </p>

              <div className="flex justify-end">
                <button
                  onClick={() => handleUpvote(p.id, p.likes || 0)}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full text-sm transition-all"
                >
                  <ThumbsUp size={14} className="text-emerald-400" /> 
                  <span className="font-medium">{p.likes || 0}</span>
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
