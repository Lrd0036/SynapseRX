import { useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import React, { useEffect, useState, FC } from "react";

// --- REAL DEPENDENCIES START ---
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import ModuleQuiz from "@/components/ModuleQuiz";
// --- REAL DEPENDENCIES END ---

// Define types for our database tables
interface Module {
  id: string;
  title: string;
  description: string;
  content: any;
  order_index: number;
  created_at: string;
}

interface UserProgress {
  completed: boolean;
  progress_percentage: number;
}

// Interface for questions from the questions table
interface QuizQuestion {
  id: string;
  module_id: string;
  question_text: string;
  question_type: string;
  options: string[];
  correct_answer: string;
  created_at: string;
}

const ModuleDetail: FC = () => {
  // Use useParams to correctly get the module ID from the URL
  const { id: moduleId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [module, setModule] = useState<Module | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [markdownContent, setMarkdownContent] = useState<string>("");

  // Effect to parse module content for display
  useEffect(() => {
    if (!module?.content) {
      setMarkdownContent("");
      return;
    }

    let contentString = "";
    if (typeof module.content === "string") {
      contentString = module.content;
    } else if (typeof module.content === "object" && module.content !== null && "textContent" in module.content) {
      // Fallback for an unexpected object format
      contentString = (module.content as { textContent: string }).textContent;
    } else {
      // Handle unexpected content type
      console.error("Module content is not a string or expected object format.");
    }

    // Attempt to clean up and set the content
    setMarkdownContent(contentString);
  }, [module]);

  useEffect(() => {
    if (!moduleId) {
      setLoading(false);
      toast({ title: "Error", description: "Module ID is missing from the URL.", variant: "destructive" });
      return;
    }
    const fetchData = async () => {
      setLoading(true);
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
          toast({ title: "Unauthorized", description: "Please sign in.", variant: "destructive" });
          navigate("/auth");
          return;
        }

        const userId = user.id;

        // Fetch Module Details
        const { data: moduleData, error: moduleError } = await supabase
          .from("training_modules")
          .select("*")
          .eq("id", moduleId)
          .single();

        if (moduleError) throw new Error(`Module fetch failed: ${moduleError.message}`);

        setModule(moduleData);

        // Fetch User Progress
        const { data: progressData, error: progressError } = await supabase
          .from("user_progress")
          .select("completed, progress_percentage")
          .eq("module_id", moduleId)
          .eq("user_id", userId)
          .maybeSingle();

        if (progressError) throw new Error(`Progress fetch failed: ${progressError.message}`);

        setProgress(progressData);

        // Fetch Quiz Questions from separate questions table
        const { data: questionsData, error: questionsError } = await supabase
          .from("questions")
          .select("*")
          .eq("module_id", moduleId)
          .order("created_at", { ascending: true });

        if (questionsError) {
          console.error("Error fetching questions:", questionsError);
          setQuestions([]);
        } else {
          setQuestions(questionsData || []);
        }
      } catch (error) {
        console.error("Error fetching module data:", error);
        toast({
          title: "Error loading module",
          description: (error as Error).message || "An unknown error occurred.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [moduleId, toast, navigate]);

  // src/pages/ModuleDetail.tsx

  // ... (lines 142 to 167 contain the handleMarkComplete logic)

  const handleMarkComplete = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return toast({ title: "Error", description: "User not authenticated.", variant: "destructive" });

    if (!moduleId) return toast({ title: "Error", description: "Module ID is missing.", variant: "destructive" });

    // Use upsert to either update existing progress or insert a new completion record
    const { error } = await supabase.from("user_progress").upsert(
      {
        user_id: user.id,
        module_id: moduleId,
        completed: true,
        progress_percentage: 100,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,module_id" },
    );

    if (error) {
      // --- ENHANCED ERROR LOGGING ---
      console.error("Supabase Progress Update Error:", error);

      // Use the error message directly to help diagnose
      toast({
        title: "Failed to Save Progress",
        description: `Error: ${error.message}. Please check console for details.`,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Success", description: "Module marked complete!" });
    navigate("/modules");
  };

  // ...

  if (loading) return <div className="p-6 text-center">Loading module...</div>;
  if (!module) return <div className="p-6 text-center">Module not found.</div>;

  const hasQuiz = questions.length > 0;
  const isCompleted = progress?.completed;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate("/modules")} className="text-foreground hover:bg-muted">
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
                <Badge className="flex items-center gap-1 bg-success text-success-foreground">
                  <CheckCircle2 className="h-4 w-4" />
                  Completed
                </Badge>
              ) : (
                <>
                  <Progress value={progress.progress_percentage ?? 0} className="w-1/3" />
                  <span className="text-sm font-medium text-muted-foreground">
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
              <p className="text-muted-foreground">This module does not have a formal assessment quiz.</p>
              <Button size="lg" onClick={handleMarkComplete}>
                Mark as Complete
              </Button>
            </div>
          )}

          {isCompleted && (
            <div className="text-center p-4 border border-success/50 bg-success/5 text-success rounded mt-6">
              You have completed this training module.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ModuleDetail;
