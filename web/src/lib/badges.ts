export type PrestigeBadge = {
  emoji: string;
  name: string;
  colorClass: string;
};

/**
 * Calculates the prestige badge based on a user's past season ranks.
 * achievements is an array of ranks the user has achieved in past seasons.
 */
export function getPrestigeBadge(achievements: { rank: number }[]): PrestigeBadge | null {
  if (!achievements || achievements.length === 0) return null;

  const firstPlaceFinishes = achievements.filter(a => a.rank === 1).length;
  const top3Finishes = achievements.filter(a => a.rank <= 3).length;
  const top10Finishes = achievements.filter(a => a.rank <= 10).length;

  if (firstPlaceFinishes >= 3) {
    return {
      emoji: '🐐',
      name: 'The GOAT',
      colorClass: 'text-yellow-300 drop-shadow-[0_0_10px_rgba(253,224,71,0.8)]'
    };
  }
  
  if (firstPlaceFinishes === 2) {
    return {
      emoji: '👑👑',
      name: 'Multi-Champion',
      colorClass: 'text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]'
    };
  }
  
  if (firstPlaceFinishes === 1) {
    return {
      emoji: '👑',
      name: 'Champion',
      colorClass: 'text-yellow-500'
    };
  }
  
  if (top3Finishes > 0) {
    return {
      emoji: '🥈',
      name: 'Podium Pundit',
      colorClass: 'text-slate-300'
    };
  }
  
  if (top10Finishes > 0) {
    return {
      emoji: '🌟',
      name: 'Elite',
      colorClass: 'text-orange-400'
    };
  }

  return null;
}
