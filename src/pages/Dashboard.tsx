import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Award, BookOpen, Clock, TrendingUp } from "lucide-react";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalModules: 0,
    completedModules: 0,
    inProgressModules: 0,
    averageScore: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: modules } = await supabase
        .from("training_modules")
        .select("id");

      const { data: progress } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", user.id);

      const { data: competencies } = await supabase
        .from("competency_records")
        .select("score")
        .eq("user_id", user.id);

      const totalModules = modules?.length || 0;
      const completedModules = progress?.filter((p) => p.completed).length || 0;
      const inProgressModules = progress?.filter((p) => !p.completed).length || 0;
      const averageScore =
        competencies?.length
          ? Math.round(
              competencies.reduce((sum, c) => sum + c.score, 0) / competencies.length
            )
          : 0;

      setStats({
        totalModules,
        completedModules,
        inProgressModules,
        averageScore,
      });
      setLoading(false);
    };

    fetchDashboardData();
  }, []);

  const progressPercentage = stats.totalModules
    ? Math.round((stats.completedModules / stats.totalModules) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Track your learning progress and achievements</p>
      </div>

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
    </div>
  );
};

export default Dashboard;
