import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import React, { useEffect, useState, FC, ReactNode } from "react";

// --- MOCKS TO FIX COMPILATION ERRORS ---
// The following are placeholders for your project's components, hooks, and Supabase client.
// The previous errors occurred because the build environment couldn't find the original files.
// This self-contained approach allows the component to compile and run.

// Mock Supabase Client
const supabase = {
  auth: {
    getUser: async () => ({
      data: { user: { id: "user-123-abc" } },
      error: null,
    }),
  },
  from: (tableName: string) => ({
    select: (columns: string) => ({
      eq: (column: string, value: any) => ({
        single: async () => {
          if (tableName === "training_modules") {
            return {
              data: {
                id: value,
                title: "Pharmacy Safety Fundamentals",
                description: "An introduction to core safety principles and procedures.",
                content:
                  "## Key Concept 1\n\nThis is the detailed content for the first key concept of Pharmacy Safety Fundamentals. It is rendered from Markdown.\n\n* Follow all safety protocols.\n* Double-check prescriptions.\n* Ensure proper sanitation.",
              },
              error: null,
            };
          }
          return { data: null, error: new Error("Not found") };
        },
        maybeSingle: async () => {
          if (tableName === "user_progress") {
            return {
              data: { completed: false, progress_percentage: 20 },
              error: null,
            };
          }
          return { data: null, error: null };
        },
        // A simple promise-like return for handling the questions query
        then: (callback: (result: { data: any[] | null; error: Error | null }) => void) => {
          if (tableName === "questions") {
            callback({
              data: [
                {
                  id: "q1",
                  text: "What is key concept 1 of Pharmacy Safety Fundamentals?",
                  options: ["Option A", "Option B", "Option C", "Option D"],
                  correct_answer: "Option A",
                },
                {
                  id: "q2",
                  text: "What is the second most important procedure?",
                  options: ["Procedure A", "Procedure B", "Procedure C", "Procedure D"],
                  correct_answer: "Procedure B",
                },
              ],
              error: null,
            });
          } else {
            callback({ data: [], error: null });
          }
        },
      }),
    }),
    upsert: async (data: any) => {
      console.log("Supabase Mock: Upserting data", data);
      return { error: null };
    },
  }),
};

// Mock UI Components
interface CardProps {
  children: ReactNode;
  className?: string;
}
const Card: FC<CardProps> = ({ children, className = "" }) => (
  <div className={`border rounded-lg shadow-sm bg-white dark:bg-gray-900 dark:border-gray-700 ${className}`}>
    {children}
  </div>
);
const CardHeader: FC<CardProps> = ({ children, className = "" }) => (
  <div className={`p-6 ${className}`}>{children}</div>
);
const CardTitle: FC<CardProps> = ({ children, className = "" }) => (
  <h2 className={`text-2xl font-bold tracking-tight ${className}`}>{children}</h2>
);
const CardDescription: FC<CardProps> = ({ children, className = "" }) => (
  <p className={`text-sm text-gray-500 dark:text-gray-400 mt-1 ${className}`}>{children}</p>
);
const CardContent: FC<CardProps> = ({ children, className = "" }) => (
  <div className={`p-6 pt-0 ${className}`}>{children}</div>
);

interface ButtonProps {
  children: ReactNode;
  variant?: string;
  size?: string;
  onClick: () => void;
  className?: string;
}
const Button: FC<ButtonProps> = ({ children, onClick, className = "" }) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-blue-600 text-white hover:bg-blue-700 h-10 py-2 px-4 ${className}`}
  >
    {children}
  </button>
);

interface ProgressProps {
  value: number;
  className?: string;
}
const Progress: FC<ProgressProps> = ({ value, className = "" }) => (
  <div className={`relative h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 ${className}`}>
    <div
      className="h-full w-full flex-1 bg-blue-600 transition-all"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    ></div>
  </div>
);

interface BadgeProps {
  children: ReactNode;
  variant?: string;
  className?: string;
}
const Badge: FC<BadgeProps> = ({ children, className = "" }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${className}`}>
    {children}
  </span>
);

// Mock useToast Hook
const useToast = () => ({
  toast: ({ title, description, variant = "default" }: { title: string; description: string; variant?: string }) => {
    console.log(`Toast [${variant}]: ${title} - ${description}`);
    // Using a simple alert as a placeholder for a visual toast message
    window.alert(`Toast [${variant}]: ${title} - ${description}`);
  },
});

