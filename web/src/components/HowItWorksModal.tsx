import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Info, X, Trophy, Brain, Target, Heart, Crosshair, Zap } from "lucide-react";

export default function HowItWorksModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const scoringItems = [
    {
      icon: Target,
      iconBg: "bg-[#AEFC00]/20",
      iconColor: "text-[#AEFC00]",
      points: "+2 pts",
      pointsColor: "text-[#AEFC00]",
      label: "Correct Prediction",
      desc: "Pick the correct advancing winner of any match.",
    },
    {
      icon: Brain,
      iconBg: "bg-purple-500/20",
      iconColor: "text-purple-400",
      points: "+4 pts",
      pointsColor: "text-purple-400",
      label: "Mastermind Bonus",
      desc: "Disagree with the AI Analyst and turn out to be right — you earn double for outsmarting the machine.",
    },
    {
      icon: Crosshair,
      iconBg: "bg-orange-500/20",
      iconColor: "text-orange-400",
      points: "+3 pts",
      pointsColor: "text-orange-400",
      label: "Sniper Bonus",
      desc: "Nail the exact final scoreline (e.g. 2–1) for an extra precision bonus.",
    },
    {
      icon: Heart,
      iconBg: "bg-pink-500/20",
      iconColor: "text-pink-400",
      points: "+1 pt",
      pointsColor: "text-pink-400",
      label: "Per Like",
      desc: "Other users can like your tactical justification in the Debate Feed, earning you reputation points.",
    },
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="btn-ghost flex items-center gap-1.5 md:gap-2 text-sm px-3 py-2 md:px-4 rounded-2xl"
      >
        <Info size={18} className="md:w-[15px] md:h-[15px]" />
        <span className="hidden sm:inline">How it Works</span>
      </button>

      {isOpen && mounted && createPortal(
        <div
          className="fixed inset-0 z-[100] grid place-items-center p-4 bg-black/70 backdrop-blur-md"
          onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
        >
          <div className="bento-card rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative animate-fade-up my-4 max-h-[90vh] overflow-y-auto modal-scroll">

            {/* Close */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-5 right-5 text-[var(--text-muted)] hover:text-white transition-colors p-1.5 rounded-xl hover:bg-[var(--bg-card-hover)]"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-[#AEFC00] flex items-center justify-center">
                <Trophy size={20} className="text-black" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white leading-tight">PitchSense Rules</h2>
                <p className="text-xs text-[var(--text-muted)] font-medium">How scoring works</p>
              </div>
            </div>

            {/* Intro */}
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-6">
              Outsmart the AI Analyst and other pundits to climb the global leaderboard. Predict match outcomes, back them with tactical reasoning, and earn points.
            </p>

            {/* Scoring Cards */}
            <div className="space-y-3 mb-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Scoring System</p>
              {scoringItems.map(({ icon: Icon, iconBg, iconColor, points, pointsColor, label, desc }) => (
                <div key={label} className="flex items-start gap-4 p-4 bg-[var(--bg-base)] rounded-2xl border border-[var(--border-subtle)]">
                  <div className={`w-9 h-9 shrink-0 rounded-xl ${iconBg} flex items-center justify-center`}>
                    <Icon size={17} className={iconColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`font-black text-sm ${pointsColor}`}>{points}</span>
                      <span className="font-semibold text-white text-sm">{label}</span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Knockout note */}
            <div className="flex items-start gap-3 p-4 bg-[#AEFC00]/5 border border-[var(--border-lime)] rounded-2xl mb-6">
              <Zap size={16} className="text-[#AEFC00] shrink-0 mt-0.5" />
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                <span className="text-white font-semibold">Knockout stages:</span> No "Draw" option — you must predict who ultimately advances. Penalty shootout winners count.
              </p>
            </div>

            {/* CTA */}
            <button
              onClick={() => setIsOpen(false)}
              className="btn-lime w-full py-3 rounded-2xl text-sm"
            >
              Got it, let's play →
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
