# CareerPilot AI: Resume Analyzer & Career Tool

CareerPilot AI is an intelligent web application designed to help job seekers analyze their resumes, practice for interviews, and improve their candidacy for a role. By leveraging generative AI, it provides a detailed resume analysis, a realistic mock interview simulation, and a full-featured admin dashboard for managing the platform.

## Core Features

-   **User Authentication**: A complete registration and login system for users.
-   **Secure Admin Panel**: A separate, secure login for administrators using credentials stored in environment variables.
-   **Advanced AI Resume Analysis**:
    -   **Dynamic Job Management**: Admins can add, edit, and delete job descriptions from a dedicated dashboard. These jobs are stored in a MongoDB database and are immediately available to users.
    -   **Deep Analysis**: The AI performs a contextual analysis of a user's resume against a job description, identifying:
        -   `matchScore`: A percentage score prioritizing core skills.
        -   `matchingSkills`, `missingSkills`, and `impliedSkills`: A detailed breakdown of skill alignment.
        -   `status`: A qualitative assessment ("Approved", "Needs Improvement", "Not a Match").
-   **AI-Powered Mock Interview Simulation**:
    -   **Eligibility-Based**: Unlocked for users who achieve a resume match score of 70% or higher.
    -   **Dynamic Question Generation**: The AI generates 5 interview questions that progressively increase in difficulty based on the specific job description.
    -   **Flexible Input**: Users can answer by either typing their response (with pasting disabled to prevent cheating) or using their voice with built-in speech-to-text.
    -   **In-Depth Performance Evaluation**: Each answer is scored on a scale of 1-10 and receives constructive, actionable AI feedback. An overall interview score is provided at the end.
-   **Visual Results & Reports**:
    -   Both resume analysis and interview results are displayed in a clear, easy-to-understand format.
    -   Users can download a PDF report of their results for offline review.
-   **Personalized Analysis History**: Securely saves a summary of each resume analysis to the database, which is private and accessible only to the logged-in user.

## Admin Dashboard Features
- **User Management**: View a complete list of all registered users in the system.
- **Job Description CRUD**: Full Create, Read, Update, and Delete functionality for job descriptions that are presented to users.

## Technology Stack

-   **Frontend**: [Next.js](https://nextjs.org/) with React & TypeScript
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/) with [ShadCN UI](https://ui.shadcn.com/) components
-   **AI & Backend**: [Genkit](https://firebase.google.com/docs/genkit) (with Google's Gemini models) for AI-powered analysis and interview simulation
-   **PDF Parsing**: [pdfjs-dist](https://mozilla.github.io/pdf.js/) for client-side text extraction from resumes
-   **Database**: [MongoDB](https://www.mongodb.com/) for storing users, job descriptions, and analysis results
-   **Authentication**: Custom implementation using `bcryptjs` for password hashing.

## Getting Started

Follow these instructions to set up and run the project locally.

### Prerequisites

-   [Node.js](https://nodejs.org/en) (version 18 or higher)
-   npm or yarn
-   A MongoDB database (either a local installation or a free cloud instance from [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of your project and add your Gemini API key, MongoDB connection string, and admin credentials.

    ```env
    # Obtain a Gemini API key from Google AI Studio: https://aistudio.google.com/app/apikey
    GEMINI_API_KEY=your_gemini_api_key_here

    # Add your MongoDB connection string below.
    # Choose ONE of the options (Atlas or Local).
    MONGODB_URI=your_mongodb_connection_string_here

    # Add your predefined admin credentials below.
    ADMIN_EMAIL=admin@example.com
    ADMIN_PASSWORD=your_secure_admin_password
    ```
    
    #### Option A: MongoDB Atlas (Cloud)
    This is the recommended option for easy setup.
    1. Get your connection string from the MongoDB Atlas dashboard.
    2. It should look like: `mongodb+srv://<username>:<password>@clustername.mongodb.net/your_db_name?retryWrites=true&w=majority`
    3. Replace `<username>`, `<password>`, and `your_db_name` with your credentials.

    #### Option B: Local MongoDB Instance
    Use this option if you have MongoDB installed and running on your machine.
    1. The standard local connection string is `mongodb://localhost:27017/your_db_name`.
    2. Replace `your_db_name` with the name you want for your database (e.g., `career-pilot`).

### Running the Application

Once the dependencies are installed and the environment variables are set, you can run the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:9002`.
