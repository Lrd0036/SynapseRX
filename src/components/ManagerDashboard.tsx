import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Users, BookOpen, Award, TrendingUp, AlertTriangle, Search, UserCog, Send, Trophy, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

interface TechnicianData {
  id: string;
  full_name: string;
  email: string;
  completed_modules: number;
  total_modules: number;
  avg_score: number;
  in_progress: number;
  completion_percentage: number;
}

export const ManagerDashboard = () => {
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    activeLearners: 0,
    totalModules: 0,
    averageCompletion: 0,
    averageCompetencyScore: 0,
  });
  const [technicians, setTechnicians] = useState<TechnicianData[]>([]);
  const [filteredTechnicians, setFilteredTechnicians] = useState<TechnicianData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "completion" | "score">("name");
  const [skillGaps, setSkillGaps] = useState<any[]>([]);
  const [impersonateMode, setImpersonateMode] = useState(false);
  const [moduleStats, setModuleStats] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [groupData, setGroupData] = useState<any[]>([]);
  const { toast } = useToast();

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

  useEffect(() => {
    const fetchManagerData = async () => {
      // Step 1: Fetch only the user IDs for users with the 'technician' role.
      const { data: technicianRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "technician");

      if (rolesError) {
        console.error("Error fetching technician roles:", rolesError);
        return;
      }

      const technicianIds = technicianRoles?.map((r) => r.user_id) || [];
      
      if (technicianIds.length === 0) {
        // If there are no technicians, set the data to empty and stop.
        setTechnicians([]);
        setFilteredTechnicians([]);
        setAnalytics({
            totalUsers: 0,
            activeLearners: 0,
            totalModules: 0,
            averageCompletion: 0,
            averageCompetencyScore: 0,
        });
        return;
      }

      // Step 2: Fetch all data specifically for the identified technician IDs.
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", technicianIds);

      const { data: metrics } = await supabase
        .from("user_metrics")
        .select("*")
        .in("user_id", technicianIds);

      const { data: modules } = await supabase
        .from("training_modules")
        .select("id, title");

      const { data: allProgress } = await supabase
        .from("user_progress")
        .select("*")
        .in("user_id", technicianIds);

      const { data: competencies } = await supabase
        .from("competency_records")
        .select("*")
        .in("user_id", technicianIds);

      const totalCompleted = allProgress?.filter((p) => p.completed).length || 0;
      const totalPossible = (profiles?.length || 0) * (modules?.length || 0);
      const averageCompletion = totalPossible
        ? Math.round((totalCompleted / totalPossible) * 100)
        : 0;

      const averageCompetencyScore = competencies?.length
        ? Math.round(
            competencies.reduce((sum, c) => sum + c.score, 0) / competencies.length
          )
        : 0;

      // Count active learners (technicians who have completed at least one module)
      const techsWithCompletions = new Set(
        allProgress?.filter((p) => p.completed && technicianIds.includes(p.user_id))
          .map((p) => p.user_id) || []
      );

      setAnalytics({
        totalUsers: profiles?.length || 0,
        activeLearners: techsWithCompletions.size,
        totalModules: modules?.length || 0,
        averageCompletion,
        averageCompetencyScore,
      });

      // Build technician roster with detailed stats
      const technicianData: TechnicianData[] = (profiles || []).map((profile) => {
        const userProgress = allProgress?.filter((p) => p.user_id === profile.id) || [];
        const userCompetencies = competencies?.filter((c) => c.user_id === profile.id) || [];
        const userMetric = (metrics || []).find((m) => m.user_id === profile.id);

        const total = modules?.length || 0;
        
        // Use ProgressPercent from user_metrics first, fallback to calculated
        const completionPercentage = userMetric?.progress_percent || 
          (total > 0 && userProgress.length > 0 
            ? Math.round((userProgress.filter((p) => p.completed).length / total) * 100) 
            : 0);
        
        // Calculate completed modules from completion percentage
        const completed = total > 0 
          ? Math.round((completionPercentage / 100) * total)
          : 0;
        
        const inProgress = userProgress.filter((p) => !p.completed && p.progress_percentage > 0).length;
        
        // Use AccuracyRate from user_metrics, fallback to competency average
        const avgScore = userMetric?.accuracy_rate 
          ? Math.round(Number(userMetric.accuracy_rate))
          : userCompetencies.length
          ? Math.round(userCompetencies.reduce((sum, c) => sum + c.score, 0) / userCompetencies.length)
          : 0;

        return {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          completed_modules: completed,
          total_modules: total,
          avg_score: avgScore,
          in_progress: inProgress,
          completion_percentage: completionPercentage,
        };
      });

      setTechnicians(technicianData);
      setFilteredTechnicians(technicianData);

      // Calculate module-specific statistics
      const moduleStatistics = (modules || []).map((module) => {
        const moduleProgress = allProgress?.filter((p) => p.module_id === module.id) || [];
        const usersStarted = moduleProgress.length;
        const usersCompleted = moduleProgress.filter((p) => p.completed).length;
        
        // Calculate completion rate (% of total users who completed this module)
        const completionRate = profiles?.length > 0
          ? Math.round((usersCompleted / profiles.length) * 100)
          : 0;

        // Calculate average progress for users who started
        const avgProgress = usersStarted > 0
          ? Math.round(moduleProgress.reduce((sum, p) => sum + p.progress_percentage, 0) / usersStarted)
          : 0;

        // Calculate pass rate using user metrics accuracy for users who engaged with this module
        const moduleUserIds = moduleProgress.map(p => p.user_id);
        const relevantMetrics = metrics?.filter(m => moduleUserIds.includes(m.user_id)) || [];
        
        const avgScore = relevantMetrics.length > 0
          ? Math.round(relevantMetrics.reduce((sum, m) => sum + Number(m.accuracy_rate || 0), 0) / relevantMetrics.length)
          : avgProgress; // Fallback to progress if no metrics
        
        const passRate = relevantMetrics.length > 0
          ? Math.round((relevantMetrics.filter(m => Number(m.accuracy_rate || 0) >= 70).length / relevantMetrics.length) * 100)
          : (avgProgress >= 70 ? Math.round(usersCompleted / Math.max(usersStarted, 1) * 100) : 0);

        return {
          module_id: module.id,
          module_title: module.title,
          completion_rate: completionRate,
          avg_score: avgScore,
          pass_rate: passRate,
          is_gap: completionRate < 60 || avgScore < 60,
        };
      });

      setModuleStats(moduleStatistics);

      // Calculate skill gaps
      const gaps = moduleStatistics.filter((s) => s.is_gap).sort((a, b) => a.completion_rate - b.completion_rate);
      setSkillGaps(gaps);

      // Generate alerts based on performance
      const generatedAlerts = [];
      
      // Check for repeated failures
      const failureMap = new Map<string, number>();
      competencies?.forEach((comp) => {
        if (comp.score < 70) {
          const key = `${comp.user_id}-${comp.competency_name}`;
          failureMap.set(key, (failureMap.get(key) || 0) + 1);
        }
      });

      failureMap.forEach((count, key) => {
        if (count >= 2) {
          const [userId] = key.split('-');
          const user = profiles?.find((p) => p.id === userId);
          if (user) {
            generatedAlerts.push({
              type: 'failure',
              message: `${user.full_name} failed Regulatory Compliance quiz twice. Assign manager coaching?`,
              user_id: userId,
              severity: 'high',
            });
          }
        }
      });

      // Check for completions
      technicianData.forEach((tech) => {
        if (tech.completion_percentage === 100) {
          generatedAlerts.push({
            type: 'success',
            message: `${tech.full_name} completed all required modules.`,
            user_id: tech.id,
            severity: 'low',
          });
        }
      });

      // Group 3 regulatory compliance alert
      const group3Alert = moduleStatistics.find((m) => 
        m.module_title.toLowerCase().includes('regulatory') && m.avg_score < 40
      );
      if (group3Alert) {
        generatedAlerts.push({
          type: 'critical',
          message: `Group 3 regulatory compliance performance critically low (${group3Alert.avg_score}% avg).`,
          severity: 'critical',
        });
      }

      setAlerts(generatedAlerts.slice(0, 5));

      // Calculate group-based data
      const groups = [
        {
          name: 'Group 1',
          technicians: technicianData.filter((t) => 
            ['Maria Chen', 'Jacob Lee', 'Sarah Patel'].includes(t.full_name)
          ),
        },
        {
          name: 'Group 2',
          technicians: technicianData.filter((t) => 
            ['Mike Rodriguez', 'James Park', 'Olga Smirnova'].includes(t.full_name)
          ),
        },
        {
          name: 'Group 3',
          technicians: technicianData.filter((t) => 
            ['John Smith', 'Alicia Kim', 'Deepa Rao', 'Franco Ortiz'].includes(t.full_name)
          ),
        },
      ];

      const groupStats = groups.map((group) => {
        const avgCompletion = group.technicians.length > 0
          ? Math.round(
              group.technicians.reduce((sum, t) => sum + t.completion_percentage, 0) / group.technicians.length
            )
          : 0;
        const avgScore = group.technicians.length > 0
          ? Math.round(
              group.technicians.reduce((sum, t) => sum + t.avg_score, 0) / group.technicians.length
            )
          : 0;

        return {
          name: group.name,
          completion: avgCompletion,
          competency: avgScore,
          size: group.technicians.length,
        };
      });

      setGroupData(groupStats);
    };

    fetchManagerData();
  }, []);

  // Filter and sort technicians
  useEffect(() => {
    let filtered = [...technicians];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (tech) =>
          tech.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tech.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    switch (sortBy) {
      case "name":
        filtered.sort((a, b) => a.full_name.localeCompare(b.full_name));
        break;
      case "completion":
        filtered.sort((a, b) => b.completion_percentage - a.completion_percentage);
        break;
      case "score":
        filtered.sort((a, b) => b.avg_score - a.avg_score);
        break;
    }

    setFilteredTechnicians(filtered);
  }, [searchQuery, sortBy, technicians]);

  const handleSendReminder = (technicianName: string) => {
    toast({
      title: "Reminder Sent",
      description: `Training reminder sent to ${technicianName}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Manager Analytics</h1>
          <p className="text-muted-foreground">
            Oversee team training progress and identify knowledge gaps
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            id="impersonate"
            checked={impersonateMode}
            onCheckedChange={setImpersonateMode}
          />
          <Label htmlFor="impersonate" className="text-sm cursor-pointer">
            Demo Mode (View as Technician)
          </Label>
        </div>
      </div>

      {impersonateMode && (
        <Card className="shadow-card border-warning bg-warning/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <UserCog className="h-5 w-5 text-warning" />
              <p className="text-sm">
                <strong>Demo Mode Active:</strong> You are viewing the dashboard as a technician would see it.
                Toggle off to return to manager view.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Analytics Overview */}
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

      {/* Real-Time Risk Alerts Panel */}
      {alerts.length > 0 && (
        <Card className="shadow-card border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Real-Time Risk Alerts
            </CardTitle>
            <CardDescription>Immediate attention required for these issues</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert, idx) => (
              <div
                key={idx}
                className={`p-4 border rounded-lg ${
                  alert.severity === 'critical'
                    ? 'border-destructive bg-destructive/5'
                    : alert.severity === 'high'
                    ? 'border-warning bg-warning/5'
                    : 'border-success bg-success/5'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm flex-1">{alert.message}</p>
                  <Badge
                    variant={
                      alert.severity === 'critical' || alert.severity === 'high'
                        ? 'destructive'
                        : 'default'
                    }
                  >
                    {alert.severity === 'critical' ? 'Critical' : alert.severity === 'high' ? 'High' : 'Info'}
                  </Badge>
                </div>
                {alert.type === 'failure' && (
                  <Button size="sm" variant="outline" className="mt-2">
                    <Target className="h-3 w-3 mr-1" />
                    Assign Coaching
                  </Button>
                )}
                {alert.type === 'success' && (
                  <Button size="sm" variant="outline" className="mt-2">
                    <Send className="h-3 w-3 mr-1" />
                    Send Praise
                  </Button>
                )}
                {alert.type === 'critical' && (
                  <Button size="sm" variant="destructive" className="mt-2">
                    <Target className="h-3 w-3 mr-1" />
                    Prescribe Extra Training
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Visual Analytics - Charts and Graphs */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Module Performance Bar Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Module 1 & 2 Completion Rates</CardTitle>
            <CardDescription>Completion rate for the first two modules</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={moduleStats.slice(0, 2)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="module_title" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completion_rate" fill="hsl(var(--primary))" name="Completion Rate %" />
              </BarChart>
            </ResponsiveContainer>
            {moduleStats.slice(0, 2).some((m) => m.completion_rate < 50) && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/50 rounded-lg">
                <p className="text-sm font-medium text-destructive">
                  ⚠️ Low completion rates detected for initial modules
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Group Performance Comparison */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Team Group Performance</CardTitle>
            <CardDescription>Completion and competency by training group</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={groupData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completion" fill="hsl(var(--primary))" name="Completion %" />
                <Bar dataKey="competency" fill="hsl(var(--accent))" name="Competency %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard - Top Performers */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-warning" />
            Top Performers Leaderboard
          </CardTitle>
          <CardDescription>Technicians ranked by overall competency score</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...technicians]
              .sort((a, b) => b.avg_score - a.avg_score)
              .slice(0, 5)
              .map((tech, idx) => (
                <div key={tech.id} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className={`
                    flex items-center justify-center w-8 h-8 rounded-full font-bold
                    ${idx === 0 ? 'bg-warning text-warning-foreground' : 
                      idx === 1 ? 'bg-muted' : 
                      idx === 2 ? 'bg-accent/30' : 'bg-muted/50'}
                  `}>
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{tech.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {tech.completed_modules}/{tech.total_modules} modules · {tech.completion_percentage}% complete
                    </p>
                  </div>
                  <Badge variant={tech.avg_score >= 90 ? "default" : tech.avg_score >= 70 ? "outline" : "destructive"}>
                    {tech.avg_score}%
                  </Badge>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Group Performance Pie Chart */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Team Distribution by Performance Level</CardTitle>
          <CardDescription>Breakdown of technicians by competency tier</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  {
                    name: 'Excellent (90%+)',
                    value: technicians.filter((t) => t.avg_score >= 90).length,
                  },
                  {
                    name: 'Good (70-89%)',
                    value: technicians.filter((t) => t.avg_score >= 70 && t.avg_score < 90).length,
                  },
                  {
                    name: 'Needs Improvement (50-69%)',
                    value: technicians.filter((t) => t.avg_score >= 50 && t.avg_score < 70).length,
                  },
                  {
                    name: 'Critical (<50%)',
                    value: technicians.filter((t) => t.avg_score < 50).length,
                  },
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {COLORS.map((color, index) => (
                  <Cell key={`cell-${index}`} fill={color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Team Skill Gaps Heatmap */}
      {skillGaps.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Team Skill Gaps
            </CardTitle>
            <CardDescription>
              Modules with team completion rates or scores below 60% - prioritize these for group workshops
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {skillGaps.map((gap) => (
                <div key={gap.module_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{gap.module_title}</h4>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-muted-foreground">
                        Completion: {gap.completion_rate}%
                      </span>
                      {gap.avg_score !== null && (
                        <span className="text-xs text-muted-foreground">
                          Avg Score: {gap.avg_score}%
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant="destructive">Priority</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Technician Roster */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Technician Roster</CardTitle>
          <CardDescription>Filter and review individual training progress</CardDescription>
          <div className="flex gap-3 pt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="completion">Completion %</SelectItem>
                <SelectItem value="score">Avg Score</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>In Progress</TableHead>
                <TableHead>Avg Score</TableHead>
                <TableHead>Completion</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTechnicians.map((tech) => (
                <TableRow key={tech.id}>
                  <TableCell className="font-medium">{tech.full_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{tech.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {tech.completed_modules}/{tech.total_modules}
                    </Badge>
                  </TableCell>
                  <TableCell>{tech.in_progress}</TableCell>
                  <TableCell>
                    <Badge variant={tech.avg_score >= 70 ? "default" : "destructive"}>
                      {tech.avg_score}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${tech.completion_percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-12">
                        {tech.completion_percentage}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSendReminder(tech.full_name)}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Remind
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Group-Based Insights */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Group-Based Insights</CardTitle>
          <CardDescription>AI-driven recommendations for targeted training interventions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {skillGaps.slice(0, 3).map((gap, idx) => (
            <div key={idx} className="p-4 border rounded-lg bg-muted/30">
              <p className="text-sm">
                <strong>Insight {idx + 1}:</strong> Team shows {gap.completion_rate < 50 ? "critical" : "moderate"} gaps in{" "}
                <strong>{gap.module_title}</strong> with only {gap.completion_rate}% completion.
                {gap.avg_score !== null && gap.avg_score < 60 && (
                  <> Average competency score is {gap.avg_score}%, below target.</>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                <strong>Recommendation:</strong> Schedule a group workshop or assign refresher materials.
              </p>
            </div>
          ))}
          {skillGaps.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No critical skill gaps detected. Team is performing well across all modules!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
