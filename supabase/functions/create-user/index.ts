import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create Supabase admin client using the secure service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user data from request body
    const { email, password, firstName, lastName, unit } = await req.json()

    if (!email || !password || !firstName || !lastName || !unit) {
      return new Response(JSON.stringify({ error: 'Email, password, first name, last name, and unit are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create the user in Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm user for simplicity
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        unit: unit,
      },
    })

    if (error) {
      throw error
    }

    // The 'handle_new_user' trigger in the database will automatically create the profile.

    return new Response(JSON.stringify({ user: data.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})