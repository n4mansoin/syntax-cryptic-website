
'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Terminal, Send, Timer, HelpCircle, Lightbulb, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase, useDoc, useUser } from '@/firebase';
import { collection, query, orderBy, where, doc, updateDoc } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export default function HuntPage() {
  const { user, isUserLoading } = useUser();
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

  useEffect(() => {
    if (isMounted && !isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router, isMounted]);

  const teamDocRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'teams', user.uid);
  }, [db, user?.uid]);
  const { data: teamData, isLoading: teamLoading } = useDoc(teamDocRef);

  const levelsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'levels'), orderBy('order', 'asc'));
  }, [db, user]);
  const { data: levels, isLoading: levelsLoading } = useCollection(levelsQuery);

  const currentLevelNumber = teamData?.currentLevel || 1;
  const currentLevel = levels?.find(l => l.order === currentLevelNumber);

  const hintRequestsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid || !currentLevel?.id) return null;
    return query(
      collection(db, 'hintRequests'), 
      where('teamId', '==', user.uid),
      where('levelId', '==', currentLevel.id)
    );
  }, [db, user?.uid, currentLevel?.id]);
  const { data: hintRequests } = useCollection(hintRequestsQuery);

  const releasedHintsQuery = useMemoFirebase(() => {
    if (!db || !user || !currentLevel?.id) return null;
    return query(
      collection(db, 'hints'),
      where('levelId', '==', currentLevel.id),
      where('isReleased', '==', true)
    );
  }, [db, user, currentLevel?.id]);
  const { data: releasedHints } = useCollection(releasedHintsQuery);

  useEffect(() => {
    if (isMounted && user && !teamLoading) {
      const timer = setInterval(() => setLevelTimer(prev => prev + 1), 1000);
      return () => clearInterval(timer);
    }
  }, [user, teamLoading, isMounted]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const hasRequestedHint = hintRequests && hintRequests.length > 0;

  const handleRequestHint = () => {
    if (!db || !user?.uid || !currentLevel?.id) return;
    
    addDocumentNonBlocking(collection(db, 'hintRequests'), {
      teamId: user.uid,
      levelId: currentLevel.id,
      requestedAt: new Date().toISOString()
    });

    toast({ 
      title: "Hint Requested", 
      description: "Signal sent to mission control." 
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || !db || !user?.uid || !currentLevel || !teamDocRef) return;
    setSubmitting(true);

    const isCorrect = answer.toUpperCase().trim() === currentLevel.answer.toUpperCase().trim();

    if (isCorrect) {
      try {
        await updateDoc(teamDocRef, {
          currentLevel: currentLevelNumber + 1
        });
        toast({ title: "Decryption Successful", description: "Advancing to next layer." });
        setAnswer('');
      } catch (error: any) {
        toast({ variant: "destructive", title: "Transmission Error", description: "Failed to update progress." });
      }
    } else {
      toast({ 
        variant: "destructive", 
        title: "Incorrect Answer", 
        description: "Try again or analyze the data patterns." 
      });
    }
    setSubmitting(false);
  };

  if (!isMounted || isUserLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const progressPercentage = Math.max(0, Math.min(100, (currentLevelNumber - 1) * 20));

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
          {teamLoading || levelsLoading ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
              <p className="text-[10px] uppercase tracking-[0.4em] font-mono text-white/20">Establishing Secure Uplink...</p>
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
                <p className="text-sm text-muted-foreground">The cryptic transmission hasn't been initialized yet. If you are the system administrator, please visit the setup portal to seed the levels.</p>
              </div>
              {(user.email === 'admin@intra-syntax.com' || user.email === 'admins@intra-syntax.com') && (
                <Button onClick={() => router.push('/admin/setup')} variant="outline" className="border-primary/20 text-primary hover:bg-primary/10 h-12 px-8 font-bold">
                  INITIALIZE DATABASE
                </Button>
              )}
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
                  className="h-16 text-xl text-center bg-card border-white/5 focus:border-primary font-mono uppercase tracking-[0.3em] rounded-xl"
                />
                <Button disabled={submitting} type="submit" className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 transition-all rounded-xl group">
                  {submitting ? "VERIFYING..." : "EXECUTE SUBMISSION"}
                  {!submitting && <Send className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                </Button>
              </form>

              <div className="w-full max-w-lg space-y-4">
                {!hasRequestedHint ? (
                  <Button 
                    variant="ghost" 
                    onClick={handleRequestHint}
                    className="w-full text-white/20 hover:text-primary hover:bg-primary/5 text-xs font-mono uppercase tracking-widest h-12 transition-all border border-transparent hover:border-primary/10"
                  >
                    <Lightbulb className="w-4 h-4 mr-2" /> Request Cryptic Hint
                  </Button>
                ) : (
                  <div className="p-6 bg-primary/5 border border-primary/20 rounded-xl animate-scale-up text-center space-y-4">
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span className="text-[10px] text-primary uppercase font-bold tracking-[0.3em]">Status: Hint Requested</span>
                    </div>
                    
                    {releasedHints && releasedHints.length > 0 ? (
                      <div className="space-y-2 text-left">
                        <p className="text-[10px] uppercase font-bold text-primary/70">Released Hints:</p>
                        {releasedHints.map((hint) => (
                          <p key={hint.id} className="text-sm font-body text-white/90 italic p-3 bg-white/[0.02] border border-white/5 rounded-lg">
                            "{hint.hintText}"
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-primary/50 uppercase font-mono tracking-widest">
                        Awaiting administrator authorization...
                      </p>
                    )}
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
