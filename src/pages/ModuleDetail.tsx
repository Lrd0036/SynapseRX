import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ModuleQuiz } from "@/components/ModuleQuiz";
import ReactMarkdown from "react-markdown";

const ModuleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [module, setModule] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchModuleData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: moduleData } = await supabase
        .from("training_modules")
        .select("*")
        .eq("id", id)
        .single();

      const { data: progressData } = await supabase
        .from("user_progress")
        .select("*")
        .eq("module_id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      setModule(moduleData);
      setProgress(progressData);
      setLoading(false);
    };

    fetchModuleData();
  }, [id]);

  const handleMarkComplete = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("user_progress").upsert({
      user_id: user.id,
      module_id: id,
      completed: true,
      progress_percentage: 100,
      completed_at: new Date().toISOString(),
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to mark module as complete",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Module completed!",
      description: "Great job! You've completed this training module.",
    });

    navigate("/modules");
  };

  if (loading || !module) {
    return <div className="p-6">Loading...</div>;
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
              <CardDescription className="text-base">
                {module.description}
              </CardDescription>
            </div>
            {progress?.completed && (
              <CheckCircle2 className="h-8 w-8 text-success flex-shrink-0" />
            )}
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
              <video 
                className="w-full h-full object-cover"
                controls
                preload="metadata"
              >
                <source src={module.video_url} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          )}

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
                This comprehensive training module covers essential topics required for pharmacy
                technician certification. Each section is designed to build upon previous knowledge
                and provide practical, actionable skills you can immediately apply in a pharmacy
                setting.
              </p>
            </div>
          )}

          {module.quiz_questions && module.quiz_questions.length > 0 && (
            <ModuleQuiz questions={module.quiz_questions} />
          )}

          {!progress?.completed && (
            <Button onClick={handleMarkComplete} className="w-full" size="lg">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark as Complete
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ModuleDetail;
