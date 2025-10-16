# SynapseRX AI: Intelligent Training & Consultation System

## 🌟 Project Pitch

[cite_start]**SynapseRX AI** is the first AI/ML-powered platform specifically designed to combat the global **pharmacy technician workforce crisis** [cite: 2833] [cite_start]by ensuring standardized, competency-based training and providing **real-time decision support** during patient interactions. [cite_start]It transforms the "training the trainers" problem into a scalable solution[cite: 2838].

[cite_start]The crisis, marked by **21-30% annual turnover** [cite: 2849] [cite_start]and **$40+ billion in annual medication error costs**[cite: 2856], requires a systematic solution that technology can provide.

## ✨ Core Features

The platform is structured around three core components:

### 1. Adaptive Learning & Competency Development (SDG 4)

* **Sequenced Modules:** Training modules unlock sequentially based on completion status, guiding the technician through a structured learning path.
* **Rich Content & Quizzing:** Modules feature rich Markdown content (for example, the "Pharmacy Safety Fundamentals" module) with embedded multiple-choice quizzes and open-ended written responses.
* **Real-time Progress:** Tracks individual module progress and overall completion percentage.
* **Compliance Tracking:** Dedicated screens for monitoring formal competency assessment records and certification expiration dates (`certifications` table).

### 2. Real-Time Consultation & Decision Support (SDG 3)

* **Live Chat UI:** A dedicated chat interface for technicians to seek **instant, context-specific guidance** during complex patient scenarios.
* **Realtime Communication:** Utilizes Supabase Realtime Channels to instantly stream messages to the interface.
* **AI Enhancement:** Architected to integrate with a custom LLM API for contextual decision support, currently using placeholder logic for simulation purposes.

### 3. Management & Analytics Dashboard (SDG 8 & 10)

* **Comprehensive Analytics:** Manager dashboards provide an overview of the entire team, including total users, active learners, average completion, and average competency scores.
* **Performance Visualization:** Uses data visualization (Bar Charts and Pie Charts) to compare performance across groups and rank technicians on a **Top Performers Leaderboard**.
* **AI-Powered Insights:** The **Learning Insights** view calls a Supabase Edge Function (`generate-insights`) to run predictive models, generating automated **Risk Alerts** and coaching recommendations for low-performing individuals or skill gaps.
* **Bulk Management:** Includes a **Bulk Import** screen with a Supabase Edge Function (`bulk-import-users`) for rapidly creating and setting up large numbers of new users, roles, and initial metrics from a single CSV file.

## 💻 Technical Stack

This project is built using modern web development and cloud technologies:

| Category | Technology | Purpose in Project |
| :--- | :--- | :--- |
| **Frontend** | **React**, **TypeScript**, **Vite** | Fast, modern application scaffolding and development. |
| **UI/Styling** | **shadcn/ui**, **Tailwind CSS** | Accessible, reusable UI components and utility-first styling. |
| **Backend/DB** | **Supabase** | Provides PostgreSQL database, Authentication, and Realtime capabilities. |
| **Serverless/API** | **Supabase Edge Functions (Deno)** | Hosts the `bulk-import-users` and `generate-insights` functions for privileged/AI operations. |
| **Data Viz** | **Recharts** | Used for displaying performance trends, module pass rates, and group comparisons. |

## 🛠️ Local Development Setup

The only requirement is having Node.js & npm installed.

1.  **Clone the repository:**
    ```sh
    git clone <YOUR_GIT_URL>
    cd <YOUR_PROJECT_NAME>
    ```

2.  **Install dependencies:**
    ```sh
    npm install
    ```
3.

4.  **Start the development server:**
    ```sh
    npm run dev
    ```
    The application will be accessible at `http://localhost:8080`.
