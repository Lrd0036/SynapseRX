import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch all necessary data for insights generation
    const [progressData, competencyData, modulesData, profilesData] = await Promise.all([
      supabaseClient.from('user_progress').select('*, profiles(full_name, email)'),
      supabaseClient.from('competency_records').select('*, profiles(full_name, email)'),
      supabaseClient.from('training_modules').select('*'),
      supabaseClient.from('profiles').select('*')
    ]);

    if (progressData.error || competencyData.error || modulesData.error || profilesData.error) {
      throw new Error('Failed to fetch data from database');
    }

    // Calculate statistics for AI context
    const userStats = calculateUserStats(progressData.data, competencyData.data, profilesData.data);
    const moduleStats = calculateModuleStats(progressData.data, modulesData.data);

    // Generate AI insights using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const systemPrompt = `You are an AI assistant for SynapseRX pharmacy training platform. Analyze the provided data and generate actionable coaching recommendations, learning path suggestions, and risk alerts for pharmacy managers.

Focus on:
- Identifying struggling learners who need coaching
- Suggesting personalized learning paths based on competency gaps
- Highlighting team-wide skill gaps
- Flagging compliance and certification risks
- Generating real-time risk alerts for high-risk modules

Provide concise, actionable recommendations that managers can immediately act upon.`;

    const userPrompt = `Analyze this pharmacy technician training data:

USER STATISTICS:
${JSON.stringify(userStats, null, 2)}

MODULE STATISTICS:
${JSON.stringify(moduleStats, null, 2)}

Generate insights in the following categories:
1. Coaching Tips - specific recommendations for struggling learners
2. Learning Paths - suggested next modules for each learner
3. Skill Gaps - team-wide areas needing improvement
4. Risk Alerts - urgent issues requiring immediate attention

Format as JSON with keys: coachingTips, learningPaths, skillGaps, riskAlerts`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiInsights = aiData.choices[0].message.content;

    // Try to parse AI response as JSON, fallback to structured format
    let parsedInsights;
    try {
      parsedInsights = JSON.parse(aiInsights);
    } catch {
      parsedInsights = {
        coachingTips: [],
        learningPaths: [],
        skillGaps: [],
        riskAlerts: []
      };
    }

    return new Response(
      JSON.stringify({
        insights: parsedInsights,
        rawStats: { userStats, moduleStats }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-insights:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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