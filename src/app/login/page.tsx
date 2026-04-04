'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Navbar } from '@/components/Navbar';
import { Terminal, Lock, User, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocalStore } from '@/lib/local-store';

export default function LoginPage() {
  const [teamName, setTeamName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { loginTeam, auth, loading: authLoading } = useAuth();
  const { addTeam, teams, isReady } = useLocalStore();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && auth.teamId) {
      router.push('/hunt');
    }
  }, [auth, authLoading, router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Hardcoded credentials: test123 / testing
    const isValid = teamName === 'test123' && password === 'testing';

    if (isValid) {
      const teamId = 'team-test123';
      
      // Initialize team in local store if it doesn't exist
      if (isReady && !teams.find(t => t.id === teamId)) {
        addTeam({
          id: teamId,
          teamName: teamName,
          currentLevel: 1,
          flagCount: 0,
          penaltyUntil: null
        });
      }

      loginTeam(teamId, teamName);
      toast({ title: "Decryption Successful", description: `Connection established.` });
      // Navigation is handled by the useEffect
    } else {
      toast({ 
        variant: "destructive", 
        title: "Authentication Failed", 
        description: "Invalid credentials (test123 / testing)." 
      });
    }
    setLoading(false);
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <Navbar />
      
      <div className="w-full max-w-md animate-scale-up">
        <Card className="border-white/5 bg-card/50 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-1 text-center pb-8">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Terminal className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-3xl font-headline font-bold tracking-tight text-white">Team Portal</CardTitle>
            <CardDescription className="text-muted-foreground font-mono text-[10px] uppercase">Awaiting Terminal Credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="teamName" className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">Terminal ID</Label>
                  <div className="relative group">
                    <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                      id="teamName" 
                      placeholder="test123" 
                      className="pl-10 h-12 bg-background border-white/5 focus:border-primary/50 font-mono text-white" 
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">Access Key</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="••••••••" 
                      className="pl-10 h-12 bg-background border-white/5 focus:border-primary/50 font-mono text-white" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full h-12 font-bold bg-primary hover:bg-primary/90 text-white uppercase tracking-widest">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "DECRYPT ACCESS"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
