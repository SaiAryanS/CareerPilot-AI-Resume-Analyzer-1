
"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CheckCircle2, AlertTriangle, XCircle, Download } from "lucide-react";

type InterviewResult = {
  question: string;
  userAnswer: string;
  score: number;
  feedback: string;
};

export default function InterviewResultsPage() {
  const router = useRouter();
  const [results, setResults] = useState<InterviewResult[]>([]);
  const [overallScore, setOverallScore] = useState(0);
  const resultsCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedResults = sessionStorage.getItem('interviewResults');
    if (!storedResults) {
      router.push('/');
      return;
    }
    const parsedResults = JSON.parse(storedResults);
    setResults(parsedResults);

    const totalScore = parsedResults.reduce((acc: number, curr: InterviewResult) => acc + curr.score, 0);
    const avgScore = totalScore / parsedResults.length;
    setOverallScore(Math.round(avgScore * 10)); // Convert to a percentage-like score
  }, [router]);

  const getStatusStyle = () => {
    if (overallScore >= 75) return { textColor: 'text-green-400', icon: <CheckCircle2 /> };
    if (overallScore >= 50) return { textColor: 'text-yellow-400', icon: <AlertTriangle /> };
    return { textColor: 'text-red-400', icon: <XCircle /> };
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-400';
    if (score >= 5) return 'text-yellow-400';
    return 'text-red-400';
  };

  const handleDownload = () => {
    const cardElement = resultsCardRef.current;
    if (!cardElement) return;

    html2canvas(cardElement, {
        scale: 2,
        backgroundColor: '#0a0a0a',
        useCORS: true,
      }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
        pdf.save('interview-results-report.pdf');
      });
  };

  const handleFinish = () => {
    sessionStorage.removeItem('interviewJobDescription');
    sessionStorage.removeItem('interviewResults');
    router.push('/');
  }

  if (results.length === 0) return null;

  const { textColor, icon } = getStatusStyle();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 pt-20">
      <Card ref={resultsCardRef} className="w-full max-w-3xl" style={{ backgroundColor: '#0a0a0a' }}>
        <CardHeader className="text-center">
          <div className="flex justify-center items-center gap-2">
              <CardTitle className={`font-headline text-2xl flex items-center gap-2 ${textColor}`}>
                  {icon} Interview Complete
              </CardTitle>
          </div>
          <CardDescription>Here is the detailed feedback from your interview simulation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center py-6 bg-muted/50 rounded-lg">
            <p className="text-muted-foreground text-sm font-medium">OVERALL SCORE</p>
            <p className={`font-bold text-6xl font-headline ${textColor}`}>{overallScore}%</p>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">Detailed Feedback</h3>
            <Accordion type="single" collapsible className="w-full">
              {results.map((result, index) => (
                <AccordionItem value={`item-${index}`} key={index}>
                  <AccordionTrigger>
                    <div className="flex justify-between items-center w-full pr-4">
                      <span className="text-left">Question {index + 1}: {result.question}</span>
                      <span className={`font-bold pl-4 ${getScoreColor(result.score)}`}>{result.score}/10</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-muted-foreground mb-2">Your Answer:</h4>
                      <p className="text-sm bg-muted/30 p-3 rounded-md whitespace-pre-wrap">{result.userAnswer}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-muted-foreground mb-2">AI Feedback:</h4>
                      <p className="text-sm">{result.feedback}</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </CardContent>
      </Card>
      <CardFooter className="w-full max-w-3xl justify-start gap-4 mt-6 p-0">
          <Button onClick={handleFinish} variant="outline" className="w-full sm:w-auto">Finish & Go Home</Button>
          <Button onClick={handleDownload} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            Download Report
          </Button>
        </CardFooter>
    </main>
  );
}
