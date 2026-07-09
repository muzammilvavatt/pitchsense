"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Trophy, Target, Brain, Crosshair, Heart, Calendar } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function ProfilePage() {
  const params = useParams();
  const alias = decodeURIComponent(params.alias as string);
  
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [newAvatarUrl, setNewAvatarUrl] = useState("");
  const [savingAvatar, setSavingAvatar] = useState(false);
  
  // Safely compute isOwner for client-side rendering
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    // Set owner on mount to avoid hydration mismatch
    const currentUser = localStorage.getItem("pitchsense_alias");
    if (currentUser && currentUser.toLowerCase() === alias.toLowerCase()) {
      setIsOwner(true);
    }

    const fetchProfile = async () => {
      // Fetch stats from leaderboard view
      const { data: lbData } = await supabase
        .from("leaderboard")
        .select("*")
        .eq("alias", alias)
        .single();
      
      // Fetch most recent prediction to grab avatar_url (if available)
      const { data: recentPreds } = await supabase
        .from("predictions")
        .select("avatar_url, created_at, prediction, score_prediction, justification, likes, countered_ai, matches(home_team, away_team)")
        .eq("alias", alias)
        .order("created_at", { ascending: false });

      if (lbData) {
        setStats({
          ...lbData,
          avatar_url: recentPreds && recentPreds.length > 0 ? recentPreds[0].avatar_url : null
        });
      }
      
      if (recentPreds) {
        setHistory(recentPreds);
      }
      
      setLoading(false);
    };

    fetchProfile();
  }, [alias]);

  const saveAvatar = async () => {
    setSavingAvatar(true);
    // Update local storage
    localStorage.setItem("pitchsense_avatar_url", newAvatarUrl);
    
    // Update all previous predictions in DB
    await supabase
      .from("predictions")
      .update({ avatar_url: newAvatarUrl })
      .eq("alias", alias);
      
    setStats({ ...stats, avatar_url: newAvatarUrl });
    setIsEditingAvatar(false);
    setSavingAvatar(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  // Render the profile even if empty


  // Fallback stats for owners with no predictions
  const displayStats = stats || {
    total_score: 0,
    correct_predictions: 0,
    mastermind_predictions: 0,
    sniper_predictions: 0,
    total_likes: 0,
    avatar_url: typeof window !== 'undefined' ? localStorage.getItem("pitchsense_avatar_url") : null
  };

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto pb-24">
      <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8">
        <ArrowLeft size={20} /> Back to Dashboard
      </Link>

      <div className="glass-card p-6 md:p-10 mb-8">
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
          <div className="relative">
            {displayStats?.avatar_url ? (
              <img src={displayStats.avatar_url} alt={alias} className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-slate-700 shadow-2xl" />
            ) : (
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-400 flex items-center justify-center font-bold text-white shadow-2xl text-5xl">
                {alias.charAt(0).toUpperCase()}
              </div>
            )}
            
            {/* Top Pundit Badge Overlay */}
            {displayStats?.total_score >= 10 && (
              <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-black font-black text-xs px-3 py-1.5 rounded-full border-2 border-slate-900 shadow-lg flex items-center gap-1">
                <Trophy size={14} /> VIP
              </div>
            )}
          </div>

          <div className="text-center md:text-left flex-1">
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">{alias}</h1>
            <p className="text-slate-400 text-lg flex items-center justify-center md:justify-start gap-2">
              <Trophy className="text-yellow-400" size={20} />
              <span className="font-bold text-emerald-400">{displayStats?.total_score || 0} Total Points</span>
            </p>

            {/* Badges Container */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-6">
              {(isOwner || (typeof window !== 'undefined' && localStorage.getItem("pitchsense_alias")?.toLowerCase() === alias.toLowerCase())) && (
                <button
                  onClick={() => setIsEditingAvatar(!isEditingAvatar)}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-bold transition-colors"
                >
                  Edit Avatar
                </button>
              )}
              {displayStats?.correct_predictions > 0 && (
                <div className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm">
                  <Target size={16} className="text-emerald-400" />
                  <span className="text-slate-300 font-medium">Accurate ({displayStats.correct_predictions})</span>
                </div>
              )}
              {displayStats?.mastermind_predictions > 0 && (
                <div className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm">
                  <Brain size={16} className="text-purple-400" />
                  <span className="text-slate-300 font-medium">Mastermind ({displayStats.mastermind_predictions})</span>
                </div>
              )}
              {displayStats?.sniper_predictions > 0 && (
                <div className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm">
                  <Crosshair size={16} className="text-orange-400" />
                  <span className="text-slate-300 font-medium">Sniper ({displayStats.sniper_predictions})</span>
                </div>
              )}
              {displayStats?.total_likes > 0 && (
                <div className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm">
                  <Heart size={16} className="text-pink-400" />
                  <span className="text-slate-300 font-medium">Respected ({displayStats.total_likes})</span>
                </div>
              )}
            </div>
            
            {isEditingAvatar && (
              <div className="mt-6 p-4 bg-slate-900/80 rounded-xl border border-slate-700">
                <h3 className="text-white font-bold mb-3 text-sm">Choose an Avatar:</h3>
                <div className="flex flex-wrap gap-3 mb-4">
                  {[
                    "https://api.dicebear.com/7.x/bottts/svg?seed=Felix&backgroundColor=0ea5e9",
                    "https://api.dicebear.com/7.x/bottts/svg?seed=Aneka&backgroundColor=10b981",
                    "https://api.dicebear.com/7.x/bottts/svg?seed=Oliver&backgroundColor=f59e0b",
                    "https://api.dicebear.com/7.x/bottts/svg?seed=Sophie&backgroundColor=ec4899",
                    "https://api.dicebear.com/7.x/notionists/svg?seed=Jack&backgroundColor=6366f1",
                    "https://api.dicebear.com/7.x/notionists/svg?seed=Mia&backgroundColor=14b8a6",
                    "https://api.dicebear.com/7.x/adventurer/svg?seed=Leo&backgroundColor=8b5cf6",
                    "https://api.dicebear.com/7.x/adventurer/svg?seed=Zoe&backgroundColor=f43f5e"
                  ].map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => setNewAvatarUrl(url)}
                      className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all hover:scale-110 ${
                        newAvatarUrl === url ? "border-emerald-400 scale-110 shadow-[0_0_15px_rgba(52,211,153,0.5)]" : "border-slate-700 hover:border-slate-500"
                      }`}
                    >
                      <img src={url} alt={`Avatar option ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 mt-4 pt-4 border-t border-slate-800">
                  <input 
                    type="url" 
                    value={newAvatarUrl}
                    onChange={(e) => setNewAvatarUrl(e.target.value)}
                    placeholder="Or paste a custom image URL..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setIsEditingAvatar(false)}
                      className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={saveAvatar}
                      disabled={savingAvatar || !newAvatarUrl}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                    >
                      {savingAvatar ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Calendar className="text-blue-400" /> Prediction History
        </h2>
      </div>

      <div className="space-y-4">
        {history.length > 0 ? (
          history.map((pred, i) => (
            <div key={i} className="glass-card p-5 transition-transform hover:scale-[1.01]">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{new Date(pred.created_at).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-bold text-lg text-white mb-2">
                    {pred.matches.home_team} vs {pred.matches.away_team}
                  </h3>
                  <div className="flex items-center gap-2 text-sm mb-4">
                    <span className="text-slate-400">Predicted:</span>
                    <span className="font-bold text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/50">
                      {pred.prediction} ({pred.score_prediction})
                    </span>
                    {pred.countered_ai && (
                      <span className="flex items-center gap-1 text-xs font-bold text-purple-400 bg-purple-950/30 px-2 py-0.5 rounded border border-purple-900/50 ml-2">
                        <Brain size={12} /> Countered AI
                      </span>
                    )}
                  </div>
                  <p className="text-slate-300 text-sm italic border-l-2 border-slate-700 pl-3 py-1 bg-slate-900/30 rounded-r-lg">
                    "{pred.justification}"
                  </p>
                </div>
                <div className="flex items-center md:items-start justify-between md:flex-col gap-4 min-w-[100px] border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-4">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Heart size={16} className={pred.likes > 0 ? "text-pink-500 fill-pink-500" : ""} /> 
                    <span className="font-bold">{pred.likes || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center p-8 bg-slate-900/50 rounded-xl border border-slate-800">
            <p className="text-slate-400">No predictions made yet.</p>
          </div>
        )}
      </div>
    </main>
  );
}
