"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ThumbsUp, Clock, MessageSquare, Trash2 } from "lucide-react";
import { getPrestigeBadge, PrestigeBadge } from "@/lib/badges";
import { getDefaultAvatar } from "@/lib/avatar";

export default function DebateFeed({ currentUserAlias, currentUserAvatar, isGuest, onLoginClick }: { currentUserAlias?: string | null, currentUserAvatar?: string | null, isGuest?: boolean, onLoginClick?: () => void }) {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [userBadges, setUserBadges] = useState<Record<string, PrestigeBadge | null>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [sortBy, setSortBy] = useState<"top" | "recent">("top");

  const fetchPredictions = async (currentSort: "top" | "recent") => {
    // Only fetch predictions from the last 72 hours to keep the feed fresh
    const threeDaysAgo = new Date();
    threeDaysAgo.setHours(threeDaysAgo.getHours() - 72);

    let query = supabase
      .from("predictions")
      .select(`
        id, alias, prediction, score_prediction, justification, likes, created_at,
        matches ( home_team, away_team ),
        replies ( id, alias, avatar_url, content, created_at )
      `)
      .gte('created_at', threeDaysAgo.toISOString());
      
    if (currentSort === "top") {
      query = query.order("likes", { ascending: false }).order("created_at", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }
    
    const { data } = await query.limit(50);
    
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
    const fetchLikes = async () => {
      if (currentUserAlias) {
        const { data } = await supabase
          .from('prediction_likes')
          .select('prediction_id')
          .eq('alias', currentUserAlias);
        if (data) {
          setLikedIds(new Set(data.map(d => d.prediction_id)));
        }
      } else {
        setLikedIds(new Set());
      }
    };
    const fetchBadges = async () => {
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
    };
    fetchLikes();
    fetchBadges();
    
    fetchPredictions(sortBy);
    
    // Subscribe to new predictions
    const channel = supabase
      .channel("public:predictions")
      .on("postgres_changes", { event: "*", schema: "public", table: "predictions" }, payload => {
        fetchPredictions(sortBy);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sortBy, currentUserAlias]);

  const handleUpvote = async (id: string, currentLikes: number) => {
    if (isGuest) {
      onLoginClick?.();
      return;
    }
    if (!currentUserAlias) return;

    const isLiked = likedIds.has(id);
    const newLikedIds = new Set(likedIds);
    let newLikesCount = currentLikes;

    if (isLiked) {
      newLikedIds.delete(id);
      newLikesCount = Math.max(0, currentLikes - 1);
      
      // DB update
      await supabase
        .from("prediction_likes")
        .delete()
        .eq("prediction_id", id)
        .eq("alias", currentUserAlias);
    } else {
      newLikedIds.add(id);
      newLikesCount = currentLikes + 1;
      
      // DB update
      await supabase
        .from("prediction_likes")
        .insert({ prediction_id: id, alias: currentUserAlias });
    }

    // Update local state
    setLikedIds(newLikedIds);

    // Optimistic UI update
    setPredictions(current => current.map(p => p.id === id ? { ...p, likes: newLikesCount } : p));
  };

  const handleReplySubmit = async (predictionId: string) => {
    if (isGuest) {
      onLoginClick?.();
      return;
    }
    if (!replyContent.trim()) return;
    setSubmittingReply(true);

    const validAvatar = (currentUserAvatar && currentUserAvatar !== "null" && currentUserAvatar !== "undefined") ? currentUserAvatar : null;

    const { error } = await supabase.from("replies").insert({
      prediction_id: predictionId,
      alias: currentUserAlias || "UnknownUser",
      avatar_url: validAvatar,
      content: replyContent.trim(),
    });

    if (!error) {
      setReplyingTo(null);
      setReplyContent("");
      fetchPredictions(sortBy);
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
    <div className="max-w-3xl mx-auto bento-card rounded-3xl overflow-hidden">
      <div className="flex justify-between items-center p-5 border-b border-[var(--border-subtle)] bg-[var(--bg-card-hover)]">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <MessageSquare className="text-[#AEFC00]" size={18} /> Debates
        </h2>
        <div className="flex bg-[var(--bg-base)] rounded-2xl p-1 border border-[var(--border-medium)]">
          <button 
            onClick={() => setSortBy("top")}
            className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-all ${sortBy === "top" ? "bg-[#AEFC00] text-black shadow-sm" : "text-[var(--text-secondary)] hover:text-white"}`}
          >
            Top
          </button>
          <button 
            onClick={() => setSortBy("recent")}
            className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-all ${sortBy === "recent" ? "bg-[#AEFC00] text-black shadow-sm" : "text-[var(--text-secondary)] hover:text-white"}`}
          >
            Recent
          </button>
        </div>
      </div>

      <div className="flex flex-col">
      {predictions.length === 0 ? (
        <div className="p-10 text-center text-slate-400">No predictions yet.</div>
      ) : (
        predictions.map((p, index) => {
          const match = p.matches || {};
          const timeAgo = new Date(p.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          const isLastPost = index === predictions.length - 1;

          return (
            <div key={p.id} className="p-4 md:p-6 flex gap-3 md:gap-5 hover:bg-[var(--bg-card-hover)] transition-colors border-b border-[var(--border-subtle)] group">
              
              {/* PARENT POST */}
              <div className="flex gap-3 md:gap-4">
                {/* Left Column: Avatar & Thread Line */}
                <div className="w-10 md:w-12 flex flex-col items-center shrink-0">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt={p.alias} className="w-10 h-10 md:w-12 md:h-12 rounded-2xl object-cover border-2 border-[var(--border-lime)] bg-black/40 z-10" />
                  ) : (
                    <img src={getDefaultAvatar(p.alias)} alt={p.alias} className="w-10 h-10 md:w-12 md:h-12 rounded-2xl object-cover border-2 border-[var(--border-lime)] bg-black/40 z-10 p-1" />
                  )}
                  {(p.replies?.length > 0 || replyingTo === p.id) && (
                    <div className="w-0.5 grow bg-[var(--border-subtle)] my-1.5 rounded-full min-h-[20px]"></div>
                  )}
                </div>

                {/* Right Column: Content */}
                <div className="flex-1 min-w-0 pb-3">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-semibold text-[15px] md:text-base hover:underline cursor-pointer ${userBadges[p.alias]?.colorClass || 'text-white'}`}>
                        {p.alias} {userBadges[p.alias]?.emoji}
                      </span>
                      <span className="text-[var(--text-muted)] text-xs flex items-center gap-1">
                        <Clock size={12} /> {timeAgo}
                      </span>
                    </div>
                  </div>

                  {/* Match Context Badge */}
                  <div className="inline-flex items-center gap-2 bg-[var(--bg-base)] border border-[var(--border-medium)] px-3 py-1.5 rounded-2xl mb-3 mt-1">
                    <div className="flex -space-x-1.5 shrink-0">
                      {match.home_logo ? (
                        <img src={match.home_logo} className="w-4 h-4 rounded-full bg-slate-800 object-contain p-0.5" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[8px] font-bold z-0">H</div>
                      )}
                      {match.away_logo ? (
                        <img src={match.away_logo} className="w-4 h-4 rounded-full bg-slate-800 object-contain p-0.5 z-10" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center text-[8px] font-bold z-10">A</div>
                      )}
                    </div>
                    <span className="text-[11px] md:text-xs text-slate-400 font-medium">
                      {match.home_team} vs {match.away_team}
                    </span>
                  </div>

                  <div className="mb-4">
                    <span className="text-slate-400 text-sm md:text-base">Picked </span>
                    <span className="font-bold text-emerald-400 text-sm md:text-base tracking-wide">
                      {p.prediction} <span className="text-emerald-500/70 font-normal">({p.score_prediction})</span>
                    </span>
                  </div>

                  {p.justification && p.justification.trim() !== "" && (
                    <div className="mb-4">
                      <p className="text-[var(--text-primary)] text-base md:text-lg leading-relaxed whitespace-pre-wrap">
                        {p.justification}
                      </p>
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="flex items-center gap-4 md:gap-6 text-slate-500">
                    <button
                      onClick={() => {
                        if (isGuest) {
                          onLoginClick?.();
                        } else {
                          setReplyingTo(replyingTo === p.id ? null : p.id);
                          setReplyContent("");
                        }
                      }}
                      className={`flex items-center gap-1.5 text-xs md:text-sm font-medium transition-colors group ${
                        replyingTo === p.id ? 'text-blue-400' : 'hover:text-blue-400'
                      }`}
                    >
                      <div className={`p-1.5 md:p-2 rounded-full transition-colors ${replyingTo === p.id ? 'bg-blue-900/30' : 'group-hover:bg-blue-900/30'}`}>
                        <MessageSquare size={16} />
                      </div>
                      <span>{p.replies?.length || 0}</span>
                    </button>
                    <button
                      onClick={() => handleUpvote(p.id, p.likes || 0)}
                      className={`flex items-center gap-1.5 text-xs md:text-sm font-medium transition-colors group ${
                        likedIds.has(p.id) ? 'text-emerald-400' : 'hover:text-emerald-400'
                      }`}
                    >
                      <div className={`p-1.5 md:p-2 rounded-full transition-colors ${likedIds.has(p.id) ? 'bg-emerald-900/30' : 'group-hover:bg-emerald-900/30'}`}>
                        <ThumbsUp size={16} className={likedIds.has(p.id) ? 'fill-emerald-400 text-emerald-400' : ''} /> 
                      </div>
                      <span>{p.likes || 0}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* REPLIES SECTION */}
              {(p.replies?.length > 0 || replyingTo === p.id) && (
                <div className="flex flex-col mt-1">
                  {p.replies?.map((r: any, idx: number) => {
                    const isLast = idx === p.replies.length - 1 && replyingTo !== p.id;
                    return (
                      <div key={r.id} className="flex gap-3 md:gap-4">
                        {/* Avatar Column */}
                        <div className="w-10 md:w-12 flex flex-col items-center shrink-0">
                          {r.avatar_url ? (
                            <img src={r.avatar_url} alt={r.alias} className="w-7 h-7 md:w-8 md:h-8 rounded-xl object-cover border border-[var(--border-lime)] bg-black/40 z-10" />
                          ) : (
                            <img src={getDefaultAvatar(r.alias)} alt={r.alias} className="w-7 h-7 md:w-8 md:h-8 rounded-xl object-cover border border-[var(--border-lime)] bg-black/40 z-10 p-1" />
                          )}
                          {!isLast && (
                            <div className="w-0.5 grow bg-[var(--border-subtle)] my-1.5 rounded-full min-h-[20px]"></div>
                          )}
                        </div>

                        {/* Reply Content */}
                        <div className="flex-1 min-w-0 pb-3">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`font-semibold text-[13px] md:text-[14px] hover:underline cursor-pointer ${userBadges[r.alias]?.colorClass || 'text-white'}`}>
                              {r.alias} {userBadges[r.alias]?.emoji}
                            </span>
                            <span className="text-[var(--text-muted)] text-[10px] md:text-[11px]">
                              {new Date(r.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {currentUserAlias && r.alias === currentUserAlias && (
                              <button 
                                onClick={() => handleDeleteReply(p.id, r.id)}
                                className="ml-auto text-slate-500 hover:text-red-400 transition-colors p-1"
                                title="Delete reply"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                          <p className="text-slate-300 text-[13px] md:text-[14px] leading-relaxed whitespace-pre-wrap">{r.content}</p>
                        </div>
                      </div>
                    );
                  })}
                  
                  {replyingTo === p.id && (
                    <div className="flex gap-3 md:gap-4 pt-1">
                      {/* Current User Avatar */}
                      <div className="w-10 md:w-12 flex flex-col items-center shrink-0">
                        {(currentUserAvatar && currentUserAvatar !== "null" && currentUserAvatar !== "undefined") ? (
                          <img src={currentUserAvatar} alt={currentUserAlias || ""} className="w-7 h-7 md:w-8 md:h-8 rounded-xl object-cover border border-[var(--border-lime)] bg-black/40 shadow-[0_0_5px_rgba(174,252,0,0.2)]" />
                        ) : (
                          <img src={getDefaultAvatar(currentUserAlias)} alt="You" className="w-7 h-7 md:w-8 md:h-8 rounded-xl object-cover border border-[var(--border-lime)] bg-black/40 shadow-[0_0_5px_rgba(174,252,0,0.2)] p-1" />
                        )}
                      </div>
                      
                      {/* Input Field */}
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <input 
                          type="text" 
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder={currentUserAlias ? `Replying as ${currentUserAlias}...` : "Write a reply..."}
                          className="bento-input flex-1 px-4 py-2 md:py-2.5 text-[13px] md:text-sm bg-[var(--bg-base)]"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleReplySubmit(p.id);
                          }}
                        />
                        <button 
                          onClick={() => handleReplySubmit(p.id)}
                          disabled={submittingReply || !replyContent.trim()}
                          className="btn-lime px-5 py-2 rounded-2xl text-[13px] md:text-sm disabled:opacity-50"
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
      </div>
    </div>
  );
}
