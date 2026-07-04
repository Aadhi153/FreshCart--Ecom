import { useEffect, type RefObject } from 'react';

export function useClickOutside(
  refs: RefObject<HTMLElement | null>[],
  onOutside: () => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;

    const handlePointerDown = (event: PointerEvent) => {
      const insideAny = refs.some((ref) => ref.current?.contains(event.target as Node));
      if (!insideAny) onOutside();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [refs, onOutside, enabled]);
}
