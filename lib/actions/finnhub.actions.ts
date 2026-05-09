"use server";

import { getDateRange, validateArticle, formatArticle } from "@/lib/utils";
import { POPULAR_STOCK_SYMBOLS } from "@/lib/constants";
import { cache } from "react";

const FINNHUB_BASE_URL =
  process.env.FINNHUB_BASE_URL || "https://finnhub.io/api/v1";
const FINNHUB_API_KEY =
  process.env.FINNHUB_API_KEY ||
  process.env.NEXT_PUBLIC_FINNHUB_API_KEY ||
  process.env.NEXT_PUBLIC_NEXT_PUBLIC_FINNHUB_API_KEY ||
  "";

type FinnhubProfile = {
  name?: string;
  ticker?: string;
  exchange?: string;
  marketCapitalization?: number;
};

type FinnhubQuote = {
  c?: number; // current price
  d?: number; // change
  dp?: number; // change percent
  h?: number;
  l?: number;
  o?: number;
  pc?: number;
  t?: number;
};

type FinnhubMetricResponse = {
  metric?: { [key: string]: number };
};

type FinnhubCandleResponse = {
  c?: number[];
  v?: number[];
  t?: number[];
  s?: string;
};

type FinnhubSearchResultWithExchange = FinnhubSearchResult & {
  exchange?: string;
};

