
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Navbar } from '@/components/Navbar';
import { Lock, User, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useStore } from '@/lib/local-store';
import { localApi } from '@/services/local-api';

export default function LoginPage() {
  const [teamName, setTeamName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { loginTeam, loginAdmin, auth, loading: authLoading } = useAuth();
  const { state, isReady } = useStore();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading) {
      if (auth.adminId) router.push('/admin/dashboard');
      else if (auth.teamId) router.push('/hunt');
    }
  }, [auth, authLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isReady || submitting) return;
    
    setSubmitting(true);
    try {
      const team = await localApi.loginTeam(teamName, password, state);

      if (team) {
        if (team.id === 'admin-root') {
          loginAdmin('admin-root');
          toast({ title: "Access Granted", description: "Terminal ID: ROOT_ADMIN" });
        } else {
          loginTeam(team.id, team.teamName);
          toast({ title: "Signal Established", description: `Welcome back, ${team.teamName}.` });
        }
      } else {
        toast({ 
          variant: "destructive", 
          title: "Authentication Failed", 
          description: "Invalid credentials. Signal rejected." 
        });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "System Error", description: "Authentication node unreachable." });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isReady || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <Navbar />
      
      <div className="w-full max-w-md animate-scale-up">
        <Card className="border-white/5 bg-card/50 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-1 text-center pb-8">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/5 flex items-center justify-center mb-4 overflow-hidden">
              <Image src="/images/logo1.png" alt="Logo" width={80} height={80} className="object-contain p-2" />
            </div>
            <CardTitle className="text-3xl font-headline font-bold tracking-tight text-white">Identity Verification</CardTitle>
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
                      placeholder="Terminal Name" 
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
              <Button type="submit" disabled={submitting} className="w-full h-12 font-bold bg-primary hover:bg-primary/90 text-white uppercase tracking-widest">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "DECRYPT ACCESS"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
