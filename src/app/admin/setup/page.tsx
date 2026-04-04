
'use client';

import { useState } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Navbar } from '@/components/Navbar';
import { Database, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminSetupPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const initialLevels = [
    { id: 'lvl1', order: 1, question: "The first key is hidden in plain sight. What is the sum of 10 and 20?", answer: "30" },
    { id: 'lvl2', order: 2, question: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?", answer: "ECHO" },
    { id: 'lvl3', order: 3, question: "The more of this there is, the less you see. What is it?", answer: "DARKNESS" },
    { id: 'lvl4', order: 4, question: "I have keys, but no locks and space, and no rooms. You can enter, but never leave. What am I?", answer: "KEYBOARD" },
    { id: 'lvl5', order: 5, question: "What has a head and a tail but no body?", answer: "COIN" },
  ];

  const handleSeedDatabase = async () => {
    if (!db || !user) return;
    setLoading(true);

    try {
      const batch = writeBatch(db);
      
      initialLevels.forEach((lvl) => {
        const levelRef = doc(db, 'levels', lvl.id);
        batch.set(levelRef, {
          question: lvl.question,
          answer: lvl.answer,
          order: lvl.order
        });
      });

      await batch.commit();
      setDone(true);
      toast({ title: "Database Seeded", description: "All levels have been initialized." });
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Setup Failed", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (isUserLoading) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <Navbar />
      <Card className="max-w-md w-full border-white/5 bg-card/50 backdrop-blur-xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Database className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>System Initialization</CardTitle>
          <CardDescription>Populate the hunt with core level data</CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <CheckCircle2 className="w-12 h-12 text-green-500 animate-scale-up" />
              <p className="text-sm text-center text-muted-foreground font-mono">DATABASE ONLINE // LEVELS SYNCED</p>
              <Button onClick={() => window.location.href = '/hunt'} className="w-full">ENTER HUNT</Button>
            </div>
          ) : (
            <Button 
              disabled={loading} 
              onClick={handleSeedDatabase} 
              className="w-full h-12 font-bold"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              SEED 5 LEVELS
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
