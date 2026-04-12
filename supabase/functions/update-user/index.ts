import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId, firstName, lastName } = await req.json()

    if (!userId || !firstName || !lastName) {
      return new Response(JSON.stringify({ error: 'User ID, first name, and last name are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Update user metadata in auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { first_name: firstName, last_name: lastName },
    })

    if (authError) throw authError

    // Update the public.profiles table
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ first_name: firstName, last_name: lastName })
      .eq('id', userId)

    if (profileError) throw profileError

    return new Response(JSON.stringify({ user: authData.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})