import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { csvData } = await req.json();
    
    if (!csvData || !Array.isArray(csvData)) {
      throw new Error("Invalid CSV data format");
    }

    const results: {
      success: Array<{ email: string; role: string }>;
      errors: Array<{ email: string; error: string }>;
    } = {
      success: [],
      errors: [],
    };

    for (const row of csvData) {
      try {
        const { FirstName, LastName, Email, Password, AccuracyRate, ProgressPercent } = row;
        
        if (!Email || !Password || !FirstName || !LastName) {
          results.errors.push({ email: Email, error: "Missing required fields" });
          continue;
        }

        // Determine role based on email
        const isManager = Email.includes("manager");
        const role = isManager ? "manager" : "technician";

        // Create auth user with email_confirmed_at set
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: Email,
          password: Password,
          email_confirm: true,
          user_metadata: {
            full_name: `${FirstName} ${LastName}`,
          },
        });

        if (authError) {
          results.errors.push({ email: Email, error: authError.message });
          continue;
        }

        const userId = authData.user.id;

        // Create profile
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .insert({
            id: userId,
            full_name: `${FirstName} ${LastName}`,
            email: Email,
          });

        if (profileError) {
          results.errors.push({ email: Email, error: `Profile: ${profileError.message}` });
          continue;
        }

        // Create user role
        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .insert({
            user_id: userId,
            role: role,
          });

        if (roleError) {
          results.errors.push({ email: Email, error: `Role: ${roleError.message}` });
          continue;
        }

        // Create user metrics
        const { error: metricsError } = await supabaseAdmin
          .from("user_metrics")
          .insert({
            user_id: userId,
            accuracy_rate: parseFloat(AccuracyRate) || 0,
            progress_percent: parseInt(ProgressPercent) || 0,
          });

        if (metricsError) {
          results.errors.push({ email: Email, error: `Metrics: ${metricsError.message}` });
          continue;
        }

        results.success.push({ email: Email, role });
        console.log(`Successfully created user: ${Email} with role: ${role}`);
      } catch (err) {
        results.errors.push({ 
          email: row.Email, 
          error: err instanceof Error ? err.message : "Unknown error" 
        });
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Bulk import error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
