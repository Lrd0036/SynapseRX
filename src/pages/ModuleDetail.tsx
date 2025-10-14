/**
 * src/pages/ModuleDetail.tsx
 * * This component renders the detailed view for a single training module.
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

// Import the custom quiz component using a named import
import { ModuleQuiz } from "@/components/ModuleQuiz";

// Define the ModuleDetail functional component
const ModuleDetail = () => {
  // Get the module 'id' from the URL parameters
  const { id } = useParams();
  // Hook for programmatic navigation
  const navigate = useNavigate();
  // Hook to display toast notifications
  const { toast } = useToast();

  // State to hold the module data
  const [module, setModule] = useState<any>(null);
  // State to hold the user's progress for this module
  const [progress, setProgress] = useState<any>(null);
  // State to manage the loading status
  const [loading, setLoading] = useState(true);

  // useEffect hook to fetch module and progress data when the component mounts or 'id' changes
  useEffect(() => {
    const fetchModuleData = async () => {
      // Get the current logged-in user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return; // Exit if no user is logged in

      // Fetch the specific module from the 'training_modules' table
      const { data: moduleData } = await supabase.from("training_modules").select("*").eq("id", id).single();

      // Fetch the user's progress for this module
      const { data: progressData } = await supabase
        .from("user_progress")
        .select("*")
        .eq("module_id", id)
        .eq("user_id", user.id)
        .maybeSingle(); // Use maybeSingle() as progress might not exist yet

      // Update state with the fetched data
      setModule(moduleData);
      setProgress(progressData);
      setLoading(false); // Set loading to false after data is fetched
    };

    fetchModuleData();
  }, [id]); // Dependency array ensures this runs again if the module id changes

  /**
   * Handles marking the module as complete after the user finishes the quiz.
   * This function is passed as a prop to the ModuleQuiz component.
   */
  const handleModuleComplete = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Insert or update the user's progress in the 'user_progress' table
    const { error } = await supabase.from("user_progress").upsert({
      user_id: user.id,
      module_id: id,
      completed: true,
      progress_percentage: 100,
      completed_at: new Date().toISOString(),
    });

    // If there's an error, show a destructive toast notification
    if (error) {
      toast({
        title: "Error",
        description: "Failed to mark module as complete",
        variant: "destructive",
      });
      return;
    }

    // On success, redirect the user back to the modules list after a short delay
    setTimeout(() => {
      navigate("/modules");
    }, 1500);
  };

  // Display a loading message while data is being fetched
  if (loading || !module) {
    return <div className="p-6">Loading...</div>;
  }

  // Render the component's UI
  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Back button to navigate to the main modules page */}
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
            {/* Show a checkmark if the module is completed */}
            {progress?.completed && <CheckCircle2 className="h-8 w-8 text-success flex-shrink-0" />}
          </div>

          <div className="flex items-center gap-4 pt-4">
            <Badge>{module.category}</Badge>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{module.duration_minutes} minutes</span>
            </div>
          </div>

          {/* Display progress bar if the module is in progress */}
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
          {/* Render video player if a video URL is available */}
          {module.video_url && (
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              <video className="w-full h-full object-cover" controls preload="metadata">
                <source src={module.video_url} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          )}

          {/* Render module content using ReactMarkdown, or show default text */}
          {module.content ? (
            <div className="prose dark:prose-invert max-w-none">
              <ReactMarkdown>{module.content}</ReactMarkdown>
            </div>
          ) : (
            <div className="prose dark:prose-invert max-w-none">
              <h3>Learning Objectives</h3>
              <ul>
                <li>Understand key concepts and principles</li>
                <li>Apply knowledge to real-world scenarios</li>
                <li>Demonstrate competency in practical skills</li>
                <li>Meet certification requirements</li>
              </ul>
              <h3>Course Content</h3>
              <p>
                This comprehensive training module covers essential topics required for pharmacy technician
                certification. Each section is designed to build upon previous knowledge and provide practical,
                actionable skills you can immediately apply in a pharmacy setting.
              </p>
            </div>
          )}

          {/* Render the quiz if an id exists and the module is not yet completed */}
          {id && !progress?.completed && module.quiz_questions && (
            <ModuleQuiz questions={module.quiz_questions} moduleId={id} onComplete={handleModuleComplete} />
          )}

          {/* Show a completion message if the module is finished */}
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

// Export the component for use in other parts of the application
export default ModuleDetail;
