export const CLASS_COLORS = [
  "#f87171", "#fb923c", "#fbbf24", "#a3e635",
  "#4ade80", "#34d399", "#2dd4bf", "#38bdf8",
  "#818cf8", "#a78bfa", "#e879f9", "#fb7185",
];

export function hexWithAlpha(hex: string, alpha: string): string {
  return `${hex}${alpha}`;
}

export function ColorDot({ color, size = 10 }: { color: string; size?: number }) {
  return (
    <span
      className="inline-block rounded-full shrink-0"
      style={{ backgroundColor: color, width: size, height: size }}
    />
  );
}
