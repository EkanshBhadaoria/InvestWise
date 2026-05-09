import TradingViewWidget from "@/components/TradingViewWidget";
import {
    HEATMAP_WIDGET_CONFIG,
    MARKET_DATA_WIDGET_CONFIG,
    MARKET_OVERVIEW_WIDGET_CONFIG,
    TOP_STORIES_WIDGET_CONFIG
} from "@/lib/constants";
import {
    Activity,
    ArrowRight,
    Bell,
    ChartNoAxesCombined,
    Flame,
    Grid2X2,
    Newspaper,
    Search,
    Sparkles,
} from "lucide-react";

const FEATURE_LINKS = [
    {
        href: "#market-overview",
        label: "Market Overview",
        description: "Major indices, sectors, futures, bonds, and forex in one sweep.",
        Icon: ChartNoAxesCombined,
    },
    {
        href: "#stock-heatmap",
        label: "Stock Heatmap",
        description: "Spot momentum across companies and industries at a glance.",
        Icon: Grid2X2,
    },
    {
        href: "#top-stories",
        label: "Top Stories",
        description: "Follow market-moving headlines as they develop.",
        Icon: Newspaper,
    },
    {
        href: "#market-data",
        label: "Market Data",
        description: "Compare movers, quotes, and live performance snapshots.",
        Icon: Activity,
    },
    {
        href: "#market-overview",
        label: "Stock Search",
        description: "Use the header search to jump into company pages fast.",
        Icon: Search,
    },
    {
        href: "#market-data",
        label: "Alerts & Watchlist",
        description: "Track names that matter and stay close to price changes.",
        Icon: Bell,
    },
];

const Home = () => {
    const scriptUrl = `https://s3.tradingview.com/external-embedding/embed-widget-`;

    return (
        <div className="flex min-h-screen home-wrapper">
            <section className="flex min-h-[calc(100vh-150px)] w-full flex-col justify-center py-8 md:py-14">
                <div className="max-w-5xl">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-gray-800/55 px-4 py-2 text-sm font-semibold text-gray-100 shadow-2xl shadow-black/25 backdrop-blur-xl">
                        <Sparkles className="h-4 w-4 text-yellow-400" />
                        Live market workspace
                    </div>
                    <h1 className="mt-7 text-5xl font-bold leading-tight text-white sm:text-6xl lg:text-7xl">
                        InvestWise
                    </h1>
                    <p className="mt-5 max-w-3xl text-lg font-medium leading-8 text-gray-200 md:text-xl">
                        A focused command center for market maps, real-time quotes, headlines, search, alerts, and watchlist decisions.
                    </p>
                </div>

                <div className="mt-10 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {FEATURE_LINKS.map(({ href, label, description, Icon }) => (
                        <a
                            key={label}
                            href={href}
                            className="group min-h-40 rounded-lg border border-white/15 bg-gray-800/65 p-5 text-left shadow-2xl shadow-black/25 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-yellow-400/60 hover:bg-gray-800/85"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-yellow-400">
                                    <Icon className="h-5 w-5" />
                                </span>
                                <ArrowRight className="h-5 w-5 shrink-0 text-gray-500 transition group-hover:translate-x-1 group-hover:text-yellow-400" />
                            </div>
                            <h2 className="mt-5 text-xl font-semibold text-white">{label}</h2>
                            <p className="mt-2 text-sm leading-6 text-gray-300">{description}</p>
                        </a>
                    ))}
                </div>
            </section>

            <section className="flex w-full items-center gap-3 pt-2 text-sm font-semibold uppercase text-gray-200">
                <Flame className="h-5 w-5 text-yellow-400" />
                Market tools
            </section>

          <section className="grid w-full gap-8 home-section">
              <div id="market-overview" className="scroll-mt-28 md:col-span-1 xl:col-span-1">
                  <TradingViewWidget
                    title="Market Overview"
                    scriptUrl={`${scriptUrl}market-overview.js`}
                    config={MARKET_OVERVIEW_WIDGET_CONFIG}
                    className="custom-chart"
                    height={600}
                  />
              </div>
              <div id="stock-heatmap" className="scroll-mt-28 md:col-span-1 xl:col-span-2">
                  <TradingViewWidget
                      title="Stock Heatmap"
                      scriptUrl={`${scriptUrl}stock-heatmap.js`}
                      config={HEATMAP_WIDGET_CONFIG}
                      height={600}
                  />
              </div>
          </section>
            <section className="grid w-full gap-8 home-section">
                <div id="top-stories" className="h-full scroll-mt-28 md:col-span-1 xl:col-span-1">
                    <TradingViewWidget
                        title="Top Stories"
                        scriptUrl={`${scriptUrl}timeline.js`}
                        config={TOP_STORIES_WIDGET_CONFIG}
                        height={600}
                    />
                </div>
                <div id="market-data" className="h-full scroll-mt-28 md:col-span-1 xl:col-span-2">
                    <TradingViewWidget
                        title="Market Data"
                        scriptUrl={`${scriptUrl}market-quotes.js`}
                        config={MARKET_DATA_WIDGET_CONFIG}
                        height={600}
                    />
                </div>
            </section>
        </div>
    )
}

export default Home;
