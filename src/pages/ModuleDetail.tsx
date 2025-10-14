import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import React, { useEffect, useState, FC, PropsWithChildren } from "react";

// --- MOCKED DEPENDENCIES START ---
// These are placeholders to ensure the component compiles and runs.
// In your local environment, you would use your actual imports.

const mockSupabase = {
  auth: {
    async getUser() {
      // Simulate a logged-in user
      return { data: { user: { id: "mock-user-123" } }, error: null };
    },
  },
  from: (tableName: string) => ({
    select: (query: string) => ({
      eq: (column: string, value: any) => {
        // This object simulates the Supabase query builder.
        // It's "thenable" so it can be awaited directly by Promise.all for the questions query.
        // It also has the .single() and .maybeSingle() methods for the other queries.
        const queryBuilder = {
          single: async () => {
            await new Promise((res) => setTimeout(res, 500)); // Simulate network delay
            if (tableName === "training_modules" && value) {
              return {
                data: {
                  id: value,
                  title: "Pharmacy Safety Fundamentals",
                  description: "An introduction to core safety principles and procedures.",
                  content:
                    '{"textContent": "This module covers the essential safety protocols that must be followed in a pharmacy setting. Key topics include: \\n\\n- Handling medications safely \\n- Dispensing procedures \\n- Patient confidentiality \\n- Emergency protocols"}',
                  order_index: 1,
                  created_at: new Date().toISOString(),
                },
                error: null,
              };
            }
            return { data: null, error: new Error("Not found") };
          },
          maybeSingle: async () => {
            await new Promise((res) => setTimeout(res, 500));
            if (tableName === "user_progress") {
              return {
                data: { completed: false, progress_percentage: 25 },
                error: null,
              };
            }
            return { data: null, error: null };
          },
          // This makes the object await-able for the general case (fetching multiple rows)
          then: async (resolve: (value: { data: any[] | null; error: Error | null }) => void) => {
            await new Promise((res) => setTimeout(res, 500));
            if (tableName === "questions") {
              resolve({
                data: [
                  {
                    id: "q1",
                    module_id: value,
                    question_text: "What is the key concept of Pharmacy Safety Fundamentals?",
                    question_type: "multiple_choice",
                    options: ["Option A", "Option B", "Option C", "Option D"],
                    correct_answer: "Option A",
                    created_at: new Date().toISOString(),
                  },
                  {
                    id: "q2",
                    module_id: value,
                    question_text: "What is the second concept?",
                    question_type: "multiple_choice",
                    options: ["1", "2", "3", "4"],
                    correct_answer: "2",
                    created_at: new Date().toISOString(),
                  },
                ],
                error: null,
              });
            } else {
              resolve({ data: [], error: null });
            }
          },
        };
        return queryBuilder;
      },
    }),
    upsert: async (data: any, options: any) => {
      await new Promise((res) => setTimeout(res, 500));
      console.log("Upsert successful", data);
      return { error: null };
    },
  }),
};

// Use the mock client
const supabase = mockSupabase;

// Mock Database types (in a real scenario, these would be generated from your schema)
namespace Database {
  export namespace public {
    export namespace Tables {
      export type training_modules = {
        Row: {
          id: string;
          created_at: string;
          title: string | null;
          description: string | null;
          content: any;
          order_index: number | null;
        };
      };
      export type user_progress = {
        Row: {
          completed: boolean | null;
          progress_percentage: number | null;
        };
      };
      export type questions = {
        Row: {
          id: string;
          module_id: string;
          question_text: string | null;
          question_type: string | null;
          options: any; // jsonb in DB
          correct_answer: string | null;
          created_at: string;
        };
      };
    }
  }
}

const useToast = () => ({
  toast: (options: { title: string; description: string; variant?: string }) => {
    console.log(`Toast: ${options.title} - ${options.description}`);
    // A real app would have a visual toast component.
  },
});

// Mock UI Components
const Card: FC<PropsWithChildren & { className?: string }> = ({ children, className }) => (
  <div className={`border rounded-lg shadow-sm bg-white dark:bg-gray-900 ${className}`}>{children}</div>
);
const CardHeader: FC<PropsWithChildren & { className?: string }> = ({ children }) => (
  <div className="p-6">{children}</div>
);
const CardTitle: FC<PropsWithChildren & { className?: string }> = ({ children }) => (
  <h2 className="text-2xl font-bold tracking-tight">{children}</h2>
);
const CardDescription: FC<PropsWithChildren & { className?: string }> = ({ children }) => (
  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{children}</p>
);
const CardContent: FC<PropsWithChildren & { className?: string }> = ({ children }) => (
  <div className="p-6 pt-0">{children}</div>
);
const Button: FC<PropsWithChildren & { variant?: string; size?: string; onClick?: () => void; className?: string }> = ({
  children,
  onClick,
  className,
  ...props
}) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-blue-600 text-white hover:bg-blue-700 h-10 py-2 px-4 ${className}`}
    {...props}
  >
    {children}
  </button>
);
const Progress: FC<{ value?: number; className?: string }> = ({ value = 0, className }) => (
  <div className={`relative h-4 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 ${className}`}>
    <div
      className="h-full w-full flex-1 bg-blue-600 transition-all"
      style={{ transform: `translateX(-${100 - value}%)` }}
    ></div>
  </div>
);
const Badge: FC<PropsWithChildren & { variant?: string; className?: string }> = ({ children, className }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${className}`}>
    {children}
  </span>
);

