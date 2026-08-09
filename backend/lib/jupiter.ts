/**
 * Jupiter price API — free, no key needed.
 * Gets token prices in USD and SOL.
 */
export type TokenPrice = {
  id: string;        // mint or "SOL"
  mintSymbol: string;
  vsToken: string;
  vsTokenSymbol: string;
  price: number;
};

const JUPITER_PRICE_URL = "https://price.jup.ag/v6/price";

export async function getTokenPrice(
  mintOrSymbol: string,
  vsToken = "USDC"
): Promise<TokenPrice | null> {
  try {
    const ids = mintOrSymbol === "SOL" ? "So11111111111111111111111111111111111111112" : mintOrSymbol;
    const url = `${JUPITER_PRICE_URL}?ids=${ids}&vsToken=${vsToken}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: Record<string, { id: string; mintSymbol: string; vsToken: string; vsTokenSymbol: string; price: number }>;
    };
    const data = json.data?.[ids];
    if (!data) return null;
    return { id: data.id, mintSymbol: data.mintSymbol, vsToken: data.vsToken, vsTokenSymbol: data.vsTokenSymbol, price: data.price };
  } catch {
    return null;
  }
}

export async function getMultipleTokenPrices(
  mintsOrSymbols: string[],
  vsToken = "USDC"
): Promise<TokenPrice[]> {
  try {
    const ids = mintsOrSymbols.map((m) =>
      m === "SOL" ? "So11111111111111111111111111111111111111112" : m
    ).join(",");
    const url = `${JUPITER_PRICE_URL}?ids=${ids}&vsToken=${vsToken}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = (await res.json()) as {
      data?: Record<string, { id: string; mintSymbol: string; vsToken: string; vsTokenSymbol: string; price: number }>;
    };
    return Object.values(json.data ?? {}).map((d) => ({
      id: d.id, mintSymbol: d.mintSymbol, vsToken: d.vsToken, vsTokenSymbol: d.vsTokenSymbol, price: d.price,
    }));
  } catch {
    return [];
  }
}
