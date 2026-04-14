import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from '@/lib/auth-store.tsx';
import { RealtimeSyncEngine } from '@/lib/local-store.tsx';
import { Analytics } from "@vercel/analytics/next"
import { FirebaseClientProvider } from '@/firebase/client-provider';

export const metadata: Metadata = {
  title: 'INTRA SYNTAX CRYPTIC',
  description: 'Minimalist cryptic hunt platform',
  icons: {
    icon: '/images/logo1.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100;300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body 
        className="font-body antialiased bg-background text-foreground selection:bg-primary selection:text-primary-foreground"
        suppressHydrationWarning
      >
        <FirebaseClientProvider>
          <AuthProvider>
            <RealtimeSyncEngine>
              {children}
              <Toaster />
              <Analytics />
            </RealtimeSyncEngine>
          </AuthProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
