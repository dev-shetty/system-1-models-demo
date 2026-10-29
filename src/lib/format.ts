const integer = new Intl.NumberFormat("en-US");
const wholeUsd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function formatInt(n: number): string {
  return integer.format(n);
}

export function formatUsd(n: number): string {
  if (n === 0) return "$0";
  if (n >= 100) return wholeUsd.format(n);
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(6)}`;
}

export function formatMs(n: number | null): string {
  if (n === null) return "–";
  if (n >= 1000) return `${(n / 1000).toFixed(2)} s`;
  return `${Math.round(n)} ms`;
}

export function formatPct(part: number, whole: number): string {
  if (whole === 0) return "–";
  return `${Math.round((part / whole) * 100)}%`;
}

export function formatLabel(value: string | boolean): string {
  return String(value).replaceAll("_", " ");
}

export function formatRatio(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "–";
  if (n >= 10) return `${Math.round(n)}×`;
  return `${n.toFixed(1)}×`;
}
