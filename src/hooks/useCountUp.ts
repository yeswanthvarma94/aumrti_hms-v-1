import { useEffect, useRef, useState } from "react";

/**
 * Counts up from previous value to target with an ease-out cubic curve.
 * Performance: only animates on the first non-zero render. Subsequent value
 * changes (e.g. realtime updates) update the displayed value instantly so
 * we don't trigger 60fps re-renders across every dashboard card on every
 * realtime event.
 */
export function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(target);
  const rafRef = useRef<number>();
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    // Skip animation entirely after the first run — realtime updates land instantly.
    if (hasAnimatedRef.current) {
      setValue(target);
      return;
    }

    if (target === 0) {
      setValue(0);
      hasAnimatedRef.current = true;
      return;
    }

    hasAnimatedRef.current = true;
    const start = 0;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + (target - start) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return value;
}
