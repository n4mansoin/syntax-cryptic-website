'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-store';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, Lightbulb, Loader2, Plus, Flag, Activity, MousePointer2, Timer, Clock, X, Sparkles, BrainCircuit
} from 'lucide-react';
import { useStore } from '@/lib/local-store';
import { Input } from '@/components/ui/input';
import { localApi } from '@/services/local-api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useFirestore } from '@/firebase';
import { generateHintSuggestions } from '@/ai/flows/generate-hint-suggestions';
import { detectSuspiciousActivity } from '@/ai/flows/detect-suspicious-activity';

function PenaltyTimer({ until }: { until: string | null }) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!until) return;
    const interval = setInterval(() => {
      const distance = new Date(until).getTime() - new Date().getTime();
      if (distance <= 0) {
        setTimeLeft('EXPIRED');
        clearInterval(interval);
      } else {
        const m = Math.floor(distance / 60000);
        const s = Math.floor((distance % 60000) / 1000);
        setTimeLeft(`${m}m ${s}s`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [until]);

  if (!until || timeLeft === 'EXPIRED') return null;

  return (
    <div className="flex items-center gap-1.5 text-[10px] font-mono text-destructive animate-pulse">
      <Timer className="w-3 h-3" /> {timeLeft}
    </div>
  );
}

interface TeamPenaltyDialogProps {
  team: { id: string; teamName: string };
  onApply: (teamId: string, mins: number) => void;
}

function TeamPenaltyDialog({ team, onApply }: TeamPenaltyDialogProps) {
  const [mins, setMins] = useState('45');
  const [open, setOpen] = useState(false);

  const handleApply = () => {
    onApply(team.id, parseInt(mins));
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive/20 text-[10px] font-bold uppercase tracking-widest">
          Set Penalty
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-white/5 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-headline tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-destructive" /> Time Lockout
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground">Select duration for <span className="text-white font-bold">{team.teamName}</span> terminal lockout.</p>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Duration (Minutes)</label>
            <Input 
              type="number" 
              value={mins} 
              onChange={(e) => setMins(e.target.value)}
              className="bg-background border-white/5 text-white"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="destructive" onClick={handleApply} className="w-full font-bold uppercase tracking-widest">
            Apply Protocol Lockout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminDashboard() {
  const db = useFirestore();
  const { auth, loading: authLoading } = useAuth();
  const { state, isReady } = useStore();
  const { toast } = useToast();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [hintText, setHintText] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !authLoading) {
      if (auth.userType !== 'admin') {
        router.push('/login');
      }
    }
  }, [auth, authLoading, router, isMounted]);

  const handleAddHint = async () => {
    if (!hintText || !selectedLevelId || !db) return;
    await localApi.releaseHint(db, selectedLevelId, hintText);
    
    toast({
      title: "Signal Injected",
      description: "Hint has been broadcasted to all active terminals.",
    });

    setHintText('');
    setSelectedLevelId('');
  };

  const handleAiGenerateHint = async () => {
    if (!selectedLevelId) {
      toast({ variant: "destructive", title: "Error", description: "Please select a level first." });
      return;
    }
    const level = state.levels.find(l => l.id === selectedLevelId);
    if (!level) return;

    setAiLoading(true);
    try {
      const result = await generateHintSuggestions({ 
        question: level.question, 
        answer: level.correctAnswer 
      });
      if (result.hints.length > 0) {
        setHintText(result.hints[0]);
        toast({ title: "AI Generation Complete", description: "New cryptic signal generated." });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "AI Error", description: "Failed to generate hints." });
    } finally {
      setAiLoading(false);
    }
  };

  const handleAuditTeam = async (teamId: string) => {
    const team = state.teams.find(t => t.id === teamId);
    if (!team) return;

    const recentAttempts = state.attempts
      .filter(a => a.teamId === teamId)
      .slice(0, 10)
      .map(a => ({
        levelId: state.levels.find(l => l.id === a.levelId)?.order || 0,
        timestamp: a.timestamp,
        isCorrect: a.isCorrect,
        ip: a.ip
      }));

    setAiLoading(true);
    try {
      const result = await detectSuspiciousActivity({
        teamId,
        currentLevel: team.currentLevel,
        flagCount: team.flagCount,
        penaltyUntil: team.penaltyUntil,
        recentAttempts
      });

      toast({
        title: result.isSuspicious ? "Suspicious Activity Detected" : "Audit Passed",
        description: result.reason,
        variant: result.isSuspicious ? "destructive" : "default"
      });
    } catch (err) {
      toast({ variant: "destructive", title: "Audit Error", description: "Failed to run AI audit." });
    } finally {
      setAiLoading(false);
    }
  };

  const handleFlagTeam = async (teamId: string) => {
    if (!db) return;
    await localApi.flagTeam(db, teamId, "Manual Admin Flag");
    toast({
      title: "Protocol Violation Logged",
      description: "Team has been flagged for manual review.",
    });
  };

  const handleApplyPenalty = async (teamId: string, mins: number) => {
    if (isNaN(mins) || !db) return;
    await localApi.applyPenalty(db, teamId, mins);
    toast({
      title: "Terminal Lockout Active",
      description: `Target terminal has been suppressed for ${mins} minutes.`,
    });
  };

  const handleRemovePenalty = async (teamId: string) => {
    if (!db) return;
    await localApi.removePenalty(db, teamId);
    toast({
      title: "Lockout Lifted",
      description: "Terminal communication restored.",
    });
  };

  const getRequestsForLevel = (levelId: string) => {
    return state.attempts.filter(a => a.levelId === levelId).length;
  };

  if (!isMounted || authLoading || !isReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (auth.userType !== 'admin') return null;

  const flaggedTeams = state.teams.filter(t => t.flagCount > 0 || (t.penaltyUntil && new Date(t.penaltyUntil) > new Date()));

  return (
    <div className="min-h-screen bg-background flex flex-col p-6 pt-24 space-y-8 max-w-[1400px] mx-auto w-full">
      <Navbar />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <h1 className="text-3xl font-headline font-bold text-white tracking-tighter uppercase">Operations Control</h1>
          </div>
          <p className="text-muted-foreground text-[10px] font-mono uppercase tracking-widest opacity-50">Identity: ROOT_ADMIN // Terminal ID: {auth.adminId}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-12">
        {/* Live Standings */}
        <Card className="md:col-span-8 bg-card/50 border-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] flex items-center gap-2 text-white">
              <BarChart3 className="w-4 h-4 text-primary" /> Live Standings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[...state.teams].sort((a,b) => b.currentLevel - a.currentLevel).map((team, i) => (
              <div key={team.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl group hover:border-primary/20 transition-all">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs text-white/20 group-hover:text-primary/50">{String(i + 1).padStart(2, '0')}</span>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-white">{team.teamName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-white/20 font-mono uppercase tracking-widest">
                        {team.penaltyUntil && new Date(team.penaltyUntil) > new Date() ? 'LOCKOUT_ACTIVE' : 'STATUS_STABLE'}
                      </span>
                      <PenaltyTimer until={team.penaltyUntil} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="border-white/10 text-[10px] px-3 font-mono text-primary">LVL {team.currentLevel}</Badge>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleAuditTeam(team.id)}
                      disabled={aiLoading}
                      className="text-white/20 hover:text-primary"
                      title="AI Security Audit"
                    >
                      <BrainCircuit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleFlagTeam(team.id)}
                      className="text-white/20 hover:text-destructive"
                      title="Manual Flag"
                    >
                      <Flag className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Hint Management */}
        <Card className="md:col-span-4 bg-card/50 border-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] flex items-center gap-2 text-white">
              <Lightbulb className="w-4 h-4 text-yellow-500" /> Hint Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Signal Injection</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleAiGenerateHint}
                  disabled={aiLoading || !selectedLevelId}
                  className="h-6 text-[9px] gap-1 text-primary hover:text-primary/80"
                >
                  <Sparkles className="w-3 h-3" /> AI GENERATE
                </Button>
              </div>
              <select 
                value={selectedLevelId} 
                onChange={(e) => setSelectedLevelId(e.target.value)}
                className="w-full bg-background border border-white/5 p-2 rounded text-xs font-mono text-white"
              >
                <option value="">Select Level</option>
                {state.levels.map(l => <option key={l.id} value={l.id}>Level {l.order}</option>)}
              </select>
              <Input 
                placeholder="Cryptic hint content..." 
                value={hintText} 
                onChange={(e) => setHintText(e.target.value)}
                className="bg-background border-white/5 text-white"
              />
              <Button onClick={handleAddHint} className="w-full h-10 gap-2 bg-primary hover:bg-primary/90 text-white font-bold uppercase text-[10px] tracking-widest">
                <Plus className="h-4 w-4" /> Release Hint
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Flagged Entities */}
        <Card className="md:col-span-6 bg-card/50 border-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] flex items-center gap-2 text-white">
              <Flag className="w-4 h-4 text-destructive" /> Flagged Entities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {flaggedTeams.map((team) => (
              <div key={team.id} className="p-4 bg-destructive/5 border border-destructive/20 rounded-xl flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-white">{team.teamName}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-destructive font-mono uppercase tracking-widest">Flags: {team.flagCount}</span>
                    <div className="flex items-center gap-2">
                      <PenaltyTimer until={team.penaltyUntil} />
                      {team.penaltyUntil && new Date(team.penaltyUntil) > new Date() && (
                        <button 
                          onClick={() => handleRemovePenalty(team.id)}
                          className="text-destructive/60 hover:text-destructive transition-colors p-0.5 rounded-full hover:bg-destructive/10"
                          title="Remove Penalty"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleAuditTeam(team.id)}
                    className="text-[9px] uppercase tracking-widest font-bold text-primary"
                  >
                    AUDIT
                  </Button>
                  <TeamPenaltyDialog team={team} onApply={handleApplyPenalty} />
                </div>
              </div>
            ))}
            {flaggedTeams.length === 0 && (
              <div className="text-center py-12 space-y-2">
                <Activity className="w-8 h-8 text-white/5 mx-auto" />
                <p className="text-white/20 font-mono text-[10px] uppercase tracking-widest">No Protocol Violations Detected</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hint Analysis */}
        <Card className="md:col-span-6 bg-card/50 border-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] flex items-center gap-2 text-white">
              <MousePointer2 className="w-4 h-4 text-primary" /> Hint Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase tracking-widest text-white/40">Level Signal</TableHead>
                  <TableHead className="text-right text-[10px] uppercase tracking-widest text-white/40">Total Requests</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.levels.map((level) => (
                  <TableRow key={level.id} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                    <TableCell className="font-mono text-xs text-white">LVL_0{level.order}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="font-mono border-white/10 text-primary">
                        {getRequestsForLevel(level.id)} REQ
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}