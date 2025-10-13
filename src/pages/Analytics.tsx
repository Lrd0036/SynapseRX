import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, Award, TrendingUp } from "lucide-react";
import { ResponsesView } from "@/components/ResponsesView";

const Analytics = () => {
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    activeLearners: 0,
    totalModules: 0,
    averageCompletion: 0,
    averageCompetencyScore: 0,
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      // Fetch all technician user IDs
      const { data: technicianRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "technician");

      const technicianIds = technicianRoles?.map((r) => r.user_id) || [];

      // Fetch technician profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .in("id", technicianIds);

      const { data: modules } = await supabase.from("training_modules").select("id");

      const { data: progress } = await supabase.from("user_progress").select("*");

      // Count active learners (technicians who have completed at least one module)
      const techsWithCompletions = new Set(
        progress?.filter((p) => p.completed && technicianIds.includes(p.user_id))
          .map((p) => p.user_id) || []
      );

      const { data: competencies } = await supabase
        .from("competency_records")
        .select("score");

      const totalCompleted = progress?.filter((p) => p.completed).length || 0;
      const totalPossible = (profiles?.length || 0) * (modules?.length || 0);
      const averageCompletion = totalPossible
        ? Math.round((totalCompleted / totalPossible) * 100)
        : 0;

      const averageCompetencyScore = competencies?.length
        ? Math.round(
            competencies.reduce((sum, c) => sum + c.score, 0) / competencies.length
          )
        : 0;

      setAnalytics({
        totalUsers: profiles?.length || 0,
        activeLearners: techsWithCompletions.size,
        totalModules: modules?.length || 0,
        averageCompletion,
        averageCompetencyScore,
      });
    };

    fetchAnalytics();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Manager Analytics</h1>
        <p className="text-muted-foreground">
          Overview of team training progress and performance metrics
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalUsers}</div>
            <p className="text-xs text-muted-foreground">All technicians</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Learners</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.activeLearners}</div>
            <p className="text-xs text-muted-foreground">With completions</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Training Modules</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalModules}</div>
            <p className="text-xs text-muted-foreground">Available courses</p>
          </CardContent>
        </Card>

        <Card className="shadow-card opacity-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Competency</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">--</div>
            <p className="text-xs text-muted-foreground">Data pending</p>
          </CardContent>
        </Card>
      </div>

      <ResponsesView />
    </div>
  );
};

export default Analytics;
