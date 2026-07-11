"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const router = useRouter();

  useEffect(() => {
    // Check if the user actually arrived with a valid session
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setErrorMsg("Your password reset link is invalid or has expired. Please try requesting a new one.");
      }
    });
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      setSuccessMsg("Password updated successfully! Redirecting...");
      setTimeout(() => {
        router.push("/");
      }, 2000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      {/* Logo + Headline */}
      <div className="text-center mb-10 mt-10">
        <div className="inline-flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#AEFC00] flex items-center justify-center shadow-[0_0_24px_rgba(174,252,0,0.3)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#050505" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16l-4-3 1.5-5h5L16 13z" />
              <path d="M8 13l-6 2" /><path d="M16 13l6 2" />
              <path d="M9.5 8L6 3" /><path d="M14.5 8l3.5-5" />
              <path d="M12 16v6" />
            </svg>
          </div>
          <span className="text-3xl font-black text-white tracking-tight">PitchSense</span>
        </div>
        <p className="text-[var(--text-muted)] text-base max-w-xs mx-auto leading-relaxed">
          Set your new password
        </p>
      </div>

      <div className="w-full max-w-md bento-card rounded-3xl overflow-hidden shadow-2xl p-6 md:p-8 space-y-4">
        {errorMsg && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 p-4 rounded-2xl">
            <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {successMsg && (
          <div className="flex items-start gap-3 bg-[#AEFC00]/10 border border-[#AEFC00]/20 p-4 rounded-2xl">
            <CheckCircle2 size={16} className="text-[#AEFC00] shrink-0 mt-0.5" />
            <p className="text-[#AEFC00] text-sm leading-relaxed">{successMsg}</p>
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">New Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bento-input w-full pl-10 pr-4 py-3 text-sm rounded-2xl"
                minLength={6}
                required
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !!successMsg}
              className="btn-lime w-full py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-black animate-bounce [animation-delay:0ms]"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-black animate-bounce [animation-delay:150ms]"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-black animate-bounce [animation-delay:300ms]"></div>
                </span>
              ) : (
                "Update Password"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
