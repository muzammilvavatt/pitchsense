"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Trophy, Target, Brain, Heart, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const { alias } = useParams();
  const router = useRouter();
  
  const [stats, setStats] = useState<any>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      const decodedAlias = decodeURIComponent(alias as string);
      
      // Fetch stats from leaderboard view
      const { data: leaderData } = await supabase
        .from("leaderboard")
        .select("*")
        .eq("alias", decodedAlias)
        .single();
      
      setStats(leaderData || {
        alias: decodedAlias,
        correct_predictions: 0,
        mastermind_predictions: 0,
        total_likes: 0,
        total_score: 0
      });

      // Fetch predictions history with match data
      const { data: predData } = await supabase
        .from("predictions")
        .select("*, matches(*)")
        .eq("alias", decodedAlias)
        .order("created_at", { ascending: false });

      if (predData) setPredictions(predData);
      
      setLoading(false);
    }
    
    if (alias) {
      fetchProfile();
    }
  }, [alias]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading profile...</div>;

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto animate-fade-in">
      <Link href="/" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-8 transition-colors">
        <ArrowLeft size={20} /> Back to Dashboard
      </Link>
      
      {/* Profile Header & Stats */}
      <div className="glass-card overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 p-8 flex flex-col md:flex-row items-center gap-6 border-b border-slate-700/50">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center font-black text-4xl text-white shadow-lg">
            {stats.alias.charAt(0).toUpperCase()}
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-black text-white">{stats.alias}</h1>
            <p className="text-emerald-400 font-bold mt-1 text-lg">{stats.total_score} Total Points</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-700/50 bg-slate-900/50">
          <div className="p-6 flex flex-col items-center justify-center gap-2 text-center">
            <Trophy className="text-yellow-400" size={28} />
            <span className="text-3xl font-black text-white">{stats.total_score}</span>
            <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Score</span>
          </div>
          <div className="p-6 flex flex-col items-center justify-center gap-2 text-center">
            <Target className="text-emerald-400" size={28} />
            <span className="text-3xl font-black text-white">{stats.correct_predictions}</span>
            <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Correct</span>
          </div>
          <div className="p-6 flex flex-col items-center justify-center gap-2 text-center">
            <Brain className="text-purple-400" size={28} />
            <span className="text-3xl font-black text-white">{stats.mastermind_predictions}</span>
            <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Masterminds</span>
          </div>
          <div className="p-6 flex flex-col items-center justify-center gap-2 text-center">
            <Heart className="text-pink-400" size={28} />
            <span className="text-3xl font-black text-white">{stats.total_likes}</span>
            <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Total Likes</span>
          </div>
        </div>
      </div>

      {/* Prediction History */}
      <h2 className="text-xl font-bold text-white mb-4">Tactical History</h2>
      
      <div className="space-y-4">
        {predictions.length === 0 ? (
          <p className="text-slate-500 text-center py-8 bg-slate-900/30 rounded-2xl border border-slate-800">
            No predictions made yet.
          </p>
        ) : (
          predictions.map((pred) => (
            <div key={pred.id} className="glass-card p-5 relative overflow-hidden">
              {/* Correctness Indicator */}
              {pred.is_correct === true && (
                <div className="absolute top-0 right-0 bg-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1 rounded-bl-lg">WIN</div>
              )}
              {pred.is_correct === false && (
                <div className="absolute top-0 right-0 bg-red-500/20 text-red-400 text-xs font-bold px-3 py-1 rounded-bl-lg">LOSS</div>
              )}
              
              <div className="flex items-center justify-between mb-4 mt-2">
                <div className="font-bold text-lg">
                  {pred.matches.home_team} vs {pred.matches.away_team}
                </div>
                <div className="text-sm font-medium bg-blue-900/30 px-3 py-1 rounded-full text-blue-300 border border-blue-800/50">
                  Pick: {pred.prediction}
                </div>
              </div>
              
              {pred.countered_ai && (
                <div className="text-xs text-purple-400 font-bold mb-3 flex items-center gap-1">
                  <Brain size={12} /> Countered AI
                </div>
              )}
              
              <div className="bg-slate-900/50 p-4 rounded-xl text-slate-300 text-sm border border-slate-800 italic">
                "{pred.justification}"
              </div>
              
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500 font-medium">
                <div>Result: {pred.matches.result || "Pending"}</div>
                <div className="flex items-center gap-1"><Heart size={14} className="text-pink-500" /> {pred.likes} Likes</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
