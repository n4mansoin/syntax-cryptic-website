'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Navbar } from '@/components/Navbar';
import { ShieldAlert, ShieldCheck, Fingerprint, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminLoginPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { loginAdmin, verify2FA } = useAuth();
  const { toast } = useToast();

  const handleInitialLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate administrative verification
    setTimeout(() => {
      // Updated admin password
      if (password === 'qwertyhbvcdfgh') {
        loginAdmin('admin-root');
        setStep(2);
      } else {
        toast({ variant: "destructive", title: "Access Denied", description: "Incorrect administrative credentials." });
      }
      setLoading(false);
    }, 1000);
  };

  const handle2FA = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      // Mock TOTP for demo purposes
      if (totp === '123456') {
        verify2FA();
        toast({ title: "Authorized", description: "Identity verified. Redirecting to secure dashboard." });
        router.push('/admin/dashboard');
      } else {
        toast({ variant: "destructive", title: "Invalid Code", description: "The provided TOTP code is incorrect or expired." });
      }
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <Navbar />
      
      <div className="w-full max-w-md animate-scale-up">
        <Card className="border-primary/20 bg-card/50 backdrop-blur-xl shadow-[0_0_40px_rgba(124,92,255,0.1)]">
          <CardHeader className="space-y-1 text-center pb-8">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              {step === 1 ? <ShieldAlert className="w-6 h-6 text-primary" /> : <ShieldCheck className="w-6 h-6 text-primary" />}
            </div>
            <CardTitle className="text-3xl font-headline font-bold tracking-tight">Admin Portal</CardTitle>
            <CardDescription className="text-muted-foreground">
              {step === 1 ? "Administrative Identity Required" : "Multi-Factor Authentication Required"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 ? (
              <form onSubmit={handleInitialLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">Master Key</Label>
                  <Input 
                    type="password" 
                    placeholder="ENTER MASTER PASSWORD" 
                    className="h-12 bg-background border-white/5 focus:border-primary/50 transition-all font-mono" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full h-12 bg-primary hover:bg-primary/90 font-bold">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "PROCEED"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handle2FA} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">Authenticator Code</Label>
                  <div className="relative group">
                    <Fingerprint className="absolute left-3 top-3 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                      placeholder="0 0 0  0 0 0" 
                      className="pl-10 h-12 text-center text-xl tracking-[0.5em] bg-background border-white/5 focus:border-primary/50 font-mono" 
                      maxLength={6}
                      value={totp}
                      onChange={(e) => setTotp(e.target.value)}
                      required
                    />
                  </div>
                  <p className="text-[10px] text-center text-white/30 font-mono mt-4">Code expires in 28 seconds</p>
                </div>
                <Button type="submit" disabled={loading} className="w-full h-12 bg-primary hover:bg-primary/90 font-bold">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "VERIFY IDENTITY"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
