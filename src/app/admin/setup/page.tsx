
'use client';

import { useState } from 'react';
import { useStore } from '@/lib/local-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Navbar } from '@/components/Navbar';
import { Database, Loader2, CheckCircle2, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { encryptAnswer } from '@/utils/crypto';
import initialLevels from '@/data/levels.json';
import initialTeams from '@/data/teams.json';

export default function AdminSetupPage() {
  const { updateStore } = useStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Source of Truth for Answers (Only exists here for initialization)
  const RAW_ANSWERS: Record<string, string> = {
    lvl1: "internet",
    lvl2: "hexadecimal",
    lvl3: "INTRA SYNTAX 2026@DPSI",
    lvl4: "x86",
    lvl5: "blockchain"
  };

  const handleResetDatabase = async () => {
    setLoading(true);
    try {
      // Dynamically encrypt answers to ensure they match the runtime SECRET_KEY
      const encryptedLevels = initialLevels.map((level: any) => ({
        ...level,
        encryptedAnswer: encryptAnswer(RAW_ANSWERS[level.id] || '', level.salt)
      }));

      updateStore(() => ({
        levels: encryptedLevels as any,
        teams: initialTeams as any,
        hints: [],
        attempts: [],
        flags: [],
      }));
      
      setDone(true);
      toast({ title: "System Reset", description: "Answers encrypted and synchronized." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Setup Failed", description: "Could not synchronize store." });
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
          <CardDescription>Securely encrypt signals and reset terminal states</CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <CheckCircle2 className="w-12 h-12 text-green-500 animate-scale-up" />
              <p className="text-sm text-center text-muted-foreground font-mono uppercase">Decryption Keys Synced // Broadcast Ready</p>
              <Button onClick={() => window.location.href = '/hunt'} className="w-full">ENTER TERMINAL</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground text-center font-mono uppercase tracking-tighter">Warning: Overwrites all progress and re-calculates secure hashes.</p>
              <Button 
                disabled={loading} 
                onClick={handleResetDatabase} 
                className="w-full h-12 font-bold bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                RESTORE FACTORY DEFAULTS
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
