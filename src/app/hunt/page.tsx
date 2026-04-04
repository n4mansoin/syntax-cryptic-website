'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Terminal, Send, Timer, HelpCircle, Lightbulb, CheckCircle2, Loader2, AlertCircle, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-store';
import { useStore } from '@/lib/local-store';
import { localApi } from '@/services/local-api';

export default function HuntPage() {
  const { auth, loading: authLoading } = useAuth();
  const { state, isReady, updateStore } = useStore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [levelTimer, setLevelTimer] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [penaltyTimeLeft, setPenaltyTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !authLoading && !auth.teamId) {
      router.push('/login');
    }
  }, [auth, authLoading, router, isMounted]);

  const teamData = state.teams.find(t => t.id === auth.teamId);
  const currentLevelNumber = teamData?.currentLevel || 1;
  const currentLevel = state.levels.find(l => l.order === currentLevelNumber);
  
  const releasedHints = state.hints.filter(h => h.levelId === currentLevel?.id && h.isReleased);

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
    if (isMounted && auth.teamId && isReady && !penaltyTimeLeft) {
      const timer = setInterval(() => setLevelTimer(prev => prev + 1), 1000);
      return () => clearInterval(timer);
    }
  }, [auth, isReady, isMounted, penaltyTimeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || !auth.teamId || !currentLevel || penaltyTimeLeft) return;
    setSubmitting(true);

    const result = await localApi.submitAnswer(auth.teamId, currentLevel.id, answer, { state, updateStore });

    if (result.success) {
      toast({ title: "Decryption Successful", description: result.message });
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

  if (!isMounted || authLoading || !isReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!auth.teamId) return null;

  const progressPercentage = Math.max(0, Math.min(100, (currentLevelNumber - 1) * 20));

  return (
    <div className="min-h-screen bg-background flex flex-col p-6 pt-24 items-center relative">
      <Navbar />

      <div className="w-full max-w-4xl space-y-8 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Terminal className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-headline font-bold text-white uppercase tracking-tighter">
                {currentLevelNumber > 5 ? "Victory" : `Level 0${currentLevelNumber}`}
              </h2>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono uppercase tracking-[0.2em]">
                <Timer className="w-3 h-3" /> Time: {formatTime(levelTimer)}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 min-w-[200px]">
            <div className="flex justify-between w-full text-[10px] uppercase font-mono tracking-widest text-primary">
              <span>Progress</span>
              <span>{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-1.5 bg-white/5" />
          </div>
        </div>

        <div className="flex flex-col items-center space-y-12 py-12">
          {penaltyTimeLeft ? (
            <div className="flex flex-col items-center gap-8 py-12 animate-fade-in text-center max-w-md">
              <div className="relative">
                <ShieldAlert className="w-24 h-24 text-destructive animate-pulse" />
                <div className="absolute inset-0 bg-destructive/20 blur-2xl rounded-full" />
              </div>
              <div className="space-y-4">
                <h3 className="text-3xl font-headline font-bold uppercase tracking-tighter text-white">System Lockout</h3>
                <p className="text-sm text-muted-foreground font-mono">Terminal signal suppressed due to protocol violations. Recalibrating downlink...</p>
                <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-2xl">
                  <span className="text-5xl font-mono font-bold text-destructive tracking-widest">{penaltyTimeLeft}</span>
                  <p className="text-[10px] uppercase tracking-widest text-destructive/60 mt-2">Time Until Restoration</p>
                </div>
              </div>
            </div>
          ) : currentLevelNumber > 5 ? (
            <div className="flex flex-col items-center gap-6 py-12">
              <CheckCircle2 className="w-20 h-20 text-primary" />
              <h3 className="text-4xl font-headline font-bold uppercase tracking-tighter">Signal Decrypted</h3>
              <p className="text-muted-foreground font-mono text-sm text-center">Mission Complete. You have breached the final security layer.</p>
            </div>
          ) : !currentLevel ? (
            <div className="flex flex-col items-center gap-6 py-12 text-center max-w-md">
              <AlertCircle className="w-16 h-16 text-yellow-500/50" />
              <div className="space-y-2">
                <h3 className="text-xl font-bold uppercase">No Signals Found</h3>
                <p className="text-sm text-muted-foreground">Encryption level synchronization failed. Initializing local backup...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="relative w-full max-w-2xl">
                <div className="absolute -left-8 -top-8 text-primary/10 select-none">
                  <HelpCircle className="w-24 h-24" />
                </div>
                <p className="text-2xl md:text-3xl font-body leading-relaxed text-center text-white/90">
                  {currentLevel?.question || "Awaiting decryption signal..."}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-6">
                <Input 
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="INPUT DECRYPTION KEY"
                  className="h-16 text-xl text-center bg-card border-white/5 focus:border-primary font-mono uppercase tracking-[0.3em] rounded-xl text-white"
                  disabled={penaltyTimeLeft !== null}
                />
                <Button disabled={submitting || !!penaltyTimeLeft} type="submit" className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 transition-all rounded-xl group text-white">
                  {submitting ? "VERIFYING..." : "EXECUTE SUBMISSION"}
                  {!submitting && <Send className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                </Button>
              </form>

              <div className="w-full max-w-lg space-y-4">
                {releasedHints.length > 0 && (
                  <div className="p-6 bg-primary/5 border border-primary/20 rounded-xl animate-scale-up text-center space-y-4">
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span className="text-[10px] text-primary uppercase font-bold tracking-[0.3em]">Status: Signal Decrypted</span>
                    </div>
                    <div className="space-y-2 text-left">
                      <p className="text-[10px] uppercase font-bold text-primary/70">Released Hints:</p>
                      {releasedHints.map((hint) => (
                        <p key={hint.id} className="text-sm font-body text-white/90 italic p-3 bg-white/[0.02] border border-white/5 rounded-lg">
                          "{hint.hintText}"
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
