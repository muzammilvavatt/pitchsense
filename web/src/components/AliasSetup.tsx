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
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrorMsg('Please select a valid image file.');
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

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
        onAliasSet(userAlias);
      }
    } else {
      const trimmedAlias = alias.trim();
      if (!trimmedAlias) {
        setErrorMsg('Username is required for sign up.');
        setLoading(false);
        return;
      }

      // Pre-flight check: see if the alias is already taken (case-insensitive)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('alias')
        .ilike('alias', trimmedAlias)
        .maybeSingle();

      if (existingProfile) {
        setErrorMsg('That Username is already taken! Please choose another one.');
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            alias: trimmedAlias
          }
        }
      });
      
      if (error) {
        setErrorMsg(error.message);
      } else if (data.session) {
        let finalAvatarUrl = null;

        // If they selected a file, upload it now that they are authenticated
        if (avatarFile && data.user) {
          const fileExt = avatarFile.name.split('.').pop();
          const fileName = `${data.user.id}-${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, avatarFile);
            
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('avatars')
              .getPublicUrl(fileName);
              
            finalAvatarUrl = publicUrl;
            
            // Update auth metadata
            await supabase.auth.updateUser({
              data: { avatar_url: publicUrl }
            });
          } else {
            console.error("Failed to upload avatar:", uploadError);
          }
        }

        // Log them in
        onAliasSet(trimmedAlias);
      } else {
        // If there is no session, they used an existing email or need to verify their email
        setErrorMsg('Sign up pending! If you already have an account, please switch to Sign In. Otherwise, check your email for a confirmation link.');
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-black mb-4 text-white tracking-tight flex items-center justify-center gap-2">
          PitchSense<span className="text-emerald-500">.</span>
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
            className={`flex-1 font-semibold text-center pb-2 ${isLogin ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-500'}`}
          >
            Sign In
          </button>
          <button 
            type="button"
            onClick={() => { setIsLogin(false); setErrorMsg(''); }}
            className={`flex-1 font-semibold text-center pb-2 ${!isLogin ? 'text-white border-b-2 border-white' : 'text-slate-500'}`}
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
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
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
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
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
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  maxLength={50}
                  required={!isLogin}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Profile Picture (Optional)</label>
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden bg-slate-800 border-2 border-slate-700 flex-shrink-0 flex items-center justify-center">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-slate-500 font-bold text-xl">
                        {alias ? alias.charAt(0).toUpperCase() : '?'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="cursor-pointer bg-slate-800/50 hover:bg-slate-700/80 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-300 font-medium transition-colors inline-block text-center w-full">
                      Choose Image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] ${isLogin ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-700 hover:bg-slate-600 border border-slate-600'} ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
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
