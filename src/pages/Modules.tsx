import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Clock, PlayCircle, CheckCircle2, Lock, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const [isManager, setIsManager] = useState(false);
  const [managerOverride, setManagerOverride] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchModules = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user is a manager
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      
      setIsManager(roleData?.role === "manager");

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

  // Calculate which modules are unlocked
  const getUnlockedModules = () => {
    if (managerOverride) return new Set(modules.map(m => m.id));
    
    const unlocked = new Set<string>();
    
    for (let i = 0; i < modules.length; i++) {
      if (i === 0) {
        // First module is always unlocked
        unlocked.add(modules[i].id);
      } else {
        // Check if previous module is completed
        const previousModule = modules[i - 1];
        if (previousModule.completed) {
          unlocked.add(modules[i].id);
        }
      }
    }
    
    return unlocked;
  };

  const unlockedModules = getUnlockedModules();

  // Calculate overall progress
  const completedCount = modules.filter(m => m.completed).length;
  const totalCount = modules.length;
  const overallProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleModuleClick = (module: TrainingModule) => {
    const isUnlocked = unlockedModules.has(module.id);
    
    if (!isUnlocked && !managerOverride) {
      toast({
        title: "Module Locked",
        description: "Complete the previous module to unlock this one.",
        variant: "destructive",
      });
      return;
    }

    // Check if this is a newly unlocked module
    const moduleIndex = modules.findIndex(m => m.id === module.id);
    if (moduleIndex > 0 && isUnlocked && !module.completed && !module.progress_percentage) {
      const previousModule = modules[moduleIndex - 1];
      if (previousModule.completed) {
        toast({
          title: "🎉 New Module Unlocked!",
          description: `You can now access "${module.title}"`,
        });
      }
    }

    navigate(`/modules/${module.id}`);
  };

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

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Training Modules</h1>
        <p className="text-muted-foreground">
          Comprehensive courses designed for pharmacy technician certification
        </p>
      </div>

      {/* Overall Progress Bar */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Learning Path Progress</h3>
              </div>
              <Badge variant="outline" className="text-base">
                {completedCount} of {totalCount} Complete
              </Badge>
            </div>
            
            <div className="space-y-2">
              <Progress value={overallProgress} className="h-3" />
              <p className="text-sm text-muted-foreground">
                {overallProgress}% of your certification training completed
              </p>
            </div>

            {isManager && (
              <div className="flex items-center gap-3 pt-2 border-t">
                <Switch
                  id="manager-override"
                  checked={managerOverride}
                  onCheckedChange={setManagerOverride}
                />
                <Label htmlFor="manager-override" className="text-sm cursor-pointer">
                  Manager Preview Mode (unlock all modules)
                </Label>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((module, index) => {
          const isUnlocked = unlockedModules.has(module.id);
          const isLocked = !isUnlocked && !managerOverride;

          return (
            <TooltipProvider key={module.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card 
                    className={`shadow-card transition-all ${
                      isLocked 
                        ? 'opacity-60 cursor-not-allowed' 
                        : 'hover:shadow-elevated cursor-pointer'
                    }`}
                    onClick={() => handleModuleClick(module)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {isLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
                          {module.title}
                        </CardTitle>
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
                        className="w-full"
                        variant={module.completed ? "secondary" : "default"}
                        disabled={isLocked}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleModuleClick(module);
                        }}
                      >
                        {isLocked ? (
                          <>
                            <Lock className="h-4 w-4 mr-2" />
                            Locked
                          </>
                        ) : (
                          <>
                            <PlayCircle className="h-4 w-4 mr-2" />
                            {module.completed ? "Review" : module.progress_percentage! > 0 ? "Continue" : "Start"}
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                {isLocked && (
                  <TooltipContent>
                    <p>Complete {modules[index - 1]?.title} to unlock</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
};

export default Modules;