// Mock ModuleQuiz Component
const ModuleQuiz: FC<{ questions: any[]; moduleId: string; onComplete: () => void }> = ({ questions, onComplete }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      onComplete();
    }
  };

  if (!questions || questions.length === 0) return <p>No quiz questions available.</p>;
  const question = questions[currentQuestionIndex];

  return (
    <div className="mt-6 border-t pt-6">
      <h3 className="text-lg font-semibold tracking-tight">Assessment Quiz</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Question {currentQuestionIndex + 1} of {questions.length}
      </p>
      <p className="font-medium mb-4">{question.question_text}</p>
      <div className="space-y-3">
        {question.options &&
          Array.isArray(question.options) &&
          question.options.map((option: string, index: number) => (
            <div
              key={index}
              className="flex items-center p-3 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <input
                type="radio"
                name={`q-${question.id}`}
                id={`${question.id}-${index}`}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <label
                htmlFor={`${question.id}-${index}`}
                className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {option}
              </label>
            </div>
          ))}
      </div>
      <Button onClick={handleNext} className="mt-6">
        {currentQuestionIndex < questions.length - 1 ? "Next Question" : "Submit & Complete"}
      </Button>
    </div>
  );
};

// --- MOCKED DEPENDENCIES END ---

type Module = Database["public"]["Tables"]["training_modules"]["Row"];
type UserProgress = Pick<Database["public"]["Tables"]["user_progress"]["Row"], "completed" | "progress_percentage">;
type Question = Omit<Database["public"]["Tables"]["questions"]["Row"], "options"> & {
  options: string[]; // ModuleQuiz expects options to be an array of strings.
};

const ModuleDetail: FC = () => {
  // In a real app, you'd get this from the URL. Hardcoding for this preview.
  const moduleId = "d2a0a2e4-8b6a-4b2c-9a3a-3e4e6f2c7a2d";
  const navigate = useNavigate();
  const { toast } = useToast();

  const [module, setModule] = useState<Module | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [markdownContent, setMarkdownContent] = useState<string>("");

  useEffect(() => {
    if (!module?.content) {
      setMarkdownContent("");
      return;
    }
    try {
      let content = module.content;
      if (typeof content === "string" && content.trim().startsWith("{")) {
        const parsed = JSON.parse(content);
        if (parsed && parsed.textContent) {
          setMarkdownContent(parsed.textContent);
          return;
        }
      }
      if (typeof content === "string") {
        setMarkdownContent(content);
      } else if (typeof content === "object" && content !== null && "textContent" in content) {
        setMarkdownContent((content as { textContent: string }).textContent);
      } else {
        setMarkdownContent("");
      }
    } catch (error) {
      setMarkdownContent(typeof module.content === "string" ? module.content : "");
      console.error("Failed to parse module content, treating as plain text.", error);
    }
  }, [module]);

  useEffect(() => {
    if (!moduleId) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
          toast({ title: "Unauthorized", description: "Please sign in.", variant: "destructive" });
          return;
        }

        const userId = user.id;

        const [moduleResult, progressResult, questionsResult] = await Promise.all([
          supabase.from("training_modules").select("*").eq("id", moduleId).single(),
          supabase
            .from("user_progress")
            .select("completed, progress_percentage")
            .eq("module_id", moduleId)
            .eq("user_id", userId)
            .maybeSingle(),
          supabase.from("questions").select("*").eq("module_id", moduleId),
        ]);

        if (moduleResult.error) throw moduleResult.error;
        if (progressResult.error) throw progressResult.error;
        if (questionsResult.error) throw questionsResult.error;

        setModule(moduleResult.data);
        setProgress(progressResult.data);

        const formattedQuestions = (questionsResult.data || []).map((q) => ({
          ...q,
          options: Array.isArray(q.options) ? q.options : [],
        }));

        setQuestions(formattedQuestions as Question[]);
      } catch (error) {
        console.error("Error fetching module data:", error);
        toast({ title: "Error loading module", description: (error as Error).message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [moduleId, toast]);

  const handleMarkComplete = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return toast({ title: "Error", description: "User not authenticated.", variant: "destructive" });

    if (!moduleId) return toast({ title: "Error", description: "Module ID is missing.", variant: "destructive" });

    await supabase.from("user_progress").upsert(
      {
        user_id: user.id,
        module_id: moduleId,
        completed: true,
        progress_percentage: 100,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,module_id" },
    );

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
                  <Progress value={progress.progress_percentage ?? 0} className="w-1/3" />
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
            <ModuleQuiz questions={questions as any} moduleId={module.id} onComplete={handleMarkComplete} />
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
