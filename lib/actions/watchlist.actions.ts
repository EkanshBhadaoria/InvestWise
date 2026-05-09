"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/database/mongoose";
import { Watchlist } from "@/database/models/watchlist.model";
import { auth } from "@/lib/better-auth/auth";
import {
  formatChangePercent,
  formatMarketCapValue,
  formatPrice,
} from "@/lib/utils";
import {
  getProfile,
  getQuote,
  getStockMetric,
} from "@/lib/actions/finnhub.actions";

const getSessionUser = async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ? session.user : null;
};

export async function getWatchlistSymbolsByEmail(
  email: string,
): Promise<string[]> {
  if (!email) return [];

  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection not found");

    // Better Auth stores users in the "user" collection
    const user = await db
      .collection("user")
      .findOne<{ _id?: unknown; id?: string; email?: string }>({ email });

    if (!user) return [];

    const userId = (user.id as string) || String(user._id || "");
    if (!userId) return [];

    const items = await Watchlist.find({ userId }, { symbol: 1 }).lean();
    return items.map((i) => String(i.symbol));
  } catch (err) {
    console.error("getWatchlistSymbolsByEmail error:", err);
    return [];
  }
}

export async function getWatchlistCount(): Promise<number> {
  const user = await getSessionUser();
  if (!user) return 0;

  await connectToDatabase();
  return Watchlist.countDocuments({ userId: user.id });
}

export async function getWatchlistForUser(): Promise<StockWithData[]> {
  const user = await getSessionUser();
  if (!user) return [];

  await connectToDatabase();
  const items = await Watchlist.find({ userId: user.id })
    .sort({ addedAt: -1 })
    .lean();

  const enriched = await Promise.all(
    items.map(async (item) => {
      const symbol = String(item.symbol || "").toUpperCase();
      const [quote, profile, metrics] = await Promise.all([
        getQuote(symbol),
        getProfile(symbol),
        getStockMetric(symbol),
      ]);

      const currentPrice = quote?.c || undefined;
      const changePercent = quote?.dp || undefined;
      const marketCapMillions = profile?.marketCapitalization;
      const marketCap = Number.isFinite(marketCapMillions)
        ? formatMarketCapValue((marketCapMillions as number) * 1_000_000)
        : "N/A";
      const peRatio = metrics?.peTTM ? metrics.peTTM.toFixed(2) : "N/A";

      return {
        userId: String(item.userId),
        symbol,
        company: String(item.company),
        addedAt: item.addedAt,
        currentPrice,
        changePercent,
        priceFormatted: currentPrice ? formatPrice(currentPrice) : "N/A",
        changeFormatted: formatChangePercent(changePercent),
        marketCap,
        peRatio,
      } as StockWithData;
    }),
  );

  return enriched;
}

export async function addToWatchlist(symbol: string, company: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  if (!symbol || !company) throw new Error("Invalid watchlist item");

  await connectToDatabase();
  await Watchlist.updateOne(
    { userId: user.id, symbol: symbol.toUpperCase() },
    {
      $setOnInsert: {
        userId: user.id,
        symbol: symbol.toUpperCase(),
        company,
        addedAt: new Date(),
      },
    },
    { upsert: true },
  );

  revalidatePath("/watchlist");
}

export async function removeFromWatchlist(symbol: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  await connectToDatabase();
  await Watchlist.deleteOne({ userId: user.id, symbol: symbol.toUpperCase() });

  revalidatePath("/watchlist");
}
