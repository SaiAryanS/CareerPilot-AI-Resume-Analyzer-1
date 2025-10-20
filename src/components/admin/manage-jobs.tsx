
"use client";

import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import JobForm from "./job-form";
import { Briefcase, PlusCircle, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Job = {
    _id: string;
    title: string;
    description: string;
};

interface ManageJobsProps {
    initialJobs: Job[];
}

export default function ManageJobs({ initialJobs }: ManageJobsProps) {
    const [jobs, setJobs] = useState<Job[]>(initialJobs);
    const [isLoading, setIsLoading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const { toast } = useToast();

    const fetchJobs = async () => {
        const response = await fetch('/api/jobs');
        const data = await response.json();
        setJobs(data);
    };

    const handleFormSubmit = async (values: { title: string; description: string }) => {
        setIsLoading(true);
        const url = selectedJob ? `/api/jobs/${selectedJob._id}` : '/api/jobs';
        const method = selectedJob ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to save job');
            }

            toast({
                title: `Job ${selectedJob ? 'Updated' : 'Created'}`,
                description: `The job description has been successfully ${selectedJob ? 'updated' : 'created'}.`,
            });

            await fetchJobs();
            setIsDialogOpen(false);
            setSelectedJob(null);

        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Operation Failed",
                description: error.message,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (jobId: string) => {
        try {
            const response = await fetch(`/api/jobs/${jobId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to delete job');
            }

            toast({
                title: "Job Deleted",
                description: "The job description has been successfully deleted.",
            });
            await fetchJobs();

        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Deletion Failed",
                description: error.message,
            });
        }
    };

    const openDialog = (job: Job | null = null) => {
        setSelectedJob(job);
        setIsDialogOpen(true);
    };


    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-lg font-semibold flex items-center">
                        <Briefcase className="mr-2 h-5 w-5" />
                        Manage Job Descriptions
                    </CardTitle>
                    <CardDescription>
                        Add, edit, or remove job descriptions available for analysis.
                    </CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => openDialog(null)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Job
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{selectedJob ? 'Edit Job Description' : 'Add New Job Description'}</DialogTitle>
                        </DialogHeader>
                        <JobForm
                            initialData={selectedJob}
                            onSubmit={handleFormSubmit}
                            isLoading={isLoading}
                        />
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {jobs.length > 0 ? (
                                jobs.map((job) => (
                                    <TableRow key={job._id}>
                                        <TableCell className="font-medium">{job.title}</TableCell>
                                        <TableCell className="max-w-md truncate">{job.description}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => openDialog(job)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This action cannot be undone. This will permanently delete the job description.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(job._id)}>
                                                            Delete
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                                        No job descriptions found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
