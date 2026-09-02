import { APP_NAME } from './app-meta';
import './styles.css';

const root = document.querySelector<HTMLElement>('#game-root');
if (!root) throw new Error('Missing #game-root');
root.textContent = APP_NAME;
