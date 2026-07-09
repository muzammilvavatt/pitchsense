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
    <div className="bg-gradient-to-r from-emerald-900/40 to-slate-900/40 border border-emerald-500/30 rounded-xl p-4 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between shadow-lg gap-4">
      <div className="flex items-center gap-3">
        <div className="bg-emerald-500/20 p-2 rounded-lg hidden sm:block">
          <Trophy className="text-emerald-400" size={24} />
        </div>
        <div>
          <h3 className="text-emerald-400 font-bold text-lg">{season.name}</h3>
          <p className="text-slate-400 text-sm">Finish 1st on the Leaderboard to claim the grand prize!</p>
        </div>
      </div>
      <div className="bg-slate-950/50 px-4 py-2 rounded-lg border border-slate-800 flex items-center gap-2 whitespace-nowrap">
        <Clock className="text-pink-500" size={16} />
        <span className="text-slate-200 font-bold font-mono">{timeLeft}</span>
      </div>
    </div>
  );
}
