import React, { useEffect, useState, FC } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { ArrowLeft, CheckCircle2, Clock } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import ModuleQuiz from "../components/ModuleQuiz";

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
  question_text: string;
  question_type: string;
  options: string[];
  correct_answer: string;
  created_at: string;
}

const ModuleDetail: FC = () => {
  const { id: moduleId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [module, setModule] = useState<Module | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [markdownContent, setMarkdownContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  // Parse markdown content safely
  useEffect(() => {
    if (!module?.content) {
      setMarkdownContent("");
      return;
    }
    try {
      if (typeof module.content === "object" && "textContent" in module.content) {
        setMarkdownContent(module.content.textContent);
      } else if (typeof module.content === "string") {
        if (module.content.trim().startsWith("{")) {
          const parsed = JSON.parse(module.content);
          setMarkdownContent(parsed.textContent || module.content);
        } else {
          setMarkdownContent(module.content);
        }
      } else {
        setMarkdownContent("");
      }
    } catch {
      setMarkdownContent("");
    }
  }, [module]);

  // Fetch data
  useEffect(() => {
    if (!moduleId) return;

    const fetchData = async () => {
      setLoading(true);

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        toast({ title: "Unauthorized", description: "Please sign in.", variant: "destructive" });
        setLoading(false);
        return;
      }
      const userId = userData.user.id;

      // Fetch module
      const modRes = await supabase.from("training_modules").select("*").eq("id", moduleId).single();
      if (modRes.error || !modRes.data) {
        toast({ title: "Error", description: modRes.error?.message || "Module not found", variant: "destructive" });
        setLoading(false);
        return;
      }
      setModule(modRes.data);

      // Fetch user progress
      const progressRes = await supabase
        .from("user_progress")
        .select("completed, progress_percentage")
        .eq("module_id", moduleId)
        .eq("user_id", userId)
        .maybeSingle();
      setProgress(progressRes.data ?? null);

      // Fetch questions
      const qRes = await supabase.from("questions").select("*").eq("module_id", moduleId);
      const parsedQuestions = (qRes.data ?? []).map((q) => ({
        ...q,
        options: typeof q.options === "string" ? JSON.parse(q.options) : q.options,
      }));
      setQuestions(parsedQuestions);

      setLoading(false);
    };

    fetchData();
  }, [moduleId, toast]);

  // Mark as complete
  const handleMarkComplete = async () => {
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      toast({ title: "Error", description: "User not authenticated", variant: "destructive" });
      return;
    }
    if (!moduleId) {
      toast({ title: "Error", description: "Module ID is missing", variant: "destructive" });
      return;
    }

    await supabase.from("user_progress").upsert([
      {
        user_id: userData.user.id,
        module_id: moduleId,
        completed: true,
        progress_percentage: 100,
        completed_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
      },
    ]);

    toast({ title: "Success", description: "Module marked complete!" });
    navigate("/modules");
  };

  if (loading) {
    return <div className="p-6 text-center">Loading module...</div>;
  }
  if (!module) {
    return <div className="p-6 text-center">Module not found.</div>;
  }

  const hasQuiz = questions.length > 0;
  const isCompleted = progress?.completed;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 text-gray-900 dark:text-gray-100">
      <Button variant="ghost" onClick={() => navigate("/modules")}>
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
