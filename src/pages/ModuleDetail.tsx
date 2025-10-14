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
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        toast({ title: "Unauthorized", description: "Please sign in.", variant: "destructive" });
        setLoading(false);
        return;
      }
      const userId = userData.user.id;

      // Fetch module details
      const modRes = await supabase.from("training_modules").select("*").eq("id", moduleId).single();
      if (modRes.error || !modRes.data) {
        toast({ title: "Error", description: modRes.error?.message || "Module not found", variant: "destructive" });
        setLoading(false);
        return;
      }
      setModule(modRes.data);

      // Fetch progress
      const progressRes = await supabase
        .from("user_progress")
        .select("completed, progress_percentage")
        .eq("module_id", moduleId)
        .eq("user_id", userId)
        .maybeSingle();
      setProgress(progressRes.data ?? null);

      // Fetch questions and parse options JSONB
      const qRes = await supabase.from("questions").select("*").eq("module_id", moduleId);
      const parsedQuestions = (qRes.data ?? []).map((q) => ({
        ...q,
        options: typeof q.options === "string" ? JSON.parse(q.options) : q.options,
      }));
      setQuestions(parsedQuestions);

      // Parse markdown content if JSON object or string
      try {
        if (modRes.data.content) {
          if (typeof modRes.data.content === "string") {
            setMarkdownContent(modRes.data.content);
          } else if (modRes.data.content.textContent) {
            setMarkdownContent(modRes.data.content.textContent);
          } else {
            setMarkdownContent("");
          }
        }
      } catch {
        setMarkdownContent("");
      }

      setLoading(false);
    };
    fetchData();
  }, [moduleId, toast]);

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
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate("/modules")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Modules
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>{module.title}</CardTitle>
          <CardDescription>{module.description}</CardDescription>
          {progress && (
            <div className="flex items-center gap-3 mt-1">
              {isCompleted ? (
                <Badge variant="outline" className="flex items-center gap-1">
                  <CheckCircle2 className="h-5 w-5" />
                  Completed
                </Badge>
              ) : (
                <>
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span>{progress.progress_percentage}% Complete</span>
                </>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {markdownContent && <ReactMarkdown>{markdownContent}</ReactMarkdown>}
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
            <div className="text-center text-success p-4 border border-success rounded mt-6">
              You have completed this training module.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ModuleDetail;
