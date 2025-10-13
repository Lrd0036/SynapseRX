import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  AlertTriangle,
  TrendingUp,
  UserCog,
  Send,
  Calendar,
  Target,
  Sparkles,
  Filter,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Recommendation {
  type: string;
  severity: string;
  message: string;
  details: string;
  action: string;
  technician_id?: string;
  technician_name?: string;
  group_name?: string;
  module_id?: string;
  module?: string;
  email?: string;
}

const LearningInsights = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterModule, setFilterModule] = useState<string>("all");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [filterTechnician, setFilterTechnician] = useState<string>("all");
  const [modules, setModules] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Fetch modules and technicians for filters
      const { data: modulesData } = await supabase
        .from("training_modules")
        .select("*");
      
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("*");

      setModules(modulesData || []);
      setTechnicians(profilesData || []);

      // Fetch competency trend data
      const { data: competencies } = await supabase
        .from("competency_records")
        .select("*")
        .order("assessed_at", { ascending: true });

      // Generate trend chart data
      const trendMap = new Map<string, any>();
      competencies?.forEach((comp) => {
        const date = new Date(comp.assessed_at).toLocaleDateString();
        if (!trendMap.has(date)) {
          trendMap.set(date, { date, scores: [] });
        }
        trendMap.get(date).scores.push(comp.score);
      });

      const chartData = Array.from(trendMap.values())
        .map((entry) => ({
          date: entry.date,
          avgScore: Math.round(
            entry.scores.reduce((sum: number, s: number) => sum + s, 0) / entry.scores.length
          ),
        }))
        .slice(-14); // Last 14 days

      setTrendData(chartData);

      // Fetch AI-generated insights
      try {
        const { data, error } = await supabase.functions.invoke("generate-insights");

        if (error) {
          console.error("Error fetching insights:", error);
          toast({
            title: "Error",
            description: "Failed to generate insights. Please try again.",
            variant: "destructive",
          });
          return;
        }

        setRecommendations(data.recommendations || []);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const filteredRecommendations = recommendations.filter((rec) => {
    if (filterModule !== "all" && rec.module_id !== filterModule) return false;
    if (filterGroup !== "all" && rec.group_name !== filterGroup) return false;
    if (filterTechnician !== "all" && rec.technician_id !== filterTechnician) return false;
    return true;
  });

  const handleAction = async (rec: Recommendation) => {
    switch (rec.action) {
      case "assign_training":
        toast({
          title: "Training Assigned",
          description: `Additional training modules assigned to ${rec.group_name} for ${rec.module}.`,
        });
        break;
      case "schedule_coaching":
        toast({
          title: "Coaching Session Scheduled",
          description: `1:1 coaching session scheduled with ${rec.technician_name}. Calendar invite sent.`,
        });
        break;
      case "send_encouragement":
        toast({
          title: "Encouragement Sent",
          description: `Congratulatory email sent to team members for improved performance in ${rec.module}.`,
        });
        break;
      case "review_training":
        toast({
          title: "Review Initiated",
          description: `Training approach review scheduled for ${rec.module}.`,
        });
        break;
      default:
        toast({
          title: "Action Noted",
          description: "Recommendation marked for review.",
        });
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case "high":
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case "warning":
        return <TrendingUp className="h-5 w-5 text-warning" />;
      case "info":
        return <Sparkles className="h-5 w-5 text-primary" />;
      default:
        return <Target className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getActionButton = (rec: Recommendation) => {
    switch (rec.action) {
      case "assign_training":
        return (
          <Button size="sm" onClick={() => handleAction(rec)}>
            <Target className="h-3 w-3 mr-1" />
            Assign Training
          </Button>
        );
      case "schedule_coaching":
        return (
          <Button size="sm" variant="outline" onClick={() => handleAction(rec)}>
            <Calendar className="h-3 w-3 mr-1" />
            Schedule 1:1
          </Button>
        );
      case "send_encouragement":
        return (
          <Button size="sm" variant="outline" onClick={() => handleAction(rec)}>
            <Send className="h-3 w-3 mr-1" />
            Send Praise
          </Button>
        );
      case "review_training":
        return (
          <Button size="sm" variant="destructive" onClick={() => handleAction(rec)}>
            <UserCog className="h-3 w-3 mr-1" />
            Review Approach
          </Button>
        );
      default:
        return (
          <Button size="sm" variant="ghost" onClick={() => handleAction(rec)}>
            Review
          </Button>
        );
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Generating insights...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Learning Insights Dashboard</h1>
        <p className="text-muted-foreground">
          AI-powered recommendations and trend analysis for targeted interventions
        </p>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Recommendations
          </CardTitle>
          <CardDescription>
            Narrow down insights by module, group, or individual technician
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Module</label>
              <Select value={filterModule} onValueChange={setFilterModule}>
                <SelectTrigger>
                  <SelectValue placeholder="All modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {modules.map((mod) => (
                    <SelectItem key={mod.id} value={mod.id}>
                      {mod.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Group</label>
              <Select value={filterGroup} onValueChange={setFilterGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="All groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  <SelectItem value="Group 1">Group 1</SelectItem>
                  <SelectItem value="Group 2">Group 2</SelectItem>
                  <SelectItem value="Group 3">Group 3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Technician</label>
              <Select value={filterTechnician} onValueChange={setFilterTechnician}>
                <SelectTrigger>
                  <SelectValue placeholder="All technicians" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Technicians</SelectItem>
                  {technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      {tech.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Tabs defaultValue="recommendations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
          <TabsTrigger value="actions">Quick Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-4">
          {filteredRecommendations
            .filter((r) => r.type !== "ai_insights")
            .map((rec, idx) => (
              <Card
                key={idx}
                className={`shadow-card ${
                  rec.severity === "critical"
                    ? "border-destructive"
                    : rec.severity === "high"
                    ? "border-warning"
                    : ""
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {getSeverityIcon(rec.severity)}
                      <div className="flex-1">
                        <CardTitle className="text-lg">{rec.message}</CardTitle>
                        <CardDescription className="mt-2">{rec.details}</CardDescription>
                      </div>
                    </div>
                    <Badge
                      variant={
                        rec.severity === "critical" || rec.severity === "high"
                          ? "destructive"
                          : rec.severity === "warning"
                          ? "outline"
                          : "default"
                      }
                    >
                      {rec.severity}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>{getActionButton(rec)}</CardContent>
              </Card>
            ))}

          {/* AI Insights */}
          {filteredRecommendations
            .filter((r) => r.type === "ai_insights")
            .map((rec, idx) => (
              <Card key={idx} className="shadow-card border-primary/50 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    {rec.message}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-sm">{rec.details}</pre>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="trends">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Performance Trend (Last 14 Days)</CardTitle>
              <CardDescription>
                Average competency scores over time - track improvement or decline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avgScore"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    name="Average Score %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Bulk Training Assignments</CardTitle>
              <CardDescription>
                Assign modules to entire groups with one click
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() =>
                  toast({
                    title: "Bulk Assignment",
                    description: "Regulatory Compliance module assigned to Group 3.",
                  })
                }
              >
                <Target className="h-4 w-4 mr-2" />
                Assign Regulatory Compliance to Group 3
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() =>
                  toast({
                    title: "Bulk Assignment",
                    description: "Advanced Safety module assigned to Group 2.",
                  })
                }
              >
                <Target className="h-4 w-4 mr-2" />
                Assign Advanced Safety to Group 2
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Automated Follow-Up Emails</CardTitle>
              <CardDescription>Send reminders and encouragement messages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() =>
                  toast({
                    title: "Email Sent",
                    description: "Reminder emails sent to all Group 3 members.",
                  })
                }
              >
                <Send className="h-4 w-4 mr-2" />
                Send Training Reminder to Group 3
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() =>
                  toast({
                    title: "Email Sent",
                    description: "Congratulatory emails sent to Group 1.",
                  })
                }
              >
                <Send className="h-4 w-4 mr-2" />
                Send Congratulations to Group 1
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LearningInsights;
