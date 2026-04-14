
'use client';

import { useState } from 'react';
import { useStore } from '@/lib/local-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Navbar } from '@/components/Navbar';
import { Database, Loader2, CheckCircle2, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import initialLevels from '@/data/levels.json';
import initialTeams from '@/data/teams.json';

export default function AdminSetupPage() {
  const { updateStore } = useStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleResetDatabase = async () => {
    setLoading(true);
    try {
      // Use the functional updater required by the RealtimeSyncEngine
      updateStore(() => ({
        levels: initialLevels as any,
        teams: initialTeams as any,
        hints: [],
        attempts: [],
        flags: [],
      }));
      
      setDone(true);
      toast({ title: "System Reset", description: "All local data has been restored to factory defaults." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Setup Failed", description: "Could not synchronize local store." });
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
          <CardTitle>System Initialization</CardTitle>
          <CardDescription>Reset local signal sets to default parameters</CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <CheckCircle2 className="w-12 h-12 text-green-500 animate-scale-up" />
              <p className="text-sm text-center text-muted-foreground font-mono">DATABASE ONLINE // BROADCAST ACTIVE</p>
              <Button onClick={() => window.location.href = '/hunt'} className="w-full">ENTER HUNT</Button>
            </div>
          ) : (
            <Button 
              disabled={loading} 
              onClick={handleResetDatabase} 
              className="w-full h-12 font-bold bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RotateCcw className="w-4 h-4 mr-2" />}
              RESTORE FACTORY DEFAULTS
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
