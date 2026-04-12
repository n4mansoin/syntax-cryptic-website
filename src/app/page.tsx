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
      
      {/* Spiral Animation Background */}
      <div className="absolute inset-0">
        <SpiralAnimation />
      </div>
      
      {/* Content Overlay */}
      <div className="z-10 text-center flex flex-col items-center space-y-12 max-w-2xl px-6">
        
        {/* Timer at the top */}
        <div className={`
          space-y-4 transition-all duration-1000 
          ${startVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}
        `}>
          {huntStartTime && <Countdown targetDate={huntStartTime} />}
        </div>

        {/* Elegant Enter Button */}
        <div 
          className={`
            transition-all duration-1500 ease-out pt-8
            ${startVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          `}
        >
          <button 
            onClick={handleEnter}
            className="
              text-white text-2xl tracking-[0.4em] uppercase font-extralight
              transition-all duration-700
              hover:tracking-[0.6em] animate-pulse
            "
          >
            Enter
          </button>
        </div>

        <p className={`
          text-white/20 text-[10px] uppercase tracking-[0.4em] font-mono mt-8 transition-opacity duration-1000
          ${startVisible ? 'opacity-100' : 'opacity-0'}
        `}>
          Status: Awaiting terminal link
        </p>
      </div>

      <footer className="absolute bottom-8 left-0 right-0 text-center pointer-events-none opacity-30">
        <p className="text-white/20 text-xs font-mono">v1.0.4-stable // high-frequency signal node</p>
      </footer>
    </div>
  );
}
