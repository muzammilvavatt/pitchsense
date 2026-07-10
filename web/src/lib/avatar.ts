const AVATARS = [
  "/avatars/shirt-red-white.svg",
  "/avatars/shirt-blue-white.svg",
  "/avatars/shirt-green-white.svg",
  "/avatars/shirt-white-black.svg",
  "/avatars/shirt-yellow-blue.svg",
  "/avatars/shirt-black-gold.svg",
  "/avatars/shirt-purple-white.svg",
  "/avatars/shirt-orange-black.svg"
];

export function getDefaultAvatar(alias: string | null | undefined): string {
  if (!alias) return AVATARS[0];
  let hash = 0;
  for (let i = 0; i < alias.length; i++) {
    hash = alias.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATARS.length;
  return AVATARS[index];
}
