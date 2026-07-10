"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Bot, User, CheckCircle2, AlertCircle, Share2, Copy } from "lucide-react";
import ReactMarkdown from "react-markdown";
import SeasonBanner from "./SeasonBanner";

export default function MatchHub({ alias, avatarUrl, isGuest, onLoginClick }: { alias: string, avatarUrl?: string | null, isGuest?: boolean, onLoginClick?: () => void }) {
  const [matches, setMatches] = useState<any[]>([]);
  const [insights, setInsights] = useState<Record<string, { insight: string, predictedWinner: string }>>({});
  const [loading, setLoading] = useState(true);

  // Form states per match
  const [predictions, setPredictions] = useState<Record<string, { winner: string, score: string, justification: string, locked?: boolean }>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      // 1. Fetch upcoming matches (now < kickoff < now + 24 hours)
      const now = new Date();
      const next24 = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const { data: matchData } = await supabase
        .from("matches")
        .select("*")
        .is("result", null)
        .gt("kickoff", now.toISOString())
        .lt("kickoff", next24.toISOString())
        .order("kickoff")
        .limit(3); // Bumped to 3 so they have options
      
      if (matchData && matchData.length > 0) {
        setMatches(matchData);
        const matchIds = matchData.map((m: any) => m.id);
        
        // 2. Fetch insights
        const { data: insightData } = await supabase
          .from("machine_insights")
          .select("*")
          .in("match_id", matchIds);
        
        if (insightData) {
          const insightMap: Record<string, { insight: string, predictedWinner: string }> = {};
          insightData.forEach((i: any) => {
            insightMap[i.match_id] = { insight: i.insight, predictedWinner: i.predicted_winner };
          });
          setInsights(insightMap);
        }

        // 3. Fetch user's existing predictions for these matches to lock them out
        const { data: existingPreds } = await supabase
          .from("predictions")
          .select("*")
          .eq("alias", alias)
          .in("match_id", matchIds);
        
        if (existingPreds) {
          const predMap: Record<string, any> = {};
          existingPreds.forEach((p: any) => {
            predMap[p.match_id] = { winner: p.prediction, score: p.score_prediction, justification: p.justification, locked: true };
          });
          setPredictions(predMap);
        }
      }
      setLoading(false);
    }
    fetchData();
  }, [alias]);

  const handlePredictionChange = (matchId: string, field: string, value: string) => {
    setPredictions(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId] || { winner: "", score: "", justification: "" },
        [field]: value
      }
    }));
  };

  const submitPrediction = async (matchId: string) => {
    if (isGuest) {
      onLoginClick?.();
      return;
    }

    const pred = predictions[matchId];
    if (!pred || !pred.winner || !pred.score || !pred.justification) return;

    setSubmitting(matchId);
    setSuccessMsg(null);

    const aiPredictedWinner = insights[matchId]?.predictedWinner || "";
    // If the user's winner is different from the AI's winner (and AI has a prediction), they are countering
    const counteredAi = aiPredictedWinner ? (pred.winner !== aiPredictedWinner) : false;

    const { error } = await supabase
      .from("predictions")
      .insert({
        alias,
        avatar_url: avatarUrl || null,
        match_id: matchId,
        prediction: pred.winner,
        score_prediction: pred.score,
        justification: pred.justification,
        countered_ai: counteredAi
      });

    setSubmitting(null);
    if (!error) {
      setSuccessMsg(`Prediction for match submitted successfully!`);
      // Lock the form
      setPredictions(prev => ({ ...prev, [matchId]: { ...prev[matchId], locked: true } }));
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  if (loading) return (
    <div className="py-20 flex flex-col items-center gap-4">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[#AEFC00] animate-bounce [animation-delay:0ms]"></div>
        <div className="w-2 h-2 rounded-full bg-[#AEFC00] animate-bounce [animation-delay:150ms]"></div>
        <div className="w-2 h-2 rounded-full bg-[#AEFC00] animate-bounce [animation-delay:300ms]"></div>
      </div>
      <p className="text-[var(--text-muted)] text-sm font-medium">Loading fixtures...</p>
    </div>
  );

  if (matches.length === 0) return (
    <div className="bento-card rounded-3xl p-12 text-center">
      <AlertCircle className="mx-auto mb-4 text-[var(--text-muted)]" size={32} />
      <p className="text-[var(--text-secondary)] font-semibold">No upcoming matches in the next 24 hours.</p>
      <p className="text-[var(--text-muted)] text-sm mt-1">Check back before kickoff!</p>
    </div>
  );

  const handleShare = async (match: any) => {
    const text = `Who will win ${match.home_team} vs ${match.away_team}? Make your prediction on PitchSense!`;
    const url = window.location.origin;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'PitchSense Prediction',
          text: text,
          url: url,
        });
      } catch (err) {
        console.log('Share dismissed');
      }
    } else {
      navigator.clipboard.writeText(`${text} ${url}`);
      alert("Link copied to clipboard!");
    }
  };

  return (
    <div className="w-full space-y-8">
      <SeasonBanner />
      {successMsg && (
        <div className="bento-card-lime rounded-2xl p-4 flex items-center gap-3 animate-fade-in">
          <CheckCircle2 size={20} className="text-[#AEFC00] shrink-0" /> 
          <span className="text-[#AEFC00] font-semibold text-sm">{successMsg}</span>
        </div>
      )}


      {(() => {
        const groupedMatches = matches.reduce((acc, match) => {
          const league = match.league || "Other Matches";
          if (!acc[league]) acc[league] = [];
          acc[league].push(match);
          return acc;
        }, {} as Record<string, any[]>);

        return Object.entries(groupedMatches).map(([league, leagueMatches]) => (
          <div key={league} className="space-y-5 mt-6">
            <div className="flex items-center gap-3">
              <div className="lime-dot"></div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                {league}
              </h2>
              <div className="h-px bg-[var(--border-subtle)] flex-grow"></div>
            </div>

            {(leagueMatches as any[]).map((match: any) => {
              const pred = predictions[match.id] || { winner: "", score: "", justification: "" };
              const kickoffDate = new Date(match.kickoff);
              const kickoffTime = kickoffDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const kickoffDay = kickoffDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

              return (
          <div key={match.id} className="bento-card rounded-3xl overflow-hidden transition-all duration-300 hover:-translate-y-0.5">
            {/* Match Header */}
            <div className="p-5 md:p-7 bg-gradient-to-br from-[var(--bg-card-hover)] to-[var(--bg-card)] border-b border-[var(--border-subtle)]">
              <div className="flex items-center justify-between mb-5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{kickoffDay}</span>
                <div className="flex items-center gap-2 bg-[#AEFC00]/10 border border-[var(--border-lime)] px-3 py-1 rounded-full animate-lime-pulse">
                  <div className="lime-dot w-1.5 h-1.5"></div>
                  <span className="text-[#AEFC00] text-xs font-bold">{kickoffTime}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 md:gap-8">
                {/* Home Team */}
                <div className="flex-1 flex flex-col items-center gap-3 text-center">
                  <div className="w-14 h-14 md:w-16 md:h-16 shrink-0 flex items-center justify-center bg-[var(--bg-card)] rounded-2xl border border-[var(--border-medium)] p-2">
                    {match.home_logo ? (
                      <img src={match.home_logo} alt={match.home_team} className="w-full h-full object-contain" />
                    ) : (
                      <span className="font-bold text-[var(--text-muted)] text-xl">H</span>
                    )}
                  </div>
                  <h3 className="text-sm md:text-base font-bold text-white leading-tight">{match.home_team}</h3>
                </div>

                {/* Center */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <span className="text-lg font-black text-[var(--text-muted)]">vs</span>
                </div>

                {/* Away Team */}
                <div className="flex-1 flex flex-col items-center gap-3 text-center">
                  <div className="w-14 h-14 md:w-16 md:h-16 shrink-0 flex items-center justify-center bg-[var(--bg-card)] rounded-2xl border border-[var(--border-medium)] p-2">
                    {match.away_logo ? (
                      <img src={match.away_logo} alt={match.away_team} className="w-full h-full object-contain" />
                    ) : (
                      <span className="font-bold text-[var(--text-muted)] text-xl">A</span>
                    )}
                  </div>
                  <h3 className="text-sm md:text-base font-bold text-white leading-tight">{match.away_team}</h3>
                </div>
              </div>
            </div>

            <div className="p-5 md:p-7 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* AI Analysis */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Bot size={14} className="text-blue-400" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">AI Analysis</span>
                </div>
                {insights[match.id] ? (
                  <div className="text-[var(--text-secondary)] leading-relaxed text-sm bg-[var(--bg-base)] p-4 rounded-2xl border border-[var(--border-subtle)] font-sans prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{insights[match.id].insight}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="bg-[var(--bg-base)] rounded-2xl p-4 border border-[var(--border-subtle)]">
                    <p className="text-[var(--text-muted)] text-sm italic">No AI insights available yet.</p>
                  </div>
                )}
              </div>

              {/* Prediction Form */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#AEFC00]/20 flex items-center justify-center">
                    <User size={14} className="text-[#AEFC00]" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">Your Prediction</span>
                </div>

                {pred.locked ? (
                  <div className="bento-card-lime rounded-2xl p-5 text-center space-y-2 relative overflow-hidden">
                    <CheckCircle2 className="mx-auto text-[#AEFC00] mb-2" size={28} />
                    <h4 className="text-white font-bold text-base">Prediction Locked In!</h4>
                    <p className="text-[#AEFC00]/70 text-sm">You picked <span className="font-bold text-white">{pred.winner}</span> — Score: <span className="font-bold text-white">{pred.score}</span></p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] ml-1">1. Pick Outcome</label>
                        <div className="flex bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden p-1 h-11">
                          <button
                            onClick={() => handlePredictionChange(match.id, "winner", match.home_team)}
                            className={`flex-1 text-xs font-bold py-1 rounded-xl transition-all ${
                              pred.winner === match.home_team 
                                ? 'bg-[#AEFC00] text-black shadow-[0_0_10px_rgba(174,252,0,0.3)]' 
                                : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'
                            }`}
                          >
                            {match.home_team}
                          </button>
                          {!match.is_knockout && (
                            <button
                              onClick={() => handlePredictionChange(match.id, "winner", "Draw")}
                              className={`flex-1 text-xs font-bold py-1 rounded-xl transition-all ${
                                pred.winner === "Draw" 
                                  ? 'bg-slate-300 text-black shadow-[0_0_10px_rgba(203,213,225,0.3)]' 
                                  : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'
                              }`}
                            >
                              Draw
                            </button>
                          )}
                          <button
                            onClick={() => handlePredictionChange(match.id, "winner", match.away_team)}
                            className={`flex-1 text-xs font-bold py-1 rounded-xl transition-all ${
                              pred.winner === match.away_team 
                                ? 'bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]' 
                                : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'
                            }`}
                          >
                            {match.away_team}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] ml-1">2. Exact Score</label>
                        <input
                          type="text"
                          placeholder="e.g. 2-1"
                          value={pred.score}
                          onChange={(e) => handlePredictionChange(match.id, "score", e.target.value)}
                          className="bento-input h-11 text-sm w-full bg-[var(--bg-base)]"
                        />
                      </div>
                    </div>
                    <textarea
                      placeholder="Your reasoning... (optional)"
                      value={pred.justification}
                      onChange={(e) => handlePredictionChange(match.id, "justification", e.target.value)}
                      className="bento-input w-full p-3 text-sm min-h-[90px] resize-none bg-[var(--bg-base)]"
                    />
                    <button
                      onClick={() => submitPrediction(match.id)}
                      disabled={!pred.winner || !pred.score || submitting === match.id}
                      className="btn-lime w-full py-3 rounded-2xl text-sm"
                    >
                      {submitting === match.id ? "Submitting..." : "Lock In Prediction →"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
              );
            })}
          </div>
        ));
      })()}
      </div>
    );
  }
