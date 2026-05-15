import React, { useMemo } from 'react';
import GameBetHistoryCard from './GameBetHistoryCard';

const GameBetHistoryList = ({ entries, loading, username, selectedStatus, onStatusChange, gameName, hideFilters = false }) => {
  const filtered = useMemo(() => {
    if (selectedStatus === 'win') {
      return entries.filter((e) => e.status === 'won' || (Number(e.payout) || 0) > 0);
    }
    if (selectedStatus === 'lost') {
      return entries.filter((e) => e.status === 'lost' && (Number(e.payout) || 0) === 0);
    }
    return entries;
  }, [entries, selectedStatus]);

  return (
    <>
      {!hideFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 mr-1">Result</span>
          {[
            { key: 'all', label: 'All' },
            { key: 'win', label: 'Win' },
            { key: 'lost', label: 'Lost' },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => onStatusChange(key)}
              className={`min-h-[40px] px-4 rounded-xl text-sm font-bold border-2 transition-colors ${
                selectedStatus === key
                  ? 'bg-[#1a74e5] border-[#1a74e5] text-white shadow-sm'
                  : 'bg-[#111827] border-[#374151] text-[#1a74e5] hover:border-[#1a74e5]/40 hover:bg-[#1f2937]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border-2 border-[#374151] bg-[#1f2937] p-6 text-center text-gray-300">
          Loading {gameName ? `${gameName} ` : ''}history...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-[#374151] bg-[#1f2937] p-6 text-center text-gray-300">
          No bets found for this game.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {filtered.map((entry, i) => (
            <GameBetHistoryCard key={entry.id || i} entry={entry} index={i + 1} username={username} />
          ))}
        </div>
      )}
    </>
  );
};

export default GameBetHistoryList;


