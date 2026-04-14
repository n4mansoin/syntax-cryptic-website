'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Navbar } from '@/components/Navbar';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Send, Timer, HelpCircle, Lightbulb, CheckCircle2, Loader2, ShieldAlert, Wifi } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-store';
import { useStore } from '@/lib/local-store';
import { localApi } from '@/services/local-api';
import { useFirestore } from '@/firebase';

export default function HuntPage() {
  const db = useFirestore();
  const { auth, loading: authLoading } = useAuth();
  const { state, isReady } = useStore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [levelTimer, setLevelTimer] = useState(0);
  const [penaltyTimeLeft, setPenaltyTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !auth.teamId && !auth.adminId) {
      router.push('/login');
    }
  }, [auth, authLoading, router]);

  const teamData = useMemo(() => state.teams.find(t => t.id === auth.teamId), [state.teams, auth.teamId]);
  const currentLevelNumber = teamData?.currentLevel || 1;
  const currentLevel = useMemo(() => state.levels.find(l => l.order === currentLevelNumber), [state.levels, currentLevelNumber]);
  
  const releasedHints = useMemo(() => {
    if (!currentLevel) return [];
    return state.hints.filter(h => h.levelId === currentLevel.id && h.isReleased);
  }, [state.hints, currentLevel]);

  useEffect(() => {
    if (!teamData?.penaltyUntil) {
      setPenaltyTimeLeft(null);
      return;
    }

    const checkPenalty = () => {
      const distance = new Date(teamData.penaltyUntil!).getTime() - new Date().getTime();
      if (distance <= 0) {
        setPenaltyTimeLeft(null);
      } else {
        const m = Math.floor(distance / 60000);
        const s = Math.floor((distance % 60000) / 1000);
        setPenaltyTimeLeft(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      }
    };

    checkPenalty();
    const interval = setInterval(checkPenalty, 1000);
    return () => clearInterval(interval);
  }, [teamData?.penaltyUntil]);

  useEffect(() => {
    if (auth.teamId && isReady && !penaltyTimeLeft) {
      const timer = setInterval(() => setLevelTimer(prev => prev + 1), 1000);
      return () => clearInterval(timer);
    }
  }, [auth.teamId, isReady, penaltyTimeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || !auth.teamId || !currentLevel || penaltyTimeLeft || !db) return;
    
    setSubmitting(true);
    const result = await localApi.submitAnswer(db, auth.teamId, currentLevel.id, answer, state);

    if (result.success) {
      toast({ title: "Verification Passed", description: result.message });
      setAnswer('');
    } else {
      toast({ 
        variant: "destructive", 
        title: result.flagged ? "Protocol Violation" : "Access Denied", 
        description: result.message 
      });
    }
    setSubmitting(false);
  };

  if (authLoading || !isReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const progressPercentage = Math.max(0, Math.min(100, (currentLevelNumber - 1) * 20));

  return (
    <div className="min-h-screen bg-background flex flex-col p-6 pt-24 items-center">
      <Navbar />

      <div className="w-full max-w-4xl space-y-8 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Image src="/images/logo1.png" alt="Terminal" width={32} height={32} />
            </div>
            <div>
              <h2 className="text-2xl font-headline font-bold text-white uppercase">
                {currentLevelNumber > 5 ? "Terminal Cleared" : `Level 0${currentLevelNumber}`}
              </h2>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono uppercase tracking-[0.2em]">
                <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> {formatTime(levelTimer)}</span>
                <span className="flex items-center gap-1 text-primary/60"><Wifi className="w-3 h-3 animate-pulse" /> Signal Stable</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 min-w-[200px]">
            <div className="flex justify-between w-full text-[10px] uppercase font-mono tracking-widest text-primary">
              <span>Sync Progress</span>
              <span>{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-1.5 bg-white/5" />
          </div>
        </div>

        <div className="flex flex-col items-center space-y-12 py-12">
          {penaltyTimeLeft ? (
            <div className="flex flex-col items-center gap-8 py-12 text-center">
              <ShieldAlert className="w-24 h-24 text-destructive animate-pulse" />
              <div className="space-y-4">
                <h3 className="text-3xl font-headline font-bold uppercase text-white">System Lockout</h3>
                <p className="text-sm text-muted-foreground font-mono max-w-sm">Signal suppressed due to repeated protocol violations. Recalibrating downlink...</p>
                <div className="p-8 bg-destructive/10 border border-destructive/20 rounded-2xl">
                  <span className="text-6xl font-mono font-bold text-destructive tracking-widest">{penaltyTimeLeft}</span>
                </div>
              </div>
            </div>
          ) : currentLevelNumber > 5 ? (
            <div className="flex flex-col items-center gap-6 py-12 text-center">
              <CheckCircle2 className="w-20 h-20 text-primary" />
              <h3 className="text-4xl font-headline font-bold uppercase">Breach Complete</h3>
              <p className="text-muted-foreground font-mono text-sm max-w-md">Final security layer bypassed. Your progress has been logged to the global leaderboard.</p>
              <Button onClick={() => router.push('/leaderboard')} className="mt-8 font-bold tracking-widest uppercase">View Rankings</Button>
            </div>
          ) : (
            <>
              <div className="relative w-full max-w-2xl text-center">
                <div className="absolute -left-12 -top-12 text-primary/5 select-none">
                  <HelpCircle className="w-32 h-32" />
                </div>
                <p className="text-2xl md:text-3xl font-body leading-relaxed text-white/90 whitespace-pre-wrap">
                  {currentLevel?.question}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-6">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-primary/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all duration-500 pointer-events-none" />
                  <Input 
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="ENTER DECRYPTION KEY"
                    className="relative h-16 text-xl text-center bg-card/60 backdrop-blur-xl border-white/5 focus:border-transparent transition-all duration-500 font-mono uppercase tracking-[0.3em] rounded-xl text-white outline-none ring-0"
                    disabled={submitting}
                  />
                </div>

                <Button 
                  disabled={submitting || !answer.trim()} 
                  type="submit" 
                  className="w-full h-14 text-lg font-bold bg-primary text-white border-none rounded-xl transition-all duration-500 hover:bg-white/5 hover:backdrop-blur-2xl hover:text-primary hover:[transform:perspective(1000px)_rotateX(4deg)_rotateY(2deg)_translateY(-2px)] active:scale-95"
                >
                  {submitting ? "VERIFYING..." : "EXECUTE SUBMISSION"}
                </Button>
              </form>

              {releasedHints.length > 0 && (
                <div className="w-full max-w-lg space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Lightbulb className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Captured Signals:</span>
                  </div>
                  <div className="space-y-4">
                    {releasedHints.map((hint) => (
                      <div key={hint.id} className="p-6 bg-white/5 border border-white/10 rounded-xl animate-scale-up">
                        <p className="text-sm font-body text-white/70 italic leading-relaxed">"{hint.hintText}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
