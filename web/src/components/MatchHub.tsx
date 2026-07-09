"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Bot, User, CheckCircle2, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function MatchHub({ alias }: { alias: string }) {
  const [matches, setMatches] = useState<any[]>([]);
  const [insights, setInsights] = useState<Record<string, { insight: string, predictedWinner: string }>>({});
  const [loading, setLoading] = useState(true);

  // Form states per match
  const [predictions, setPredictions] = useState<Record<string, { winner: string, score: string, justification: string }>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      // Fetch upcoming matches
      const { data: matchData } = await supabase
        .from("matches")
        .select("*")
        .is("result", null)
        .order("kickoff")
        .limit(2);
      
      if (matchData) {
        setMatches(matchData);
        // Fetch insights for these matches
        const matchIds = matchData.map((m: any) => m.id);
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
      }
      setLoading(false);
    }
    fetchData();
  }, []);

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
        match_id: matchId,
        prediction: pred.winner,
        score_prediction: pred.score,
        justification: pred.justification,
        countered_ai: counteredAi
      });

    setSubmitting(null);
    if (!error) {
      setSuccessMsg(`Prediction for match submitted successfully!`);
      // Clear form
      setPredictions(prev => ({ ...prev, [matchId]: { winner: "", score: "", justification: "" } }));
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

      {matches.map((match) => {
        const pred = predictions[match.id] || { winner: "", score: "", justification: "" };
        const kickoff = new Date(match.kickoff).toLocaleString();

        return (
          <div key={match.id} className="glass-card overflow-hidden">
            <div className="bg-slate-800/80 p-4 border-b border-slate-700/50 flex justify-between items-center">
              <h3 className="font-bold text-xl">
                {match.home_team} <span className="text-slate-500 font-normal mx-2">vs</span> {match.away_team}
              </h3>
              <span className="text-sm text-slate-400 bg-slate-900 px-3 py-1 rounded-full">{kickoff}</span>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* AI Analysis */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-blue-400 font-medium pb-2 border-b border-slate-700">
                  <Bot size={20} /> Machine Insight
                </div>
                {insights[match.id] ? (
                  <div className="text-slate-300 leading-relaxed text-sm bg-blue-950/20 p-4 rounded-lg border border-blue-900/30 font-sans prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{insights[match.id].insight}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-slate-500 italic text-sm">No AI insights available for this fixture.</p>
                )}
              </div>

              {/* Human Prediction Form */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-400 font-medium pb-2 border-b border-slate-700">
                  <User size={20} /> Counter or Support the AI
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={pred.winner}
                      onChange={(e) => handlePredictionChange(match.id, "winner", e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-md p-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
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
                      className="bg-slate-900 border border-slate-700 rounded-md p-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <textarea
                    placeholder="Provide your tactical counter-argument or supporting evidence here..."
                    value={pred.justification}
                    onChange={(e) => handlePredictionChange(match.id, "justification", e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-md p-3 text-sm min-h-[120px] focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
                  />
                  <button
                    onClick={() => submitPrediction(match.id)}
                    disabled={!pred.winner || !pred.score || !pred.justification || submitting === match.id}
                    className="w-full bg-slate-700 hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-slate-700 text-white font-medium py-2 rounded-md transition-colors"
                  >
                    {submitting === match.id ? "Submitting..." : "Submit Your Argument"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
