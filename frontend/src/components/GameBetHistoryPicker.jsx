import React from 'react';

const GameBetHistoryPicker = ({ games, loading, onSelect, compact = false }) => {
  if (loading) {
    return (
      <p className={`text-center text-gray-400 ${compact ? 'text-sm py-6' : 'py-12'}`}>Loading games...</p>
    );
  }

  if (!games?.length) {
    return (
      <p className={`text-center text-gray-400 ${compact ? 'text-sm py-6' : 'py-12'}`}>No games available.</p>
    );
  }

  return (
    <div className={`grid gap-3 ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
      {games.map((game) => {
        const code = String(game.gameCode || '').toUpperCase();
        return (
          <button
            key={code}
            type="button"
            onClick={() => onSelect(game)}
            className="group flex items-center gap-4 rounded-2xl border-2 border-[#374151] bg-[#1f2937] p-4 text-left hover:border-[#1a74e5] hover:bg-[#243044] transition-colors shadow-md"
          >
            <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-[#111827] border border-[#374151]">
              {game.image ? (
                <img src={game.image} alt={game.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg font-bold text-[#1a74e5]">
                  {code.slice(0, 2)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-white text-lg truncate">{game.name || code}</p>
              <p className="text-xs text-gray-400 mt-0.5">View bet history</p>
            </div>
            <svg className="w-5 h-5 text-gray-500 group-hover:text-[#1a74e5] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        );
      })}
    </div>
  );
};

export default GameBetHistoryPicker;

