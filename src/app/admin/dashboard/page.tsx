'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-store';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, Lightbulb, Loader2, Plus, Flag, Activity, MousePointer2, Timer, Clock
} from 'lucide-react';
import { useLocalStore } from '@/lib/local-store';
import { Input } from '@/components/ui/input';
import { localApi, Flag as TeamFlag } from '@/services/local-api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

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

export default function AdminDashboard() {
  const { auth, loading: authLoading } = useAuth();
  const { teams, levels, isReady, refresh } = useLocalStore();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [hintText, setHintText] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [penaltyMinutes, setPenaltyMinutes] = useState('45');
  const [globalFlags, setGlobalFlags] = useState<TeamFlag[]>([]);
  const [hintRequests, setHintRequests] = useState<any[]>([]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !authLoading && auth.userType !== 'admin') {
      router.push('/login');
    }
  }, [auth, authLoading, router, isMounted]);

  useEffect(() => {
    if (isReady) {
      const f = JSON.parse(localStorage.getItem('is_flags') || '[]');
      const r = JSON.parse(localStorage.getItem('is_hint_requests') || '[]');
      setGlobalFlags(f);
      setHintRequests(r);
    }
  }, [isReady, teams]);

  const handleAddHint = () => {
    if (!hintText || !selectedLevelId) return;
    localApi.releaseHint(selectedLevelId, hintText);
    setHintText('');
    setSelectedLevelId('');
    refresh();
  };

  const handleFlagTeam = (teamId: string) => {
    localApi.flagTeam(teamId, "Manual Admin Flag");
    refresh();
  };

  const handleApplyPenalty = (teamId: string) => {
    const mins = parseInt(penaltyMinutes);
    if (isNaN(mins)) return;
    localApi.applyPenalty(teamId, mins);
    refresh();
  };

  const getRequestsForLevel = (levelId: string) => {
    return hintRequests.filter(r => r.levelId === levelId).length;
  };

  if (!isMounted || authLoading || !isReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (auth.userType !== 'admin') return null;

  const flaggedTeams = teams.filter(t => t.flagCount > 0 || globalFlags.some(f => f.teamId === t.id) || (t.penaltyUntil && new Date(t.penaltyUntil) > new Date()));

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
            {[...teams].sort((a,b) => b.currentLevel - a.currentLevel).map((team, i) => (
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
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleFlagTeam(team.id)}
                    className="text-white/20 hover:text-destructive"
                  >
                    <Flag className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {teams.length === 0 && (
              <p className="text-center py-8 text-white/20 font-mono text-xs">NO ACTIVE TEAMS FOUND</p>
            )}
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
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Manual Signal Injection</p>
              <select 
                value={selectedLevelId} 
                onChange={(e) => setSelectedLevelId(e.target.value)}
                className="w-full bg-background border border-white/5 p-2 rounded text-xs font-mono text-white"
              >
                <option value="">Select Level</option>
                {levels.map(l => <option key={l.id} value={l.id}>Level {l.order}</option>)}
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
                    <PenaltyTimer until={team.penaltyUntil} />
                  </div>
                </div>
                
                <Dialog>
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
                          value={penaltyMinutes} 
                          onChange={(e) => setPenaltyMinutes(e.target.value)}
                          className="bg-background border-white/5 text-white"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="destructive" onClick={() => handleApplyPenalty(team.id)} className="w-full font-bold uppercase tracking-widest">
                        Apply Protocol Lockout
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
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
                {levels.map((level) => (
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