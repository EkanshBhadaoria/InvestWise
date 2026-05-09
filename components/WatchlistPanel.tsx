"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Trash2, Pencil } from "lucide-react";
import AlertModal from "@/components/AlertModal";
import { deleteAlert } from "@/lib/actions/alert.actions";
import { removeFromWatchlist } from "@/lib/actions/watchlist.actions";
import { WATCHLIST_TABLE_HEADER } from "@/lib/constants";
import { getAlertText, getChangeColorClass } from "@/lib/utils";

const WatchlistPanel = ({
  watchlist,
  alerts,
  news,
}: {
  watchlist: StockWithData[];
  alerts: Alert[];
  news: MarketNewsArticle[];
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAlertId, setEditingAlertId] = useState<string | undefined>(
    undefined,
  );
  const [modalData, setModalData] = useState<AlertData | undefined>(undefined);

  const alertsBySymbol = useMemo(() => {
    const map = new Map<string, Alert[]>();
    alerts.forEach((alert) => {
      const key = alert.symbol.toUpperCase();
      const list = map.get(key) || [];
      list.push(alert);
      map.set(key, list);
    });
    return map;
  }, [alerts]);

  const handleCreateAlert = (symbol: string, company: string) => {
    setEditingAlertId(undefined);
    setModalData({
      symbol,
      company,
      alertName: `${symbol} alert`,
      alertType: "upper",
      threshold: "",
    });
    setModalOpen(true);
  };

  const handleEditAlert = (alert: Alert) => {
    setEditingAlertId(alert.id);
    setModalData({
      symbol: alert.symbol,
      company: alert.company,
      alertName: alert.alertName,
      alertType: alert.alertType,
      threshold: String(alert.threshold),
    });
    setModalOpen(true);
  };

  const handleDeleteAlert = async (alertId: string) => {
    await deleteAlert(alertId);
  };

  const handleRemoveWatchlist = async (symbol: string) => {
    await removeFromWatchlist(symbol);
  };

  if (!watchlist || watchlist.length === 0) {
    return (
      <div className="watchlist-empty-container min-h-[calc(100vh-180px)] justify-center">
        <div className="watchlist-empty items-center text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="watchlist-star"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.385a.563.563 0 00-.182-.557L3.04 10.385a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345l2.125-5.111z"
            />
          </svg>
          <h2 className="empty-title">Your watchlist is empty</h2>
          <p className="empty-description">
            Add symbols to personalize alerts, track price changes, and catch
            volume spikes.
          </p>
          <Link href="/search" className="search-btn mx-auto">
            Search stocks
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="watchlist-container">
      <section className="watchlist">
        <div className="flex items-center justify-between">
          <h1 className="watchlist-title">Your watchlist</h1>
          <Link href="/search" className="search-btn">
            Add more
          </Link>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-600 bg-gray-800">
          <table className="watchlist-table">
            <thead>
              <tr className="table-header-row">
                {WATCHLIST_TABLE_HEADER.map((label) => (
                  <th
                    key={label}
                    className="table-header px-4 py-3 text-left text-sm"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {watchlist.map((item) => {
                const symbolAlerts = alertsBySymbol.get(item.symbol) || [];
                return (
                  <tr key={item.symbol} className="table-row">
                    <td className="table-cell px-4 py-4">
                      <div className="font-semibold text-gray-100">
                        {item.company}
                      </div>
                    </td>
                    <td className="table-cell px-4 py-4 text-gray-300">
                      {item.symbol}
                    </td>
                    <td className="table-cell px-4 py-4">
                      {item.priceFormatted}
                    </td>
                    <td
                      className={`table-cell px-4 py-4 ${getChangeColorClass(item.changePercent)}`}
                    >
                      {item.changeFormatted || "--"}
                    </td>
                    <td className="table-cell px-4 py-4 text-gray-300">
                      {item.marketCap}
                    </td>
                    <td className="table-cell px-4 py-4 text-gray-300">
                      {item.peRatio}
                    </td>
                    <td className="table-cell px-4 py-4">
                      <div className="flex flex-col gap-1">
                        {symbolAlerts.length === 0 ? (
                          <span className="text-sm text-gray-500">
                            No alerts
                          </span>
                        ) : (
                          symbolAlerts.slice(0, 2).map((alert) => (
                            <span
                              key={alert.id}
                              className="text-sm text-gray-300"
                            >
                              {getAlertText(alert)}
                            </span>
                          ))
                        )}
                        <button
                          className="add-alert"
                          onClick={() =>
                            handleCreateAlert(item.symbol, item.company)
                          }
                          type="button"
                        >
                          + Add alert
                        </button>
                      </div>
                    </td>
                    <td className="table-cell px-4 py-4">
                      <button
                        className="watchlist-icon-btn watchlist-icon"
                        onClick={() => handleRemoveWatchlist(item.symbol)}
                        type="button"
                        title={`Remove ${item.symbol}`}
                        aria-label={`Remove ${item.symbol}`}
                      >
                        <Trash2 className="trash-icon" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="watchlist-alerts">
        <div className="flex items-center justify-between">
          <h2 className="watchlist-title">Alerts</h2>
        </div>
        <div className="alert-list">
          {alerts.length === 0 ? (
            <div className="alert-empty">No alerts set yet.</div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="alert-item">
                <div className="alert-name">{alert.alertName}</div>
                <div className="alert-details">
                  <span className="alert-company">{alert.company}</span>
                  <span className="alert-price">{getAlertText(alert)}</span>
                </div>
                <div className="alert-actions">
                  <span className="text-xs text-gray-500">{alert.symbol}</span>
                  <div className="flex items-center gap-2">
                    <button
                      className="alert-update-btn"
                      onClick={() => handleEditAlert(alert)}
                      type="button"
                      title="Edit alert"
                      aria-label="Edit alert"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      className="alert-delete-btn"
                      onClick={() => handleDeleteAlert(alert.id)}
                      type="button"
                      title="Delete alert"
                      aria-label="Delete alert"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {news && news.length > 0 ? (
          <div>
            <h2 className="watchlist-title mt-8">Watchlist news</h2>
            <div className="watchlist-news mt-4">
              {news.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  className="news-item"
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="news-tag">{item.source}</span>
                  <h3 className="news-title">{item.headline}</h3>
                  <p className="news-summary">{item.summary}</p>
                  <span className="news-cta">Read more</span>
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </aside>

      <AlertModal
        alertId={editingAlertId}
        alertData={modalData}
        open={modalOpen}
        setOpen={setModalOpen}
      />
    </div>
  );
};

export default WatchlistPanel;
