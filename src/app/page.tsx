
"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import CareerPilotClient from '@/components/career-pilot/career-pilot-client';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center p-4 pt-20">
      <div className="max-w-3xl">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold font-headline text-primary">
          Welcome to CareerPilot AI
        </h1>
        <p className="mt-4 text-lg sm:text-xl text-muted-foreground">
          Analyze your resume against any job description with the power of AI. Get a detailed skill match analysis, identify missing keywords, and tailor your resume to land your dream job.
        </p>
        <div className="mt-10">
          <Button asChild size="lg" className="font-bold">
            <Link href="/register">
              Get Started for Free <ArrowRight className="ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // usePathname is used to trigger re-renders on navigation
  const pathname = usePathname();

  useEffect(() => {
    // This check now runs on component mount and whenever the path changes.
    // The router.refresh() on logout will cause this component to remount.
    const loggedInStatus = sessionStorage.getItem('isLoggedIn') === 'true';
    setIsLoggedIn(loggedInStatus);
  }, [pathname]);

  if (isLoggedIn) {
    return (
      <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 sm:p-8 md:p-12 pt-24 sm:pt-28 md:pt-32">
        <CareerPilotClient />
      </main>
    );
  }

  return <LandingPage />;
}
