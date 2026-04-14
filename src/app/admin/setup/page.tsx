'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Navbar } from '@/components/Navbar';
import { Database, Loader2, CheckCircle2, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import initialLevels from '@/data/levels.json';
import initialTeams from '@/data/teams.json';
import { useFirestore, useUser } from '@/firebase';
import { collection, doc, writeBatch, setDoc, getDocs, query, where } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function AdminSetupPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleResetDatabase = async () => {
    if (!db || !user) {
      toast({ 
        variant: "destructive", 
        title: "Setup Failed", 
        description: "Terminal identity missing. Please ensure you are logged in." 
      });
      return;
    }
    
    setLoading(true);
    try {
      // 1. Establish administrative identity in a separate write to bypass batch restrictions
      const adminRoleRef = doc(db, 'admin_roles', user.uid);
      await setDoc(adminRoleRef, { 
        username: 'admin', 
        role: 'admin',
        bootstrappedAt: new Date().toISOString()
      }, { merge: true });

      // 2. Synchronize levels and metadata
      const batch = writeBatch(db);

      // Reset Levels
      initialLevels.forEach((level: any) => {
        const levelRef = doc(db, 'levels', level.id);
        batch.set(levelRef, level);
      });

      // Reset Teams to Level 1 and Clear Penalties
      // We search for existing team docs by name and reset them, or create new ones if they don't exist
      // Since we can't easily query within a batch, we'll reset any existing teams we find in the system
      const teamsSnap = await getDocs(collection(db, 'teams'));
      teamsSnap.forEach((teamDoc) => {
        batch.update(teamDoc.ref, {
          currentLevel: 1,
          flagCount: 0,
          penaltyUntil: null,
          lastSolvedAt: null
        });
      });

      // Also ensure the predefined teams exist in Firestore at Level 1
      initialTeams.forEach((team: any) => {
        // We use a deterministic path based on ID from teams.json if possible, 
        // but since login creates UIDs, we focus on the existing ones above.
        // For new teams in the JSON, they will be initialized on their first login.
      });

      await batch.commit();
      
      setDone(true);
      toast({ title: "Cloud Node Active", description: "Global synchronization complete. All units reset to Level 1." });
    } catch (error: any) {
      const permissionError = new FirestorePermissionError({
        path: 'multiple/batch',
        operation: 'write'
      });
      errorEmitter.emit('permission-error', permissionError);
      
      toast({ 
        variant: "destructive", 
        title: "Setup Failed", 
        description: error.message || "Insufficient permissions." 
      });
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
          <CardTitle className="text-xl font-headline font-bold uppercase tracking-tight text-white">Cloud Initialization</CardTitle>
          <CardDescription className="text-[10px] font-mono uppercase opacity-50">Sync production node with core protocols</CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="flex flex-col items-center gap-4">
                <CheckCircle2 className="w-12 h-12 text-green-500 animate-scale-up" />
                <p className="text-sm text-center text-muted-foreground font-mono uppercase">Sync Persistent // Node Active</p>
              </div>
              <Button onClick={() => window.location.href = '/admin/dashboard'} className="w-full font-bold uppercase tracking-widest">ENTER DASHBOARD</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-[9px] text-muted-foreground text-center font-mono uppercase tracking-tighter bg-destructive/5 p-3 rounded border border-destructive/10">
                Warning: This operation will overwrite global cloud data and RESET ALL TEAMS TO LEVEL 1.
              </p>
              <Button 
                disabled={loading} 
                onClick={handleResetDatabase} 
                className="w-full h-12 font-bold bg-primary text-white hover:opacity-90 uppercase tracking-widest"
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
