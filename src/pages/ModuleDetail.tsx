/**
 * src/pages/ModuleDetail.tsx
 *
 * This component renders the detailed view for a single training module.
 * It fetches module data, user progress, and displays the module content,
 * including a video player and a quiz.
 *
 * Corrected to match the user's specific Supabase schema.
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

// Import the custom quiz component
import { ModuleQuiz } from "@/components/ModuleQuiz";

// Define TypeScript types that match the actual database schema
interface TrainingModule {
  id: string;
  title: string;
  description: string;
  // The 'content' field can be a JSON string or regular text
  content?: string;
}

interface UserProgress {
  completed: boolean;
  progress_percentage: number;
}

// Helper function to safely parse JSON content
const parseModuleContent = (content: string | undefined) => {
  if (!content) return { videoUrl: null, textContent: null };
  try {
    const parsed = JSON.parse(content);
    return {
      videoUrl: parsed.videoUrl || null,
      textContent: parsed.textContent || null,
    };
  } catch (e) {
    // If it's not valid JSON, treat it as plain text content
    return { videoUrl: null, textContent: content };
  }
};

// Define the ModuleDetail functional component
const ModuleDetail = () => {
  const { id: moduleId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [module, setModule] = useState<TrainingModule | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!moduleId) {
      setLoading(false);
      return;
    }

    const fetchModuleData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch module details from the 'training_modules' table
      const { data: moduleData, error: moduleError } = await supabase
        .from("training_modules")
        .select("id, title, description, content") // Fetches only the columns that exist
        .eq("id", moduleId)
        .single();

      if (moduleError) {
        console.error("Error fetching module:", moduleError.message);
        setModule(null);
        setLoading(false);
        return;
      }

      // Fetch user's progress for this module
      const { data: progressData, error: progressError } = await supabase
        .from("user_progress")
        .select("completed, progress_percentage")
        .eq("module_id", moduleId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (progressError) {
        console.error("Error fetching user progress:", progressError.message);
      }

      setModule(moduleData);
      setProgress(progressData);
      setLoading(false);
    };

    fetchModuleData();
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
      toast({
        title: "Error",
        description: "Failed to save your progress. Please try again.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Module Complete!",
      description: "Great job! Your progress has been saved.",
    });

    setTimeout(() => navigate("/modules"), 1500);
  };

  if (loading) {
    return <div className="p-6 text-center">Loading module...</div>;
  }

  if (!module) {
    return <div className="p-6 text-center">Module not found or failed to load.</div>;
  }

  // Parse the content to extract video URL and text
  const { videoUrl, textContent } = parseModuleContent(module.content);

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
            {textContent ? (
              <ReactMarkdown>{textContent}</ReactMarkdown>
            ) : (
              !videoUrl && <p>No learning content available for this module.</p>
            )}
          </div>

          {moduleId && !progress?.completed && <ModuleQuiz moduleId={moduleId} onComplete={handleModuleComplete} />}

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
