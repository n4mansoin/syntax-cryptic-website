'use client';

import { Countdown } from '@/components/Countdown';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Terminal, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-store';

export default function Home() {
  const { auth } = useAuth();
  // Target: Tomorrow same time for demo purposes
  const huntStartTime = new Date();
  huntStartTime.setDate(huntStartTime.getDate() + 1);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <Navbar />
      
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="z-10 text-center max-w-2xl flex flex-col items-center space-y-12">
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3 mb-2 animate-fade-in">
            <div className="h-[1px] w-8 bg-primary/40" />
            <span className="text-primary font-medium tracking-[0.3em] text-xs uppercase">Cryptic Transmission Incoming</span>
            <div className="h-[1px] w-8 bg-primary/40" />
          </div>
          <h1 className="text-6xl md:text-8xl font-headline font-black tracking-tighter text-white animate-scale-up">
            INTRA<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">SYNTAX</span>
          </h1>
        </div>

        <div className="space-y-6">
          <p className="text-muted-foreground uppercase tracking-widest text-sm font-medium">Hunt starts in</p>
          <Countdown targetDate={huntStartTime} />
        </div>

        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
          {auth.userType === 'team' ? (
            <Link href="/hunt" className="w-full">
              <Button size="lg" className="w-full group h-14 text-lg font-bold rounded-xl bg-primary hover:bg-primary/90 transition-all duration-300 shadow-[0_0_20px_rgba(124,92,255,0.3)]">
                ENTER THE VOID
                <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          ) : (
            <Link href="/login" className="w-full">
              <Button size="lg" variant="outline" className="w-full h-14 text-lg font-bold rounded-xl border-white/10 hover:bg-white/5 transition-all">
                TEAM LOGIN
              </Button>
            </Link>
          )}
          <p className="text-white/20 text-[10px] uppercase tracking-[0.4em] font-mono">Status: Awaiting decryption key</p>
        </div>
      </div>

      <footer className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-white/20 text-xs font-mono">v1.0.4-stable // intra.syntax.io</p>
      </footer>
    </div>
  );
}
