export function bindOutsideDrop(rootEl: HTMLElement, onOutsideTap: () => void) {
  const handler = (ev: MouseEvent) => {
    const target = ev.target as Node
    if (rootEl && !rootEl.contains(target)) {
      onOutsideTap()
    }
  }
  document.addEventListener('mousedown', handler)
  return () => document.removeEventListener('mousedown', handler)
}
