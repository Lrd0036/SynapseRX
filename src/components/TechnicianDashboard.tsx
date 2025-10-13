import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, BookOpen, Clock, TrendingUp, ArrowRight, Bell, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const TechnicianDashboard = () => {
  const [stats, setStats] = useState({
    totalModules: 0,
    completedModules: 0,
    inProgressModules: 0,
    averageScore: 0,
  });
  const [upcomingModules, setUpcomingModules] = useState<any[]>([]);
  const [recentScores, setRecentScores] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch modules and progress
      const { data: modules } = await supabase
        .from("training_modules")
        .select("*")
        .order("order_index");

      const { data: progress } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", user.id);

      const { data: competencies } = await supabase
        .from("competency_records")
        .select("*")
        .eq("user_id", user.id)
        .order("assessed_at", { ascending: false })
        .limit(3);

      const totalModules = modules?.length || 0;
      const completedModules = progress?.filter((p) => p.completed).length || 0;
      const inProgressModules = progress?.filter((p) => !p.completed && p.progress_percentage > 0).length || 0;
      const averageScore =
        competencies?.length
          ? Math.round(
              competencies.reduce((sum, c) => sum + c.score, 0) / competencies.length
            )
          : 0;

      // Find next unlocked modules
      const modulesWithProgress = modules?.map((module) => {
        const prog = progress?.find((p) => p.module_id === module.id);
        return {
          ...module,
          completed: prog?.completed || false,
          progress_percentage: prog?.progress_percentage || 0,
        };
      }) || [];

      // Find upcoming modules (unlocked but not started)
      const upcoming = [];
      for (let i = 0; i < modulesWithProgress.length; i++) {
        if (i === 0) {
          if (!modulesWithProgress[i].completed && modulesWithProgress[i].progress_percentage === 0) {
            upcoming.push(modulesWithProgress[i]);
          }
        } else {
          const previousCompleted = modulesWithProgress[i - 1].completed;
          if (previousCompleted && !modulesWithProgress[i].completed) {
            upcoming.push(modulesWithProgress[i]);
          }
        }
      }

      // Generate notifications for newly unlocked modules
      const newNotifications: string[] = [];
      for (let i = 1; i < modulesWithProgress.length; i++) {
        if (modulesWithProgress[i - 1].completed && 
            !modulesWithProgress[i].completed && 
            modulesWithProgress[i].progress_percentage === 0) {
          newNotifications.push(`🎉 New module unlocked: "${modulesWithProgress[i].title}"`);
        }
      }

      setStats({
        totalModules,
        completedModules,
        inProgressModules,
        averageScore,
      });
      setUpcomingModules(upcoming.slice(0, 3));
      setRecentScores(competencies || []);
      setNotifications(newNotifications);
      setLoading(false);
    };

    fetchDashboardData();
  }, []);

  const progressPercentage = stats.totalModules
    ? Math.round((stats.completedModules / stats.totalModules) * 100)
    : 0;

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">My Learning Dashboard</h1>
        <p className="text-muted-foreground">Track your progress and continue your certification journey</p>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <Card className="shadow-card border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5 text-primary" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {notifications.map((notif, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                <span>{notif}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Modules</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalModules}</div>
            <p className="text-xs text-muted-foreground">Available for training</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Award className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedModules}</div>
            <p className="text-xs text-muted-foreground">Modules finished</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgressModules}</div>
            <p className="text-xs text-muted-foreground">Currently learning</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageScore}%</div>
            <p className="text-xs text-muted-foreground">Competency average</p>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Overall Progress</CardTitle>
          <CardDescription>Your training completion status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Course Completion</span>
              <span className="font-medium">{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
          <p className="text-sm text-muted-foreground">
            You've completed {stats.completedModules} out of {stats.totalModules} training modules
          </p>
        </CardContent>
      </Card>

      {/* Upcoming Modules */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Next Steps
          </CardTitle>
          <CardDescription>Continue your learning path with these modules</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcomingModules.length > 0 ? (
            upcomingModules.map((module) => (
              <div
                key={module.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <h4 className="font-medium">{module.title}</h4>
                  <p className="text-sm text-muted-foreground">{module.category}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate(`/modules/${module.id}`)}
                >
                  Start
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Great work! You've started all available modules.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Performance */}
      {recentScores.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Recent Performance</CardTitle>
            <CardDescription>Your latest competency assessments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentScores.map((score, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{score.competency_name}</h4>
                  <p className="text-xs text-muted-foreground">
                    {new Date(score.assessed_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={score.score >= 70 ? "default" : "destructive"}>
                  {score.score}%
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
