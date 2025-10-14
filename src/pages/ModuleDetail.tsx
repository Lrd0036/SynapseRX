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
import React, { useEffect, useState } from "react";

// FIX 1: Define interfaces for your data structures.
// This provides type safety and helps TypeScript understand your data, fixing many errors.
interface Module {
  id: string;
  title: string;
  description: string;
  content: string | { textContent: string }; // Content can be a string or a JSON object
}

interface UserProgress {
  completed: boolean;
  progress_percentage: number;
}

interface Question {
  id: string;
  module_id: string;
  // Add any other properties your questions have from the database
  [key: string]: any;
}

const ModuleDetail: React.FC = () => {
  const { id: moduleId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // FIX 2: Use the new interfaces in your state hooks instead of `any`.
  const [module, setModule] = useState<Module | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // FIX 3: The markdown parsing logic has been moved INSIDE the component.
  // State and hooks can only be used within a component's body.
  const [markdownContent, setMarkdownContent] = useState<string>("");

  useEffect(() => {
    if (!module || !module.content) {
      setMarkdownContent("");
      return;
    }

    try {
      // Handle content that is already an object
      if (typeof module.content === "object" && module.content.textContent) {
        setMarkdownContent(module.content.textContent);
      }
      // Handle content that is a string
      else if (typeof module.content === "string") {
        // Check if it's a JSON string
        if (module.content.trim().startsWith("{")) {
          const parsed = JSON.parse(module.content);
          if (parsed && parsed.textContent) {
            setMarkdownContent(parsed.textContent);
            return;
          }
        }
        // Otherwise, use the string directly
        setMarkdownContent(module.content);
      } else {
        setMarkdownContent("");
      }
    } catch (error) {
      // If parsing fails, it's not valid JSON. Treat it as a plain string.
      if (typeof module.content === "string") {
        setMarkdownContent(module.content);
      } else {
        setMarkdownContent("");
      }
      console.error("Failed to parse module content, treating as plain text.", error);
    }
  }, [module]);

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
      // The types we defined earlier help TypeScript infer the correct types here.
      const { data: moduleData } = await supabase.from("training_modules").select("*").eq("id", moduleId).single();
      setModule(moduleData);

      // User progress
      const { data: progressData } = await supabase
        .from("user_progress")
        .select("completed, progress_percentage")
        .eq("module_id", moduleId)
        .eq("user_id", userId)
        .maybeSingle();
      setProgress(progressData);

      // Questions
      const { data: questionsData } = await supabase.from("questions").select("*").eq("module_id", moduleId);
      setQuestions(questionsData ?? []);

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

    if (!moduleId) {
      toast({ title: "Error", description: "Module ID is missing", variant: "destructive" });
      return;
    }

    await supabase.from("user_progress").upsert(
      {
        user_id: userId,
        module_id: moduleId,
        completed: true,
        progress_percentage: 100,
        completed_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
      },
      { onConflict: "user_id, module_id" }, // Added onConflict for safer upsert
    );

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
                <Badge variant="outline" className="flex items-center gap-1 border-green-500 text-green-500">
                  <CheckCircle2 className="h-5 w-5" />
                  Completed
                </Badge>
              ) : (
                <>
                  <Progress value={progress.progress_percentage} className="w-1/3" />
                  <span>{progress.progress_percentage}% Complete</span>
                </>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {/* FIX 4: Use the parsed markdownContent from state here */}
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
            <div className="text-center text-green-700 p-4 border border-green-300 bg-green-50 rounded mt-6">
              You have completed this training module.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ModuleDetail;
