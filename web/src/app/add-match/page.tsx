"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, CheckCircle2, AlertCircle, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AddMatchPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    home_team: "",
    away_team: "",
    home_logo: "",
    away_logo: "",
    league: "World Cup",
    kickoff: "",
    is_knockout: false,
  });

  const [magicPrompt, setMagicPrompt] = useState("");
  const [magicLoading, setMagicLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleMagicFill = async () => {
    if (!magicPrompt.trim()) return;
    setMagicLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/parse-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: magicPrompt,
          localTime: new Date().toString()
        }),
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to parse match with AI");

      // Convert the ISO string from AI into a format datetime-local input understands (YYYY-MM-DDThh:mm)
      let kickoffLocal = "";
      if (data.kickoff) {
        const d = new Date(data.kickoff);
        if (!isNaN(d.getTime())) {
          // Format as local time string for the input
          const offset = d.getTimezoneOffset() * 60000;
          kickoffLocal = new Date(d.getTime() - offset).toISOString().slice(0, 16);
        }
      }

      setFormData(prev => ({
        ...prev,
        home_team: data.home_team || prev.home_team,
        away_team: data.away_team || prev.away_team,
        league: data.league || prev.league,
        is_knockout: data.is_knockout ?? prev.is_knockout,
        kickoff: kickoffLocal || prev.kickoff,
      }));
      
      setMagicPrompt(""); // clear after success
    } catch (err: any) {
      setError(err.message || "AI Magic Fill failed");
    } finally {
      setMagicLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (!formData.home_team || !formData.away_team || !formData.kickoff || !formData.league) {
      setError("Please fill out all required fields.");
      setLoading(false);
      return;
    }

    try {
      const matchDate = new Date(formData.kickoff);
      
      const { error: sbError } = await supabase.from("matches").insert({
        home_team: formData.home_team,
        away_team: formData.away_team,
        home_logo: formData.home_logo || null,
        away_logo: formData.away_logo || null,
        league: formData.league,
        kickoff: matchDate.toISOString(),
        is_knockout: formData.is_knockout
      });

      if (sbError) throw sbError;

      setSuccess(true);
      setFormData({
        home_team: "",
        away_team: "",
        home_logo: "",
        away_logo: "",
        league: formData.league,
        kickoff: "",
        is_knockout: false,
      });

    } catch (err: any) {
      setError(err.message || "Failed to add match to database.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-dark)] flex flex-col font-sans pb-20">
      <header className="sticky top-0 z-40 bg-[var(--bg-dark)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)]">
        <div className="max-w-xl mx-auto px-6 h-20 flex items-center gap-4">
          <Link href="/" className="p-2 -ml-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-white/5 transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <div className="flex items-center gap-2 text-[#AEFC00]">
            <ShieldAlert size={20} />
            <h1 className="text-xl font-black uppercase tracking-widest text-white">Admin / Add Match</h1>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto w-full px-6 py-8">
        <div className="bento-card rounded-3xl p-6 md:p-8 space-y-6">
          
          <div className="space-y-2 mb-8">
            <h2 className="text-2xl font-black text-white">Manual Fallback</h2>
            <p className="text-sm text-[var(--text-muted)] font-medium">
              Use this tool to manually insert a match if the third-party API fails or gets suspended.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-500 text-sm font-medium">{error}</p>
            </div>
          )}

          {success && (
            <div className="bento-card-lime rounded-2xl p-4 flex items-center gap-3">
              <CheckCircle2 size={20} className="text-[#AEFC00] shrink-0" />
              <p className="text-[#AEFC00] text-sm font-bold">Match added successfully! It is now live in the Match Hub.</p>
            </div>
          )}

          {/* AI Magic Fill Section */}
          <div className="bg-[#AEFC00]/10 border border-[#AEFC00]/30 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-widest text-[#AEFC00]">✨ AI Magic Fill</label>
            </div>
            <textarea 
              value={magicPrompt}
              onChange={(e) => setMagicPrompt(e.target.value)}
              placeholder="e.g. Spain vs France euro semi final tomorrow at 9pm UK time"
              className="w-full bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#AEFC00] transition-colors resize-none h-20"
            />
            <button
              type="button"
              onClick={handleMagicFill}
              disabled={magicLoading || !magicPrompt.trim()}
              className="w-full h-12 bg-white text-black font-black uppercase tracking-widest text-sm rounded-xl hover:bg-gray-200 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {magicLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  <span>Thinking...</span>
                </>
              ) : (
                "Parse with AI"
              )}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 pt-4 border-t border-[var(--border-subtle)]">
            
            {/* League */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Tournament / League *</label>
              <select
                name="league"
                value={formData.league}
                onChange={handleChange}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#AEFC00] transition-colors appearance-none"
              >
                <option value="World Cup">World Cup</option>
                <option value="UEFA Champions League">UEFA Champions League</option>
                <option value="Euro Championship">Euro Championship</option>
                <option value="Copa America">Copa America</option>
                <option value="Premier League">Premier League</option>
                <option value="La Liga">La Liga</option>
                <option value="UEFA Nations League">UEFA Nations League</option>
                <option value="Europa League">Europa League</option>
                <option value="Major League Soccer">Major League Soccer</option>
                <option value="Custom Friendly">Custom Friendly</option>
              </select>
            </div>

            {/* Teams */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Home Team *</label>
                <input
                  type="text"
                  name="home_team"
                  value={formData.home_team}
                  onChange={handleChange}
                  placeholder="e.g. Spain"
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#AEFC00] transition-colors"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Away Team *</label>
                <input
                  type="text"
                  name="away_team"
                  value={formData.away_team}
                  onChange={handleChange}
                  placeholder="e.g. France"
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#AEFC00] transition-colors"
                  required
                />
              </div>
            </div>

            {/* Logos */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Home Logo URL</label>
                <input
                  type="url"
                  name="home_logo"
                  value={formData.home_logo}
                  onChange={handleChange}
                  placeholder="https://..."
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#AEFC00] transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Away Logo URL</label>
                <input
                  type="url"
                  name="away_logo"
                  value={formData.away_logo}
                  onChange={handleChange}
                  placeholder="https://..."
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#AEFC00] transition-colors"
                />
              </div>
            </div>

            {/* Kickoff */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Kickoff Time (Local) *</label>
              <input
                type="datetime-local"
                name="kickoff"
                value={formData.kickoff}
                onChange={handleChange}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#AEFC00] transition-colors [color-scheme:dark]"
                required
              />
            </div>

            {/* Knockout Toggle */}
            <label className="flex items-center gap-3 p-4 bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-xl cursor-pointer hover:border-[#AEFC00]/50 transition-colors">
              <input
                type="checkbox"
                name="is_knockout"
                checked={formData.is_knockout}
                onChange={handleChange}
                className="w-5 h-5 accent-[#AEFC00] rounded"
              />
              <span className="text-sm font-bold text-white">This is a Knockout Match (No Draws)</span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-[#AEFC00] text-black font-black uppercase tracking-widest rounded-xl hover:bg-[#9DE000] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                "Save Match to Database"
              )}
            </button>

          </form>
        </div>
      </main>
    </div>
  );
}
