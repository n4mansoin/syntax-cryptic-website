
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth as useAppAuth } from '@/lib/auth-store';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, Flag, Lightbulb, Activity, 
  Settings, Clock, Loader2
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';

export default function AdminDashboard() {
  const { user, isUserLoading } = useUser();
  const { auth, loading: authLoading } = useAppAuth();
  const router = useRouter();
  const db = useFirestore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch all teams
  const teamsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'teams'), orderBy('currentLevel', 'desc'));
  }, [db, user]);
  const { data: teamsData, isLoading: teamsLoading } = useCollection(teamsQuery);

  // Fetch all hint requests
  const allHintRequestsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'hintRequests'), orderBy('requestedAt', 'desc'));
  }, [db, user]);
  const { data: allHintRequests } = useCollection(allHintRequestsQuery);

  // Fetch levels
  const levelsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'levels'), orderBy('order', 'asc'));
  }, [db, user]);
  const { data: levels } = useCollection(levelsQuery);

  useEffect(() => {
    if (isMounted && !isUserLoading && !user) {
      router.push('/admin/login');
    }
  }, [user, isUserLoading, router, isMounted]);

  const getRequestCountForLevel = (levelId: string) => {
    return allHintRequests?.filter(req => req.levelId === levelId).length || 0;
  };

  const formatTimestamp = (isoString: string) => {
    if (!isMounted) return '--:--:--';
    try {
      return new Date(isoString).toLocaleTimeString();
    } catch {
      return 'Invalid Date';
    }
  };

  if (!isMounted || isUserLoading || authLoading || teamsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col p-6 pt-24 space-y-8 max-w-[1400px] mx-auto w-full">
      <Navbar />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <h1 className="text-3xl font-headline font-bold text-white tracking-tighter uppercase">Operations Control</h1>
          </div>
          <p className="text-muted-foreground text-xs font-mono uppercase tracking-widest opacity-50">Identity: {user.uid} // Custom Claim: Root_Admin</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-12">
        <Card className="md:col-span-8 bg-card/50 border-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Live Standings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {teamsData?.map((team, i) => (
              <div key={team.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs text-white/20">{String(i + 1).padStart(2, '0')}</span>
                  <span className="font-bold text-sm">{team.teamName}</span>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="border-white/10 text-[10px] px-3 font-mono">LVL {team.currentLevel}</Badge>
                </div>
              </div>
            ))}
            {(!teamsData || teamsData.length === 0) && (
              <p className="text-center py-8 text-white/20 font-mono text-xs">NO ACTIVE TEAMS FOUND</p>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-4 bg-card/50 border-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-500" /> Hint Request Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {levels?.map((lvl) => (
              <div key={lvl.id} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg border border-white/5">
                <span className="text-[10px] font-mono text-white/40">LEVEL 0{lvl.order}</span>
                <span className="text-xs font-bold">{getRequestCountForLevel(lvl.id)} REQS</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="md:col-span-12 bg-card/50 border-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> System Activity Log
            </CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-[10px] space-y-2">
            {allHintRequests?.slice(0, 10).map((log) => (
              <div key={log.id} className="flex justify-between border-b border-white/5 pb-2 opacity-60">
                <span>SIGNAL_REQ: TEAM_{log.teamId.slice(0,6)} -> LVL_{log.levelId.slice(0,4)}</span>
                <span>{formatTimestamp(log.requestedAt)}</span>
              </div>
            ))}
            {(!allHintRequests || allHintRequests.length === 0) && (
              <p className="text-center py-8 text-white/20 font-mono text-xs">NO RECENT ACTIVITY</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
