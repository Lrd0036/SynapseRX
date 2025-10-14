import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { ArrowLeft, CheckCircle2, Clock } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import ModuleQuiz from "../components/ModuleQuiz";

const ModuleDetail: React.FC = () => {
  const { id: moduleId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [module, setModule] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!moduleId) return;
    const fetchData = async () => {
      setLoading(true);

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        toast({ title: "Unauthorized", description: "Sign in!", variant: "destructive" });
        setLoading(false);
        return;
      }
      const userId = userData.user.id;

      // Training module
      const modRes = await supabase.from("training_modules").select("*").eq("id", moduleId).single();
      setModule(modRes.data ?? null);

      // User progress
      const progressRes = await supabase
        .from("user_progress")
        .select("completed, progress_percentage")
        .eq("module_id", moduleId)
        .eq("user_id", userId)
        .maybeSingle();
      setProgress(progressRes.data ?? null);

      // Questions
      const qRes = await supabase.from("questions").select("*").eq("module_id", moduleId);
      setQuestions(qRes.data ?? []);

      setLoading(false);
    };
    fetchData();
  }, [moduleId, toast]);

  const handleMarkComplete = async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      toast({ title: "Error", description: "User not authenticated", variant: "destructive" });
      return;
    }
    const userId = userData.user.id;

    await supabase.from("user_progress").upsert([
      {
        user_id: userId,
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

  if (loading) return <div className="p-6 text-center">Loading module...</div>;
  if (!module) return <div className="p-6 text-center">Module not found.</div>;

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
          {module.content && <ReactMarkdown>{module.content}</ReactMarkdown>}
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
