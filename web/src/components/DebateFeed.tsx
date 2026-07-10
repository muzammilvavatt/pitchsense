"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ThumbsUp, Clock, MessageSquare, Trash2 } from "lucide-react";
import { getPrestigeBadge, PrestigeBadge } from "@/lib/badges";
import { resolveAvatar } from "@/lib/avatar";

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
    <div className="max-w-3xl mx-auto space-y-8 pb-10">
      
      {/* HEADER */}
      <div className="flex justify-between items-center px-2">
        <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
          <MessageSquare className="text-[#AEFC00]" size={24} /> Debates
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

      {/* FEED */}
      <div className="flex flex-col gap-6 md:gap-8">
        {predictions.length === 0 ? (
          <div className="p-10 text-center text-[var(--text-muted)] bento-card rounded-3xl">No predictions yet.</div>
        ) : (
          predictions.map((p, index) => {
            const match = p.matches || {};
            const timeAgo = new Date(p.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

            return (
              <div key={p.id} className="bento-card rounded-3xl p-5 md:p-8 flex flex-col gap-5 relative overflow-hidden group">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#AEFC00]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                {/* POST HEADER */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <img src={resolveAvatar(p.avatar_url, p.alias)} alt={p.alias} className="w-12 h-12 md:w-14 md:h-14 rounded-2xl object-cover border-2 border-[var(--border-lime)] bg-black/40 shadow-lg" />
                    
                    {/* User Info */}
                    <div className="flex flex-col">
                      <span className={`font-bold text-base md:text-lg hover:underline cursor-pointer ${userBadges[p.alias]?.colorClass || 'text-white'}`}>
                        {p.alias} {userBadges[p.alias]?.emoji}
                      </span>
                      <span className="text-[var(--text-muted)] text-xs flex items-center gap-1 font-medium">
                        <Clock size={12} /> {timeAgo}
                      </span>
                    </div>
                  </div>

                  {/* Match Context Badge */}
                  <div className="hidden sm:inline-flex items-center gap-2 bg-black/20 border border-[var(--border-medium)] px-3 py-1.5 rounded-2xl">
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
                    <span className="text-xs text-[var(--text-secondary)] font-medium">
                      {match.home_team} vs {match.away_team}
                    </span>
                  </div>
                </div>

                {/* Mobile Match Context (if hidden on desktop) */}
                <div className="sm:hidden inline-flex items-center gap-2 bg-black/20 border border-[var(--border-medium)] px-3 py-1.5 rounded-2xl self-start">
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
                  <span className="text-[11px] text-[var(--text-secondary)] font-medium">
                    {match.home_team} vs {match.away_team}
                  </span>
                </div>

                {/* CONTENT */}
                <div className="flex flex-col gap-4 pl-0 md:pl-[72px]">
                  {/* Picked Pill */}
                  <div className="inline-flex self-start items-center gap-2 bg-[#AEFC00]/10 border border-[#AEFC00]/30 px-4 py-2 rounded-2xl">
                    <span className="text-[var(--text-muted)] text-sm font-semibold uppercase tracking-widest">Picked</span>
                    <span className="font-black text-[#AEFC00] text-sm md:text-base">
                      {p.prediction} <span className="text-[#AEFC00]/70 font-bold">({p.score_prediction})</span>
                    </span>
                  </div>

                  {/* Justification Text */}
                  {p.justification && p.justification.trim() !== "" && (
                    <p className="text-[var(--text-primary)] text-base md:text-lg leading-relaxed whitespace-pre-wrap font-medium">
                      {p.justification}
                    </p>
                  )}

                  {/* Action Bar */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => handleUpvote(p.id, p.likes || 0)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold transition-all border ${
                        likedIds.has(p.id) 
                          ? 'bg-[#AEFC00]/20 text-[#AEFC00] border-[#AEFC00]/30' 
                          : 'bg-black/20 text-[var(--text-secondary)] border-[var(--border-medium)] hover:text-white hover:border-[var(--text-muted)]'
                      }`}
                    >
                      <ThumbsUp size={16} className={likedIds.has(p.id) ? 'fill-[#AEFC00]' : ''} /> 
                      {p.likes || 0}
                    </button>
                    
                    <button
                      onClick={() => {
                        if (isGuest) {
                          onLoginClick?.();
                        } else {
                          setReplyingTo(replyingTo === p.id ? null : p.id);
                          setReplyContent("");
                        }
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold transition-all border ${
                        replyingTo === p.id
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          : 'bg-black/20 text-[var(--text-secondary)] border-[var(--border-medium)] hover:text-white hover:border-[var(--text-muted)]'
                      }`}
                    >
                      <MessageSquare size={16} className={replyingTo === p.id ? 'fill-blue-500/20' : ''} />
                      {p.replies?.length || 0}
                    </button>
                  </div>
                </div>

                {/* REPLIES SECTION */}
                {(p.replies?.length > 0 || replyingTo === p.id) && (
                  <div className="mt-4 ml-0 md:ml-[72px] bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-3xl p-4 md:p-6 flex flex-col gap-4">
                    {p.replies?.map((r: any) => (
                      <div key={r.id} className="flex gap-3 md:gap-4">
                        {/* Avatar */}
                        <img src={resolveAvatar(r.avatar_url, r.alias)} alt={r.alias} className="w-8 h-8 md:w-10 md:h-10 rounded-xl object-cover border border-[var(--border-lime)] bg-black/40 shrink-0" />
                        
                        {/* Reply Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-bold text-sm md:text-base hover:underline cursor-pointer ${userBadges[r.alias]?.colorClass || 'text-white'}`}>
                              {r.alias} {userBadges[r.alias]?.emoji}
                            </span>
                            <span className="text-[var(--text-muted)] text-[10px] md:text-xs font-medium">
                              {new Date(r.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {currentUserAlias && r.alias === currentUserAlias && (
                              <button 
                                onClick={() => handleDeleteReply(p.id, r.id)}
                                className="ml-auto text-[var(--text-muted)] hover:text-red-400 transition-colors p-1 bg-red-500/0 hover:bg-red-500/10 rounded-lg"
                                title="Delete reply"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                          <p className="text-[var(--text-secondary)] text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium">
                            {r.content}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {/* Reply Input Box */}
                    {replyingTo === p.id && (
                      <div className="flex gap-3 md:gap-4 mt-2 pt-4 border-t border-[var(--border-subtle)]">
                        <img src={resolveAvatar(currentUserAvatar, currentUserAlias)} alt={currentUserAlias || "You"} className="w-8 h-8 md:w-10 md:h-10 rounded-xl object-cover border border-[var(--border-lime)] bg-black/40 shrink-0 shadow-[0_0_5px_rgba(174,252,0,0.2)]" />
                        <div className="flex-1 flex flex-col md:flex-row gap-2">
                          <input 
                            type="text" 
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder={currentUserAlias ? `Replying as ${currentUserAlias}...` : "Write a reply..."}
                            className="bento-input flex-1 px-4 py-3 text-sm rounded-2xl bg-black/20"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleReplySubmit(p.id);
                            }}
                          />
                          <button 
                            onClick={() => handleReplySubmit(p.id)}
                            disabled={submittingReply || !replyContent.trim()}
                            className="btn-lime px-6 py-3 rounded-2xl text-sm disabled:opacity-50 font-bold"
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
