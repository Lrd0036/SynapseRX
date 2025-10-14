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

  useEffect(() => {
    if (!moduleId) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user) {
          toast({ title: "Unauthorized", description: "Please sign in.", variant: "destructive" });
          setLoading(false);
          return;
        }
        const userId = userData.user.id;

        const [modRes, progressRes, questionsRes] = await Promise.all([
          supabase.from("training_modules").select("*").eq("id", moduleId).single(),
          supabase
            .from("user_progress")
            .select("completed, progress_percentage")
            .eq("module_id", moduleId)
            .eq("user_id", userId)
            .maybeSingle(),
          supabase.from("questions").select("*").eq("module_id", moduleId),
        ]);

        if (modRes.error || !modRes.data) throw modRes.error || new Error("Module not found");
        if (progressRes.error) throw progressRes.error;
        if (questionsRes.error) throw questionsRes.error;

        setModule(modRes.data);
        setProgress(progressRes.data ?? null);

        const formattedQuestions = (questionsRes.data ?? []).map((q) => ({
          ...q,
          options: Array.isArray(q.options) ? q.options : [],
        })) as Question[];
        setQuestions(formattedQuestions);

        if (modRes.data.content) {
          if (typeof modRes.data.content === "string" && modRes.data.content.trim().startsWith("{")) {
            const c = JSON.parse(modRes.data.content);
            setMarkdownContent(c.textContent || "");
          } else if (typeof modRes.data.content === "string") {
            setMarkdownContent(modRes.data.content);
          } else if ("textContent" in modRes.data.content) {
            setMarkdownContent(modRes.data.content.textContent);
          } else {
            setMarkdownContent("");
          }
        }
      } catch (error) {
        console.error("Fetching module data failed:", error);
        toast({ title: "Loading error", description: (error as Error).message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [moduleId, toast]);

  const handleMarkComplete = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return toast({ title: "Error", description: "Not authenticated.", variant: "destructive" });
    if (!moduleId) return toast({ title: "Error", description: "No module ID.", variant: "destructive" });

    await supabase.from("user_progress").upsert(
      {
        user_id: userData.user.id,
        module_id: moduleId,
        completed: true,
        progress_percentage: 100,
        completed_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
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
