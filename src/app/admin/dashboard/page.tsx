'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-store';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
  BarChart3, Flag, Lightbulb, PlayCircle, Activity, 
  Settings, Clock, Search
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, collectionGroup } from 'firebase/firestore';
import { updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export default function AdminDashboard() {
  const { auth, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();
  
  const [selectedLevel, setSelectedLevel] = useState('1');
  const [hintText, setHintText] = useState('');

  // Fetch all teams for standings
  const teamsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'teams'), orderBy('currentLevel', 'desc'));
  }, [db]);
  const { data: teamsData } = useCollection(teamsQuery);

  // Fetch all hint requests (using collectionGroup if supported, or individual team fetches)
  // For standard rules we might need collectionGroup, but let's try mapping if we have small team count
  // or a central collection if backend.json allowed.
  // Using collectionGroup 'hintRequests'
  const allHintRequestsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collectionGroup(db, 'hintRequests');
  }, [db]);
  const { data: allHintRequests } = useCollection(allHintRequestsQuery);

  // Fetch levels to populate dropdowns and aggregate requests
  const levelsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'levels'), orderBy('order', 'asc'));
  }, [db]);
  const { data: levels } = useCollection(levelsQuery);

  useEffect(() => {
    if (!loading && (!auth.adminId || !auth.is2FAVerified)) {
      router.push('/admin/login');
    }
  }, [auth, loading, router]);

  const handleReleaseHint = () => {
    if (!db || !hintText) return;
    
    addDocumentNonBlocking(collection(db, 'levels', selectedLevel, 'hints'), {
      hintText,
      isReleased: true,
      levelId: selectedLevel,
      releasedAt: new Date().toISOString()
    });

    toast({ title: "Hint Released", description: `Hint for Level ${selectedLevel} is now live.` });
    setHintText('');
  };

  const handlePenalty = (teamId: string) => {
    if (!db) return;
    const penaltyUntil = new Date(Date.now() + 45 * 60 * 1000).toISOString();
    updateDocumentNonBlocking(doc(db, 'teams', teamId), {
      penaltyUntil,
      flagCount: (teamsData?.find(t => t.id === teamId)?.flagCount || 0) + 1
    });
    toast({ title: "Penalty Applied", description: `45 minute penalty applied.` });
  };

  const getRequestCountForLevel = (levelId: string) => {
    return allHintRequests?.filter(req => req.levelId === levelId).length || 0;
  };

  if (loading || !auth.adminId || !auth.is2FAVerified) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col p-6 pt-24 space-y-8 max-w-[1400px] mx-auto w-full">
      <Navbar />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <h1 className="text-3xl font-headline font-bold text-white tracking-tighter uppercase">Operations Control</h1>
          </div>
          <p className="text-muted-foreground text-xs font-mono uppercase tracking-widest opacity-50">Root@intra-syntax:~# active_session_03</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-4 py-1.5 font-mono uppercase tracking-widest text-xs">
            Admin Root: {auth.adminId}
          </Badge>
          <Button variant="ghost" size="icon" className="text-white/20 hover:text-white">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-12">
        
        {/* Live Standings (Wide) */}
        <Card className="md:col-span-8 bg-card/50 border-white/5 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Live Standings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {teamsData?.map((team, i) => (
                <div key={team.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] transition-all cursor-default group">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-xs text-white/20">{String(i + 1).padStart(2, '0')}</span>
                    <span className="font-bold text-sm tracking-tight group-hover:text-primary transition-colors">{team.teamName}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    {team.flagCount > 0 && <Badge variant="destructive" className="text-[8px] h-4">FLAGGED x{team.flagCount}</Badge>}
                    <Badge variant="outline" className="border-white/10 text-[10px] px-3 font-mono">LVL {team.currentLevel}</Badge>
                    <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden hidden md:block">
                      <div className="h-full bg-primary" style={{ width: `${Math.min(100, (team.currentLevel / (levels?.length || 10)) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Hint Requests Aggregation */}
        <Card className="md:col-span-4 bg-card/50 border-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-500" /> Hint Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {levels?.map((lvl) => {
                const count = getRequestCountForLevel(lvl.id);
                return (
                  <div key={lvl.id} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg border border-white/5">
                    <span className="text-[10px] font-mono text-white/40 uppercase">LEVEL 0{lvl.order}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{count}</span>
                      <span className="text-[8px] uppercase tracking-widest text-white/20">Requests</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Hint Control */}
        <Card className="md:col-span-4 bg-card/50 border-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" /> Hint Controller
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Select Target Level</Label>
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger className="bg-background border-white/5 h-10 font-mono text-xs">
                  <SelectValue placeholder="Level ID" />
                </SelectTrigger>
                <SelectContent>
                  {levels?.map(lvl => (
                    <SelectItem key={lvl.id} value={lvl.id}>LEVEL 0{lvl.order}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Cryptic Hint Message</Label>
              <Input 
                placeholder="Enter hint..." 
                className="bg-background border-white/5 text-sm h-12"
                value={hintText}
                onChange={(e) => setHintText(e.target.value)}
              />
            </div>
            <Button className="w-full bg-primary hover:bg-primary/90 font-bold text-xs uppercase tracking-widest h-12" onClick={handleReleaseHint}>
              Broadcast Hint
            </Button>
          </CardContent>
        </Card>

        {/* Flagged Activity (Responsive Actions) */}
        <Card className="md:col-span-4 bg-card/50 border-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] flex items-center gap-2">
              <Flag className="w-4 h-4 text-destructive" /> Suspicious Behavior
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {teamsData?.filter(t => t.flagCount > 0).slice(0, 3).map((team) => (
              <div key={team.id} className="p-4 bg-destructive/5 border border-destructive/20 rounded-xl space-y-2">
                <div className="flex justify-between items-start">
                  <span className="font-bold text-sm text-destructive">{team.teamName}</span>
                  <Badge variant="outline" className="text-[8px] font-mono border-destructive/30">FLAGGED x{team.flagCount}</Badge>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="ghost" size="sm" className="h-7 text-[9px] bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-widest w-full" onClick={() => handlePenalty(team.id)}>Re-Apply Penalty</Button>
                  <Button variant="ghost" size="sm" className="h-7 text-[9px] bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-widest w-full" onClick={() => router.push(`/admin/review/${team.id}`)}>Review</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Activity Logs (Real System Simulation) */}
        <Card className="md:col-span-4 bg-card/50 border-white/5 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Activity Logs
            </CardTitle>
            <Clock className="w-3 h-3 text-white/20" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3 font-mono text-[10px]">
              {allHintRequests?.slice(0, 5).map((log, i) => (
                <div key={log.id} className="flex justify-between items-center opacity-60 hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-bold">HINT_REQ</span>
                    <span className="text-white/30 text-[8px]">LVL_{log.levelId.slice(0, 4)}</span>
                  </div>
                  <span className="text-white/20">{new Date(log.requestedAt).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>

      <footer className="text-center opacity-20 py-8">
        <p className="text-[10px] font-mono uppercase tracking-[0.5em]">System Core Active // Secured by Intra Syntax protocols</p>
      </footer>
    </div>
  );
}
