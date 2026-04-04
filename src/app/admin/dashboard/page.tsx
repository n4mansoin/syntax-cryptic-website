'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth as useAppAuth } from '@/lib/auth-store';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, Lightbulb, Loader2, Plus, Terminal
} from 'lucide-react';
import { useLocalStore } from '@/lib/local-store';
import { Input } from '@/components/ui/input';

export default function AdminDashboard() {
  const { auth, loading: authLoading } = useAppAuth();
  const { teams, levels, hintRequests, hints, addHint, isReady } = useLocalStore();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [hintText, setHintText] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !authLoading && !auth.adminId) {
      router.push('/admin/login');
    }
  }, [auth, authLoading, router, isMounted]);

  const getRequestCountForLevel = (levelId: string) => {
    return hintRequests.filter(req => req.levelId === levelId).length;
  };

  const handleAddHint = () => {
    if (!hintText || !selectedLevelId) return;
    addHint({
      levelId: selectedLevelId,
      hintText: hintText,
      isReleased: true,
      releasedAt: new Date().toISOString()
    });
    setHintText('');
    setSelectedLevelId('');
  };

  if (!isMounted || authLoading || !isReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!auth.adminId) return null;

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
                  <span className="font-bold text-sm text-white">{team.teamName}</span>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="border-white/10 text-[10px] px-3 font-mono text-primary">LVL {team.currentLevel}</Badge>
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
              <Lightbulb className="w-4 h-4 text-yellow-500" /> Hint Signal Monitor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {levels.map((lvl) => (
                <div key={lvl.id} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg border border-white/5">
                  <span className="text-[10px] font-mono text-white/40">LEVEL 0{lvl.order}</span>
                  <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-none">{getRequestCountForLevel(lvl.id)} REQS</Badge>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-white/5 space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Release New Hint</p>
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
                <Plus className="h-4 w-4" /> Release Signal
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-12 bg-card/50 border-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] flex items-center gap-2 text-white">
              <Terminal className="w-4 h-4 text-primary" /> Global Hint Registry
            </CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-[10px] space-y-2">
            {hints.slice().reverse().map((h) => (
              <div key={h.id} className="flex justify-between border-b border-white/5 pb-2 text-white/60">
                <span className="truncate">HINT_RELEASE: LVL_{h.levelId} -> "{h.hintText.slice(0, 60)}..."</span>
                <span className="flex-shrink-0 text-primary">{h.releasedAt ? new Date(h.releasedAt).toLocaleTimeString() : 'N/A'}</span>
              </div>
            ))}
            {hints.length === 0 && (
              <p className="text-center py-8 text-white/20 font-mono text-xs">NO HINTS RELEASED TO THE NETWORK</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
