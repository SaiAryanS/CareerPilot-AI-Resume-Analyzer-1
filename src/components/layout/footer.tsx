import Link from 'next/link';
import { Github } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-border/50">
      <div className="container mx-auto flex h-16 items-center justify-center px-4 sm:px-6">
        <div className="flex items-center space-x-2">
          <Github className="h-5 w-5 text-muted-foreground" />
          <Link
            href="https://github.com/SaiAryanS/CareerPilot-AI-Resume-Analyzer/tree/master"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            View on GitHub
          </Link>
        </div>
      </div>
    </footer>
  );
}
