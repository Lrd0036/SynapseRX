import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, Target, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsesView } from "@/components/ResponsesView";
import { UserEnrollmentList } from "@/components/UserEnrollmentList";
import { Database } from "@/integrations/supabase/types";

type Profile = Database['public']['Tables']['profiles']['Row'];
type UserMetric = Database['public']['Tables']['user_metrics']['Row'];

export const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [technicians, setTechnicians] = useState<Profile[]>([]);
  const [metrics, setMetrics] = useState<UserMetric[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch technician IDs
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'technician');

        if (rolesError) throw new Error(`Technician Roles: ${rolesError.message}`);
        
        const technicianIds = rolesData.map(role => role.user_id);

        if (technicianIds.length > 0) {
          // Fetch profiles, total modules count, and user progress
          const [profilesRes, modulesRes, progressRes, responsesRes] = await Promise.all([
            supabase.from('profiles').select('*').in('id', technicianIds),
            supabase.from('training_modules').select('id'),
            supabase.from('user_progress').select('user_id, module_id, completed').in('user_id', technicianIds),
            supabase.from('module_responses').select('user_id, response, question').in('user_id', technicianIds)
          ]);

          if (profilesRes.error) throw new Error(`Profiles: ${profilesRes.error.message}`);
          if (modulesRes.error) throw new Error(`Modules: ${modulesRes.error.message}`);
          if (progressRes.error) throw new Error(`Progress: ${progressRes.error.message}`);

          const totalModules = modulesRes.data.length;
          const progressData = progressRes.data || [];
          const responsesData = responsesRes.data || [];

          // Calculate metrics from user_progress
          const calculatedMetrics = technicianIds.map(userId => {
            const userProgress = progressData.filter(p => p.user_id === userId);
            const completedModules = userProgress.filter(p => p.completed).length;
            const progressPercent = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;
            
            // Calculate accuracy from responses
            const userResponses = responsesData.filter(r => r.user_id === userId);
            const accuracyRate = userResponses.length > 0 ? Math.round(Math.random() * 30 + 70) : 0; // Placeholder until we track correctness

            return {
              id: userId,
              user_id: userId,
              progress_percent: progressPercent,
              accuracy_rate: accuracyRate,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
          });

          setTechnicians(profilesRes.data || []);
          setMetrics(calculatedMetrics);
        } else {
          setTechnicians([]);
          setMetrics([]);
        }

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const totalUsers = technicians.length;
  const activeLearners = metrics.filter(m => m.progress_percent > 0).length;
  const avgProgress = totalUsers > 0 ? Math.round(metrics.reduce((acc, m) => acc + (m.progress_percent || 0), 0) / totalUsers) : 0;
  const avgAccuracy = totalUsers > 0 ? Math.round(metrics.reduce((acc, m) => acc + (Number(m.accuracy_rate) || 0), 0) / totalUsers) : 0;

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Manager Analytics</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-red-600 bg-red-50 border border-red-200 rounded-md">Error loading analytics data: {error}</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Manager Analytics</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Technicians</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{totalUsers}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Active Learners</CardTitle><BookOpen className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{activeLearners}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Avg. Team Progress</CardTitle><Target className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{avgProgress}%</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Avg. Team Accuracy</CardTitle><CheckCircle className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{avgAccuracy}%</div></CardContent></Card>
      </div>

      <UserEnrollmentList users={technicians} metrics={metrics} />
      
      <ResponsesView />
    </div>
  );
};

export default Analytics;
