import { useEffect, useRef, type RefObject } from 'react';

const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const previous = document.activeElement as HTMLElement | null;
    const getFocusable = () => Array.from(container.querySelectorAll<HTMLElement>(focusableSelector))
      .filter((element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true');

    const initial = getFocusable()[0];
    if (initial && !container.contains(document.activeElement)) initial.focus();
    else if (!initial) container.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || event.defaultPrevented) return;
      const focusable = getFocusable();
      const active = document.activeElement as HTMLElement | null;
      if (!focusable.length) {
        event.preventDefault();
        container.focus();
        return;
      }
      if (event.shiftKey && (active === focusable[0] || !container.contains(active))) {
        event.preventDefault();
        focusable[focusable.length - 1].focus();
      } else if (!event.shiftKey && (active === focusable[focusable.length - 1] || !container.contains(active))) {
        event.preventDefault();
        focusable[0].focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus?.();
    };
  }, []);

  return ref;
}
