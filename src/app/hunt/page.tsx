'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/lib/auth-store';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Terminal, Send, Timer, HelpCircle, AlertTriangle, Lightbulb, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, doc } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export default function HuntPage() {
  const { auth, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();
  
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [levelTimer, setLevelTimer] = useState(0);

  // Fetch levels from Firestore
  const levelsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'levels'), orderBy('order', 'asc'));
  }, [db]);
  const { data: levels, isLoading: levelsLoading } = useCollection(levelsQuery);

  // Fetch team progress
  const teamDocQuery = useMemoFirebase(() => {
    if (!db || !auth.teamId) return null;
    return doc(db, 'teams', auth.teamId);
  }, [db, auth.teamId]);
  
  // Fetch hint requests for this team to see if already requested
  const hintRequestsQuery = useMemoFirebase(() => {
    if (!db || !auth.teamId) return null;
    return collection(db, 'teams', auth.teamId, 'hintRequests');
  }, [db, auth.teamId]);
  const { data: hintRequests } = useCollection(hintRequestsQuery);

  const currentLevelIndex = (auth.currentLevel || 1) - 1;
  const currentLevel = levels?.[currentLevelIndex];

  useEffect(() => {
    if (!authLoading && !auth.teamId) {
      router.push('/login');
    }
  }, [auth.teamId, authLoading, router]);

  useEffect(() => {
    const timer = setInterval(() => setLevelTimer(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [auth.currentLevel]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const hasRequestedHint = hintRequests?.some(req => req.levelId === currentLevel?.id);

  const handleRequestHint = () => {
    if (!db || !auth.teamId || !currentLevel || hasRequestedHint) return;

    addDocumentNonBlocking(collection(db, 'teams', auth.teamId, 'hintRequests'), {
      teamId: auth.teamId,
      levelId: currentLevel.id,
      requestedAt: new Date().toISOString(),
    });

    toast({ title: "Signal Sent", description: "Hint request logged in system records." });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || !db || !auth.teamId || !currentLevel) return;
    setSubmitting(true);

    // In a real app, this would be a server-side check. 
    // For MVP, we simulate with a list of answers or a field in the level doc.
    setTimeout(() => {
      // Mock validation - in production the 'answer' field wouldn't be public in 'levels'
      // but for this prototype we assume standard verification
      const isCorrect = answer.trim().toUpperCase() === "DECRYPT"; // Placeholder logic
      
      if (isCorrect) {
        const nextLevel = (auth.currentLevel || 1) + 1;
        updateDocumentNonBlocking(doc(db, 'teams', auth.teamId), {
          currentLevel: nextLevel
        });
        
        toast({ title: "Decryption Successful", description: `Moving to Level ${nextLevel}` });
        setAnswer('');
        setLevelTimer(0);
        
        if (levels && nextLevel > levels.length) {
          router.push('/leaderboard');
        }
      } else {
        toast({ 
          variant: "destructive", 
          title: "Incorrect Answer", 
          description: "Try again or check for hints." 
        });
      }
      setSubmitting(false);
    }, 800);
  };

  if (authLoading || levelsLoading || !auth.teamId) return null;

  const totalLevels = levels?.length || 5;
  const progressPercentage = Math.round((( (auth.currentLevel || 1) - 1) / totalLevels) * 100);

  return (
    <div className="min-h-screen bg-background flex flex-col p-6 pt-24 items-center">
      <Navbar />

      <div className="w-full max-w-4xl space-y-8 animate-fade-in">
        {/* Top bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Terminal className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-headline font-bold text-white uppercase tracking-tighter">Level 0{auth.currentLevel || 1}</h2>
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

        {/* Level content */}
        <div className="flex flex-col items-center space-y-12 py-12">
          <div className="relative w-full max-w-2xl">
            <div className="absolute -left-8 -top-8 text-primary/10 select-none">
              <HelpCircle className="w-24 h-24" />
            </div>
            <p className="text-2xl md:text-3xl font-body leading-relaxed text-center text-white/90 selection:bg-primary/30">
              {currentLevel?.question || "No more levels available. You have completed the hunt."}
            </p>
          </div>

          {currentLevel && (
            <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-6">
              <div className="relative group">
                <Input 
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="INPUT DECRYPTION KEY"
                  className="h-16 text-xl text-center bg-card border-white/5 focus:border-primary focus:ring-primary/20 transition-all font-mono uppercase tracking-[0.3em] rounded-xl placeholder:text-white/10"
                />
              </div>
              <Button disabled={submitting} type="submit" className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(124,92,255,0.2)] rounded-xl group">
                {submitting ? "VERIFYING..." : "EXECUTE SUBMISSION"}
                {!submitting && <Send className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />}
              </Button>
            </form>
          )}

          {/* Hint Area */}
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

        {/* System Logs (Footer decoration) */}
        <div className="pt-12 flex justify-center opacity-20 hover:opacity-100 transition-opacity">
          <div className="grid grid-cols-3 gap-8 text-[9px] font-mono uppercase tracking-[0.2em] text-white">
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" /> Connection Stable
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-primary rounded-full" /> Level Packet {auth.currentLevel || 1} Received
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-2 h-2 text-yellow-500" /> Latency: 42ms
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
