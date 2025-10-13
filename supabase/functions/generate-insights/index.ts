import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all necessary data
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email");

    const { data: modules } = await supabase
      .from("training_modules")
      .select("*");

    const { data: progress } = await supabase
      .from("user_progress")
      .select("*");

    const { data: competencies } = await supabase
      .from("competency_records")
      .select("*")
      .order("assessed_at", { ascending: false });

    // Calculate group-based statistics
    const groups = [
      {
        name: "Group 1",
        technicians: profiles?.filter((p) =>
          ["Maria Chen", "Jacob Lee", "Sarah Patel"].includes(p.full_name)
        ),
      },
      {
        name: "Group 2",
        technicians: profiles?.filter((p) =>
          ["Mike Rodriguez", "James Park", "Olga Smirnova"].includes(p.full_name)
        ),
      },
      {
        name: "Group 3",
        technicians: profiles?.filter((p) =>
          ["John Smith", "Alicia Kim", "Deepa Rao", "Franco Ortiz"].includes(
            p.full_name
          )
        ),
      },
    ];

    // Generate recommendations
    const recommendations = [];

    // Check group performance
    for (const group of groups) {
      for (const module of modules || []) {
        const moduleCompetencies = competencies?.filter(
          (c) =>
            group.technicians?.some((t) => t.id === c.user_id) &&
            (c.competency_name.toLowerCase().includes(module.title.toLowerCase().split(" ")[0]) ||
             c.competency_name.toLowerCase().includes(module.title.toLowerCase().split(" ")[1] || ""))
        ) || [];

        if (moduleCompetencies.length > 0) {
          const lowScorers = moduleCompetencies.filter((c) => c.score < 60);
          const percentageLowScorers =
            (lowScorers.length / moduleCompetencies.length) * 100;

          if (percentageLowScorers >= 60) {
            recommendations.push({
              type: "group_gap",
              severity: "high",
              group: group.name,
              module: module.title,
              message: `Technicians in ${group.name} are behind in ${module.title}—assign more training.`,
              details: `${lowScorers.length} out of ${moduleCompetencies.length} technicians scored below 60%.`,
              action: "assign_training",
              module_id: module.id,
              group_name: group.name,
            });
          }
        }
      }
    }

    // Check individual technician performance
    for (const profile of profiles || []) {
      const userCompetencies = competencies
        ?.filter((c) => c.user_id === profile.id)
        .sort((a, b) => new Date(b.assessed_at).getTime() - new Date(a.assessed_at).getTime());

      if (userCompetencies && userCompetencies.length >= 2) {
        const recentTwo = userCompetencies.slice(0, 2);
        if (recentTwo.every((c) => c.score < 50)) {
          recommendations.push({
            type: "individual_support",
            severity: "critical",
            technician_id: profile.id,
            technician_name: profile.full_name,
            message: `Technician ${profile.full_name} needs targeted support—schedule 1:1 coaching or remedial training.`,
            details: `Last two assessments: ${recentTwo[1].competency_name} (${recentTwo[1].score}%), ${recentTwo[0].competency_name} (${recentTwo[0].score}%).`,
            action: "schedule_coaching",
            email: profile.email,
          });
        }
      }
    }

    // Trend analysis - check if scores improved in the last week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    for (const module of modules || []) {
      const moduleCompetencies = competencies?.filter(
        (c) =>
          c.competency_name.toLowerCase().includes(module.title.toLowerCase().split(" ")[0]) ||
          c.competency_name.toLowerCase().includes(module.title.toLowerCase().split(" ")[1] || "")
      ) || [];

      const recentScores = moduleCompetencies.filter(
        (c) => new Date(c.assessed_at) >= oneWeekAgo
      );
      const olderScores = moduleCompetencies.filter(
        (c) => new Date(c.assessed_at) < oneWeekAgo
      );

      if (recentScores.length > 0 && olderScores.length > 0) {
        const recentAvg =
          recentScores.reduce((sum, c) => sum + c.score, 0) / recentScores.length;
        const olderAvg =
          olderScores.reduce((sum, c) => sum + c.score, 0) / olderScores.length;
        const improvement = Math.round(recentAvg - olderAvg);

        if (improvement > 10) {
          recommendations.push({
            type: "trend_positive",
            severity: "info",
            module: module.title,
            message: `${module.title} scores improved by ${improvement}% last week after targeted interventions.`,
            details: `Average score increased from ${Math.round(olderAvg)}% to ${Math.round(recentAvg)}%.`,
            action: "send_encouragement",
            module_id: module.id,
          });
        } else if (improvement < -10) {
          recommendations.push({
            type: "trend_negative",
            severity: "warning",
            module: module.title,
            message: `${module.title} scores declined by ${Math.abs(improvement)}% last week—review training approach.`,
            details: `Average score decreased from ${Math.round(olderAvg)}% to ${Math.round(recentAvg)}%.`,
            action: "review_training",
            module_id: module.id,
          });
        }
      }
    }

    // Use AI to enrich recommendations with additional context
    const aiPrompt = `You are an educational analytics AI. Given the following training data, provide 2-3 additional actionable insights or recommendations for pharmacy technician managers:

Training Data Summary:
- Total Technicians: ${profiles?.length || 0}
- Total Modules: ${modules?.length || 0}
- Recent Competency Assessments: ${competencies?.slice(0, 10).map(c => `${c.competency_name}: ${c.score}%`).join(", ")}

Current Recommendations:
${recommendations.slice(0, 3).map(r => `- ${r.message}`).join("\n")}

Provide brief, actionable recommendations (1-2 sentences each) focusing on:
1. Specific training interventions
2. Individual coaching strategies
3. Team development opportunities

Format as a numbered list.`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "You are an educational analytics AI providing actionable insights for pharmacy technician training programs.",
            },
            {
              role: "user",
              content: aiPrompt,
            },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      console.error("AI response error:", await aiResponse.text());
    } else {
      const aiData = await aiResponse.json();
      const aiInsights = aiData.choices?.[0]?.message?.content || "";

      if (aiInsights) {
        recommendations.push({
          type: "ai_insights",
          severity: "info",
          message: "AI-Generated Strategic Recommendations",
          details: aiInsights,
          action: "review",
        });
      }
    }

    return new Response(
      JSON.stringify({
        recommendations: recommendations.slice(0, 10),
        summary: {
          total_technicians: profiles?.length || 0,
          total_modules: modules?.length || 0,
          critical_issues: recommendations.filter((r) => r.severity === "critical").length,
          high_priority: recommendations.filter((r) => r.severity === "high").length,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-insights:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function calculateUserStats(progressData: any[], competencyData: any[], profilesData: any[]) {
  const userMap = new Map();
  
  profilesData.forEach(profile => {
    userMap.set(profile.id, {
      id: profile.id,
      name: profile.full_name,
      email: profile.email,
      completedModules: 0,
      totalModules: 0,
      averageScore: 0,
      competencies: []
    });
  });

  progressData.forEach(progress => {
    const user = userMap.get(progress.user_id);
    if (user) {
      user.totalModules++;
      if (progress.completed) user.completedModules++;
    }
  });

  competencyData.forEach(comp => {
    const user = userMap.get(comp.user_id);
    if (user) {
      user.competencies.push({
        name: comp.competency_name,
        score: comp.score
      });
    }
  });

  // Calculate average scores
  userMap.forEach(user => {
    if (user.competencies.length > 0) {
      const totalScore = user.competencies.reduce((sum: number, c: any) => sum + c.score, 0);
      user.averageScore = Math.round(totalScore / user.competencies.length);
    }
  });

  return Array.from(userMap.values());
}

function calculateModuleStats(progressData: any[], modulesData: any[]) {
  const moduleMap = new Map();
  
  modulesData.forEach(module => {
    moduleMap.set(module.id, {
      id: module.id,
      title: module.title,
      category: module.category,
      totalUsers: 0,
      completedUsers: 0,
      completionRate: 0
    });
  });

  progressData.forEach(progress => {
    const module = moduleMap.get(progress.module_id);
    if (module) {
      module.totalUsers++;
      if (progress.completed) module.completedUsers++;
    }
  });

  moduleMap.forEach(module => {
    if (module.totalUsers > 0) {
      module.completionRate = Math.round((module.completedUsers / module.totalUsers) * 100);
    }
  });

  return Array.from(moduleMap.values());
}