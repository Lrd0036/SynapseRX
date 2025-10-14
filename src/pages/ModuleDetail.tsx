import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import supabase from "../integrations/supabaseClient";
import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { ArrowLeft, CheckCircle2, Clock } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import ModuleQuiz from "../components/ModuleQuiz";

interface DbQuestion {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
}

interface TrainingModule {
  id: string;
  title: string;
  description: string;
  content?: string;
}

interface UserProgress {
  completed: boolean;
  progress_percentage: number;
}

const ModuleDetail: React.FC = () => {
  const { id: moduleId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [module, setModule] = useState<TrainingModule | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [questions, setQuestions] = useState<DbQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!moduleId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);

      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        toast({ title: "Unauthorized", description: "Please sign in.", variant: "destructive" });
        setLoading(false);
        return;
      }

      const userId = userData.user.id;

      const moduleRes = await supabase.from<TrainingModule>("trainingmodules").select("*").eq("id", moduleId).single();

      if (moduleRes.error) {
        toast({ title: "Error", description: moduleRes.error.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      setModule(moduleRes.data);

      const progressRes = await supabase
        .from<UserProgress>("userprogress")
        .select("completed, progress_percentage")
        .eq("userid", userId)
        .eq("moduleid", moduleId)
        .maybeSingle();

      if (progressRes.error) {
        toast({ title: "Error", description: progressRes.error.message, variant: "destructive" });
      } else {
        setProgress(progressRes.data || null);
      }

      const questionsRes = await supabase
        .from<DbQuestion>("questions")
        .select("id, question_text, options, correct_answer")
        .eq("moduleid", moduleId);

      if (questionsRes.error) {
        toast({ title: "Error", description: questionsRes.error.message, variant: "destructive" });
        setQuestions([]);
      } else {
        setQuestions(questionsRes.data || []);
      }

      setLoading(false);
    };

    fetchData();
  }, [moduleId, toast]);

  const handleMarkComplete = async () => {
    if (!moduleId) return;

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      toast({ title: "Error", description: "User not authenticated", variant: "destructive" });
      return;
    }

    const userId = userData.user.id;

    const { error } = await supabase.from("userprogress").upsert({
      userid: userId,
      moduleid: moduleId,
      completed: true,
      progress_percentage: 100,
      completed_at: new Date().toISOString(),
    });

    if (error) {
      toast({ title: "Error", description: "Failed to update progress", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Module marked complete!" });
      navigate("/modules");
    }
  };

  if (loading) return <div className="p-6 text-center">Loading module...</div>;
  if (!module) return <div className="p-6 text-center">Module not found</div>;

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
