// Palette for cards without a photo. Picked to read well with white text.
export const CARD_COLORS = ['#e5484d', '#30a46c', '#a0522d', '#3e63dd', '#e8930c', '#8e4ec6', '#0d9488', '#d6409f']

export function colorFor(title: string): string {
  let h = 0
  for (const ch of title) h = (h * 31 + ch.codePointAt(0)!) >>> 0
  return CARD_COLORS[h % CARD_COLORS.length]
}
