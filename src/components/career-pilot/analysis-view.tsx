
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Job } from './career-pilot-client';

interface AnalysisViewProps {
  jobId: string;
  onJobChange: (id: string) => void;
  selectedJobDescription: string;
  jobList: Job[];
  resumeFile: File | null;
  onResumeFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAnalyze: () => void;
  isLoading: boolean;
  isJobsLoading: boolean;
}

export function AnalysisView({
  jobId,
  onJobChange,
  selectedJobDescription,
  jobList,
  resumeFile,
  onResumeFileChange,
  onAnalyze,
  isLoading,
  isJobsLoading
}: AnalysisViewProps) {
  return (
    <Card className="w-full max-w-2xl mx-auto border-primary/20 shadow-primary/5 shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Resume Analysis</CardTitle>
        <CardDescription>Select a job description and upload your resume to get a skill match analysis.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="job-description" className="font-medium">Job Description</Label>
          <Select onValueChange={onJobChange} value={jobId}>
            <SelectTrigger id="job-description" className="w-full bg-background/50 border-border focus:border-primary focus:ring-primary">
              <SelectValue placeholder={isJobsLoading ? "Loading jobs..." : "Select a job description"} />
            </SelectTrigger>
            <SelectContent>
              {jobList.map((job) => (
                <SelectItem key={job._id} value={job._id}>{job.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedJobDescription && (
            <div className="p-4 mt-2 text-sm text-muted-foreground bg-muted/30 rounded-md border border-border/50 whitespace-pre-line max-h-48 overflow-y-auto">
                {selectedJobDescription}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="resume-upload" className="font-medium">Your Resume</Label>
          <div className="flex items-center space-x-4">
            <Label htmlFor="resume-upload" className="flex-1">
              <div className="flex items-center justify-center w-full h-12 px-4 py-2 text-sm rounded-md border border-dashed border-primary/50 cursor-pointer hover:bg-accent/10 hover:border-primary/80 transition-colors">
                <Upload className="mr-2 h-4 w-4" />
                <span>{resumeFile ? 'Change Resume' : 'Upload Resume (.pdf)'}</span>
              </div>
            </Label>
            <Input id="resume-upload" type="file" className="hidden" onChange={onResumeFileChange} accept=".pdf" />
            {resumeFile && <p className="text-sm text-muted-foreground truncate max-w-xs">{resumeFile.name}</p>}
          </div>
          <p className="text-xs text-muted-foreground">Please use a PDF file for analysis.</p>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={onAnalyze}
          disabled={!jobId || !resumeFile || isLoading || isJobsLoading}
          className="w-full font-bold"
          size="lg"
        >
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Analyze
        </Button>
      </CardFooter>
    </Card>
  );
}
