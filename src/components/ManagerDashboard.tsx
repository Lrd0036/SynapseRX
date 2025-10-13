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
import { Users, BookOpen, Award, TrendingUp, AlertTriangle, Search, UserCog, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  useEffect(() => {
    const fetchManagerData = async () => {
      // Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email");

      // Fetch modules
      const { data: modules } = await supabase
        .from("training_modules")
        .select("id, title");

      // Fetch all progress
      const { data: allProgress } = await supabase
        .from("user_progress")
        .select("*");

      // Fetch all competencies
      const { data: competencies } = await supabase
        .from("competency_records")
        .select("*");

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

      setAnalytics({
        totalUsers: profiles?.length || 0,
        totalModules: modules?.length || 0,
        averageCompletion,
        averageCompetencyScore,
      });

      // Build technician roster with detailed stats
      const technicianData: TechnicianData[] = (profiles || []).map((profile) => {
        const userProgress = allProgress?.filter((p) => p.user_id === profile.id) || [];
        const userCompetencies = competencies?.filter((c) => c.user_id === profile.id) || [];

        const completed = userProgress.filter((p) => p.completed).length;
        const inProgress = userProgress.filter((p) => !p.completed && p.progress_percentage > 0).length;
        const total = modules?.length || 0;
        const avgScore = userCompetencies.length
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
          completion_percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      });

      setTechnicians(technicianData);
      setFilteredTechnicians(technicianData);

      // Calculate skill gaps by module
      const moduleGaps = (modules || []).map((module) => {
        const moduleProgress = allProgress?.filter((p) => p.module_id === module.id) || [];
        const completionRate = moduleProgress.length > 0
          ? Math.round((moduleProgress.filter((p) => p.completed).length / (profiles?.length || 1)) * 100)
          : 0;

        // Find average scores for this module's competencies
        const moduleCompetencies = competencies?.filter((c) => 
          c.competency_name.toLowerCase().includes(module.title.toLowerCase().split(' ')[0])
        ) || [];
        
        const avgModuleScore = moduleCompetencies.length > 0
          ? Math.round(moduleCompetencies.reduce((sum, c) => sum + c.score, 0) / moduleCompetencies.length)
          : null;

        return {
          module_id: module.id,
          module_title: module.title,
          completion_rate: completionRate,
          avg_score: avgModuleScore,
          is_gap: completionRate < 60 || (avgModuleScore !== null && avgModuleScore < 60),
        };
      });

      setSkillGaps(moduleGaps.filter((g) => g.is_gap).sort((a, b) => a.completion_rate - b.completion_rate));
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
            <CardTitle className="text-sm font-medium">Total Technicians</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Active learners</p>
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

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Completion</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.averageCompletion}%</div>
            <p className="text-xs text-muted-foreground">Team progress</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Competency</CardTitle>
            <Award className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.averageCompetencyScore}%</div>
            <p className="text-xs text-muted-foreground">Performance score</p>
          </CardContent>
        </Card>
      </div>

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
