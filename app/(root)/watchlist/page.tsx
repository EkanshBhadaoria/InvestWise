import WatchlistPanel from "@/components/WatchlistPanel";
import { getAlertsForUser } from "@/lib/actions/alert.actions";
import { getNews } from "@/lib/actions/finnhub.actions";
import { getWatchlistForUser } from "@/lib/actions/watchlist.actions";

const WatchlistPage = async () => {
  const watchlist = await getWatchlistForUser();
  const alerts = await getAlertsForUser();

  let news: MarketNewsArticle[] = [];
  try {
    const symbols = watchlist.map((item) => item.symbol);
    news = symbols.length > 0 ? await getNews(symbols) : [];
  } catch (e) {
    console.error("Watchlist news fetch failed", e);
  }

  return <WatchlistPanel watchlist={watchlist} alerts={alerts} news={news} />;
};

export default WatchlistPage;
