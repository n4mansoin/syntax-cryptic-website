'use client';

import { useState, useEffect } from 'react';

export function Countdown({ targetDate }: { targetDate: Date }) {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      if (distance < 0) {
        clearInterval(timer);
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
        return;
      }

      setTimeLeft({
        d: Math.floor(distance / (1000 * 60 * 60 * 24)),
        h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        s: Math.floor((distance % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) return <div className="h-20" />;

  const TimeUnit = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <span className="text-5xl md:text-7xl font-headline font-bold tabular-nums text-white">
        {value.toString().padStart(2, '0')}
      </span>
      <span className="text-xs uppercase tracking-widest text-primary font-medium mt-2">{label}</span>
    </div>
  );

  return (
    <div className="flex gap-8 md:gap-12 animate-fade-in">
      <TimeUnit value={timeLeft.d} label="Days" />
      <TimeUnit value={timeLeft.h} label="Hours" />
      <TimeUnit value={timeLeft.m} label="Min" />
      <TimeUnit value={timeLeft.s} label="Sec" />
    </div>
  );
}
