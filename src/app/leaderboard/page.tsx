'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/lib/auth-store';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, ArrowUp, Timer, Search, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function LeaderboardPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Mock leaderboard data
  const teams = [
    { rank: 1, name: "Null Pointers", level: 14, lastSolved: "2m ago", time: "14:22:05" },
    { rank: 2, name: "Binary Bandits", level: 14, lastSolved: "5m ago", time: "14:28:44" },
    { rank: 3, name: "Syntax Errors", level: 12, lastSolved: "1m ago", time: "15:10:11" },
    { rank: 4, name: "V0id_Runners", level: 11, lastSolved: "12m ago", time: "15:44:22" },
    { rank: 5, name: "Cyber Phantoms", level: 9, lastSolved: "30m ago", time: "16:05:00" },
    { rank: 6, name: "The Alchemists", level: 8, lastSolved: "45m ago", time: "16:12:11" },
    { rank: 7, name: "Root Access", level: 7, lastSolved: "1h ago", time: "17:00:00" },
  ];

  useEffect(() => {
    const interval = setInterval(() => setLastUpdated(new Date()), 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredTeams = teams.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-background flex flex-col p-6 pt-24 items-center">
      <Navbar />

      <div className="w-full max-w-4xl space-y-8 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-8 h-8 text-primary" />
              <h1 className="text-4xl font-headline font-bold text-white tracking-tighter uppercase">Live Standings</h1>
            </div>
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <Globe className="w-4 h-4 animate-pulse text-primary/50" />
              Real-time progression monitor // Auto-refreshing every 10s
            </p>
          </div>
          
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/20" />
            <Input 
              placeholder="Search Team..." 
              className="pl-10 bg-card border-white/5 focus:border-primary/50 focus:ring-primary/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-card/30 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          <Table>
            <TableHeader className="bg-white/[0.02]">
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="w-20 text-center text-[10px] uppercase tracking-widest font-bold text-primary">Rank</TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest font-bold text-white">Team Identity</TableHead>
                <TableHead className="text-center text-[10px] uppercase tracking-widest font-bold text-white">Level</TableHead>
                <TableHead className="text-right text-[10px] uppercase tracking-widest font-bold text-white">Solved Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeams.map((team) => (
                <TableRow key={team.rank} className="border-white/5 hover:bg-white/[0.03] transition-colors group">
                  <TableCell className="text-center font-headline font-bold text-lg py-6">
                    {team.rank === 1 ? <span className="text-primary text-2xl">01</span> : team.rank < 10 ? `0${team.rank}` : team.rank}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-white text-lg tracking-tight group-hover:text-primary transition-colors">{team.name}</span>
                      <span className="text-[10px] text-white/20 font-mono flex items-center gap-1">
                        <ArrowUp className="w-2 h-2 text-green-500" /> Solved {team.lastSolved}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1 font-mono text-sm">
                      LVL {team.level}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-mono text-sm text-white/70">{team.time}</span>
                      <span className="text-[9px] uppercase tracking-widest text-white/20">System Clock</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-center pt-4">
          <p className="text-[10px] text-white/10 uppercase tracking-[0.3em] font-mono">
            Last Synced: {lastUpdated.toLocaleTimeString()} // Global Network Active
          </p>
        </div>
      </div>
    </div>
  );
}
