import { useEffect, useState } from "react";

// Counts down once a second from `seconds`. Starts full, since the pages that
// use it are reached right after a code was sent.
export const useCooldown = (seconds: number) => {
  const [secondsLeft, setSecondsLeft] = useState(seconds);

  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timeout = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);

    return () => clearTimeout(timeout);
  }, [secondsLeft]);

  return { secondsLeft, restart: () => setSecondsLeft(seconds) };
};
