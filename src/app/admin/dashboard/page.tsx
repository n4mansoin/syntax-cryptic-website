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
import { 
  BarChart3, Flag, Lightbulb, PlayCircle, ShieldAlert, Activity, 
  Settings, Users, Clock, Terminal, Search
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminDashboard() {
  const { auth, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [selectedLevel, setSelectedLevel] = useState('1');
  const [hintText, setHintText] = useState('');

  useEffect(() => {
    if (!loading && (!auth.adminId || !auth.is2FAVerified)) {
      router.push('/admin/login');
    }
  }, [auth, loading, router]);

  const handleReleaseHint = () => {
    toast({ title: "Hint Released", description: `Hint for Level ${selectedLevel} is now live.` });
    setHintText('');
  };

  const handlePenalty = (team: string) => {
    toast({ title: "Penalty Applied", description: `45 minute penalty applied to Team ${team}.` });
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
            <Button variant="ghost" size="sm" className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Full Report</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {[
                { name: "Null Pointers", level: 14, progress: 92 },
                { name: "Binary Bandits", level: 14, progress: 88 },
                { name: "Syntax Errors", level: 12, progress: 75 },
                { name: "V0id_Runners", level: 11, progress: 68 },
              ].map((team, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] transition-all cursor-default group">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-xs text-white/20">0{i+1}</span>
                    <span className="font-bold text-sm tracking-tight group-hover:text-primary transition-colors">{team.name}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <Badge variant="outline" className="border-white/10 text-[10px] px-3 font-mono">LVL {team.level}</Badge>
                    <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden hidden md:block">
                      <div className="h-full bg-primary" style={{ width: `${team.progress}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Flagged Activity */}
        <Card className="md:col-span-4 bg-card/50 border-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] flex items-center gap-2">
              <Flag className="w-4 h-4 text-destructive" /> Suspicious Behavior
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { team: "Cyber Phantoms", reason: "Rapid Attempt Burst", time: "2m ago" },
              { team: "Root Access", reason: "Anomalous IP Change", time: "14m ago" },
            ].map((flag, i) => (
              <div key={i} className="p-4 bg-destructive/5 border border-destructive/20 rounded-xl space-y-2">
                <div className="flex justify-between items-start">
                  <span className="font-bold text-sm text-destructive">{flag.team}</span>
                  <span className="text-[10px] font-mono text-white/30">{flag.time}</span>
                </div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-white/50">{flag.reason}</p>
                <div className="flex gap-2 pt-2">
                  <Button variant="ghost" size="sm" className="h-7 text-[9px] bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-widest w-full" onClick={() => handlePenalty(flag.team)}>Penalty</Button>
                  <Button variant="ghost" size="sm" className="h-7 text-[9px] bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-widest w-full">Review</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Hint Control */}
        <Card className="md:col-span-4 bg-card/50 border-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-500" /> Hint Controller
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
                  <SelectItem value="1">LEVEL 01</SelectItem>
                  <SelectItem value="2">LEVEL 02</SelectItem>
                  <SelectItem value="3">LEVEL 03</SelectItem>
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

        {/* Simulation Environment */}
        <Card className="md:col-span-4 bg-card/50 border-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] flex items-center gap-2">
              <PlayCircle className="w-4 h-4 text-blue-500" /> Simulation Env
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl font-mono text-[10px] leading-relaxed text-blue-200/60">
              $ run level_3_sim.sh<br/>
              [OK] Mock Answer Hashing<br/>
              [OK] State Transition Valid<br/>
              [!] AI Hint Strength: High
            </div>
            <Button variant="outline" className="w-full border-white/5 hover:bg-white/5 font-bold text-xs uppercase tracking-widest h-12">
              Launch Sandbox
            </Button>
          </CardContent>
        </Card>

        {/* Activity Logs */}
        <Card className="md:col-span-4 bg-card/50 border-white/5 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Activity Logs
            </CardTitle>
            <Clock className="w-3 h-3 text-white/20" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3 font-mono text-[10px]">
              {[
                { action: "HINT_RELEASED", meta: "LVL_04", time: "12:44:02" },
                { action: "TEAM_LOGOUT", meta: "VOID_RUNNERS", time: "12:42:15" },
                { action: "PENALTY_SET", meta: "ROOT_ACCESS", time: "12:38:55" },
                { action: "ADMIN_LOGIN", meta: "ROOT_USER", time: "12:35:01" },
              ].map((log, i) => (
                <div key={i} className="flex justify-between items-center opacity-60 hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-bold">{log.action}</span>
                    <span className="text-white/30 text-[8px]">{log.meta}</span>
                  </div>
                  <span className="text-white/20">{log.time}</span>
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

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={`block mb-1 ${className}`}>{children}</label>;
}
