"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ThumbsUp, Clock, MessageSquare, Trash2 } from "lucide-react";

export default function DebateFeed({ currentUserAlias, currentUserAvatar }: { currentUserAlias?: string | null, currentUserAvatar?: string | null }) {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [sortBy, setSortBy] = useState<"top" | "recent">("top");
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());

  const fetchPredictions = async (currentSort: "top" | "recent") => {
    let query = supabase
      .from("predictions")
      .select(`
        id, alias, prediction, score_prediction, justification, likes, created_at,
        matches ( home_team, away_team ),
        replies ( id, alias, avatar_url, content, created_at )
      `);
      
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
    // Load previously liked IDs from local storage
    const storedLikes = localStorage.getItem('pitchsense_liked_predictions');
    if (storedLikes) {
      setLikedIds(new Set(JSON.parse(storedLikes)));
    }
    
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
  }, [sortBy]);

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedPosts);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedPosts(newSet);
  };

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
      <div className="flex justify-between items-center mb-2 border-b border-slate-800/50 pb-3">
        <h2 className="text-lg font-bold text-white hidden md:flex items-center gap-2">
          <MessageSquare className="text-blue-500" size={18} /> Match Debates
        </h2>
        <div className="flex bg-slate-900/80 rounded-lg p-1 border border-slate-800 ml-auto md:ml-0">
          <button 
            onClick={() => setSortBy("top")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${sortBy === "top" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
          >
            Top
          </button>
          <button 
            onClick={() => setSortBy("recent")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${sortBy === "recent" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
          >
            Recent
          </button>
        </div>
      </div>

      {predictions.length === 0 ? (
        <div className="glass-card p-10 text-center text-slate-400">No predictions yet.</div>
      ) : (
        predictions.map((p) => {
          const match = p.matches || {};
          const timeAgo = new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return (
            <div key={p.id} className="glass-card p-4 hover:border-slate-500/50 transition-colors flex flex-col">
              
              {/* PARENT POST */}
              <div className="flex gap-3 md:gap-4">
                {/* Left Column: Avatar & Thread Line */}
                <div className="w-10 md:w-12 flex flex-col items-center shrink-0">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt={p.alias} className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border border-slate-600 bg-white z-10" />
                  ) : (
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-emerald-600 to-green-800 flex items-center justify-center font-bold text-white text-base md:text-lg border border-slate-600 z-10">
                      ⚽
                    </div>
                  )}
                  {(p.replies?.length > 0 || replyingTo === p.id) && (
                    <div className="w-0.5 grow bg-slate-800/80 my-1.5 rounded-full min-h-[20px]"></div>
                  )}
                </div>

                {/* Right Column: Content */}
                <div className="flex-1 min-w-0 pb-3">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-[15px] md:text-base hover:underline cursor-pointer">{p.alias}</span>
                      <span className="text-slate-500 text-xs flex items-center gap-1">
                        <Clock size={12} /> {timeAgo}
                      </span>
                    </div>
                  </div>

                  {/* Match Context Badge */}
                  <div className="inline-flex items-center gap-2 bg-slate-900/40 border border-slate-700/50 px-2.5 py-1 rounded-md mb-2.5 mt-0.5">
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

                  <div className="mb-2">
                    <span className="text-slate-400 text-[13px] md:text-sm">Picked </span>
                    <span className="font-bold text-emerald-400 text-[13px] md:text-sm">
                      {p.prediction} <span className="text-emerald-500/70 font-normal">({p.score_prediction})</span>
                    </span>
                  </div>

                  <div className="bg-slate-900/50 p-3 md:p-4 rounded-xl border border-slate-800/80 mb-3">
                    <p className={`text-white text-[15px] md:text-[16px] leading-relaxed whitespace-pre-wrap ${!expandedPosts.has(p.id) ? "line-clamp-4" : ""}`}>
                      {p.justification}
                    </p>
                    {p.justification?.length > 180 && !expandedPosts.has(p.id) && (
                      <button 
                        onClick={() => toggleExpand(p.id)}
                        className="text-blue-400 text-sm font-bold mt-2 hover:underline"
                      >
                        Read more
                      </button>
                    )}
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center gap-4 md:gap-6 text-slate-500">
                    <button
                      onClick={() => {
                        setReplyingTo(replyingTo === p.id ? null : p.id);
                        setReplyContent("");
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
                          {(r.avatar_url && r.avatar_url !== "null" && r.avatar_url !== "undefined") ? (
                            <img src={r.avatar_url} alt={r.alias} className="w-7 h-7 md:w-8 md:h-8 rounded-full object-cover border border-slate-700 bg-white z-10" />
                          ) : (
                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-emerald-600 to-green-800 flex items-center justify-center font-bold text-white text-[10px] border border-slate-700 z-10">
                              ⚽
                            </div>
                          )}
                          {!isLast && (
                            <div className="w-0.5 grow bg-slate-800/80 my-1.5 rounded-full min-h-[20px]"></div>
                          )}
                        </div>

                        {/* Reply Content */}
                        <div className="flex-1 min-w-0 pb-3">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-bold text-white text-[13px] md:text-[14px] hover:underline cursor-pointer">{r.alias}</span>
                            <span className="text-slate-500 text-[10px] md:text-[11px]">
                              {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                          <img src={currentUserAvatar} alt={currentUserAlias || ""} className="w-7 h-7 md:w-8 md:h-8 rounded-full object-cover border border-slate-700 bg-white" />
                        ) : (
                          <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-emerald-600 to-green-800 flex items-center justify-center font-bold text-white text-[10px] border border-slate-700">
                            ⚽
                          </div>
                        )}
                      </div>
                      
                      {/* Input Field */}
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <input 
                          type="text" 
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder={currentUserAlias ? `Replying as ${currentUserAlias}...` : "Write a reply..."}
                          className="flex-1 bg-slate-900/50 border border-slate-700 rounded-full px-4 py-1.5 md:py-2 text-[13px] md:text-sm text-white focus:outline-none focus:border-blue-500 shadow-inner"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleReplySubmit(p.id);
                          }}
                        />
                        <button 
                          onClick={() => handleReplySubmit(p.id)}
                          disabled={submittingReply || !replyContent.trim()}
                          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 md:py-2 rounded-full text-[13px] md:text-sm font-bold transition-colors disabled:opacity-50 shadow-md"
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
  );
}
