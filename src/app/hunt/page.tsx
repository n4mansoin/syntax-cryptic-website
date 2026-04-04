'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/lib/auth-store';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Terminal, Send, Timer, HelpCircle, ChevronRight, AlertTriangle, Lightbulb } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function HuntPage() {
  const { auth, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [currentLevel, setCurrentLevel] = useState(1);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hints, setHints] = useState<string[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [levelTimer, setLevelTimer] = useState(0);

  // Mock levels data - 5 levels
  const levels = [
    { id: 1, question: "The beginning of everything, the zero in the binary. What is the first color seen by the void?", hint: "It reflects all, yet holds none." },
    { id: 2, question: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?", hint: "A sound of your own voice." },
    { id: 3, question: "A sequence of bytes, a shadow in the code. Find the prime that comes after the age of the universe in millions.", hint: "Think big, think primes (approx 13,700)." },
    { id: 4, question: "The more of them you take, the more you leave behind. What are they?", hint: "They mark your path through the sand." },
    { id: 5, question: "A king with no crown, a traveler with no feet. I move the sand but cannot be seen. What am I?", hint: "It whispers through the binary trees." }
  ];

  useEffect(() => {
    if (!loading && !auth.teamId) {
      router.push('/login');
    }
  }, [auth.teamId, loading, router]);

  useEffect(() => {
    const timer = setInterval(() => setLevelTimer(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [currentLevel]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;
    setSubmitting(true);

    // Simulated verification logic
    setTimeout(() => {
      const correctAnswers = ["WHITE", "ECHO", "13739", "FOOTSTEPS", "WIND"];
      if (answer.trim().toUpperCase() === correctAnswers[currentLevel - 1]) {
        toast({ title: "Decryption Successful", description: `Moving to Level ${currentLevel + 1}` });
        if (currentLevel < levels.length) {
          setCurrentLevel(prev => prev + 1);
          setAnswer('');
          setLevelTimer(0);
          setShowHint(false);
        } else {
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

  if (loading || !auth.teamId) return null;

  // Progress formula as requested: Level 1 start = 0%, increments by 20%
  const progressPercentage = Math.round(((currentLevel - 1) / levels.length) * 100);

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
              <h2 className="text-2xl font-headline font-bold text-white uppercase tracking-tighter">Level 0{currentLevel}</h2>
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
              {levels[currentLevel - 1]?.question}
            </p>
          </div>

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

          {/* Hint Area */}
          <div className="w-full max-w-lg">
            {!showHint ? (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowHint(true)}
                className="w-full text-white/20 hover:text-primary hover:bg-primary/5 text-xs font-mono uppercase tracking-widest h-12 transition-all border border-transparent hover:border-primary/10"
              >
                <Lightbulb className="w-4 h-4 mr-2" /> Request Cryptic Hint
              </Button>
            ) : (
              <div className="p-6 bg-primary/5 border border-primary/20 rounded-xl animate-scale-up">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-primary" />
                  <span className="text-[10px] text-primary uppercase font-bold tracking-[0.3em]">System Suggestion</span>
                </div>
                <p className="text-sm italic text-primary/80 leading-relaxed font-body">
                  "{levels[currentLevel - 1]?.hint}"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* System Logs (Footer decoration) */}
        <div className="pt-12 flex justify-center opacity-20 hover:opacity-100 transition-opacity">
          <div className="grid grid-cols-3 gap-8 text-[9px] font-mono uppercase tracking-[0.2em] text-white">
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" /> Connection Stable
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-primary rounded-full" /> Level Packet {currentLevel} Received
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
