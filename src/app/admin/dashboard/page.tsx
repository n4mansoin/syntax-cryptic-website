'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-store';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, Lightbulb, Loader2, Plus, Terminal, ShieldAlert
} from 'lucide-react';
import { useLocalStore } from '@/lib/local-store';
import { Input } from '@/components/ui/input';
import { localApi, Hint, Attempt } from '@/services/local-api';

export default function AdminDashboard() {
  const { auth, loading: authLoading } = useAuth();
  const { teams, levels, isReady, refresh } = useLocalStore();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [hintText, setHintText] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [globalHints, setGlobalHints] = useState<Hint[]>([]);
  const [globalAttempts, setGlobalAttempts] = useState<Attempt[]>([]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !authLoading && auth.userType !== 'admin') {
      router.push('/admin/login');
    }
  }, [auth, authLoading, router, isMounted]);

  useEffect(() => {
    if (isReady) {
      const h = JSON.parse(localStorage.getItem('is_hints') || '[]');
      const a = JSON.parse(localStorage.getItem('is_attempts') || '[]');
      setGlobalHints(h);
      setGlobalAttempts(a);
    }
  }, [isReady, teams]);

  const handleAddHint = () => {
    if (!hintText || !selectedLevelId) return;
    localApi.releaseHint(selectedLevelId, hintText);
    setHintText('');
    setSelectedLevelId('');
    refresh();
  };

  const handlePenalty = (teamId: string) => {
    localApi.applyPenalty(teamId);
    refresh();
  };

  if (!isMounted || authLoading || !isReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (auth.userType !== 'admin') return null;

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
                    <span className="text-[9px] text-white/20 font-mono uppercase tracking-widest">
                      {team.penaltyUntil && new Date(team.penaltyUntil) > new Date() ? 'LOCKOUT_ACTIVE' : 'STATUS_STABLE'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="border-white/10 text-[10px] px-3 font-mono text-primary">LVL {team.currentLevel}</Badge>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handlePenalty(team.id)}
                    className="text-white/20 hover:text-destructive"
                  >
                    <ShieldAlert className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {teams.length === 0 && (
              <p className="text-center py-8 text-white/20 font-mono text-xs">NO ACTIVE TEAMS FOUND</p>
            )}
          </CardContent>
        </Card>

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

        <Card className="md:col-span-12 bg-card/50 border-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] flex items-center gap-2 text-white">
              <Terminal className="w-4 h-4 text-primary" /> System Logs
            </CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-[10px] space-y-2 max-h-[300px] overflow-auto">
            {globalAttempts.slice().reverse().map((a) => (
              <div key={a.id} className="flex justify-between border-b border-white/5 pb-2 text-white/60">
                <span className="truncate">
                  {a.isCorrect ? '[SUCCESS]' : '[FAILURE]'} :: TEAM_{a.teamId} :: LVL_{a.levelId}
                </span>
                <span className="flex-shrink-0 text-primary">{new Date(a.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
            {globalAttempts.length === 0 && (
              <p className="text-center py-8 text-white/20 font-mono text-xs">NO LOGS AVAILABLE</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}