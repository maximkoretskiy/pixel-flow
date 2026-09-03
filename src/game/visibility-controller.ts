export function handleVisibility(hidden: boolean, pause: () => void): void {
  if (hidden) pause();
}

export function bindVisibility(doc: Document, pause: () => void): () => void {
  const listener = () => handleVisibility(doc.hidden, pause);
  doc.addEventListener('visibilitychange', listener);
  return () => doc.removeEventListener('visibilitychange', listener);
}
