"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Bot, User, CheckCircle2, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import SeasonBanner from "./SeasonBanner";

export default function MatchHub({ alias, avatarUrl }: { alias: string, avatarUrl?: string | null }) {
  const [matches, setMatches] = useState<any[]>([]);
  const [insights, setInsights] = useState<Record<string, { insight: string, predictedWinner: string }>>({});
  const [loading, setLoading] = useState(true);

  // Form states per match
  const [predictions, setPredictions] = useState<Record<string, { winner: string, score: string, justification: string, locked?: boolean }>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      // 1. Fetch upcoming matches (kickoff > now)
      const now = new Date().toISOString();
      const { data: matchData } = await supabase
        .from("matches")
        .select("*")
        .is("result", null)
        .gt("kickoff", now)
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

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="bg-emerald-500/20 border border-emerald-500 text-emerald-400 p-4 rounded-lg flex items-center gap-3 animate-fade-in">
          <CheckCircle2 size={20} /> {successMsg}
        </div>
      )}

      <SeasonBanner />

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
          <div key={match.id} className="glass-card overflow-hidden">
            <div className="bg-slate-800/80 p-4 border-b border-slate-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h3 className="font-bold text-lg md:text-xl">
                {match.home_team} <span className="text-slate-500 font-normal mx-1 md:mx-2 text-sm md:text-base">vs</span> {match.away_team}
              </h3>
              <span className="text-xs md:text-sm text-slate-400 bg-slate-900 px-3 py-1 rounded-full whitespace-nowrap">{kickoff}</span>
            </div>

            <div className="flex justify-between items-center px-2 md:px-8 py-6 mb-2 mt-4 mx-4 relative bg-slate-900/30 rounded-2xl border border-slate-800/50">
              {/* VS Badge */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-slate-700 text-slate-500 font-black italic rounded-full w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-xs md:text-sm z-10 shadow-xl shadow-black/50">
                VS
              </div>
              
              <div className="text-center w-5/12 flex flex-col items-center gap-2">
                {match.home_logo ? (
                  <img src={match.home_logo} alt={match.home_team} className="w-14 h-14 md:w-24 md:h-24 object-contain drop-shadow-xl" />
                ) : (
                  <div className="w-14 h-14 md:w-24 md:h-24 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-500 shadow-inner">H</div>
                )}
                <h3 className="text-base md:text-2xl font-black text-white leading-tight mt-1">{match.home_team}</h3>
              </div>
              
              <div className="text-center w-5/12 flex flex-col items-center gap-2">
                {match.away_logo ? (
                  <img src={match.away_logo} alt={match.away_team} className="w-14 h-14 md:w-24 md:h-24 object-contain drop-shadow-xl" />
                ) : (
                  <div className="w-14 h-14 md:w-24 md:h-24 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-500 shadow-inner">A</div>
                )}
                <h3 className="text-base md:text-2xl font-black text-white leading-tight mt-1">{match.away_team}</h3>
              </div>
            </div>

            <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              {/* AI Analysis */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-blue-400 font-medium pb-2 border-b border-slate-700">
                  <Bot size={18} /> Machine Insight
                </div>
                {insights[match.id] ? (
                  <div className="text-slate-300 leading-relaxed text-sm bg-blue-950/20 p-4 rounded-xl border border-blue-900/30 font-sans prose prose-invert prose-sm max-w-none shadow-inner">
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
                      placeholder="Provide your tactical justification here..."
                      value={pred.justification}
                      onChange={(e) => handlePredictionChange(match.id, "justification", e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm min-h-[100px] focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
                    />
                            <button
                              onClick={() => submitPrediction(match.id)}
                              disabled={!pred.winner || !pred.score || !pred.justification || submitting === match.id}
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


