import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Trophy, Clock } from 'lucide-react';

export default function SeasonBanner() {
  const [season, setSeason] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    async function fetchActiveSeason() {
      const { data } = await supabase
        .from('seasons')
        .select('*')
        .eq('is_active', true)
        .single();
      if (data) setSeason(data);
    }
    fetchActiveSeason();
  }, []);

  useEffect(() => {
    if (!season) return;
    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);

    function updateTimeLeft() {
      const end = new Date(season.end_date).getTime();
      const now = new Date().getTime();
      const distance = end - now;
      if (distance < 0) {
        setTimeLeft('Season Ended');
        clearInterval(interval);
        return;
      }
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${days}d ${hours}h ${mins}m`);
    }

    return () => clearInterval(interval);
  }, [season]);

  if (!season) return null;

  return (
    <div className="bento-card-lime rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-lime-pulse">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#AEFC00] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(174,252,0,0.3)]">
          <Trophy size={18} className="text-black" />
        </div>
        <div>
          <h3 className="text-white font-bold text-sm leading-tight">{season.name}</h3>
          <p className="text-[var(--text-muted)] text-xs mt-0.5">Compete for the #1 spot — earn exclusive Prestige Badges.</p>
        </div>
      </div>
      <div className="flex items-center gap-2 bg-[var(--bg-base)] border border-[var(--border-lime)] px-3.5 py-2 rounded-xl shrink-0">
        <Clock size={13} className="text-[#AEFC00]" />
        <span className="text-white font-bold text-sm font-mono tracking-wider">{timeLeft}</span>
      </div>
    </div>
  );
}
