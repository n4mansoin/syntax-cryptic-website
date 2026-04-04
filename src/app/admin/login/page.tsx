
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth as useAppStore } from '@/lib/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Navbar } from '@/components/Navbar';
import { ShieldAlert, ShieldCheck, Fingerprint, Loader2, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useUser } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

export default function AdminLoginPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [adminName, setAdminName] = useState('admin');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { loginAdmin, verify2FA } = useAppStore();
  const firebaseAuth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (!isUserLoading && user && user.email === 'admin@intra-syntax.com') {
      // If already logged in to Firebase as admin, allow 2FA step directly
      setStep(2);
    }
  }, [user, isUserLoading]);

  const handleInitialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const email = `${adminName.toLowerCase().trim()}@intra-syntax.com`;
    
    try {
      try {
        await signInWithEmailAndPassword(firebaseAuth, email, password);
      } catch (authError: any) {
        if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential') {
          await createUserWithEmailAndPassword(firebaseAuth, email, password);
        } else {
          throw authError;
        }
      }
      
      loginAdmin('admin-root');
      setStep(2);
      toast({ title: "Administrative Access", description: "Phase 1 complete. Awaiting TOTP." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Access Denied", description: "Invalid admin credentials." });
    } finally {
      setLoading(false);
    }
  };

  const handle2FA = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Mock TOTP: 123456
    if (totp === '123456') {
      verify2FA();
      toast({ title: "Authorized", description: "Identity verified." });
      router.push('/admin/dashboard');
    } else {
      toast({ variant: "destructive", title: "Invalid Code", description: "Incorrect TOTP." });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <Navbar />
      
      <div className="w-full max-w-md animate-scale-up">
        <Card className="border-primary/20 bg-card/50 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-1 text-center pb-8">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              {step === 1 ? <ShieldAlert className="w-6 h-6 text-primary" /> : <ShieldCheck className="w-6 h-6 text-primary" />}
            </div>
            <CardTitle className="text-3xl font-headline font-bold tracking-tight">Admin Portal</CardTitle>
            <CardDescription className="text-muted-foreground">Secure Administrative Login</CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 ? (
              <form onSubmit={handleInitialLogin} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">Identity</Label>
                    <div className="relative group">
                      <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input 
                        placeholder="ADMIN NAME" 
                        className="pl-10 h-12 bg-background border-white/5 focus:border-primary/50 font-mono" 
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">Master Key</Label>
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      className="h-12 bg-background border-white/5 focus:border-primary/50 transition-all font-mono" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full h-12 bg-primary hover:bg-primary/90 font-bold">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "PROCEED"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handle2FA} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">Authenticator Code (123456)</Label>
                  <div className="relative group">
                    <Fingerprint className="absolute left-3 top-3 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                      placeholder="000000" 
                      className="pl-10 h-12 text-center text-xl tracking-[0.5em] bg-background border-white/5 focus:border-primary/50 font-mono" 
                      maxLength={6}
                      value={totp}
                      onChange={(e) => setTotp(e.target.value)}
                      required
                    />
                  </div>
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
