
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type AuthState = 'user' | 'admin' | null;

export default function Navbar() {
  const [authState, setAuthState] = useState<AuthState>(null);
  const pathname = usePathname();
  const router = useRouter();

  // This effect simulates checking session state based on sessionStorage.
  useEffect(() => {
    const isAdmin = sessionStorage.getItem('isAdmin') === 'true';
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';

    if (isAdmin) {
      setAuthState('admin');
    } else if (isLoggedIn) {
      setAuthState('user');
    } else {
      setAuthState(null);
    }
  }, [pathname]); // Re-check on path change

  const handleLogout = (isAdmin: boolean) => {
    // Clear session storage on logout
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('isAdmin');
    sessionStorage.removeItem('userEmail');
    setAuthState(null);
    
    const targetUrl = isAdmin ? '/admin/login' : '/';
    
    // Force a full page refresh by setting the location href.
    // This is more robust than router.push + router.refresh for a full state reset.
    window.location.href = targetUrl;
  };

  const renderMenuItems = () => {
    if (authState === 'admin') {
      return (
        <>
          <DropdownMenuItem asChild>
            <Link href="/admin/dashboard">Admin Dashboard</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleLogout(true)}>
            Log Out
          </DropdownMenuItem>
        </>
      );
    }
    if (authState === 'user') {
      return (
        <>
          <DropdownMenuItem asChild>
            <Link href="/">Analyze Resume</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/history">Analysis History</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleLogout(false)}>
            Log Out
          </DropdownMenuItem>
        </>
      );
    }
    // Logged out state
    return (
      <>
        <DropdownMenuItem asChild>
          <Link href="/login">Login / Register</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/admin/login">Admin Login</Link>
        </DropdownMenuItem>
      </>
    );
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-7 h-7 text-primary"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span className="text-xl font-bold font-headline">CareerPilot AI</span>
        </Link>

        <nav>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {renderMenuItems()}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
}
