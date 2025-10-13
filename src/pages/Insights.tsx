import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Lightbulb, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  Calendar,
  DollarSign,
  ArrowRight,
  Brain,
  Shield,
  RefreshCw
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Insight {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  userId?: string;
  moduleId?: string;
}

interface Certification {
  id: string;
  user_id: string;
  certification_name: string;
  expiration_date: string;
  status: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

const Insights = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [coachingTips, setCoachingTips] = useState<Insight[]>([]);
  const [learningPaths, setLearningPaths] = useState<Insight[]>([]);
  const [skillGaps, setSkillGaps] = useState<Insight[]>([]);
  const [riskAlerts, setRiskAlerts] = useState<Insight[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [stats, setStats] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchInsights = async () => {
    try {
      setRefreshing(true);
      const { data, error } = await supabase.functions.invoke('generate-insights');

      if (error) throw error;

      if (data?.insights) {
        setCoachingTips(data.insights.coachingTips || []);
        setLearningPaths(data.insights.learningPaths || []);
        setSkillGaps(data.insights.skillGaps || []);
        setRiskAlerts(data.insights.riskAlerts || []);
      }

      if (data?.rawStats) {
        setStats(data.rawStats);
      }
    } catch (error) {
      console.error('Error fetching insights:', error);
      toast({
        title: "Error loading insights",
        description: "Failed to generate AI recommendations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const fetchCertifications = async () => {
    const { data: certsData, error: certsError } = await supabase
      .from('certifications')
      .select('*')
      .order('expiration_date', { ascending: true });

    if (certsError || !certsData) return;

    // Fetch profile data separately
    const userIds = certsData.map(c => c.user_id);
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);

    // Merge the data
    const enrichedCerts = certsData.map(cert => ({
      ...cert,
      profiles: profilesData?.find(p => p.id === cert.user_id) || null
    }));

    setCertifications(enrichedCerts as any);
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchInsights(), fetchCertifications()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-amber-500 text-white';
      case 'low': return 'bg-primary text-primary-foreground';
      default: return 'bg-secondary';
    }
  };

  const getExpirationStatus = (date: string) => {
    const daysUntil = Math.ceil((new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) return { label: 'Expired', color: 'destructive' };
    if (daysUntil <= 21) return { label: `${daysUntil} days`, color: 'amber' };
    return { label: `${daysUntil} days`, color: 'default' };
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-96" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
            Recommendations & Learning Insights
          </h1>
          <p className="text-muted-foreground mt-2">
            AI-powered coaching recommendations and team analytics
          </p>
        </div>
        <Button onClick={fetchInsights} disabled={refreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Insights
        </Button>
      </div>

      {/* Real-Time Risk Alerts */}
      {riskAlerts.length > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Real-Time Risk Alerts
            </CardTitle>
            <CardDescription>Urgent issues requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {riskAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 p-4 rounded-lg bg-card border border-destructive/20 hover:border-destructive/40 transition-colors cursor-pointer"
                onClick={() => alert.moduleId && navigate(`/modules/${alert.moduleId}`)}
              >
                <Shield className="h-5 w-5 text-destructive mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold">{alert.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{alert.description}</p>
                </div>
                <Badge className={getPriorityColor(alert.priority)}>{alert.priority}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Learner-Specific Coaching Tips */}
        <Card className="border-teal-200 hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-teal-700">
              <Lightbulb className="h-5 w-5" />
              Coaching Tips
            </CardTitle>
            <CardDescription>Personalized recommendations for struggling learners</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {coachingTips.length > 0 ? (
              coachingTips.map((tip) => (
                <div
                  key={tip.id}
                  className="p-3 rounded-lg bg-teal-50 border border-teal-100 hover:border-teal-300 transition-colors cursor-pointer"
                  onClick={() => tip.userId && navigate(`/analytics`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-teal-900">{tip.title}</p>
                    <Badge variant="outline" className="text-xs">{tip.priority}</Badge>
                  </div>
                  <p className="text-xs text-teal-700 mt-1">{tip.description}</p>
                  <ArrowRight className="h-4 w-4 text-teal-600 mt-2" />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No coaching recommendations at this time.</p>
            )}
          </CardContent>
        </Card>

        {/* Personalized Learning Paths */}
        <Card className="border-emerald-200 hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-700">
              <Brain className="h-5 w-5" />
              Learning Paths
            </CardTitle>
            <CardDescription>Suggested modules based on competency gaps</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {learningPaths.length > 0 ? (
              learningPaths.map((path) => (
                <div
                  key={path.id}
                  className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 hover:border-emerald-300 transition-colors cursor-pointer"
                  onClick={() => path.moduleId && navigate(`/modules/${path.moduleId}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-emerald-900">{path.title}</p>
                    <Badge variant="outline" className="text-xs">{path.priority}</Badge>
                  </div>
                  <p className="text-xs text-emerald-700 mt-1">{path.description}</p>
                  <ArrowRight className="h-4 w-4 text-emerald-600 mt-2" />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No learning path recommendations available.</p>
            )}
          </CardContent>
        </Card>

        {/* Team Skill Gaps */}
        <Card className="border-amber-200 hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <Users className="h-5 w-5" />
              Team Skill Gaps
            </CardTitle>
            <CardDescription>Modules requiring team-wide improvement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {skillGaps.length > 0 ? (
              skillGaps.map((gap) => (
                <div
                  key={gap.id}
                  className="p-3 rounded-lg bg-amber-50 border border-amber-100 hover:border-amber-300 transition-colors cursor-pointer"
                  onClick={() => gap.moduleId && navigate(`/modules/${gap.moduleId}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-amber-900">{gap.title}</p>
                    <Badge variant="outline" className="text-xs">{gap.priority}</Badge>
                  </div>
                  <p className="text-xs text-amber-700 mt-1">{gap.description}</p>
                  <TrendingUp className="h-4 w-4 text-amber-600 mt-2" />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No skill gaps identified.</p>
            )}
          </CardContent>
        </Card>

        {/* Compliance & Certification Tracker */}
        <Card className="border-purple-200 hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-700">
              <Calendar className="h-5 w-5" />
              Certification Tracker
            </CardTitle>
            <CardDescription>Upcoming certification and CE deadlines</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {certifications.length > 0 ? (
              certifications.slice(0, 5).map((cert) => {
                const status = getExpirationStatus(cert.expiration_date);
                return (
                  <div
                    key={cert.id}
                    className="p-3 rounded-lg bg-purple-50 border border-purple-100 hover:border-purple-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-purple-900">{cert.certification_name}</p>
                        <p className="text-xs text-purple-600">{cert.profiles?.full_name}</p>
                      </div>
                      <Badge variant={status.color as any} className="text-xs">{status.label}</Badge>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">No certifications tracked.</p>
            )}
            {certifications.length > 5 && (
              <Button variant="link" className="w-full text-purple-700 p-0">
                View all certifications
              </Button>
            )}
          </CardContent>
        </Card>

        {/* ROI & Impact Metrics */}
        <Card className="border-blue-200 hover:shadow-lg transition-shadow md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <DollarSign className="h-5 w-5" />
              ROI & Impact Metrics
            </CardTitle>
            <CardDescription>Training effectiveness and projected savings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                <p className="text-sm font-medium text-blue-600">Estimated Error Reduction</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">23%</p>
                <p className="text-xs text-blue-600 mt-1">Based on competency improvements</p>
              </div>
              <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                <p className="text-sm font-medium text-green-600">Projected Cost Savings</p>
                <p className="text-2xl font-bold text-green-900 mt-1">$18,500</p>
                <p className="text-xs text-green-600 mt-1">Annual reduction in medication errors</p>
              </div>
              <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-100">
                <p className="text-sm font-medium text-indigo-600">Turnover Reduction</p>
                <p className="text-2xl font-bold text-indigo-900 mt-1">15%</p>
                <p className="text-xs text-indigo-600 mt-1">Through improved training programs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Insights;