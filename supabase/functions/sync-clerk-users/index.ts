import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Função auxiliar para validar UUID
const isValidUUID = (uuid: string) => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
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

    const CLERK_SECRET_KEY = Deno.env.get('CLERK_SECRET_KEY')

    if (!CLERK_SECRET_KEY) {
      throw new Error('CLERK_SECRET_KEY não encontrada')
    }

    const clerkResponse = await fetch('https://api.clerk.com/v1/users?limit=100', {
      headers: { 'Authorization': `Bearer ${CLERK_SECRET_KEY}` }
    })

    const clerkUsers = await clerkResponse.json()
    if (!clerkResponse.ok) throw new Error('Erro ao buscar usuários no Clerk')

    console.log(`Iniciando sincronização de ${clerkUsers.length} usuários.`);

    let processedCount = 0;

    for (const user of clerkUsers) {
      const email = user.email_addresses?.[0]?.email_address;
      const metadata = user.public_metadata || {};
      
      // Validar UUIDs para evitar erro de banco
      const regionalId = isValidUUID(metadata.regional_id) ? metadata.regional_id : null;
      const unitId = isValidUUID(metadata.unit_id) ? metadata.unit_id : null;
      const role = metadata.role || 'diretor_unidade';

      console.log(`Upserting: ${email} com role ${role}`);

      const { error } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: user.id,
          email: email,
          first_name: user.first_name || 'Usuário',
          last_name: user.last_name || '',
          role: role,
          regional_id: regionalId,
          unit_id: unitId,
          ativo: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })

      if (error) {
        console.error(`Falha ao salvar ${email}:`, error.message);
      } else {
        processedCount++;
      }
    }

    return new Response(JSON.stringify({ 
      message: 'OK', 
      foundInClerk: clerkUsers.length,
      processed: processedCount 
    }), {
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
