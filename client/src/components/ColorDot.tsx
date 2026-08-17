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
