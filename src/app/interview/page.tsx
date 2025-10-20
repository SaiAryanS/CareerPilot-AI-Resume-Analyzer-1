
"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  generateInterviewQuestions,
  evaluateInterviewAnswer,
  type EvaluateAnswerOutput,
} from '@/ai/flows/interview-flow';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Loader2, Mic, StopCircle, Timer } from 'lucide-react';

type InterviewResult = EvaluateAnswerOutput & { question: string; userAnswer: string; };

const INTERVIEW_TIME_LIMIT = 180; // 3 minutes in seconds

export default function InterviewPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [results, setResults] = useState<InterviewResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [timeLeft, setTimeLeft] = useState(INTERVIEW_TIME_LIMIT);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const answerRef = useRef(userAnswer);

  useEffect(() => {
    answerRef.current = userAnswer;
  }, [userAnswer]);

  const preventPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    toast({
      variant: 'destructive',
      title: 'Pasting Disabled',
      description: 'Please type your answer to ensure a fair evaluation.',
    });
  };

  const handleSpeech = () => {
    if (isRecording) {
      recognition?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ variant: 'destructive', title: 'Speech recognition not supported in this browser.' });
      return;
    }

    const newRecognition = new SpeechRecognition();
    newRecognition.continuous = true;
    newRecognition.interimResults = true;
    setRecognition(newRecognition);

    newRecognition.onstart = () => setIsRecording(true);
    newRecognition.onend = () => setIsRecording(false);
    newRecognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      toast({ variant: 'destructive', title: 'Speech recognition error', description: event.error });
      setIsRecording(false);
    };

    newRecognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setUserAnswer((prev) => prev + finalTranscript + ' ');
      }
    };
    newRecognition.start();
  };

  const handleSubmit = useCallback(async () => {
    // Clear the timer when submitting
    if (timerRef.current) clearInterval(timerRef.current);

    const answerToSubmit = answerRef.current;
    if (!answerToSubmit.trim()) {
      toast({ variant: 'destructive', title: 'Please provide an answer.' });
      return;
    }

    setIsEvaluating(true);
    try {
      const jobDescription = sessionStorage.getItem('interviewJobDescription');
      if (!jobDescription) throw new Error('Job description not found.');

      const result = await evaluateInterviewAnswer({
        jobDescription,
        question: questions[currentQuestionIndex],
        userAnswer: answerToSubmit,
      });

      const newResults = [...results, { ...result, question: questions[currentQuestionIndex], userAnswer: answerToSubmit }];
      setResults(newResults);

      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setUserAnswer('');
        setTimeLeft(INTERVIEW_TIME_LIMIT);
      } else {
        sessionStorage.setItem('interviewResults', JSON.stringify(newResults));
        router.push('/interview/results');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Evaluation Failed', description: error.message });
    } finally {
      setIsEvaluating(false);
    }
  }, [questions, currentQuestionIndex, results, router, toast]);

  // Timer countdown effect
  useEffect(() => {
    if (isLoading || isEvaluating || questions.length === 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timerRef.current!);
          toast({ title: "Time's Up!", description: "Submitting your answer automatically." });
          handleSubmit();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLoading, isEvaluating, questions, currentQuestionIndex, handleSubmit, toast]);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const jobDescription = sessionStorage.getItem('interviewJobDescription');
        if (!jobDescription) {
          toast({ variant: 'destructive', title: 'Error', description: 'No job description found. Redirecting...' });
          router.push('/');
          return;
        }
        const response = await generateInterviewQuestions(jobDescription);
        setQuestions(response.questions);
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to generate questions', description: error.message });
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuestions();
  }, [router, toast]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl text-center">
          <CardContent className="p-10 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="font-headline text-xl text-primary">Preparing Your Interview...</p>
            <p className="text-muted-foreground">The AI is generating questions based on the job description.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 pt-20">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex justify-between items-center mb-4">
            <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="w-full mr-4" />
            <div className="flex items-center gap-2 text-muted-foreground font-mono text-sm">
                <Timer className="h-4 w-4" />
                <span>{formatTime(timeLeft)}</span>
            </div>
          </div>
          <CardTitle className="font-headline text-xl">Question {currentQuestionIndex + 1} of {questions.length}</CardTitle>
          <CardDescription className="text-lg pt-2">{questions[currentQuestionIndex]}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onPaste={preventPaste}
              placeholder="Type or speak your answer here..."
              rows={8}
              className="pr-20"
              disabled={isEvaluating}
            />
            <Button
              size="icon"
              variant={isRecording ? 'destructive' : 'outline'}
              className="absolute top-3 right-3"
              onClick={handleSpeech}
              disabled={isEvaluating}
            >
              {isRecording ? <StopCircle /> : <Mic />}
            </Button>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSubmit} disabled={isEvaluating || !userAnswer.trim()} className="w-full font-bold">
            {isEvaluating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {currentQuestionIndex < questions.length - 1 ? 'Submit & Next Question' : 'Finish Interview'}
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
