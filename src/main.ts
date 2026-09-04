import './styles.css';
import { createGame } from './game/create-game';
import { resolveLevelSelection, writeLevelSelection } from './levels/selection';

const root = document.querySelector<HTMLElement>('#game-root');
if (!root) throw new Error('Missing #game-root');
const initialEntry = resolveLevelSelection(window.location.search);
writeLevelSelection(initialEntry.id, 'replace');
const game = createGame(root, initialEntry.id);

window.addEventListener('popstate', () => {
  const entry = resolveLevelSelection(window.location.search);
  writeLevelSelection(entry.id, 'replace');
  game.scene.getScene('pixel-flow').scene.restart({ levelId: entry.id });
});
