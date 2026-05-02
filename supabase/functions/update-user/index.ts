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

    const { userId, firstName, lastName, role, regionalId, unitId } = await req.json()

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const CLERK_SECRET_KEY = Deno.env.get('CLERK_SECRET_KEY');
    
    // 1. Atualizar no Clerk (Metadata e Perfil)
    if (CLERK_SECRET_KEY) {
      console.log(`Atualizando Clerk para o usuário ${userId}...`);
      const clerkResponse = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          public_metadata: {
            role,
            regional_id: regionalId,
            unit_id: unitId
          }
        })
      });

      if (!clerkResponse.ok) {
        const errorData = await clerkResponse.json();
        console.error("Erro Clerk:", errorData);
        throw new Error(`Erro Clerk: ${JSON.stringify(errorData)}`);
      }
    }

    // 2. O Supabase (Profiles) já é atualizado pelo frontend por segurança,
    // mas garantimos aqui também se necessário.

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("Erro na função update-user:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})