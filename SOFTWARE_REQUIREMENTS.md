
# Software Requirements Document: AI-Powered Resume Analysis

## 1. Introduction

### 1.1 Project Overview
This project is an AI-powered web application designed to help users analyze their resumes against specific job descriptions. It provides a detailed analysis, including a match score, a list of matching and missing skills, and an overall status, to help candidates understand their fit for a potential role and identify areas for improvement.

### 1.2 Purpose
The primary purpose of this tool is to provide an automated, intelligent, and objective analysis of a user's resume in the context of a job description. It aims to move beyond simple keyword matching to provide a deeper, semantic analysis of a candidate's skills and experience.

## 2. User Roles

### 2.1 Applicant / User
The primary user of this application is an individual (e.g., job seeker, student, professional) who wants to assess their resume against a job opening. They interact with the system by providing a job description and their resume.

## 3. Functional Requirements

### 3.1 FR-1: Job Description Selection
- **3.1.1:** The system must present the user with a dropdown menu of predefined job descriptions.
- **3.1.2:** The available job roles shall include: Data Analyst, Cyber Security Analyst, Web Developer, Backend Developer, Machine Learning Engineer, and AI Engineer.
- **3.1.3:** Upon selection, the full text of the chosen job description shall be displayed to the user for review.

### 3.2 FR-2: Resume Upload
- **3.2.1:** The system must provide an interface for the user to upload their resume.
- **3.2.2:** The accepted file format for resumes is PDF (.pdf).
- **3.2.3:** After a file is selected, the system shall display the name of the uploaded file as confirmation.

### 3.3 FR-3: AI-Powered Analysis
- **3.3.1:** An "Analyze" button shall be available to trigger the analysis process.
- **3.3.2:** The "Analyze" button must be disabled until both a job description has been selected and a resume file has been uploaded.
- **3.3.3:** On activation, the system will extract the text content from the uploaded PDF resume.
- **3.3.4:** The extracted resume text and the selected job description text will be sent to a backend AI service (Genkit Flow).
- **3.3.5:** The AI service will perform a deep, contextual analysis focusing on semantic meaning, experience, and accomplishments, not just keyword matching.
- **3.3.6:** The AI analysis will produce the following output:
    - `matchScore`: A percentage score (0-100) representing the resume's relevance to the job description.
    - `matchingSkills`: A list of skills present in both the resume and the job description.
    - `missingSkills`: A list of skills required by the job description but absent from the resume.
    - `status`: A qualitative assessment based on the score ("Approved", "Needs Improvement", or "Not a Match").

### 3.4 FR-4: Results Display
- **3.4.1:** After the analysis is complete, the results shall be displayed to the user on a new screen.
- **3.4.2:** The `matchScore` will be displayed prominently.
- **3.4.3:** The color of the score and the status message will change based on the score:
    - **Green:** for scores >= 75% (Status: Approved)
    - **Yellow:** for scores between 50% and 74% (Status: Needs Improvement)
    - **Red:** for scores < 50% (Status: Not a Match)
- **3.4.4:** The lists of `matchingSkills` and `missingSkills` will be clearly displayed in separate sections.
- **3.4.5:** The user shall have an option to perform another analysis, which will reset the application to its initial state.

## 4. Non-Functional Requirements

### 4.1 NFR-1: Performance
- **4.1.1:** The web interface should load in under 3 seconds.
- **4.1.2:** The AI analysis process should provide feedback to the user (e.g., loading spinner) and should ideally complete within 10-15 seconds.

### 4.2 NFR-2: Usability
- **4.2.1:** The user interface must be intuitive, clean, and responsive, working seamlessly on both desktop and mobile devices.
- **4.2.2:** The application will have a dark theme with a lime green accent color for primary elements.
- **4.2.3:** The user journey shall be simple: Select, Upload, Analyze, View Results.

### 4.3 NFR-3: Technology Stack
- **4.3.1:** **Frontend:** Next.js, React, TypeScript
- **4.3.2:** **Styling:** Tailwind CSS, ShadCN UI components
- **4.3.3:** **AI Backend:** Genkit with Google's Gemini models
- **4.3.4:** **PDF Parsing:** `pdfjs-dist` library

## 5. System Architecture
The application follows a client-server model.
- The **client** is a Next.js single-page application responsible for the user interface, file handling, and making API calls.
- The **server-side** functionality is handled by Next.js server components and Genkit flows, which interface with the Generative AI model.
