'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { LogOut, LayoutDashboard, Trophy, Terminal } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function Navbar() {
  const { auth, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-background/80 backdrop-blur-md border-b border-white/5">
      <Link href="/" className="flex items-center gap-2">
        <Terminal className="w-6 h-6 text-primary" />
        <span className="font-headline font-bold tracking-tighter text-xl">INTRA SYNTAX</span>
      </Link>

      <div className="flex items-center gap-4">
        {auth.userType === 'team' && (
          <>
            <Link href="/hunt">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">Level</Button>
            </Link>
            <Link href="/leaderboard">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">Leaderboard</Button>
            </Link>
            <div className="h-4 w-[1px] bg-white/10 mx-2" />
            <span className="text-sm font-medium text-primary uppercase tracking-widest">{auth.teamName}</span>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-destructive transition-colors">
              <LogOut className="w-4 h-4" />
            </Button>
          </>
        )}

        {auth.userType === 'admin' && (
          <>
            {auth.is2FAVerified && (
              <Link href="/admin/dashboard">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground flex gap-2 items-center">
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
              <LogOut className="w-4 h-4" />
            </Button>
          </>
        )}

        {!auth.userType && (
          <Link href="/login">
            <Button variant="outline" size="sm">Login</Button>
          </Link>
        )}
      </div>
    </nav>
  );
}
