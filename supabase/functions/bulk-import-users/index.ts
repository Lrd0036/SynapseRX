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

        if (!Email || !FirstName || !LastName) {
          results.errors.push({ email: Email, error: "Missing required fields (Email, FirstName, LastName)" });
          continue; // Skip to the next row.
        }

        let userId: string;
        let userExists = false;

        // **UPSERT LOGIC START**
        // Step 1: Check if the user already exists in auth.users.
        const { data: existingUserData, error: existingUserError } =
          await supabaseAdmin.auth.admin.getUserByEmail(Email);

        if (existingUserError && existingUserError.message !== "User not found") {
          throw existingUserError;
        }

        if (existingUserData?.user) {
          // User exists, so we get their ID for updating.
          userId = existingUserData.user.id;
          userExists = true;
        } else {
          // User does not exist, so we create them.
          if (!Password) {
            results.errors.push({ email: Email, error: "Missing password for new user." });
            continue;
          }

          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: Email,
            password: Password,
            email_confirm: true,
            user_metadata: {
              full_name: `${FirstName} ${LastName}`,
            },
          });

          if (authError) {
            results.errors.push({ email: Email, error: `Auth creation: ${authError.message}` });
            continue;
          }
          userId = authData.user.id;
        }

        // Step 2: Use .upsert() to insert or update the public data.
        // The `onConflict` option tells Supabase to update if a record with the same primary key (id/user_id) exists.

        // Upsert the profile record.
        const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
          {
            id: userId,
            full_name: `${FirstName} ${LastName}`,
            email: Email,
          },
          { onConflict: "id" },
        );

        if (profileError) {
          results.errors.push({ email: Email, error: `Profile upsert: ${profileError.message}` });
          continue;
        }

        // Determine role and upsert it.
        const role = Email.includes("manager") ? "manager" : "technician";
        const { error: roleError } = await supabaseAdmin.from("user_roles").upsert(
          {
            user_id: userId,
            role: role,
          },
          { onConflict: "user_id" },
        ); // Use user_id as the conflict target

        if (roleError) {
          results.errors.push({ email: Email, error: `Role upsert: ${roleError.message}` });
          continue;
        }

        // Upsert the user metrics record.
        const { error: metricsError } = await supabaseAdmin.from("user_metrics").upsert(
          {
            user_id: userId,
            accuracy_rate: parseFloat(AccuracyRate) || 0,
            progress_percent: parseInt(ProgressPercent) || 0,
          },
          { onConflict: "user_id" },
        ); // Use user_id as the conflict target

        if (metricsError) {
          results.errors.push({ email: Email, error: `Metrics upsert: ${metricsError.message}` });
          continue;
        }

        results.success.push({ email: Email, role, action: userExists ? "updated" : "created" });
      } catch (err) {
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
    // Handle any top-level errors during the process.
    console.error("Fatal bulk import error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Server error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
