export type ManagerSideDishLine = {
  label: string;
  price: number | null;
};

/** Both clients store one dish per line. Commas may belong to names or prices. */
export function parseManagerSideDishItems(
  items: string,
): ManagerSideDishLine[] {
  return items
    .split(/\r\n?|\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = /^([^:]+):\s*(\d{1,3}(?:,\d{3})+|\d+)\s*원?$/.exec(line);
      const label = match?.[1].trim();
      const price = match ? Number(match[2].replaceAll(',', '')) : NaN;

      if (!label || !Number.isSafeInteger(price) || price < 0) {
        return { label: line, price: null };
      }

      return { label, price };
    });
}
