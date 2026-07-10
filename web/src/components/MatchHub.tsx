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

  if (loading) return <div className="text-center py-10 text-slate-400">Loading fixtures...</div>;

  if (matches.length === 0) return (
    <div className="glass-card p-10 text-center text-slate-400">
      <AlertCircle className="mx-auto mb-4" size={32} />
      <p>No upcoming matches found.</p>
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
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <SeasonBanner />
      {successMsg && (
        <div className="bg-emerald-500/20 border border-emerald-500 text-emerald-400 p-4 rounded-lg flex items-center gap-3 animate-fade-in">
          <CheckCircle2 size={20} /> {successMsg}
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
          <div key={league} className="space-y-6 mt-8">
            <div className="flex items-center gap-4 mb-2 pb-2">
              <h2 className="text-xl md:text-2xl font-black text-white bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-emerald-200">
                {league}
              </h2>
              <div className="h-px bg-slate-700 flex-grow"></div>
            </div>

            {(leagueMatches as any[]).map((match: any) => {
              const pred = predictions[match.id] || { winner: "", score: "", justification: "" };
              const kickoff = new Date(match.kickoff).toLocaleString();

              return (
          <div key={match.id} className="glass-card overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-[0_15px_50px_-15px_rgba(0,0,0,0.7)] hover:shadow-[0_20px_50px_-10px_rgba(16,185,129,0.2)] hover:border-emerald-500/30 transition-all duration-300 border border-slate-700/80 group">
            <div className="bg-slate-900/60 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-700/50">
              <h3 className="font-bold text-lg md:text-xl">
                {match.home_team} <span className="text-slate-500 font-normal mx-1 md:mx-2 text-sm md:text-base">vs</span> {match.away_team}
              </h3>
              <div className="flex items-center justify-between w-full sm:w-auto gap-3 mt-1 sm:mt-0">
                <span className="text-xs md:text-sm text-slate-400 bg-slate-900 px-3 py-1.5 rounded-full whitespace-nowrap border border-slate-700/50">{kickoff}</span>
                <button
                  onClick={() => handleShare(match)}
                  className="flex items-center gap-2 text-slate-300 bg-slate-700/80 hover:bg-slate-600 px-4 py-1.5 rounded-full text-sm transition-colors border border-slate-600/50 font-medium shadow-sm"
                >
                  <Share2 size={14} /> Share
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center px-6 md:px-16 py-12 mb-4 mt-6 mx-4 md:mx-6 relative bg-gradient-to-r from-emerald-900/40 via-slate-900 to-blue-900/40 rounded-3xl border border-slate-700/50 shadow-inner group-hover:from-emerald-800/40 group-hover:to-blue-800/40 transition-colors duration-500">
              {/* VS Badge */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-400 font-bold italic text-base md:text-xl bg-slate-950 px-4 py-2 rounded-full border border-slate-700 shadow-xl shadow-black/40 z-10">
                VS
              </div>
              
              <div className="text-center w-5/12 flex flex-col items-center gap-4 relative z-20">
                {match.home_logo ? (
                  <img src={match.home_logo} alt={match.home_team} className="w-20 h-20 md:w-32 md:h-32 object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.15)] group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <div className="w-20 h-20 md:w-32 md:h-32 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center font-bold text-slate-500 text-3xl shadow-inner">H</div>
                )}
                <h3 className="text-xl md:text-3xl font-black text-white mt-2 drop-shadow-md tracking-tight leading-none">{match.home_team}</h3>
              </div>
              
              <div className="text-center w-5/12 flex flex-col items-center gap-4 relative z-20">
                {match.away_logo ? (
                  <img src={match.away_logo} alt={match.away_team} className="w-20 h-20 md:w-32 md:h-32 object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.15)] group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <div className="w-20 h-20 md:w-32 md:h-32 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center font-bold text-slate-500 text-3xl shadow-inner">A</div>
                )}
                <h3 className="text-xl md:text-3xl font-black text-white mt-2 drop-shadow-md tracking-tight leading-none">{match.away_team}</h3>
              </div>
            </div>

            <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              {/* AI Analysis */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-blue-400 font-medium pb-2 border-b border-slate-700">
                  <Bot size={18} /> Machine Insight
                </div>
                {insights[match.id] ? (
                  <div className="text-slate-200 leading-loose text-base bg-blue-950/20 p-6 rounded-xl border border-blue-900/30 font-sans prose prose-invert prose-base max-w-none shadow-inner tracking-wide">
                    <ReactMarkdown>{insights[match.id].insight}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-slate-500 italic text-sm">No AI insights available for this fixture.</p>
                )}
              </div>

              {/* Human Prediction Form */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-400 font-medium pb-2 border-b border-slate-700">
                  <User size={18} /> Your Prediction
                </div>
                
                {pred.locked ? (
                  <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-6 text-center space-y-2 shadow-inner">
                    <CheckCircle2 className="mx-auto text-emerald-400 mb-2" size={32} />
                    <h4 className="text-white font-bold text-lg">Prediction Locked</h4>
                    <p className="text-slate-400 text-sm">You predicted <span className="font-bold text-white">{pred.winner} ({pred.score})</span>.</p>
                    <p className="text-slate-500 text-xs mt-2 italic">Waiting for full time...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <select
                        value={pred.winner}
                        onChange={(e) => handlePredictionChange(match.id, "winner", e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:ring-1 focus:ring-emerald-500 outline-none w-full"
                      >
                        <option value="">Select Winner</option>
                        <option value={match.home_team}>{match.home_team}</option>
                        <option value={match.away_team}>{match.away_team}</option>
                        {!match.is_knockout && <option value="Draw">Draw</option>}
                      </select>
                      <input
                        type="text"
                        placeholder="Score (e.g. 2-1)"
                        value={pred.score}
                        onChange={(e) => handlePredictionChange(match.id, "score", e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:ring-1 focus:ring-emerald-500 outline-none w-full"
                      />
                    </div>
                    <textarea
                      placeholder="Add tactical justification (Optional: Great analyses get highly liked which boosts your prestige rank!)"
                      value={pred.justification}
                      onChange={(e) => handlePredictionChange(match.id, "justification", e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm min-h-[100px] focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
                    />
                            <button
                              onClick={() => submitPrediction(match.id)}
                              disabled={!pred.winner || !pred.score || submitting === match.id}
                              className="w-full bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-900 text-white font-bold py-3 rounded-lg transition-all active:scale-[0.98] border border-emerald-600/50"
                            >
                              {submitting === match.id ? "Locking in..." : "Submit Prediction"}
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


