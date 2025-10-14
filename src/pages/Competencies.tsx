import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Award, TrendingUp } from "lucide-react";

interface CompetencyRecord {
  id: string;
  competency_name: string;
  score: number;
  assessed_at: string;
  notes: string | null;
}

interface UserMetrics {
  progress_percent: number;
  accuracy_rate: number;
}

const Competencies = () => {
  const [competencies, setCompetencies] = useState<CompetencyRecord[]>([]);
  const [metrics, setMetrics] = useState<UserMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompetencies = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch certifications as competencies
      const { data: certs } = await supabase
        .from("certifications")
        .select("*")
        .eq("user_id", user.id)
        .order("issue_date", { ascending: false });

      // Fetch user metrics for overall score
      const { data: metricsData } = await supabase
        .from("user_metrics")
        .select("*")
        .eq("user_id", user.id)
        .single();

      // Fetch completed modules as competencies
      const { data: progress } = await supabase
        .from("user_progress")
        .select(`
          *,
          training_modules (
            title
          )
        `)
        .eq("user_id", user.id)
        .eq("completed", true)
        .order("completed_at", { ascending: false });

      // Map certifications to competency format
      const certCompetencies: CompetencyRecord[] = (certs || []).map(cert => ({
        id: cert.id,
        competency_name: cert.certification_name,
        score: cert.status === 'active' ? 100 : 50,
        assessed_at: cert.issue_date,
        notes: `Expires: ${new Date(cert.expiration_date).toLocaleDateString()}`
      }));

      // Map completed modules to competency format
      const moduleCompetencies: CompetencyRecord[] = (progress || []).map(prog => ({
        id: prog.id,
        competency_name: prog.training_modules?.title || 'Training Module',
        score: prog.progress_percentage,
        assessed_at: prog.completed_at || prog.last_accessed_at,
        notes: 'Module completed'
      }));

      setCompetencies([...certCompetencies, ...moduleCompetencies]);
      setMetrics(metricsData);
      setLoading(false);
    };

    fetchCompetencies();
  }, []);

  const averageScore = metrics?.accuracy_rate 
    ? Math.round(Number(metrics.accuracy_rate))
    : competencies.length
    ? Math.round(
        competencies.reduce((sum, c) => sum + c.score, 0) / competencies.length
      )
    : 0;

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-success";
    if (score >= 70) return "text-primary";
    if (score >= 50) return "text-warning";
    return "text-destructive";
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Competency Tracking</h1>
        <p className="text-muted-foreground">
          Monitor your skills assessment and professional development
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Overall Competency</CardTitle>
                <CardDescription>Average across all assessments</CardDescription>
              </div>
              <TrendingUp className="h-8 w-8 text-accent" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-4xl font-bold">{averageScore}%</div>
            <Progress value={averageScore} className="h-2" />
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Assessments</CardTitle>
                <CardDescription>Total competencies evaluated</CardDescription>
              </div>
              <Award className="h-8 w-8 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{competencies.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Competency Records</CardTitle>
          <CardDescription>Detailed assessment history</CardDescription>
        </CardHeader>
        <CardContent>
          {competencies.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No competency assessments yet</p>
              <p className="text-sm mt-1">
                Complete training modules to unlock assessments
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {competencies.map((comp) => (
                <div
                  key={comp.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{comp.competency_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Assessed on {new Date(comp.assessed_at).toLocaleDateString()}
                    </p>
                    {comp.notes && (
                      <p className="text-sm mt-1 text-muted-foreground">{comp.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getScoreColor(comp.score)}`}>
                        {comp.score}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Competencies;
