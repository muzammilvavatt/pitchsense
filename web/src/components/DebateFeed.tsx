"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ThumbsUp, Clock, MessageSquare, Trash2 } from "lucide-react";

export default function DebateFeed() {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  const fetchPredictions = async () => {
    const { data } = await supabase
      .from("predictions")
      .select(`
        id, alias, prediction, score_prediction, justification, likes, created_at,
        matches ( home_team, away_team ),
        replies ( id, alias, avatar_url, content, created_at )
      `)
      .order("created_at", { ascending: false })
      .limit(50);
    
    if (data) {
      // Sort replies by creation time for each prediction
      const sortedData = data.map(p => ({
        ...p,
        replies: p.replies ? p.replies.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) : []
      }));
      setPredictions(sortedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Get current user alias for delete permissions
    setCurrentUser(localStorage.getItem('pitchsense_alias'));

    // Load previously liked IDs from local storage
    const storedLikes = localStorage.getItem('pitchsense_liked_predictions');
    if (storedLikes) {
      setLikedIds(new Set(JSON.parse(storedLikes)));
    }
    
    fetchPredictions();
    
    // Subscribe to new predictions
    const channel = supabase
      .channel("public:predictions")
      .on("postgres_changes", { event: "*", schema: "public", table: "predictions" }, payload => {
        // Simple refetch to keep it easy
        fetchPredictions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleUpvote = async (id: string, currentLikes: number) => {
    const isLiked = likedIds.has(id);
    const newLikedIds = new Set(likedIds);
    let newLikesCount = currentLikes;

    if (isLiked) {
      newLikedIds.delete(id);
      newLikesCount = Math.max(0, currentLikes - 1);
    } else {
      newLikedIds.add(id);
      newLikesCount = currentLikes + 1;
    }

    // Update local state and storage
    setLikedIds(newLikedIds);
    localStorage.setItem('pitchsense_liked_predictions', JSON.stringify(Array.from(newLikedIds)));

    // Optimistic UI update
    setPredictions(current => current.map(p => p.id === id ? { ...p, likes: newLikesCount } : p));
    
    // DB update
    await supabase
      .from("predictions")
      .update({ likes: newLikesCount })
      .eq("id", id);
  };

  const handleReplySubmit = async (predictionId: string) => {
    if (!replyContent.trim()) return;
    setSubmittingReply(true);

    const currentUser = localStorage.getItem("pitchsense_alias") || "UnknownUser";
    const currentAvatar = localStorage.getItem("pitchsense_avatar_url") || null;

    const { error } = await supabase.from("replies").insert({
      prediction_id: predictionId,
      alias: currentUser,
      avatar_url: currentAvatar,
      content: replyContent.trim(),
    });

    if (!error) {
      setReplyingTo(null);
      setReplyContent("");
      fetchPredictions();
    }
    setSubmittingReply(false);
  };

  const handleDeleteReply = async (predictionId: string, replyId: string) => {
    const { error } = await supabase.from("replies").delete().eq("id", replyId);
    if (!error) {
      setPredictions(current => current.map(p => {
        if (p.id === predictionId) {
          return { ...p, replies: p.replies.filter((r: any) => r.id !== replyId) };
        }
        return p;
      }));
    }
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
                  <img src={p.avatar_url} alt={p.alias} className="w-5 h-5 rounded-full object-cover border border-slate-600 bg-white" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-600 to-green-800 flex items-center justify-center font-bold text-white text-[10px] border border-slate-600">
                    ⚽
                  </div>
                )}
                <span className="font-bold text-blue-400">{p.alias}</span>
                <span className="text-slate-500">picked</span>
                <span className="font-bold text-white bg-slate-800 border border-slate-700 px-2 py-0.5 rounded shadow-inner">
                  {p.prediction} <span className="text-slate-400 font-normal">({p.score_prediction})</span>
                </span>
              </div>

              <p className="text-slate-200 bg-slate-900/40 p-3 md:p-4 rounded-xl border border-slate-800/80 italic mb-3 text-sm md:text-base leading-relaxed">
                "{p.justification}"
              </p>

              <div className="flex justify-end border-t border-slate-800/50 pt-3 gap-3">
                <button
                  onClick={() => {
                    setReplyingTo(replyingTo === p.id ? null : p.id);
                    setReplyContent("");
                  }}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all shadow-sm ${
                    replyingTo === p.id 
                      ? 'bg-blue-900/40 text-blue-400 cursor-default border border-blue-500/30' 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-blue-400 active:scale-95'
                  }`}
                >
                  <MessageSquare size={14} className={replyingTo === p.id ? 'text-blue-400' : 'text-blue-500'} />
                  <span>{p.replies?.length || 0}</span>
                </button>
                <button
                  onClick={() => handleUpvote(p.id, p.likes || 0)}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all shadow-sm ${
                    likedIds.has(p.id) 
                      ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-900/60' 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 active:scale-95'
                  }`}
                >
                  <ThumbsUp size={14} className={likedIds.has(p.id) ? 'text-emerald-400' : 'text-emerald-500'} /> 
                  <span>{p.likes || 0}</span>
                </button>
              </div>

              {/* Replies Section */}
              {(p.replies?.length > 0 || replyingTo === p.id) && (
                <div className="mt-4 pl-4 md:pl-6 border-l-2 border-slate-800/80 space-y-3">
                  {p.replies?.map((r: any) => (
                    <div key={r.id} className="bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
                      <div className="flex items-center gap-2 mb-1.5">
                        {r.avatar_url ? (
                          <img src={r.avatar_url} alt={r.alias} className="w-5 h-5 rounded-full object-cover border border-slate-700 bg-white" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-600 to-green-800 flex items-center justify-center font-bold text-white text-[10px] border border-slate-700">
                            ⚽
                          </div>
                        )}
                        <span className="font-bold text-blue-400 text-xs">{r.alias}</span>
                        <span className="text-slate-500 text-[10px]">
                          {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {currentUser && r.alias === currentUser && (
                          <button 
                            onClick={() => handleDeleteReply(p.id, r.id)}
                            className="ml-auto text-slate-500 hover:text-red-400 transition-colors p-1"
                            title="Delete reply"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                      <p className="text-slate-300 text-sm md:text-[15px] ml-7">{r.content}</p>
                    </div>
                  ))}
                  
                  {replyingTo === p.id && (
                    <div className="mt-3 flex gap-2 ml-7">
                      <input 
                        type="text" 
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Write a reply..."
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 shadow-inner"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleReplySubmit(p.id);
                        }}
                      />
                      <button 
                        onClick={() => handleReplySubmit(p.id)}
                        disabled={submittingReply || !replyContent.trim()}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 shadow-md"
                      >
                        Reply
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
