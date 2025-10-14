/**
 * src/pages/ModuleDetail.tsx
 *
 * This component renders the detailed view for a single training module.
 * It now correctly parses the `content` field from the database and
 * passes the right data to the ModuleQuiz and ReactMarkdown components.
 */

// Import necessary hooks and components from React and other libraries
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

// Import UI components from the project's design system
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Import the existing, correct quiz component
import { ModuleQuiz } from "@/components/ModuleQuiz";

// --- TypeScript Interfaces ---
interface FormattedQuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  type?: string;
}

interface DbQuestion {
  id: string;
  question_text: string;
  options: string[] | string; // Can be an array or a stringified array
  correct_answer: string;
}

interface TrainingModule {
  id: string;
  title: string;
  description: string;
  content?: string | object; // Content can be a string or a pre-parsed object
}

interface UserProgress {
  completed: boolean;
  progress_percentage: number;
}

/**
 * NEW & IMPROVED HELPER FUNCTION
 * This function now safely handles the 'content' column, whether it's a string,
 * a JSON object, or null. It correctly extracts the video URL and text content.
 * This prevents the "[object Object]" crash.
 */
const parseModuleContent = (content: any) => {
  if (!content) {
    return { videoUrl: null, textContent: null };
  }

  let parsedContent;
  if (typeof content === "string") {
    try {
      parsedContent = JSON.parse(content);
    } catch (e) {
      // It's a plain string, not JSON. Treat it as text content.
      return { videoUrl: null, textContent: content };
    }
  } else if (typeof content === "object") {
    // It's already a JSON object from Supabase.
    parsedContent = content;
  } else {
    return { videoUrl: null, textContent: null };
  }

  // Now that we have a guaranteed object, extract properties.
  const videoUrl = parsedContent.videoUrl || null;
  const textContent = parsedContent.textContent || null;

  return { videoUrl, textContent };
};

const ModuleDetail = () => {
  const { id: moduleId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [module, setModule] = useState<TrainingModule | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<FormattedQuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!moduleId) {
      setLoading(false);
      return;
    }

    const fetchAllData = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const [moduleRes, progressRes, questionsRes] = await Promise.all([
        supabase.from("training_modules").select("id, title, description, content").eq("id", moduleId).single(),
        supabase
          .from("user_progress")
          .select("completed, progress_percentage")
          .eq("module_id", moduleId)
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase.from("questions").select("id, question_text, options, correct_answer").eq("module_id", moduleId),
      ]);

      if (moduleRes.error) console.error("Error fetching module:", moduleRes.error.message);
      setModule(moduleRes.data);

      if (progressRes.error) console.error("Error fetching progress:", progressRes.error.message);
      setProgress(progressRes.data);

      if (questionsRes.error) {
        console.error("Error fetching questions:", questionsRes.error.message);
      } else if (questionsRes.data) {
        const formatted = questionsRes.data
          .map((q: DbQuestion) => {
            const options = Array.isArray(q.options) ? q.options : JSON.parse(q.options || "[]");
            const correctIndex = options.findIndex((opt) => opt === q.correct_answer);

            return {
              question: q.question_text,
              options: options,
              correctAnswer: correctIndex,
            };
          })
          .filter((q) => q.correctAnswer !== -1); // Filter out questions where the correct answer wasn't found
        setQuizQuestions(formatted);
      }

      setLoading(false);
    };

    fetchAllData();
  }, [moduleId]);

  const handleModuleComplete = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !moduleId) return;

    const { error } = await supabase.from("user_progress").upsert({
      user_id: user.id,
      module_id: moduleId,
      completed: true,
      progress_percentage: 100,
      completed_at: new Date().toISOString(),
    });

    if (error) {
      toast({ title: "Error", description: "Failed to save your progress.", variant: "destructive" });
    } else {
      toast({ title: "Module Complete!", description: "Great job! Your progress has been saved." });
      setTimeout(() => navigate("/modules"), 1500);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading module...</div>;
  }

  if (!module) {
    return <div className="p-6 text-center">Module not found or failed to load.</div>;
  }

  const { videoUrl, textContent } = parseModuleContent(module.content);
  const hasQuiz = quizQuestions && quizQuestions.length > 0;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <Button variant="ghost" onClick={() => navigate("/modules")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Modules
      </Button>

      <Card className="shadow-elevated">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">{module.title}</CardTitle>
              <CardDescription className="text-base">{module.description}</CardDescription>
            </div>
            {progress?.completed && <CheckCircle2 className="h-8 w-8 text-success flex-shrink-0" />}
          </div>
          {progress && !progress.completed && (
            <div className="space-y-2 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span>Your Progress</span>
                <span className="font-medium">{progress.progress_percentage}%</span>
              </div>
              <Progress value={progress.progress_percentage} className="h-2" />
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {videoUrl && (
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              <video className="w-full h-full object-cover" controls preload="metadata">
                <source src={videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          )}

          <div className="prose dark:prose-invert max-w-none">
            {textContent && <ReactMarkdown>{textContent}</ReactMarkdown>}
          </div>

          {hasQuiz && !progress?.completed && (
            <ModuleQuiz questions={quizQuestions} moduleId={moduleId} onComplete={handleModuleComplete} />
          )}

          {!hasQuiz && !progress?.completed && (
            <div className="text-center p-4 border-dashed border-2 rounded-lg">
              <p className="text-muted-foreground mb-4">This module does not have a quiz.</p>
              <Button onClick={handleModuleComplete}>Mark as Complete</Button>
            </div>
          )}

          {progress?.completed && (
            <div className="bg-success/10 border border-success p-6 rounded-lg text-center">
              <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-success mb-2">Module Completed</h3>
              <p className="text-muted-foreground">You have successfully completed this training module.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ModuleDetail;
