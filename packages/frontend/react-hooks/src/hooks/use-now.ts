import { useEffect, useState } from 'react';

/**
 * The time, as a timestamp that moves every `intervalMs`.
 *
 * For anything that renders relative to now — "5 minutes ago" beside a row,
 * an expiry, a countdown. Reading `Date.now()` or `new Date()` during render
 * instead looks the same and is wrong: the React Compiler caches the result on
 * the inputs it can see, so an age computed from `createdAt` alone stops moving
 * until something unrelated changes. Passing this value in makes the clock an
 * input.
 *
 * The outside system is the timer, and every call is one of them. Call it once,
 * above the list: the component that maps over the rows takes `now` and hands
 * it to each row as a prop, so the rows stay pure and a list of fifty ages runs
 * one timer, not fifty. What a tick re-renders is the owner of the hook, so
 * keep it off a component that also holds the page's dialogs or forms. A clock
 * only one thing reads — a one-second countdown — is a leaf of its own that
 * calls the hook and renders just that string.
 *
 * ```tsx
 * function SessionList({ sessions }: Props) {
 *   const now = useNow(60_000);
 *   return sessions.map((s) => <SessionRow key={s.id} session={s} now={now} />);
 * }
 * ```
 */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    // The timer: one tick per interval, cleared on unmount.
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
