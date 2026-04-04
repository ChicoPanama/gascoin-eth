"use client";

import { useEffect, useState } from "react";
import type { CooldownStatus } from "../types/wallet-tracker";

export function useCooldownTimer(cooldown: CooldownStatus | null) {
  const [secondsLeft, setSecondsLeft] = useState(cooldown?.seconds_remaining ?? 0);

  useEffect(() => {
    if (!cooldown?.in_cooldown) { setSecondsLeft(0); return; }
    setSecondsLeft(cooldown.seconds_remaining);
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const days = Math.floor(secondsLeft / 86400);
  const hours = Math.floor((secondsLeft % 86400) / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  return {
    secondsLeft, days, hours, minutes, seconds,
    formatted: `${String(days).padStart(2, '0')}D ${String(hours).padStart(2, '0')}H ${String(minutes).padStart(2, '0')}M ${String(seconds).padStart(2, '0')}S`,
    expired: secondsLeft === 0,
  };
}
