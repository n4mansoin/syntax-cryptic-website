
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth as useAppStore } from '@/lib/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Navbar } from '@/components/Navbar';
import { Terminal, Lock, User, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function LoginPage() {
  const [teamName, setTeamName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { loginTeam } = useAppStore();
  const firebaseAuth = useAuth();
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/hunt');
    }
  }, [user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Standardized email format for the Firebase Auth system
    const email = `${teamName.toLowerCase().trim()}@intra-syntax.com`;

    try {
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      } catch (authError: any) {
        // Auto-register for prototype purposes if user not found or for the specific test account
        if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential') {
          userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        } else {
          throw authError;
        }
      }

      if (userCredential.user) {
        // Ensure Firestore document exists for this team
        const teamDocRef = doc(db, 'teams', userCredential.user.uid);
        const teamSnap = await getDoc(teamDocRef);
        
        if (!teamSnap.exists()) {
          await setDoc(teamDocRef, {
            teamName: teamName,
            currentLevel: 1,
            flagCount: 0,
            penaltyUntil: null
          });
        }

        loginTeam(userCredential.user.uid, teamName);
        toast({ title: "Decryption Successful", description: `Team ${teamName} connection established.` });
        router.push('/hunt');
      }
    } catch (error: any) {
      console.error(error);
      toast({ 
        variant: "destructive", 
        title: "Authentication Failed", 
        description: error.message || "Invalid team name or access key." 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <Navbar />
      
      <div className="w-full max-w-md animate-scale-up">
        <Card className="border-white/5 bg-card/50 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-1 text-center pb-8">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Terminal className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-3xl font-headline font-bold tracking-tight">Team Authentication</CardTitle>
            <CardDescription className="text-muted-foreground">Enter your secure credentials to join the hunt</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="teamName" className="text-xs font-semibold uppercase tracking-widest text-primary/70 ml-1">Team Identity</Label>
                  <div className="relative group">
                    <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                      id="teamName" 
                      placeholder="ENTER TEAM NAME" 
                      className="pl-10 h-12 bg-background border-white/5 focus:border-primary/50 focus:ring-primary/20 transition-all font-mono text-sm tracking-wider" 
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-widest text-primary/70 ml-1">Access Key</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="••••••••" 
                      className="pl-10 h-12 bg-background border-white/5 focus:border-primary/50 focus:ring-primary/20 transition-all" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full h-12 text-sm font-bold bg-primary hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(124,92,255,0.2)]">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "DECRYPT ACCESS"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
