import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Gift, CheckCircle2, X } from 'lucide-react';

export default function PrizeClaimModal({ alias }: { alias: string }) {
  const [winnerData, setWinnerData] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function checkPrize() {
      if (!alias) return;
      const { data } = await supabase
        .from('prize_winners')
        .select('*, seasons(name)')
        .eq('alias', alias)
        .is('claimed_email', null)
        .maybeSingle();

      if (data) {
        setWinnerData(data);
        setIsOpen(true);
      }
    }
    checkPrize();
  }, [alias]);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase
      .from('prize_winners')
      .update({ claimed_email: email })
      .eq('id', winnerData.id);
      
    setLoading(false);
    if (!error) {
      setSubmitted(true);
      setTimeout(() => setIsOpen(false), 3000);
    }
  };

  if (!isOpen || !winnerData) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-pink-500/50 w-full max-w-lg rounded-2xl p-8 relative shadow-[0_0_50px_-12px_rgba(236,72,153,0.5)] animate-in zoom-in duration-300">
        <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X size={24} />
        </button>
        
        <div className="text-center">
          <div className="bg-pink-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_-5px_rgba(236,72,153,0.5)]">
            <Gift className="text-pink-400" size={40} />
          </div>
          <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Congratulations!</h2>
          <p className="text-slate-300 text-lg mb-6">
            You placed <span className="font-bold text-pink-400">#{winnerData.rank}</span> in the <span className="font-bold text-emerald-400">{winnerData.seasons.name}</span>!
          </p>
          
          <div className="bg-slate-800 rounded-xl p-4 mb-8 border border-slate-700">
            <p className="text-sm text-slate-400 uppercase font-bold tracking-wider mb-1">Your Prize</p>
            <p className="text-xl text-white font-black">{winnerData.prize_description}</p>
          </div>

          {submitted ? (
            <div className="bg-emerald-500/20 border border-emerald-500 text-emerald-400 p-4 rounded-xl flex items-center justify-center gap-3">
              <CheckCircle2 size={24} />
              <span className="font-bold">Prize claimed! Check your email soon.</span>
            </div>
          ) : (
            <form onSubmit={handleClaim} className="space-y-4">
              <p className="text-slate-400 text-sm mb-4">Enter your email below so we can send you your prize.</p>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-pink-500 transition-colors"
              />
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-lg transition-colors"
              >
                {loading ? 'Processing...' : 'Claim Prize'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
