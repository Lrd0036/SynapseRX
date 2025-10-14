import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import supabase from "../integrations/supabaseClient";
import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import Button from "../components/ui/button";
import Progress from "../components/ui/progress";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import useToast from "../hooks/use-toast";
import ModuleQuiz from "./ModuleQuiz";

interface DbQuestion {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
}

interface FormattedQuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

interface TrainingModule {
  id: string;
  title: string;
  description: string;
  content?: any;
}

interface UserProgress {
  completed: boolean;
  progress_percentage: number;
}

const ModuleDetail: React.FC = () => {
  const { id: moduleId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [module, setModule] = useState<TrainingModule | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<FormattedQuizQuestion[]>([]);
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
        toast({ title: "Error", description: "User not authenticated", variant: "destructive" });
        setLoading(false);
        return;
      }

      const userId = userData.user.id;

      const [moduleRes, progressRes, questionsRes] = await Promise.all([
        supabase
          .from<TrainingModule>("trainingmodules")
          .select("id, title, description, content")
          .eq("id", moduleId)
          .single(),
        supabase
          .from<UserProgress>("userprogress")
          .select("completed, progress_percentage")
          .eq("moduleid", moduleId)
          .eq("userid", userId)
          .maybeSingle(),
        supabase
          .from<DbQuestion>("questions")
          .select("id, question_text, options, correct_answer")
          .eq("moduleid", moduleId),
      ]);

      if (moduleRes.error) {
        toast({ title: "Error", description: moduleRes.error.message, variant: "destructive" });
      } else {
        setModule(moduleRes.data);
      }

      if (progressRes.error) {
        toast({ title: "Error", description: progressRes.error.message, variant: "destructive" });
      } else {
        setProgress(progressRes.data || null);
      }

      if (questionsRes.error) {
        toast({ title: "Error", description: questionsRes.error.message, variant: "destructive" });
        setQuizQuestions([]);
      } else {
        // Format questions safely
        const formatted = questionsRes.data
          ?.map((q) => {
            // options stored as JSON string or array
            const options = Array.isArray(q.options) ? q.options : JSON.parse(q.options as unknown as string);

            // find index of correct answer string
            const correctIndex = options.findIndex((opt) => opt === q.correct_answer);
            if (correctIndex === -1) return null;

            return {
              question: q.question_text,
              options: options,
              correctAnswer: correctIndex,
            };
          })
          .filter((q): q is FormattedQuizQuestion => q !== null);

        setQuizQuestions(formatted || []);
      }

      setLoading(false);
    };

    fetchData();
  }, [moduleId, toast]);

  const handleModuleComplete = async () => {
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
      toast({ title: "Error", description: "Failed to save progress", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Progress saved successfully" });
      navigate("/modules");
    }
  };

  if (loading) return <div className="p-6 text-center">Loading module...</div>;
  if (!module) return <div className="p-6 text-center">Module not found.</div>;

  const hasQuiz = quizQuestions.length > 0;

  // Optional: parse module content - e.g. markdown and video supported
  const parseModuleContent = (content: any) => {
    if (!content) return { videoUrl: null, textContent: null };
    try {
      const parsed = typeof content === "string" ? JSON.parse(content) : content;
      return {
        videoUrl: parsed.videoUrl || null,
        textContent: parsed.textContent || null,
      };
    } catch {
      return { videoUrl: null, textContent: content };
    }
  };

  const { videoUrl, textContent } = parseModuleContent(module.content);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate("/modules")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Modules
      </Button>

      <Card className="shadow-elevated">
        <CardHeader>
          <CardTitle className="text-2xl">{module.title}</CardTitle>
          <CardDescription>{module.description}</CardDescription>
          {progress && (
            <div className="flex items-center gap-2 mt-2">
              {progress.completed ? (
                <CheckCircle2 className="text-success h-8 w-8" />
              ) : (
                <Progress value={progress.progress_percentage} />
              )}
              <span>{progress.progress_percentage}% Complete</span>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {videoUrl && (
            <video controls className="w-full aspect-video rounded-lg bg-muted" src={videoUrl}>
              Your browser does not support the video tag.
            </video>
          )}

          {textContent && <ReactMarkdown>{textContent}</ReactMarkdown>}

          {hasQuiz && !progress?.completed && (
            <ModuleQuiz questions={quizQuestions} moduleId={module.id} onComplete={handleModuleComplete} />
          )}

          {!hasQuiz && !progress?.completed && (
            <div className="p-4 border-2 border-dashed rounded-lg text-center text-muted">
              This module does not have a quiz.
              <Button onClick={handleModuleComplete} className="mt-4" size="lg">
                Mark as Complete
              </Button>
            </div>
          )}

          {progress?.completed && (
            <div className="text-success p-6 bg-success/10 rounded-lg text-center">
              <CheckCircle2 className="mx-auto mb-3 h-12 w-12" />
              <h3 className="text-lg font-semibold">Module Completed</h3>
              <p>You have successfully completed this training module.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ModuleDetail;
