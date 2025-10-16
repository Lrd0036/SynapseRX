SynapseRX AI: Intelligent Training & Consultation System
Executive Summary
SynapseRX AI is the first AI/ML-powered platform designed to solve the global pharmacy technician workforce crisis. It ensures standardized, competency-based training and provides real-time decision support during patient interactions, addressing over $40B in annual medication error costs and 21–30% technician turnover rates. The platform’s dual approach—emphasizing both adaptive learning and live consultation—breaks the “training the trainers” cycle pervasive in healthcare.

Problem Significance
Workforce Instability: Chronic shortages, high attrition (40–60% first-year), and lack of standardized training threaten patient safety and operational stability.

Financial Impact: Up to $35,000 cost per lost technician, $40B annually in medication errors.

Knowledge Decay: Inexperienced technicians training new hires worsens the competency gap, resulting in systemic risk for patients and organizations.

SDG Alignment: Directly supports SDGs 3, 4, 8, 10 for health, education, decent work, and equality.

Solution Description & Core Features
Adaptive Learning & Competency Development
Sequenced Modules: 21 modules covering safety, regulations, calculations, and advanced topics.

Rich Content & Quizzing: Interactive Markdown modules, embedded quizzes, scenario-based learning.

Personalization: AI assesses gaps, builds tailored learning paths and pacing.

Compliance Tracking: Automated CE tracking and certification alerts.

Real-Time Consultation & Decision Support
Live Chat UI: Technicians receive live, context-driven support during patient interactions.

AI Integration: Custom LLM and natural language prompts for decision assistance.

Workflow Integration: Regulatory guidance (OBRA 90, state mandates), red-flag escalation.

Management & Analytics Dashboard
Comprehensive Analytics: Team/individual progress, rank, risk alerts, and coaching tips.

Performance Visualization: Real-time bar/pie charts, benchmarking, and Top Performers leaderboard.

Bulk User Import: CSV-based user/role creation for rapid onboarding.

Technical Architecture & Stack
Category	Technology	Description
Frontend	React, TypeScript	Modern, fast UI; Vite scaffold.
UI/Styling	shadcn/ui, Tailwind	Accessible components, utility CSS.
Backend/DB	Supabase, PostgreSQL	Auth, Realtime sync, robust relational storage.
Serverless/API	Deno, Supabase Edge	“bulk-import-users,” “generate-insights” functions
Data Viz	Recharts	Visualizes analytics and trends.
Security/Compliance: SOC2 Type II, FERPA alignment, end-to-end encrypted, HIPAA-compliant; audit & anomaly tracking.

Scalability: Cloud-native, cross-platform, 99.8% uptime under test, supports thousands of concurrent users.

Implementation Instructions
Clone Repository:
git clone [repo_url] && cd SynapseRX

Install Dependencies:
npm install

Start Dev Server:
npm run dev
Visit http://localhost:8080

Requires Node.js & npm.

Demo & Resources
Project Video: YouTube Demo

Full Documentation available in the repository attachments.

Validation & Impact
Validated with 5 pilot sites, 200 active users

Reduced training time and error rates

31% validated ROI in 18 months

89% adoption intent in target market

21-module curriculum, 210 assessment questions

85% MVP feature completion (2025)

Contributors
Lance R. Dye (lead, correspondence: lancerdye@gmail.com)

Abigale Lackey

Kalea Connolly

AIS Student Chapters Technology Innovation Challenge 2025 Submission

License
This project is for academic demonstration and competition use. For licensing and collaboration inquiries, contact the project lead.

