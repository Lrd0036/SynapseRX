import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import React, { useEffect, useState, FC } from "react";

import { supabase } from "../integrations/supabase/client";
import { Database } from "../integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { useToast } from "../hooks/use-toast";
import ModuleQuiz from "../components/ModuleQuiz";

// Using types generated from your Supabase schema for better accuracy.
type Module = Database["public"]["Tables"]["training_modules"]["Row"];
type UserProgress = Pick<Database["public"]["Tables"]["user_progress"]["Row"], "completed" | "progress_percentage">;
type Question = Omit<Database["public"]["Tables"]["questions"]["Row"], "options"> & {
  options: string[]; // ModuleQuiz expects options to be an array of strings.
};

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
    if (!module?.content) {
      setMarkdownContent("");
      return;
    }
    try {
      let content = module.content;
      // Handle content that might be a stringified JSON object
      if (typeof content === "string" && content.trim().startsWith("{")) {
        const parsed = JSON.parse(content);
        if (parsed && parsed.textContent) {
          setMarkdownContent(parsed.textContent);
          return;
        }
      }
      // Handle plain markdown string or other non-JSON string content
      if (typeof content === "string") {
        setMarkdownContent(content);
      } else if (typeof content === "object" && content !== null && "textContent" in content) {
        // Handle the case where content is already a parsed JSON object
        setMarkdownContent((content as { textContent: string }).textContent);
      } else {
        setMarkdownContent("");
      }
    } catch (error) {
      // Fallback for any parsing error: treat content as a plain string.
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

        const formattedQuestions =
          questionsResult.data?.map((q) => ({
            ...q,
            options: Array.isArray(q.options) ? q.options : [],
          })) || [];

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
