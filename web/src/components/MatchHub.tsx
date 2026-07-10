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
          <div key={match.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm transition-colors hover:border-slate-700">
            {/* Clean Match Header */}
            <div className="p-4 md:p-6 flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8 border-b border-slate-800/50 bg-slate-900/50">
              
              {/* Home Team */}
              <div className="flex-1 flex items-center justify-end gap-4 w-full md:w-auto">
                <h3 className="text-xl md:text-2xl font-bold text-white text-right leading-tight">{match.home_team}</h3>
                <div className="w-12 h-12 md:w-16 md:h-16 shrink-0 flex items-center justify-center bg-slate-800 rounded-full border border-slate-700 p-2">
                  {match.home_logo ? (
                    <img src={match.home_logo} alt={match.home_team} className="w-full h-full object-contain" />
                  ) : (
                    <span className="font-bold text-slate-500 text-lg">H</span>
                  )}
                </div>
              </div>

              {/* Center Match Info */}
              <div className="flex flex-col items-center justify-center shrink-0 w-24">
                <div className="text-sm font-medium text-slate-500 mb-1">VS</div>
                <div className="text-xs text-emerald-500 font-semibold bg-emerald-500/10 px-3 py-1 rounded-full whitespace-nowrap">
                  {kickoff.split(', ')[1]} {/* Just show time */}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">{kickoff.split(', ')[0]}</div>
              </div>

              {/* Away Team */}
              <div className="flex-1 flex items-center justify-start gap-4 w-full md:w-auto">
                <div className="w-12 h-12 md:w-16 md:h-16 shrink-0 flex items-center justify-center bg-slate-800 rounded-full border border-slate-700 p-2">
                  {match.away_logo ? (
                    <img src={match.away_logo} alt={match.away_team} className="w-full h-full object-contain" />
                  ) : (
                    <span className="font-bold text-slate-500 text-lg">A</span>
                  )}
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white text-left leading-tight">{match.away_team}</h3>
              </div>
            </div>

            <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              {/* AI Analysis */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-blue-400 font-medium pb-2 border-b border-slate-700">
                  <Bot size={18} /> Machine Insight
                </div>
                {insights[match.id] ? (
                  <div className="text-slate-300 leading-relaxed text-sm bg-slate-900 p-5 rounded-lg border border-slate-800 font-sans prose prose-invert prose-sm max-w-none">
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
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 text-center space-y-2">
                    <CheckCircle2 className="mx-auto text-emerald-500 mb-2" size={24} />
                    <h4 className="text-white font-bold">Prediction Locked</h4>
                    <p className="text-slate-400 text-sm">You picked <span className="font-bold text-white">{pred.winner} ({pred.score})</span></p>
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
                              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white font-bold py-2.5 rounded-lg transition-colors"
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