// Mock ModuleQuiz Component
const ModuleQuiz: FC<{ questions: Question[]; moduleId: string; onComplete: () => void }> = ({
  questions,
  moduleId,
  onComplete,
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedOption(null);
    } else {
      onComplete();
    }
  };

  const question = questions[currentQuestionIndex];

  return (
    <div className="mt-6 border-t pt-6">
      <h3 className="text-xl font-semibold text-center mb-2">Assessment Quiz</h3>
      <p className="text-center text-sm text-gray-500 mb-6">
        Question {currentQuestionIndex + 1} of {questions.length}
      </p>
      <div className="space-y-4">
        <p className="font-semibold">{question.text}</p>
        {question.options.map((option: string) => (
          <div
            key={option}
            onClick={() => setSelectedOption(option)}
            className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedOption === option ? "bg-blue-100 border-blue-500 dark:bg-blue-900/50 dark:border-blue-700" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}
          >
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name={`q-${question.id}`}
                value={option}
                checked={selectedOption === option}
                readOnly
                className="form-radio h-4 w-4 text-blue-600"
              />
              <span>{option}</span>
            </label>
          </div>
        ))}
      </div>
      <Button onClick={handleNext} className="mt-6 w-full">
        {currentQuestionIndex < questions.length - 1 ? "Next Question" : "Submit & Complete"}
      </Button>
    </div>
  );
};
// --- END OF MOCKS ---

interface Module {
  id: string;
  title: string;
  description: string;
  content: string | { textContent: string };
}

interface UserProgress {
  completed: boolean;
  progress_percentage: number;
}

interface Question {
  id: string;
  module_id: string;
  text: string;
  options: string[];
  [key: string]: any;
}

const ModuleDetail: FC = () => {
  const { id: moduleId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [module, setModule] = useState<Module | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [markdownContent, setMarkdownContent] = useState<string>("");

  useEffect(() => {
    if (!module?.content) return;
    try {
      let content = module.content;
      if (typeof content === "object" && content.textContent) {
        setMarkdownContent(content.textContent);
      } else if (typeof content === "string") {
        if (content.trim().startsWith("{")) {
          const parsed = JSON.parse(content);
          setMarkdownContent(parsed.textContent || content);
        } else {
          setMarkdownContent(content);
        }
      } else {
        setMarkdownContent("");
      }
    } catch (error) {
      setMarkdownContent(typeof module.content === "string" ? module.content : "");
      console.error("Failed to parse module content.", error);
    }
  }, [module]);

  useEffect(() => {
    if (!moduleId) return;
    const fetchData = async () => {
      setLoading(true);
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        toast({ title: "Unauthorized", description: "Please sign in.", variant: "destructive" });
        return setLoading(false);
      }
      const userId = userData.user.id;

      const { data: moduleData } = await supabase.from("training_modules").select("*").eq("id", moduleId).single();
      const { data: progressData } = await supabase
        .from("user_progress")
        .select("completed, progress_percentage")
        .eq("module_id", moduleId)
        .eq("user_id", userId)
        .maybeSingle();
      const { data: questionsData } = await supabase.from("questions").select("*").eq("module_id", moduleId);

      setModule(moduleData);
      setProgress(progressData);
      setQuestions(questionsData ?? []);
      setLoading(false);
    };
    fetchData();
  }, [moduleId, toast]);

  const handleMarkComplete = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return toast({ title: "Error", description: "User not authenticated.", variant: "destructive" });

    if (!moduleId) return toast({ title: "Error", description: "Module ID is missing.", variant: "destructive" });

    await supabase.from("user_progress").upsert({
      user_id: user.id,
      module_id: moduleId,
      completed: true,
      progress_percentage: 100,
      completed_at: new Date().toISOString(),
      last_accessed_at: new Date().toISOString(),
    });

    toast({ title: "Success", description: "Module marked complete!" });
    navigate("/modules");
  };

  if (loading) return <div className="p-6 text-center">Loading module...</div>;
  if (!module) return <div className="p-6 text-center">Module not found.</div>;

  const hasQuiz = questions.length > 0;
  const isCompleted = progress?.completed;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 text-gray-900 dark:text-gray-100">
      <Button
        variant="ghost"
        onClick={() => navigate("/modules")}
        className="bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Modules
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>{module.title}</CardTitle>
          <CardDescription>{module.description}</CardDescription>
          {progress && (
            <div className="flex items-center gap-3 mt-4">
              {isCompleted ? (
                <Badge className="flex items-center gap-1 border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Completed
                </Badge>
              ) : (
                <>
                  <Progress value={progress.progress_percentage} className="w-1/3" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {progress.progress_percentage}% Complete
                  </span>
                </>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {markdownContent && (
            <div className="prose dark:prose-invert max-w-none">
              <ReactMarkdown>{markdownContent}</ReactMarkdown>
            </div>
          )}

          {!isCompleted && hasQuiz && (
            <ModuleQuiz questions={questions} moduleId={module.id} onComplete={handleMarkComplete} />
          )}

          {!isCompleted && !hasQuiz && (
            <div className="text-center space-y-4 mt-6">
              <p>This module does not have a quiz.</p>
              <Button size="lg" onClick={handleMarkComplete}>
                Mark as Complete
              </Button>
            </div>
          )}

          {isCompleted && (
            <div className="text-center text-green-700 p-4 border border-green-300 bg-green-50 rounded mt-6 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400">
              You have completed this training module.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ModuleDetail;
