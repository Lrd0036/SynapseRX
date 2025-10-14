/**
 * src/pages/ModuleDetail.tsx
 *
 * This component renders the detailed view for a single training module.
 * It fetches module data, user progress, and displays the module content,
 * including a video player and a quiz.
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
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Import the custom quiz component using a named import with the corrected alias path
import { ModuleQuiz } from "@/components/ModuleQuiz";

// --- New: Define TypeScript types for our data ---
// This makes the code safer and easier to read.
interface TrainingModule {
  id: string;
  title: string;
  description: string;
  category: string;
  duration_minutes: number;
  video_url?: string;
  content?: string;
}

interface UserProgress {
  completed: boolean;
  progress_percentage: number;
}

// Define the ModuleDetail functional component
const ModuleDetail = () => {
  // Get the module 'id' from the URL parameters
  const { id: moduleId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // State with our new, stricter types
  const [module, setModule] = useState<TrainingModule | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);

  // useEffect hook to fetch module and progress data
  useEffect(() => {
    // Ensure we have a moduleId before fetching
    if (!moduleId) {
      setLoading(false);
      return;
    }

    const fetchModuleData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch the module details
      const { data: moduleData, error: moduleError } = await supabase
        .from("training_modules")
        .select("*")
        .eq("id", moduleId)
        .single();

      if (moduleError) {
        console.error("Error fetching module:", moduleError.message);
        setLoading(false);
        return;
      }

      // Fetch the user's progress for this module
      const { data: progressData, error: progressError } = await supabase
        .from("user_progress")
        .select("completed, progress_percentage")
        .eq("module_id", moduleId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (progressError) {
        console.error("Error fetching user progress:", progressError.message);
      }

      // Update state with the fetched data
      setModule(moduleData);
      setProgress(progressData);
      setLoading(false);
    };

    fetchModuleData();
  }, [moduleId]); // Re-run if moduleId changes

  /**
   * Handles marking the module as complete after the user finishes the quiz.
   */
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

    // Show a success message
    toast({
      title: "Module Complete!",
      description: "Great job! Your progress has been saved.",
      className: "bg-green-100 text-green-800",
    });

    // Redirect back to the modules page
    setTimeout(() => navigate("/modules"), 1500);
  };

  // Display a loading message
  if (loading) {
    return <div className="p-6 text-center">Loading module...</div>;
  }

  // Display a message if the module couldn't be found
  if (!module) {
    return <div className="p-6 text-center">Module not found.</div>;
  }

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
          <div className="flex items-center gap-4 pt-4">
            <Badge>{module.category}</Badge>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{module.duration_minutes} minutes</span>
            </div>
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
          {module.video_url && (
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              <video className="w-full h-full object-cover" controls preload="metadata">
                <source src={module.video_url} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          )}

          <div className="prose dark:prose-invert max-w-none">
            {module.content ? (
              <ReactMarkdown>{module.content}</ReactMarkdown>
            ) : (
              <p>No content available for this module.</p>
            )}
          </div>

          {/* --- QUIZ RENDERING LOGIC ---
            The quiz will only appear if:
            1. A `moduleId` exists in the URL.
            2. The user's progress for this module is NOT marked as `completed: true`.
            
            If the quiz isn't showing up, check your 'user_progress' table in Supabase
            to make sure the 'completed' column is false or the row doesn't exist.
          */}
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
