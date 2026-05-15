import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API_BASE_URL, fetchWithAuth, getAuthHeaders } from '../config/api';
import GameBetHistoryPicker from '../components/GameBetHistoryPicker';
import GameBetHistoryList from '../components/GameBetHistoryList';

const getUsername = () => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    return u?.username || u?.name || u?.phone || '';
  } catch {
    return '';
  }
};

const GameBetHistory = () => {
  const navigate = useNavigate();
  const { gameCode: gameCodeParam } = useParams();
  const selectedCode = useMemo(
    () => (gameCodeParam ? String(gameCodeParam).trim().toUpperCase() : ''),
    [gameCodeParam]
  );

  const [games, setGames] = useState([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const username = useMemo(() => getUsername(), []);

  const selectedGame = useMemo(
    () => games.find((g) => String(g.gameCode || '').toUpperCase() === selectedCode),
    [games, selectedCode]
  );

  const selectedGameName = selectedGame?.name || selectedCode || 'Game';

  useEffect(() => {
    let alive = true;
    (async () => {
      setGamesLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/games`, { cache: 'no-store' });
        const data = await res.json();
        if (alive && data?.success && Array.isArray(data?.data)) setGames(data.data);
        else if (alive) setGames([]);
      } catch {
        if (alive) setGames([]);
      } finally {
        if (alive) setGamesLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const fetchHistory = useCallback(async () => {
    if (!selectedCode) return;
    setHistoryLoading(true);
    try {
      const qs = new URLSearchParams({ limit: '100', gameCode: selectedCode });
      const res = await fetchWithAuth(`${API_BASE_URL}/games/my-bet-history?${qs}`, {
        headers: getAuthHeaders(),
      });
      if (res.status === 401) return;
      const data = await res.json();
      if (data?.success && Array.isArray(data?.data)) setEntries(data.data);
      else setEntries([]);
    } catch {
      setEntries([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [selectedCode]);

  useEffect(() => {
    if (!selectedCode) return;
    fetchHistory();
    const id = setInterval(fetchHistory, 30000);
    return () => clearInterval(id);
  }, [fetchHistory, selectedCode]);

  const handleSelectGame = (game) => {
    const code = String(game?.gameCode || '').trim().toUpperCase();
    if (code) navigate(`/game-bet-history/${encodeURIComponent(code)}`);
  };

  const handleBack = () => {
    if (selectedCode) navigate('/game-bet-history');
    else navigate(-1);
  };

  return (
    <div className="min-h-screen bg-[#111827] text-white px-3 sm:px-4 pt-3 pb-[calc(7rem+env(safe-area-inset-bottom,0px))]">
      <div className="w-full max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-[#374151] border border-[#374151] flex items-center justify-center text-gray-200 hover:bg-gray-200 active:scale-95 transition"
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate text-[#1a74e5]">Game Bet History</h1>
            {selectedCode ? (
              <p className="text-sm text-gray-400 truncate">{selectedGameName}</p>
            ) : (
              <p className="text-sm text-gray-400">Select a game to view history</p>
            )}
          </div>
        </div>

        {!selectedCode ? (
          <GameBetHistoryPicker games={games} loading={gamesLoading} onSelect={handleSelectGame} />
        ) : (
          <GameBetHistoryList
            entries={entries}
            loading={historyLoading}
            username={username}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            gameName={selectedGameName}
          />
        )}
      </div>
    </div>
  );
};

export default GameBetHistory;

