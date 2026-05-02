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

    const { email, firstName, lastName, role, regionalId, unitId } = await req.json()
    const CLERK_SECRET_KEY = Deno.env.get('CLERK_SECRET_KEY')

    if (!CLERK_SECRET_KEY) {
      throw new Error('CLERK_SECRET_KEY não configurada no Supabase')
    }

    console.log(`Cadastrando ${email} no Clerk...`);

    // 1. Criar o usuário no Clerk (Senha aleatória, ignora força de senha)
    const tempPassword = Math.random().toString(36).slice(-12) + "A1!";

    const clerkResponse = await fetch('https://api.clerk.com/v1/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_address: [email],
        first_name: firstName,
        last_name: lastName,
        password: tempPassword,
        public_metadata: {
          role,
          regional_id: regionalId,
          unit_id: unitId,
        },
        skip_password_requirement: true,
        skip_password_checks: true,
      })
    })

    const clerkData = await clerkResponse.json()

    if (!clerkResponse.ok) {
      console.error("Erro Clerk:", clerkData);
      return new Response(JSON.stringify({ error: clerkData.errors?.[0]?.long_message || clerkData.errors?.[0]?.message || 'Erro no Clerk' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const clerkUserId = clerkData.id;

    // 2. Criar o Perfil no Supabase IMEDIATAMENTE
    console.log(`Criando perfil no Supabase para ${clerkUserId}...`);
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: clerkUserId,
        first_name: firstName,
        last_name: lastName,
        role: role,
        regional_id: regionalId,
        unit_id: unitId || null,
        ativo: true
      })

    if (profileError) {
      console.error("Erro ao criar perfil:", profileError);
      // Não travamos o processo se o perfil falhar (o auto-provisionamento no login resolve depois),
      // mas avisamos no log.
    }

    return new Response(JSON.stringify({ message: 'Usuário cadastrado com sucesso', user: clerkData }), {
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
