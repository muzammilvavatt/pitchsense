"use client";

import { useState } from "react";
import { ArrowRight, Activity } from "lucide-react";

export default function AliasSetup({ onSetAlias }: { onSetAlias: (alias: string) => void }) {
  const [alias, setAlias] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (alias.trim()) {
      onSetAlias(alias.trim());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <div className="glass-card p-10 max-w-md w-full text-center space-y-6">
        <div className="flex justify-center mb-4 text-emerald-400">
          <Activity size={48} />
        </div>
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            PitchSense
          </h1>
          <p className="text-slate-400 mt-2">Join the Ultimate Football Debate</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder="Enter your Username..."
            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            maxLength={50}
            required
          />
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
          >
            Start Predicting <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
