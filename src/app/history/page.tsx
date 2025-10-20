
"use client";

import { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table";
import { Loader2 } from 'lucide-react';

type Analysis = {
  _id: string;
  resumeFileName: string;
  jobDescription: string;
  matchScore: number;
  createdAt: string;
};
  
export default function HistoryPage() {
    const [analyses, setAnalyses] = useState<Analysis[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAnalyses = async () => {
            const userEmail = sessionStorage.getItem('userEmail');
            if (!userEmail) {
                setError("You must be logged in to view your history.");
                setIsLoading(false);
                return;
            }

            try {
                const response = await fetch(`/api/history?userEmail=${encodeURIComponent(userEmail)}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch analysis history');
                }
                const data = await response.json();
                setAnalyses(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAnalyses();
    }, []);

    const renderContent = () => {
      if (isLoading) {
        return (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
              <div className="flex justify-center items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading history...
              </div>
            </TableCell>
          </TableRow>
        );
      }

      if (error) {
        return (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-red-500 h-24">
              {error}
            </TableCell>
          </TableRow>
        );
      }
      
      if (analyses.length > 0) {
        return analyses.map((analysis) => (
            <TableRow key={analysis._id}>
                <TableCell className="font-medium">{analysis.resumeFileName}</TableCell>
                <TableCell>{analysis.jobDescription}</TableCell>
                <TableCell className="text-right font-bold">{analysis.matchScore}%</TableCell>
                <TableCell>{new Date(analysis.createdAt).toLocaleDateString()}</TableCell>
            </TableRow>
        ));
      }

      return (
        <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                No analysis history found.
            </TableCell>
        </TableRow>
      );
    }

    return (
      <main className="min-h-screen container mx-auto p-4 pt-24 sm:pt-28 md:pt-32">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Analysis History</CardTitle>
            <CardDescription>
              Here are the past resume analyses you have performed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Resume File</TableHead>
                    <TableHead>Job Description</TableHead>
                    <TableHead className="text-right">Match Score</TableHead>
                    <TableHead>Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {renderContent()}
                </TableBody>
                </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    );
}
