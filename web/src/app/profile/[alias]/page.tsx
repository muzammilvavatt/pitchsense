"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Trophy, Target, Brain, Crosshair, Heart, Edit2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function ProfilePage() {
  const params = useParams();
  const alias = decodeURIComponent(params.alias as string);

  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [newAvatarUrl, setNewAvatarUrl] = useState("");
  const [savingAvatar, setSavingAvatar] = useState(false);

  const [isOwner, setIsOwner] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    const checkOwner = async () => {
      let currentUser = localStorage.getItem("pitchsense_alias");
      if (!currentUser) {
        const { data } = await supabase.auth.getSession();
        currentUser = data.session?.user?.user_metadata?.alias;
      }
      if (currentUser && currentUser.toLowerCase() === alias.toLowerCase()) {
        setIsOwner(true);
      }
    };
    checkOwner();

    const fetchProfile = async () => {
      const { data: lbData } = await supabase
        .from("leaderboard")
        .select("*")
        .eq("alias", alias)
        .single();

      const { data: recentPreds } = await supabase
        .from("predictions")
        .select("avatar_url, created_at, prediction, score_prediction, justification, likes, countered_ai, matches(home_team, away_team)")
        .eq("alias", alias)
        .order("created_at", { ascending: false });

      const currentLocUser = localStorage.getItem("pitchsense_alias");
      const localAvatar = (currentLocUser && currentLocUser.toLowerCase() === alias.toLowerCase())
        ? localStorage.getItem("pitchsense_avatar_url")
        : null;

      const dbAvatar = recentPreds && recentPreds.length > 0 ? recentPreds[0].avatar_url : null;

      if (lbData) {
        setStats({ ...lbData, avatar_url: localAvatar || dbAvatar });
      } else {
        setStats({
          total_score: 0,
          correct_predictions: 0,
          mastermind_predictions: 0,
          sniper_predictions: 0,
          total_likes: 0,
          avatar_url: localAvatar || dbAvatar
        });
      }

      if (recentPreds) setHistory(recentPreds);
      setLoading(false);
    };

    fetchProfile();
  }, [alias]);

  // Custom file upload has been removed in favor of lightweight preset SVGs

  const saveAvatar = async () => {
    setSavingAvatar(true);
    localStorage.setItem("pitchsense_avatar_url", newAvatarUrl);
    window.dispatchEvent(new CustomEvent("avatarUpdate", { detail: newAvatarUrl }));
    await supabase.auth.updateUser({ data: { avatar_url: newAvatarUrl } });
    await supabase.from("predictions").update({ avatar_url: newAvatarUrl }).eq("alias", alias);
    await supabase.from("replies").update({ avatar_url: newAvatarUrl }).eq("alias", alias);
    setStats({ ...stats, avatar_url: newAvatarUrl });
    setIsEditingAvatar(false);
    setSavingAvatar(false);
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    const { error } = await supabase.rpc('delete_my_account');
    if (error) {
      alert("Failed to delete account: " + error.message);
      setDeletingAccount(false);
      return;
    }
    localStorage.removeItem("pitchsense_alias");
    localStorage.removeItem("pitchsense_avatar_url");
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#AEFC00] animate-bounce [animation-delay:0ms]"></div>
          <div className="w-2 h-2 rounded-full bg-[#AEFC00] animate-bounce [animation-delay:150ms]"></div>
          <div className="w-2 h-2 rounded-full bg-[#AEFC00] animate-bounce [animation-delay:300ms]"></div>
        </div>
      </div>
    );
  }

  const displayStats = stats || {
    total_score: 0,
    correct_predictions: 0,
    mastermind_predictions: 0,
    sniper_predictions: 0,
    total_likes: 0,
    avatar_url: isOwner ? (typeof window !== 'undefined' ? localStorage.getItem("pitchsense_avatar_url") : null) : null
  };

  return (
    <main className="min-h-screen max-w-4xl mx-auto px-4 md:px-8 py-8 pb-24">

      {/* Back Link */}
      <Link href="/" className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-white transition-colors mb-8 text-sm font-medium group">
        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" /> Back to Dashboard
      </Link>

      {/* HERO PROFILE CARD */}
      <div className="bento-card rounded-3xl p-6 md:p-10 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#AEFC00]/5 via-transparent to-[#3B82F6]/5 pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
          {/* Avatar */}
          <div className="relative shrink-0">
            {(isEditingAvatar && newAvatarUrl) || displayStats?.avatar_url ? (
              <img
                src={(isEditingAvatar && newAvatarUrl) ? newAvatarUrl : displayStats.avatar_url}
                alt={alias}
                className="w-28 h-28 md:w-36 md:h-36 rounded-3xl object-cover border-2 border-[var(--border-lime)] bg-black/40"
              />
            ) : (
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-3xl bg-gradient-to-br from-[#AEFC00]/20 to-[#3B82F6]/20 flex items-center justify-center text-5xl border-2 border-[var(--border-lime)]">
                ⚽
              </div>
            )}
            {isOwner && (
              <button
                onClick={() => setIsEditingAvatar(!isEditingAvatar)}
                className="absolute -bottom-2 -right-2 bg-[#AEFC00] hover:opacity-90 text-black p-2 rounded-xl shadow-lg transition-all"
                title="Edit Avatar"
              >
                <Edit2 size={15} />
              </button>
            )}
            {displayStats?.total_score >= 10 && (
              <div className="absolute -top-2 -right-2 bg-[#AEFC00] text-black font-black text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg">
                <Trophy size={11} /> VIP
              </div>
            )}
          </div>

          {/* Info */}
          <div className="text-center md:text-left flex-1 min-w-0">
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-1 truncate">{alias}</h1>
            <div className="flex items-center justify-center md:justify-start gap-2 mb-5">
              <Trophy className="text-[#AEFC00]" size={18} />
              <span className="text-xl font-black text-[#AEFC00]">{displayStats?.total_score || 0}</span>
              <span className="text-[var(--text-muted)] font-semibold text-sm">total points</span>
            </div>

            {/* Achievement Badges */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              {displayStats?.correct_predictions > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-semibold bg-[#AEFC00]/10 border border-[var(--border-lime)] text-[#AEFC00] px-3 py-1.5 rounded-full">
                  <Target size={13} /> {displayStats.correct_predictions} Accurate
                </div>
              )}
              {displayStats?.mastermind_predictions > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-semibold bg-purple-500/10 border border-purple-500/20 text-purple-400 px-3 py-1.5 rounded-full">
                  <Brain size={13} /> {displayStats.mastermind_predictions} Mastermind
                </div>
              )}
              {displayStats?.sniper_predictions > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-semibold bg-orange-500/10 border border-orange-500/20 text-orange-400 px-3 py-1.5 rounded-full">
                  <Crosshair size={13} /> {displayStats.sniper_predictions} Sniper
                </div>
              )}
              {displayStats?.total_likes > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-semibold bg-pink-500/10 border border-pink-500/20 text-pink-400 px-3 py-1.5 rounded-full">
                  <Heart size={13} /> {displayStats.total_likes} Liked
                </div>
              )}
              {isOwner && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-1.5 rounded-full hover:bg-red-500/20 transition-colors"
                >
                  Delete Account
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Avatar Editor */}
        {isEditingAvatar && (
          <div className="relative mt-6 pt-6 border-t border-[var(--border-subtle)]">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-4">Choose Avatar</p>
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              {[
                "/avatars/shirt-red-white.svg",
                "/avatars/shirt-blue-white.svg",
                "/avatars/shirt-green-white.svg",
                "/avatars/shirt-white-black.svg",
                "/avatars/shirt-yellow-blue.svg",
                "/avatars/shirt-black-gold.svg",
                "/avatars/shirt-purple-white.svg",
                "/avatars/shirt-orange-black.svg",
              ].map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => setNewAvatarUrl(url)}
                  className={`w-14 h-14 rounded-2xl overflow-hidden border-2 transition-all hover:scale-110 ${
                    newAvatarUrl === url
                      ? "border-[#AEFC00] scale-110 shadow-[0_0_15px_rgba(174,252,0,0.4)]"
                      : "border-[var(--border-medium)] hover:border-[var(--border-lime)] bg-black/20"
                  }`}
                >
                  <img src={url} alt={`Avatar ${idx + 1}`} className="w-full h-full object-cover p-1" />
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-4 border-t border-[var(--border-subtle)]">
              <button
                onClick={() => setIsEditingAvatar(false)}
                className="btn-ghost flex-1 py-2.5 rounded-2xl text-sm"
              >
                Cancel
              </button>
              <button
                onClick={saveAvatar}
                disabled={savingAvatar || !newAvatarUrl}
                className="btn-lime flex-1 py-2.5 rounded-2xl text-sm"
              >
                {savingAvatar ? "Saving..." : "Save Avatar"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-up">
          <div className="bento-card rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-red-500/20">
            <div className="w-10 h-10 rounded-2xl bg-red-500/20 flex items-center justify-center mb-4">
              <span className="text-red-400 text-xl">⚠</span>
            </div>
            <h3 className="text-xl font-black text-white mb-2">Delete Account?</h3>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-6">
              This is permanent and irreversible. All your predictions, likes, and replies will be wiped immediately.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-ghost flex-1 py-2.5 rounded-2xl text-sm"
                disabled={deletingAccount}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="flex-1 py-2.5 rounded-2xl text-sm font-bold bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50"
              >
                {deletingAccount ? "Deleting..." : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREDICTION HISTORY */}
      <div className="flex items-center gap-3 mb-5">
        <div className="lime-dot"></div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)]">Prediction History</h2>
        <div className="h-px bg-[var(--border-subtle)] flex-grow"></div>
      </div>

      <div className="space-y-3">
        {history.length > 0 ? (
          history.map((pred, i) => (
            <div key={i} className="bento-card rounded-3xl p-5 transition-all hover:-translate-y-0.5">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                    {new Date(pred.created_at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <h3 className="font-bold text-base text-white mt-1 mb-3">
                    {pred.matches.home_team} <span className="text-[var(--text-muted)] font-normal text-sm">vs</span> {pred.matches.away_team}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="text-xs text-[var(--text-muted)] font-medium">Predicted:</span>
                    <span className="font-bold text-xs text-[#AEFC00] bg-[#AEFC00]/10 border border-[var(--border-lime)] px-2.5 py-1 rounded-full">
                      {pred.prediction} · {pred.score_prediction}
                    </span>
                    {pred.countered_ai && (
                      <span className="flex items-center gap-1 text-xs font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-full">
                        <Brain size={11} /> Countered AI
                      </span>
                    )}
                  </div>
                  {pred.justification && (
                    <p className="text-[var(--text-secondary)] text-sm italic border-l-2 border-[var(--border-lime)] pl-3 py-1 leading-relaxed">
                      "{pred.justification}"
                    </p>
                  )}
                </div>
                <div className="flex items-center md:items-end justify-between md:flex-col gap-2 border-t md:border-t-0 md:border-l border-[var(--border-subtle)] pt-3 md:pt-0 md:pl-5 shrink-0">
                  <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                    <Heart size={15} className={pred.likes > 0 ? "text-pink-500 fill-pink-500" : ""} />
                    <span className="font-bold text-sm text-white">{pred.likes || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bento-card rounded-3xl p-12 text-center">
            <p className="text-[var(--text-secondary)] font-semibold">No predictions yet.</p>
            <p className="text-[var(--text-muted)] text-sm mt-1">Head to the Hub to make your first call!</p>
          </div>
        )}
      </div>
    </main>
  );
}
