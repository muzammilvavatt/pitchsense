import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowRight, LogIn, UserPlus, AlertCircle } from 'lucide-react';

interface AuthScreenProps {
  onAliasSet: (alias: string) => void;
}

export default function AliasSetup({ onAliasSet }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [alias, setAlias] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
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
        const userAlias = data.user.user_metadata?.alias || 'UnknownUser';
        onAliasSet(userAlias);
      }
    } else {
      if (!alias.trim()) {
        setErrorMsg('Username is required for sign up.');
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            alias: alias.trim(),
            avatar_url: avatarUrl.trim() || null
          }
        }
      });
      
      if (error) {
        setErrorMsg(error.message);
      } else if (data.user) {
        // Automatically set the alias if sign up succeeds without email confirmation
        const userAlias = data.user.user_metadata?.alias || alias.trim();
        onAliasSet(userAlias);
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-light tracking-[0.2em] mb-4 text-white uppercase drop-shadow-md flex items-center justify-center">
          PITCH<span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-amber-300">SENSE</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-md mx-auto">
          The ultimate platform for tactical football debates and live match predictions.
        </p>
      </div>

      <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl">
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
          <button 
            type="button"
            onClick={() => { setIsLogin(true); setErrorMsg(''); }}
            className={`flex-1 font-semibold text-center pb-2 ${isLogin ? 'text-red-400 border-b-2 border-red-400' : 'text-slate-500'}`}
          >
            Sign In
          </button>
          <button 
            type="button"
            onClick={() => { setIsLogin(false); setErrorMsg(''); }}
            className={`flex-1 font-semibold text-center pb-2 ${!isLogin ? 'text-rose-400 border-b-2 border-rose-400' : 'text-slate-500'}`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {errorMsg && (
            <div className="bg-red-900/30 border border-red-500/50 p-3 rounded-lg flex items-center gap-2 text-red-200 text-sm">
              <AlertCircle size={16} />
              <p>{errorMsg}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
              minLength={6}
              required
            />
            {isLogin && (
              <div className="flex justify-end mt-2">
                <a href="mailto:four4inbazar@gmail.com?subject=Password Reset Request" className="text-xs text-slate-400 hover:text-emerald-400 transition-colors">
                  Forgot Password?
                </a>
              </div>
            )}
          </div>

          {!isLogin && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Username</label>
                <input
                  type="text"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="Choose a unique Username"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                  maxLength={50}
                  required={!isLogin}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Avatar Image URL (Optional)</label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="Link to a player/club icon"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-sm"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] ${isLogin ? 'bg-red-600 hover:bg-red-500' : 'bg-rose-600 hover:bg-rose-500'} ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Processing...' : (
              isLogin ? <><LogIn size={18} /> Sign In</> : <><UserPlus size={18} /> Create Account</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
