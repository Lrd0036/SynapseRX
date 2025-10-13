// Import the 'serve' function from the Deno standard library for creating an HTTP server.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// Import the 'createClient' function from the Supabase JavaScript library.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

// Define CORS headers to allow cross-origin requests.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Start the server and handle incoming requests.
serve(async (req) => {
  // Respond to preflight OPTIONS requests with the CORS headers.
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a new Supabase client with admin privileges using environment variables.
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

    // Parse the JSON body of the request to get the CSV data.
    const { csvData } = await req.json();

    // Check if the CSV data is valid.
    if (!csvData || !Array.isArray(csvData)) {
      throw new Error("Invalid CSV data format");
    }

    // Initialize an object to store the results of the import process.
    const results: {
      success: Array<{ email: string; role: string }>;
      errors: Array<{ email: string; error: string }>;
    } = {
      success: [],
      errors: [],
    };

    // Iterate over each row of the CSV data.
    for (const row of csvData) {
      try {
        // Destructure the required fields from the row.
        const { FirstName, LastName, Email, Password, AccuracyRate, ProgressPercent } = row;

        // Check for missing required fields.
        if (!Email || !Password || !FirstName || !LastName) {
          results.errors.push({ email: Email, error: "Missing required fields" });
          continue;
        }

        // Determine the user's role based on their email address.
        const isManager = Email.includes("manager");
        const role = isManager ? "manager" : "technician";

        // Create a new user in the Supabase auth system.
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: Email,
          password: Password,
          email_confirm: true,
          user_metadata: {
            full_name: `${FirstName} ${LastName}`,
          },
        });

        // If there was an error creating the user, add it to the errors array.
        if (authError) {
          results.errors.push({ email: Email, error: authError.message });
          continue;
        }

        const userId = authData.user.id;

        // Create a new profile for the user in the 'profiles' table.
        const { error: profileError } = await supabaseAdmin.from("profiles").insert({
          id: userId,
          full_name: `${FirstName} ${LastName}`,
          email: Email,
        });

        // If there was an error creating the profile, add it to the errors array.
        if (profileError) {
          results.errors.push({ email: Email, error: `Profile: ${profileError.message}` });
          continue;
        }

        // Assign a role to the user in the 'user_roles' table.
        const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
          user_id: userId,
          role: role,
        });

        // If there was an error assigning the role, add it to the errors array.
        if (roleError) {
          results.errors.push({ email: Email, error: `Role: ${roleError.message}` });
          continue;
        }

        // Create a new record for the user in the 'user_metrics' table.
        const { error: metricsError } = await supabaseAdmin.from("user_metrics").insert({
          user_id: userId,
          accuracy_rate: parseFloat(AccuracyRate) || 0,
          progress_percent: parseInt(ProgressPercent) || 0,
        });

        // If there was an error creating the metrics, add it to the errors array.
        if (metricsError) {
          results.errors.push({ email: Email, error: `Metrics: ${metricsError.message}` });
          continue;
        }

        // If everything was successful, add the user to the success array.
        results.success.push({ email: Email, role });
        console.log(`Successfully created user: ${Email} with role: ${role}`);
      } catch (err) {
        // If there was an unexpected error, add it to the errors array.
        results.errors.push({
          email: row.Email,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    // Return the results of the import process as a JSON response.
    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    // If there was a fatal error, log it and return an error response.
    console.error("Bulk import error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
