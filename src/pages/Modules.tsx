import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, PlayCircle, CheckCircle2 } from "lucide-react";

interface TrainingModule {
  id: string;
  title: string;
  description: string;
  category: string;
  duration_minutes: number;
  completed?: boolean;
  progress_percentage?: number;
}

const Modules = () => {
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchModules = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: modulesData } = await supabase
        .from("training_modules")
        .select("*")
        .order("order_index");

      const { data: progressData } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", user.id);

      const modulesWithProgress = modulesData?.map((module) => {
        const progress = progressData?.find((p) => p.module_id === module.id);
        return {
          ...module,
          completed: progress?.completed || false,
          progress_percentage: progress?.progress_percentage || 0,
        };
      });

      setModules(modulesWithProgress || []);
      setLoading(false);
    };

    fetchModules();
  }, []);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Safety: "bg-destructive/10 text-destructive",
      Operations: "bg-primary/10 text-primary",
      Clinical: "bg-accent/10 text-accent",
      "Soft Skills": "bg-secondary text-secondary-foreground",
      Compliance: "bg-warning/10 text-warning",
    };
    return colors[category] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Training Modules</h1>
        <p className="text-muted-foreground">
          Comprehensive courses designed for pharmacy technician certification
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => (
          <Card key={module.id} className="shadow-card hover:shadow-elevated transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg">{module.title}</CardTitle>
                {module.completed && (
                  <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                )}
              </div>
              <CardDescription className="line-clamp-2">
                {module.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className={getCategoryColor(module.category || "")}>
                  {module.category}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{module.duration_minutes} min</span>
                </div>
              </div>

              {module.progress_percentage! > 0 && !module.completed && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{module.progress_percentage}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${module.progress_percentage}%` }}
                    />
                  </div>
                </div>
              )}

              <Button
                onClick={() => navigate(`/modules/${module.id}`)}
                className="w-full"
                variant={module.completed ? "secondary" : "default"}
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                {module.completed ? "Review" : module.progress_percentage! > 0 ? "Continue" : "Start"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Modules;
