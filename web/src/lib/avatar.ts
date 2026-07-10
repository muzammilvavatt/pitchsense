// Football-themed background colors (classic kit colors)
const KIT_COLORS = [
  "1a1a2e", // deep navy
  "c0392b", // arsenal red
  "1565c0", // chelsea blue
  "2e7d32", // celtic green
  "f39c12", // dortmund yellow
  "6a1b9a", // fiorentina purple
  "e65100", // hull city amber
  "00695c", // werder bremen teal
  "37474f", // juventus dark
  "880e4f", // west ham claret
  "1b5e20", // brazil green
  "0d47a1", // france blue
];

/** Generate a DiceBear adventurer avatar URL seeded by the alias */
export function getDefaultAvatar(alias: string | null | undefined): string {
  const seed = alias || "pitchsense";
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % KIT_COLORS.length;
  const bgColor = KIT_COLORS[colorIndex];
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${bgColor}&backgroundType=solid`;
}

/**
 * Resolve the best avatar URL for a user.
 * - If avatar_url is a custom URL (e.g. DiceBear or external) → use it
 * - If avatar_url is an old jersey path (starts with /avatars/) → fall back to auto-generated
 * - If avatar_url is null/empty → auto-generate from alias
 */
export function resolveAvatar(avatar_url: string | null | undefined, alias: string | null | undefined): string {
  if (!avatar_url || avatar_url === "null" || avatar_url === "undefined") {
    return getDefaultAvatar(alias);
  }
  // Migrate legacy jersey paths that never existed as real files
  if (avatar_url.startsWith("/avatars/")) {
    return getDefaultAvatar(alias);
  }
  return avatar_url;
}
