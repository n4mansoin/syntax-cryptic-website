
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
import { Loader2, User, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminLoginPage() {
  const [adminName, setAdminName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { loginAdmin, auth, loading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && auth.adminId) {
      router.push('/admin/dashboard');
    }
  }, [auth, authLoading, router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Updated Credentials: admin / qawsedrftg
    if (adminName === 'admin' && password === 'qawsedrftg') {
      loginAdmin('admin-root');
      toast({ title: "Access Granted", description: "Welcome back, Administrator." });
    } else {
      toast({ 
        variant: "destructive", 
        title: "Authentication Failed", 
        description: "Invalid credentials. Terminal access denied." 
      });
    }
    setLoading(false);
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <Navbar />
      
      <div className="w-full max-w-md animate-scale-up">
        <Card className="border-primary/20 bg-card/50 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-1 text-center pb-8">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 overflow-hidden">
              <Image src="/images/logo1.png" alt="Admin" width={64} height={64} className="object-contain" />
            </div>
            <CardTitle className="text-3xl font-headline font-bold tracking-tight text-white">Admin Control</CardTitle>
            <CardDescription className="text-muted-foreground font-mono text-[10px] uppercase">Awaiting Root Credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">Terminal ID</Label>
                  <div className="relative group">
                    <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                      placeholder="admin" 
                      className="pl-10 h-12 bg-background border-white/5 focus:border-primary/50 font-mono text-white" 
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">Access Key</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
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
              <Button type="submit" disabled={loading} className="w-full h-12 bg-primary hover:bg-primary/90 font-bold text-white uppercase tracking-widest">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "PROCEED"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
