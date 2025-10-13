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

    // Get the CSV data from the request body.
    const { csvData } = await req.json();

    // Validate that the CSV data is a non-empty array.
    if (!csvData || !Array.isArray(csvData)) {
      throw new Error("Invalid CSV data format");
    }

    // Initialize an object to track successes and failures.
    const results = {
      success: [],
      errors: [],
    };

    // Process each row in the CSV data.
    for (const row of csvData) {
      try {
        // Destructure required fields from the row.
        const { FirstName, LastName, Email, Password, AccuracyRate, ProgressPercent } = row;

        // Ensure all required fields are present.
        if (!Email || !Password || !FirstName || !LastName) {
          results.errors.push({ email: Email, error: "Missing required fields" });
          continue; // Skip to the next row.
        }

        // Determine the user's role.
        const role = Email.includes("manager") ? "manager" : "technician";

        // Step 1: Create the authentication user.
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: Email,
          password: Password,
          email_confirm: true, // Mark email as confirmed automatically.
          user_metadata: {
            full_name: `${FirstName} ${LastName}`,
          },
        });

        if (authError) {
          results.errors.push({ email: Email, error: authError.message });
          continue;
        }

        // **CRITICAL FIX**: Get the user ID from the successful auth creation.
        const userId = authData.user.id;

        // Step 2: Create the corresponding public data records.
        // Create a profile record.
        const { error: profileError } = await supabaseAdmin.from("profiles").insert({
          id: userId,
          full_name: `${FirstName} ${LastName}`,
          email: Email,
        });

        if (profileError) {
          results.errors.push({ email: Email, error: `Profile Error: ${profileError.message}` });
          continue;
        }

        // Create a user role record.
        const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
          user_id: userId,
          role: role,
        });

        if (roleError) {
          results.errors.push({ email: Email, error: `Role Error: ${roleError.message}` });
          continue;
        }

        // Create a user metrics record.
        const { error: metricsError } = await supabaseAdmin.from("user_metrics").insert({
          user_id: userId,
          accuracy_rate: parseFloat(AccuracyRate) || 0,
          progress_percent: parseInt(ProgressPercent) || 0,
        });

        if (metricsError) {
          results.errors.push({ email: Email, error: `Metrics Error: ${metricsError.message}` });
          continue;
        }

        // If all steps succeed, log it and add to the success array.
        results.success.push({ email: Email, role });
        console.log(`Successfully created and configured user: ${Email}`);
      } catch (err) {
        results.errors.push({
          email: row.Email,
          error: err instanceof Error ? err.message : "An unknown error occurred",
        });
      }
    }

    // Return a summary of the import process.
    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    // Handle any top-level errors during the process.
    console.error("Fatal bulk import error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Server error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
