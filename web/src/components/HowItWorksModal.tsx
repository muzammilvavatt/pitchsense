import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Info, X, Trophy, Brain, Target, Heart, Crosshair } from "lucide-react";

export default function HowItWorksModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors bg-blue-900/20 px-4 py-2 rounded-full border border-blue-900/30 font-medium"
      >
        <Info size={16} /> How it Works
      </button>

      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[100] grid place-items-center p-4 bg-black/80 backdrop-blur-md transition-opacity">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative animate-in fade-in zoom-in duration-200 my-8 max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            
            <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
              <Trophy className="text-emerald-400" /> PitchSense Rules
            </h2>
            
            <div className="space-y-6 text-slate-300 text-sm leading-relaxed">
              <section>
                <h3 className="font-bold text-white text-base mb-2">The Goal</h3>
                <p>Welcome to PitchSense. Your goal is to outsmart the AI Analyst and other human pundits to climb the global leaderboard. Predict match outcomes, justify your tactics, and earn points.</p>
              </section>

              <section className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <h3 className="font-bold text-white text-base mb-3">Scoring System</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <Target className="text-emerald-400 shrink-0 mt-0.5" size={18} />
                    <div>
                      <span className="font-bold text-white">+2 Points (Correct Prediction)</span>
                      <p className="text-slate-400 text-xs mt-0.5">Guess the correct advancing winner.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Brain className="text-purple-400 shrink-0 mt-0.5" size={18} />
                    <div>
                      <span className="font-bold text-white">+4 Points (Mastermind Bonus)</span>
                      <p className="text-slate-400 text-xs mt-0.5">If you disagree with the AI Analyst's prediction and you turn out to be right, you earn double points for outsmarting the machine!</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Crosshair className="text-orange-400 shrink-0 mt-0.5" size={18} />
                    <div>
                      <span className="font-bold text-white">+3 Points (Sniper Bonus)</span>
                      <p className="text-slate-400 text-xs mt-0.5">Correctly guess the EXACT final scoreline (e.g. 2-1).</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Heart className="text-pink-400 shrink-0 mt-0.5" size={18} />
                    <div>
                      <span className="font-bold text-white">+1 Point (Per Like)</span>
                      <p className="text-slate-400 text-xs mt-0.5">When other users read your tactical justification in the Debate Feed and 'Like' it, you earn reputation points.</p>
                    </div>
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-white text-base mb-2">Knockout Matches & Penalties</h3>
                <p>In knockout stages (like Semi-Finals), there is no "Draw" option. You must predict who will ultimately advance. If the match goes to a penalty shootout, you will win points if your chosen team wins the shootout.</p>
              </section>
            </div>
            
            <div className="mt-8">
              <button 
                onClick={() => setIsOpen(false)}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Got it, let's play!
              </button>
            </div>
          </div>
        </div>, document.body
      )}
    </>
  );
}