async function fetchJSON<T>(
  url: string,
  revalidateSeconds?: number,
): Promise<T> {
  const options: RequestInit & { next?: { revalidate?: number } } =
    revalidateSeconds
      ? { cache: "force-cache", next: { revalidate: revalidateSeconds } }
      : { cache: "no-store" };

  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Fetch failed ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

export { fetchJSON };

export async function getNews(
  symbols?: string[],
): Promise<MarketNewsArticle[]> {
  try {
    const range = getDateRange(5);
    const token = FINNHUB_API_KEY;
    if (!token) {
      throw new Error("FINNHUB API key is not configured");
    }
    const cleanSymbols = (symbols || [])
      .map((s) => s?.trim().toUpperCase())
      .filter((s): s is string => Boolean(s));

    const maxArticles = 6;

    // If we have symbols, try to fetch company news per symbol and round-robin select
    if (cleanSymbols.length > 0) {
      const perSymbolArticles: Record<string, RawNewsArticle[]> = {};

      await Promise.all(
        cleanSymbols.map(async (sym) => {
          try {
            const url = `${FINNHUB_BASE_URL}/company-news?symbol=${encodeURIComponent(sym)}&from=${range.from}&to=${range.to}&token=${token}`;
            const articles = await fetchJSON<RawNewsArticle[]>(url, 300);
            perSymbolArticles[sym] = (articles || []).filter(validateArticle);
          } catch (e) {
            console.error("Error fetching company news for", sym, e);
            perSymbolArticles[sym] = [];
          }
        }),
      );

      const collected: MarketNewsArticle[] = [];
      // Round-robin up to 6 picks
      for (let round = 0; round < maxArticles; round++) {
        for (let i = 0; i < cleanSymbols.length; i++) {
          const sym = cleanSymbols[i];
          const list = perSymbolArticles[sym] || [];
          if (list.length === 0) continue;
          const article = list.shift();
          if (!article || !validateArticle(article)) continue;
          collected.push(formatArticle(article, true, sym, round));
          if (collected.length >= maxArticles) break;
        }
        if (collected.length >= maxArticles) break;
      }

      if (collected.length > 0) {
        // Sort by datetime desc
        collected.sort((a, b) => (b.datetime || 0) - (a.datetime || 0));
        return collected.slice(0, maxArticles);
      }
      // If none collected, fall through to general news
    }

    // General market news fallback or when no symbols provided
    const generalUrl = `${FINNHUB_BASE_URL}/news?category=general&token=${token}`;
    const general = await fetchJSON<RawNewsArticle[]>(generalUrl, 300);

    const seen = new Set<string>();
    const unique: RawNewsArticle[] = [];
    for (const art of general || []) {
      if (!validateArticle(art)) continue;
      const key = `${art.id}-${art.url}-${art.headline}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(art);
      if (unique.length >= 20) break; // cap early before final slicing
    }

    const formatted = unique
      .slice(0, maxArticles)
      .map((a, idx) => formatArticle(a, false, undefined, idx));
    return formatted;
  } catch (err) {
    console.error("getNews error:", err);
    throw new Error("Failed to fetch news");
  }
}

export async function getQuote(symbol: string): Promise<QuoteData | null> {
  try {
    const token = FINNHUB_API_KEY;
    if (!token) return null;
    const url = `${FINNHUB_BASE_URL}/quote?symbol=${encodeURIComponent(symbol)}&token=${token}`;
    const data = await fetchJSON<FinnhubQuote>(url, 60);
    return { c: data?.c, dp: data?.dp };
  } catch (e) {
    console.error("Error fetching quote for", symbol, e);
    return null;
  }
}

export async function getProfile(symbol: string): Promise<ProfileData | null> {
  try {
    const token = FINNHUB_API_KEY;
    if (!token) return null;
    const url = `${FINNHUB_BASE_URL}/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${token}`;
    const profile = await fetchJSON<FinnhubProfile>(url, 3600);
    return {
      name: profile?.name || profile?.ticker,
      marketCapitalization: profile?.marketCapitalization,
    };
  } catch (e) {
    console.error("Error fetching profile2 for", symbol, e);
    return null;
  }
}

export async function getStockMetric(
  symbol: string,
): Promise<FinancialsData["metric"] | null> {
  try {
    const token = FINNHUB_API_KEY;
    if (!token) return null;
    const url = `${FINNHUB_BASE_URL}/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all&token=${token}`;
    const data = await fetchJSON<FinnhubMetricResponse>(url, 3600);
    return data?.metric || null;
  } catch (e) {
    console.error("Error fetching metrics for", symbol, e);
    return null;
  }
}

export async function getDailyCandle(
  symbol: string,
  from: string,
  to: string,
): Promise<FinnhubCandleResponse | null> {
  try {
    const token = FINNHUB_API_KEY;
    if (!token) return null;

    const fromEpoch = Math.floor(new Date(from).getTime() / 1000);
    const toEpoch = Math.floor(new Date(to).getTime() / 1000);
    const url = `${FINNHUB_BASE_URL}/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${fromEpoch}&to=${toEpoch}&token=${token}`;
    const data = await fetchJSON<FinnhubCandleResponse>(url, 300);
    if (data?.s !== "ok") return null;
    return data;
  } catch (e) {
    console.error("Error fetching candle for", symbol, e);
    return null;
  }
}

export const searchStocks = cache(
  async (query?: string): Promise<StockWithWatchlistStatus[]> => {
    try {
      const token = FINNHUB_API_KEY;
      if (!token) {
        // If no token, log and return empty to avoid throwing per requirements
        console.warn("FINNHUB API key is not configured");
        return [];
      }

      const trimmed = typeof query === "string" ? query.trim() : "";

      let results: FinnhubSearchResultWithExchange[] = [];

      if (!trimmed) {
        // Fetch top 10 popular symbols' profiles
        const top = POPULAR_STOCK_SYMBOLS.slice(0, 10);
        const profiles = await Promise.all(
          top.map(async (sym) => {
            try {
              const url = `${FINNHUB_BASE_URL}/stock/profile2?symbol=${encodeURIComponent(sym)}&token=${token}`;
              // Revalidate every hour
              const profile = await fetchJSON<FinnhubProfile>(url, 3600);
              return { sym, profile };
            } catch (e) {
              console.error("Error fetching profile2 for", sym, e);
              return { sym, profile: null };
            }
          }),
        );

        results = profiles
          .map(({ sym, profile }) => {
            const symbol = sym.toUpperCase();
            const name: string | undefined =
              profile?.name || profile?.ticker || undefined;
            const exchange: string | undefined = profile?.exchange || undefined;
            if (!name) return undefined;
            const r: FinnhubSearchResultWithExchange = {
              symbol,
              description: name,
              displaySymbol: symbol,
              type: "Common Stock",
              exchange,
            };
            return r;
          })
          .filter((x): x is FinnhubSearchResultWithExchange => Boolean(x));
      } else {
        const url = `${FINNHUB_BASE_URL}/search?q=${encodeURIComponent(trimmed)}&token=${token}`;
        const data = await fetchJSON<FinnhubSearchResponse>(url, 1800);
        results = Array.isArray(data?.result) ? data.result : [];
      }

      const mapped: StockWithWatchlistStatus[] = results
        .map((r) => {
          const upper = (r.symbol || "").toUpperCase();
          const name = r.description || upper;
          const exchangeFromDisplay =
            (r.displaySymbol as string | undefined) || undefined;
          const exchangeFromProfile = r.exchange;
          const exchange = exchangeFromDisplay || exchangeFromProfile || "US";
          const type = r.type || "Stock";
          const item: StockWithWatchlistStatus = {
            symbol: upper,
            name,
            exchange,
            type,
            isInWatchlist: false,
          };
          return item;
        })
        .slice(0, 15);

      return mapped;
    } catch (err) {
      console.error("Error in stock search:", err);
      return [];
    }
  },
);
