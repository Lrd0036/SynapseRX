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
type ModuleResponseWithDetails = Database['public']['Tables']['module_responses']['Row'] & {
  profiles: { full_name: string } | null;
  training_modules: { title: string } | null;
};

export const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [technicians, setTechnicians] = useState<Profile[]>([]);
  const [metrics, setMetrics] = useState<UserMetric[]>([]);
  const [responses, setResponses] = useState<ModuleResponseWithDetails[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [techniciansRes, metricsRes, responsesRes] = await Promise.all([
          supabase.from('user_roles').select('profiles:user_id(*)').eq('role', 'technician'),
          supabase.from('user_metrics').select('*'),
          supabase.from('module_responses').select('*, profiles:user_id(full_name), training_modules:module_id(title)'),
        ]);

        if (techniciansRes.error) throw new Error(`Technicians: ${techniciansRes.error.message}`);
        if (metricsRes.error) throw new Error(`Metrics: ${metricsRes.error.message}`);
        if (responsesRes.error) throw new Error(`Responses: ${responsesRes.error.message}`);
        
        setTechnicians((techniciansRes.data?.map(t => t.profiles).filter(Boolean) as Profile[]) || []);
        setMetrics(metricsRes.data || []);
        setResponses((responsesRes.data as ModuleResponseWithDetails[]) || []);

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
  const avgAccuracy = totalUsers > 0 ? Math.round(metrics.reduce((acc, m) => acc + (m.accuracy_rate || 0), 0) / totalUsers) : 0;

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
      
      <ResponsesView responses={responses} />
    </div>
  );
};

export default Analytics;
