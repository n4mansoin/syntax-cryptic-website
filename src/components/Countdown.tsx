'use client';

import { useState, useEffect } from 'react';

export function Countdown({ startDate, endDate }: { startDate: Date; endDate: Date }) {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
  const [statusLabel, setStatusLabel] = useState<string>('');

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date().getTime();
      const startDist = startDate.getTime() - now;
      const endDist = endDate.getTime() - now;

      if (startDist > 0) {
        // Phase 1: Counting down to start
        const distance = startDist;
        setStatusLabel('Hunt starts in');
        setTimeLeft({
          d: Math.floor(distance / (1000 * 60 * 60 * 24)),
          h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((distance % (1000 * 60)) / 1000),
        });
      } else if (endDist > 0) {
        // Phase 2: Counting down to end
        const distance = endDist;
        setStatusLabel('Hunt ends in');
        setTimeLeft({
          d: Math.floor(distance / (1000 * 60 * 60 * 24)),
          h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((distance % (1000 * 60)) / 1000),
        });
      } else {
        // Finished
        setStatusLabel('Hunt ended');
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);

    return () => clearInterval(timer);
  }, [startDate, endDate]);

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
    <div className="flex flex-col items-center gap-4 animate-fade-in">
      <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary/70 mb-2">
        {statusLabel}
      </div>
      <div className="flex gap-8 md:gap-12">
        <TimeUnit value={timeLeft.d} label="Days" />
        <TimeUnit value={timeLeft.h} label="Hours" />
        <TimeUnit value={timeLeft.m} label="Min" />
        <TimeUnit value={timeLeft.s} label="Sec" />
      </div>
    </div>
  );
}
