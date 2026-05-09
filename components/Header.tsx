import Link from "next/link";
import Image from "next/image";
import NavItems from "@/components/NavItems";
import UserDropdown from "@/components/UserDropdown";
import { searchStocks } from "@/lib/actions/finnhub.actions";
import { getWatchlistCount } from "@/lib/actions/watchlist.actions";

const Header = async ({ user }: { user: User }) => {
  const initialStocks = await searchStocks();
  const watchlistCount = await getWatchlistCount();

  return (
    <header className="sticky top-0 header">
      <div className="container header-wrapper">
        <Link href="/">
          <Image
            src="/assets/icons/logo.svg"
            alt="InvestWise logo"
            width={140}
            height={32}
            className="h-8 w-auto cursor-pointer"
          />
        </Link>
        <nav className="hidden sm:block">
          <NavItems initialStocks={initialStocks} />
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/watchlist"
            className="group flex items-center gap-2 rounded-full border border-white/10 bg-gray-700/40 px-3 py-1.5 text-sm font-semibold text-gray-200 transition hover:border-yellow-500/60 hover:text-yellow-500"
          >
            <span>Watchlist</span>
            <span className="rounded-full bg-gray-900/70 px-2 py-0.5 text-xs text-gray-300 group-hover:text-yellow-400">
              {watchlistCount}
            </span>
          </Link>
          <UserDropdown user={user} initialStocks={initialStocks} />
        </div>
      </div>
    </header>
  );
};
export default Header;
