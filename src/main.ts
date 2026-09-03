import './styles.css';
import { createGame } from './game/create-game';

const root = document.querySelector<HTMLElement>('#game-root');
if (!root) throw new Error('Missing #game-root');
createGame(root);
