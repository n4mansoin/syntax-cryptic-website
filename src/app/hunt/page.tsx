'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/lib/auth-store';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Terminal, Send, Timer, HelpCircle, Lightbulb, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, where, doc } from 'firebase/firestore';

export default function HuntPage() {
  const { auth, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();
  
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [levelTimer, setLevelTimer] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch team document for real progress
  const teamDocRef = useMemoFirebase(() => {
    if (!db || !auth.teamId) return null;
    return doc(db, 'teams', auth.teamId);
  }, [db, auth.teamId]);
  const { data: teamData, isLoading: teamLoading } = useDoc(teamDocRef);

  // Fetch levels
  const levelsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'levels'), orderBy('order', 'asc'));
  }, [db]);
  const { data: levels, isLoading: levelsLoading } = useCollection(levelsQuery);

  // Fetch hint requests for this team
  const hintRequestsQuery = useMemoFirebase(() => {
    if (!db || !auth.teamId) return null;
    return query(collection(db, 'hintRequests'), where('teamId', '==', auth.teamId));
  }, [db, auth.teamId]);
  const { data: hintRequests } = useCollection(hintRequestsQuery);

  const currentLevelNumber = teamData?.currentLevel || 1;
  const currentLevel = levels?.find(l => l.order === currentLevelNumber);

  useEffect(() => {
    if (isMounted && !authLoading && !auth.teamId) {
      router.push('/login');
    }
  }, [auth.teamId, authLoading, router, isMounted]);

  useEffect(() => {
    if (isMounted) {
      const timer = setInterval(() => setLevelTimer(prev => prev + 1), 1000);
      return () => clearInterval(timer);
    }
  }, [currentLevelNumber, isMounted]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const hasRequestedHint = hintRequests?.some(req => req.levelId === currentLevel?.id);

  const handleRequestHint = () => {
    toast({ 
      title: "Hint Requested", 
      description: "Admin notification sent. Monitoring for signal release." 
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || !db || !auth.teamId || !currentLevel) return;
    setSubmitting(true);

    setTimeout(() => {
      // In a real app, this logic would be in a Cloud Function
      toast({ 
        variant: "destructive", 
        title: "Incorrect Answer", 
        description: "Try again or wait for admin signals." 
      });
      setSubmitting(false);
    }, 800);
  };

  if (!isMounted || authLoading || teamLoading || levelsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!auth.teamId) return null;

  const totalLevels = 5;
  // Level 1 = 0%, Level 2 = 20%, etc.
  const progressPercentage = Math.min(100, Math.max(0, (currentLevelNumber - 1) * 20));

  return (
    <div className="min-h-screen bg-background flex flex-col p-6 pt-24 items-center">
      <Navbar />

      <div className="w-full max-w-4xl space-y-8 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Terminal className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-headline font-bold text-white uppercase tracking-tighter">Level 0{currentLevelNumber}</h2>
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
          <div className="relative w-full max-w-2xl">
            <div className="absolute -left-8 -top-8 text-primary/10 select-none">
              <HelpCircle className="w-24 h-24" />
            </div>
            <p className="text-2xl md:text-3xl font-body leading-relaxed text-center text-white/90">
              {currentLevel?.question || "Awaiting level data from secure channel..."}
            </p>
          </div>

          {currentLevel && (
            <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-6">
              <div className="relative group">
                <Input 
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="INPUT DECRYPTION KEY"
                  className="h-16 text-xl text-center bg-card border-white/5 focus:border-primary focus:ring-primary/20 transition-all font-mono uppercase tracking-[0.3em] rounded-xl"
                />
              </div>
              <Button disabled={submitting} type="submit" className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 transition-all rounded-xl group">
                {submitting ? "VERIFYING..." : "EXECUTE SUBMISSION"}
                {!submitting && <Send className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />}
              </Button>
            </form>
          )}

          {currentLevel && (
            <div className="w-full max-w-lg">
              {!hasRequestedHint ? (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleRequestHint}
                  className="w-full text-white/20 hover:text-primary hover:bg-primary/5 text-xs font-mono uppercase tracking-widest h-12 transition-all border border-transparent hover:border-primary/10"
                >
                  <Lightbulb className="w-4 h-4 mr-2" /> Request Cryptic Hint
                </Button>
              ) : (
                <div className="p-6 bg-primary/5 border border-primary/20 rounded-xl animate-scale-up text-center space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span className="text-[10px] text-primary uppercase font-bold tracking-[0.3em]">Status: Hint Requested</span>
                  </div>
                  <p className="text-[10px] text-primary/50 uppercase font-mono tracking-widest">
                    Awaiting administrator authorization...
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
