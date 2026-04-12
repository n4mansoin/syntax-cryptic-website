
'use client';

import { useState, useEffect } from 'react';
import { Countdown } from '@/components/Countdown';
import { Navbar } from '@/components/Navbar';
import { SpiralAnimation } from "@/components/ui/spiral-animation";
import { useAuth } from '@/lib/auth-store';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { auth } = useAuth();
  const router = useRouter();
  const [huntStartTime, setHuntStartTime] = useState<Date | null>(null);
  const [startVisible, setStartVisible] = useState(false);

  useEffect(() => {
    // Target: Tomorrow same time for demo purposes
    const target = new Date();
    target.setDate(target.getDate() + 1);
    setHuntStartTime(target);

    const timer = setTimeout(() => {
      setStartVisible(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const handleEnter = () => {
    if (auth.userType === 'team') {
      router.push('/hunt');
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-black flex flex-col items-center justify-center">
      <Navbar />
      
      {/* Spiral Animation Background - Shifted down by 48px (translate-y-12) */}
      <div className="absolute inset-0 translate-y-12">
        <SpiralAnimation />
      </div>
      
      {/* Timer at the top */}
      <div className={`
        absolute top-32 z-10 transition-all duration-1000 px-6
        ${startVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}
      `}>
        {huntStartTime && <Countdown targetDate={huntStartTime} />}
      </div>

      {/* START Button - Positioned at the visual center of the spiral */}
      {/* Offset calculation: 48px (spiral shift) + 28px (internal spiral offset) = 76px */}
      <div 
        className={`
          absolute inset-0 z-20 flex items-center justify-center pointer-events-none
          transition-all duration-1500 ease-out translate-y-[76px]
          ${startVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
        `}
      >
        <button 
          onClick={handleEnter}
          className="
            pointer-events-auto
            text-white text-2xl tracking-[0.6em] uppercase font-extralight
            transition-all duration-700
            hover:tracking-[0.8em] animate-pulse
            bg-transparent border-none outline-none
          "
        >
          START
        </button>
      </div>

      <footer className="absolute bottom-8 left-0 right-0 text-center pointer-events-none opacity-30">
        <p className="text-white/20 text-xs font-mono">v1.0.4-stable // high-frequency signal node</p>
      </footer>
    </div>
  );
}
