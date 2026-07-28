/** Format a number as Indonesian Rupiah currency. */
export function numberToIdr(number: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
  }).format(number);
}

/** Parse a formatted IDR string back into a rounded integer. */
export function idrToNumber(idr: string): number {
  const cleaned = idr.replace(/[^0-9,-]/g, "");
  const normalized = cleaned.replace(",", ".");
  const result = Number.parseFloat(normalized);
  return Math.round(result);
}
