
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Navbar } from '@/components/Navbar';
import { Database, Loader2, CheckCircle2, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import initialLevels from '@/data/levels.json';
import initialTeams from '@/data/teams.json';
import { useFirestore } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';

export default function AdminSetupPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleResetDatabase = async () => {
    if (!db) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);

      // 1. Sync Levels (Plain Text)
      initialLevels.forEach((level: any) => {
        const levelRef = doc(db, 'levels', level.id);
        batch.set(levelRef, level);
      });

      // 2. Sync Teams
      initialTeams.forEach((team: any) => {
        const teamRef = doc(db, 'teams', team.id);
        batch.set(teamRef, team);
      });

      await batch.commit();
      
      setDone(true);
      toast({ title: "Cloud Synchronization Complete", description: "Signal keys broadcasted to production Firestore." });
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Setup Failed", description: "Could not synchronize cloud store." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <Navbar />
      <Card className="max-w-md w-full border-white/5 bg-card/50 backdrop-blur-xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Database className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Cloud Initialization</CardTitle>
          <CardDescription>Sync production database with current level and team data</CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <CheckCircle2 className="w-12 h-12 text-green-500 animate-scale-up" />
              <p className="text-sm text-center text-muted-foreground font-mono uppercase">Cloud Node Active // Sync Persistent</p>
              <Button onClick={() => window.location.href = '/hunt'} className="w-full">ENTER TERMINAL</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground text-center font-mono uppercase tracking-tighter">Warning: This will overwrite global cloud data for all participants.</p>
              <Button 
                disabled={loading} 
                onClick={handleResetDatabase} 
                className="w-full h-12 font-bold bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                RESTORE FACTORY DEFAULTS (CLOUD)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
