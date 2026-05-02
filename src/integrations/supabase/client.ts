import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://kmdihubvvsmmleswbbrd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttZGlodWJ2dnNtbWxlc3diYnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2NzMxNjMsImV4cCI6MjA3NjI0OTE2M30.ECfidAgBtzM1hNkjqKWz941Cg3Ta0Pl4NWZMHnvTISE";

// Cliente Supabase sem interceptor de Clerk.
// A autenticação é feita pelo Clerk no frontend.
// O Supabase usa a chave anon com RLS desativado para acesso direto aos dados.
// Quando o RLS for reativado futuramente, será necessário configurar um JWT Template
// no Clerk que assine com o JWT Secret do Supabase.
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);