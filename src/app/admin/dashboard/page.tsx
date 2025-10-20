
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import clientPromise from "@/lib/mongodb";
import ManageJobs from "@/components/admin/manage-jobs";
import ManageUsers from "@/components/admin/manage-users";

async function getUsers() {
    try {
        const client = await clientPromise;
        const db = client.db();
        const users = await db
            .collection("users")
            .find(
                {},
                // Exclude password from the result set
                { projection: { password: 0 } }
            )
            .sort({ createdAt: -1 })
            .toArray();

        // MongoDB returns an _id object. We need to convert it to a string for React.
        return JSON.parse(JSON.stringify(users));
    } catch (error) {
        console.error("Failed to fetch users:", error);
        return [];
    }
}

async function getJobs() {
    try {
        const client = await clientPromise;
        const db = client.db();
        const jobs = await db
            .collection("job_descriptions")
            .find({})
            .sort({ title: 1 })
            .toArray();
        return JSON.parse(JSON.stringify(jobs));
    } catch (error) {
        console.error("Failed to fetch jobs:", error);
        return [];
    }
}


export default async function AdminDashboardPage() {
    // We fetch initial data on the server to avoid a loading flash on the client.
    const initialUsers = await getUsers();
    const initialJobs = await getJobs();

    return (
        <main className="min-h-screen container mx-auto p-4 pt-24 sm:pt-28 md:pt-32">
            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl">Admin Dashboard</CardTitle>
                        <CardDescription>
                            Welcome, Admin. Here is a summary of user activity and job descriptions.
                        </CardDescription>
                    </CardHeader>
                    {/* User Management Section */}
                    <ManageUsers initialUsers={initialUsers} />
                </Card>

                {/* Job Description Management Section */}
                <ManageJobs initialJobs={initialJobs} />
            </div>
        </main>
    );
}
