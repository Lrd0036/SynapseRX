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
    const results: {
      success: Array<{ email: string; role: string; action: string }>;
      errors: Array<{ email: string; error: string }>;
    } = {
      success: [],
      errors: [],
    };

    // Process each row in the CSV data.
    for (const row of csvData) {
      // Use a new try/catch block for each row to ensure one error doesn't stop the whole process.
      try {
        // Sanitize and trim all incoming string data from the CSV row.
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
          continue; // Skip to the next row.
        }

        let userId: string;
        let userAction = "created"; // Assume we are creating a new user by default.

        // **REVISED UPSERT LOGIC**
        // Step 1: Try to list users with this email to check if they exist
        const {
          data: { users: existingUsers },
          error: listError,
        } = await supabaseAdmin.auth.admin.listUsers();

        const existingUser = existingUsers?.find(u => u.email === Email);

        if (existingUser) {
          // If the user exists, we'll use their ID and mark the action as 'updated'.
          userId = existingUser.id;
          userAction = "updated";
          console.log(`User ${Email} already exists. Proceeding with update.`);
        } else {
          // If the user does not exist, we must create them. A password is required.
          if (!Password) {
            results.errors.push({ email: Email, error: "Missing password for new user creation." });
            continue;
          }

          const {
            data: { user: newUser },
            error: createError,
          } = await supabaseAdmin.auth.admin.createUser({
            email: Email,
            password: Password,
            email_confirm: true,
            user_metadata: {
              full_name: `${FirstName} ${LastName}`,
            },
          });

          if (createError) {
            throw new Error(`Auth creation error: ${createError.message}`);
          }
          
          if (!newUser) {
            throw new Error("User creation returned null");
          }
          
          userId = newUser.id;
        }

        // Step 2: Now that we have a userId, upsert the associated public data.
        const role = Email.includes("manager") ? "manager" : "technician";

        // Upsert profile data
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .upsert({ id: userId, full_name: `${FirstName} ${LastName}`, email: Email }, { onConflict: "id" });
        if (profileError) throw new Error(`Profile upsert failed: ${profileError.message}`);

        // Upsert role data
        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: userId, role: role }, { onConflict: "user_id" });
        if (roleError) throw new Error(`Role upsert failed: ${roleError.message}`);

        // Upsert metrics data
        const { error: metricsError } = await supabaseAdmin.from("user_metrics").upsert(
          {
            user_id: userId,
            accuracy_rate: parseFloat(AccuracyRate) || 0,
            progress_percent: parseInt(ProgressPercent) || 0,
          },
          { onConflict: "user_id" },
        );
        if (metricsError) throw new Error(`Metrics upsert failed: ${metricsError.message}`);

        // If all operations succeed, record the success.
        results.success.push({ email: Email, role, action: userAction });
      } catch (err) {
        // Catch any error within the loop for a specific row and add it to the results.
        results.errors.push({
          email: row.Email,
          error: err instanceof Error ? err.message : "An unknown error occurred during row processing.",
        });
      }
    }

    // Return a summary of the import process.
    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    // Handle any fatal errors that occur outside the loop (e.g., parsing JSON).
    console.error("Fatal bulk import error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Server error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
