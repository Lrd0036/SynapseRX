// Import Deno's server and Supabase client library.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

// Define CORS headers to allow requests from any origin.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Start the Deno server to handle incoming requests.
serve(async (req) => {
  // Handle preflight OPTIONS requests for CORS.
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create an admin Supabase client to perform privileged operations.
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const { csvData } = await req.json();

    if (!csvData || !Array.isArray(csvData)) {
      throw new Error("Invalid CSV data format");
    }

    const results: {
      success: Array<{ email: string; role: string; action: string }>;
      errors: Array<{ email: string; error: string }>;
    } = {
      success: [],
      errors: [],
    };

    // Process each row in the CSV data.
    for (const row of csvData) {
      try {
        const Email = row.Email?.trim();
        const FirstName = row.FirstName?.trim();
        const LastName = row.LastName?.trim();
        const Password = row.Password?.trim();
        const AccuracyRate = row.AccuracyRate;
        const ProgressPercent = row.ProgressPercent;

        if (!Email || !FirstName || !LastName) {
          results.errors.push({
            email: Email || "Unknown",
            error: "Missing required fields (Email, FirstName, LastName)",
          });
          continue;
        }

        let userId: string;
        let userAction = "created";

        // **ROBUST UPSERT LOGIC**
        // Step 1: Attempt to create the user directly.
        const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: Email,
          password: Password,
          email_confirm: true,
          user_metadata: { full_name: `${FirstName} ${LastName}` },
        });

        if (createError) {
          // If creation fails because the user already exists, treat it as an update path.
          if (createError.message.includes("already been registered")) {
            const {
              data: { users },
              error: getUserError,
            } = await supabaseAdmin.auth.admin.listUsers();
            const existingUser = users?.find(u => u.email === Email);

            if (getUserError) throw new Error(`Failed to retrieve existing user ${Email}: ${getUserError.message}`);
            if (!existingUser) throw new Error(`Could not find user ${Email} after creation conflict.`);

            userId = existingUser.id;
            userAction = "updated";
            console.log(`User ${Email} exists. Updating associated data.`);
          } else {
            // If it's a different auth error (e.g., weak password), report it.
            throw createError;
          }
        } else {
          // If creation was successful, get the new user's ID.
          userId = createData.user.id;
        }

        // Step 2: With a valid userId, perform upserts on the public tables.
        const role = Email.includes("manager") ? "manager" : "technician";

        // Upsert profile data (update if ID exists, insert if not).
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .upsert({ id: userId, full_name: `${FirstName} ${LastName}`, email: Email }, { onConflict: "id" });
        if (profileError) throw new Error(`Profile upsert: ${profileError.message}`);

        // Upsert role data (update if user_id exists, insert if not).
        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: userId, role: role }, { onConflict: "user_id" });
        if (roleError) throw new Error(`Role upsert: ${roleError.message}`);

        // Upsert metrics data (update if user_id exists, insert if not).
        const { error: metricsError } = await supabaseAdmin.from("user_metrics").upsert(
          {
            user_id: userId,
            accuracy_rate: parseFloat(AccuracyRate) || 0,
            progress_percent: parseInt(ProgressPercent) || 0,
          },
          { onConflict: "user_id" },
        );
        if (metricsError) throw new Error(`Metrics upsert: ${metricsError.message}`);

        results.success.push({ email: Email, role, action: userAction });
      } catch (err) {
        results.errors.push({
          email: row.Email,
          error: err instanceof Error ? err.message : "An unknown error occurred during row processing.",
        });
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Fatal bulk import error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Server error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
