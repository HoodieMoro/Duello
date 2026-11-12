import { useCallback, useEffect, useState } from 'react';
import { gameById } from './games';
import { playerName, useStore, type Result } from './lib/store';
import Home from './pages/Home';
import GameScreen from './pages/GameScreen';
import Lobby from './online/Lobby';
import Room from './online/Room';
import { normalizeCode } from './online/roomApi';

/** Navigazione con l'hash (#/dama): funziona su GitHub Pages e col tasto Indietro. */
function useRoute() {
  const read = () => window.location.hash.replace(/^#\/?/, '');
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = useCallback((id: string) => {
    window.location.hash = id ? `/${id}` : '/';
  }, []);
  return [route, go] as const;
}

export default function App() {
  const { store, setName, addWin, resetScores } = useStore();
  const [route, go] = useRoute();
  const game = gameById(route);

  const onResult = useCallback((r: Result) => game && r !== 'draw' && addWin(game.id, r), [game, addWin]);
  const online = route.startsWith('online');
  const roomCode = online ? normalizeCode(route.split('/')[1] ?? '') : '';

  useEffect(() => {
    document.title = game ? `${game.name} · Duello` : online ? 'Online · Duello' : 'Duello';
    window.scrollTo(0, 0);
  }, [game, online]);

  if (online) {
    const defaultName = store.names[0].trim() ? playerName(store.names, 0) : '';
    return roomCode ? (
      <Room key={roomCode} code={roomCode} defaultName={defaultName} onLeave={() => go('')} />
    ) : (
      <Lobby defaultName={defaultName} onEnter={(c) => go(`online/${c}`)} onBack={() => go('')} />
    );
  }

  if (game) {
    return (
      <GameScreen
        key={game.id}
        game={game}
        names={store.names}
        score={store.scores[game.id] ?? [0, 0]}
        onResult={onResult}
        onExit={() => go('')}
      />
    );
  }
  return <Home store={store} onName={setName} onPlay={go} onReset={resetScores} />;
}
