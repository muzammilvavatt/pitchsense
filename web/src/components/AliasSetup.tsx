import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LogIn, UserPlus, AlertCircle, Mail, Lock, User } from 'lucide-react';

interface AuthScreenProps {
  onAliasSet: (alias: string, avatarUrl?: string | null) => void;
}

export default function AliasSetup({ onAliasSet }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [alias, setAlias] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (isLogin) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErrorMsg(error.message);
      } else if (data.user) {
        const userAlias = data.user.user_metadata?.alias || data.user.user_metadata?.full_name || 'UnknownUser';
        const userAvatar = data.user.user_metadata?.avatar_url || null;
        onAliasSet(userAlias, userAvatar);
      }
    } else {
      const trimmedAlias = alias.trim();
      if (!trimmedAlias) {
        setErrorMsg('Username is required for sign up.');
        setLoading(false);
        return;
      }

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('alias')
        .ilike('alias', trimmedAlias)
        .maybeSingle();

      if (existingProfile) {
        setErrorMsg('That username is already taken! Please choose another one.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { alias: trimmedAlias }
        }
      });

      if (error) {
        setErrorMsg(error.message);
      } else if (data.session) {
        onAliasSet(trimmedAlias, null);
      } else {
        setErrorMsg('Sign up pending! If you already have an account, please switch to Sign In. Otherwise, check your email for a confirmation link.');
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">

      {/* Logo + Headline */}
      <div className="text-center mb-10">
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
          <span className="lime-badge text-[10px]">BETA</span>
        </div>
        <p className="text-[var(--text-muted)] text-base max-w-xs mx-auto leading-relaxed">
          Outsmart the AI. Climb the leaderboard. Prove your football IQ.
        </p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md bento-card rounded-3xl overflow-hidden shadow-2xl">

        {/* Tab Toggle */}
        <div className="flex border-b border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setErrorMsg(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold transition-all ${
              isLogin
                ? 'bg-[#AEFC00]/10 text-[#AEFC00] border-b-2 border-[#AEFC00]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <LogIn size={15} /> Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setErrorMsg(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold transition-all ${
              !isLogin
                ? 'bg-[#AEFC00]/10 text-[#AEFC00] border-b-2 border-[#AEFC00]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <UserPlus size={15} /> Sign Up
          </button>
        </div>

        <form onSubmit={handleAuth} className="p-6 md:p-8 space-y-4">

          {/* Error */}
          {errorMsg && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 p-4 rounded-2xl">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm leading-relaxed">{errorMsg}</p>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="bento-input w-full pl-10 pr-4 py-3 text-sm rounded-2xl"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Password</label>
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
            {isLogin && (
              <div className="flex justify-end">
                <a
                  href="mailto:four4inbazar@gmail.com?subject=Password Reset Request"
                  className="text-xs text-[var(--text-muted)] hover:text-[#AEFC00] transition-colors"
                >
                  Forgot password?
                </a>
              </div>
            )}
          </div>

          {/* Username (sign up only) */}
          {!isLogin && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Username</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="Pick a unique username"
                  className="bento-input w-full pl-10 pr-4 py-3 text-sm rounded-2xl"
                  maxLength={50}
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="btn-lime w-full py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-black animate-bounce [animation-delay:0ms]"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-black animate-bounce [animation-delay:150ms]"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-black animate-bounce [animation-delay:300ms]"></div>
                </span>
              ) : isLogin ? (
                <><LogIn size={16} /> Sign In →</>
              ) : (
                <><UserPlus size={16} /> Create Account →</>
              )}
            </button>
          </div>
        </form>

        {/* Footer note */}
        <div className="px-6 md:px-8 pb-6 text-center">
          <p className="text-xs text-[var(--text-muted)]">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); }}
              className="text-[#AEFC00] font-semibold hover:opacity-80 transition-opacity"
            >
              {isLogin ? "Sign up free" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
