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

export function getDefaultAvatar(alias: string | null | undefined): string {
  if (!alias) {
    return `https://api.dicebear.com/9.x/adventurer/svg?seed=pitchsense&backgroundColor=1a1a2e&backgroundType=solid`;
  }

  // Pick a kit color deterministically
  let hash = 0;
  for (let i = 0; i < alias.length; i++) {
    hash = alias.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % KIT_COLORS.length;
  const bgColor = KIT_COLORS[colorIndex];

  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(alias)}&backgroundColor=${bgColor}&backgroundType=solid`;
}
