import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useSignIn } from '@clerk/clerk-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, ArrowLeft } from 'lucide-react';

// Schema Login
const LoginSchema = z.object({
  email: z.string().email({ message: 'Email inválido.' }),
  password: z.string().min(1, { message: 'Senha é obrigatória.' }),
});
type LoginFormValues = z.infer<typeof LoginSchema>;



// Login Form Component
const LoginForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/acoes";
  const { isLoaded, signIn, setActive } = useSignIn();
  const [isPending, setIsPending] = useState(false);
  
  const translateError = (err: any) => {
    console.error("Erro completo do Clerk no Login:", err);
    const msg = err.errors?.[0]?.message || err.message || "";
    const longMsg = err.errors?.[0]?.longMessage || "";
    const code = err.errors?.[0]?.code || "";
    
    // 1. Limite mensal de e-mails do Clerk
    if (msg.includes("monthly limit") || longMsg.includes("monthly limit")) {
      return "O limite mensal de e-mails de teste em desenvolvimento foi atingido. Para continuar testando gratuitamente, use e-mails com '+clerk_test' (Ex: teste+clerk_test@dominio.com) e o código padrão 424242!";
    }
    
    // 2. Senha incorreta ou dados incorretos
    if (msg.includes("is incorrect") || code === "form_password_incorrect") {
      return "E-mail ou senha incorretos. Por favor, tente novamente.";
    }
    
    // 3. E-mail inválido
    if (msg.includes("identifier is invalid") || code === "form_identifier_invalid") {
      return "O formato do e-mail digitado é inválido.";
    }
    
    // 4. Usuário não encontrado
    if (msg.includes("not found") || code === "form_identifier_not_found") {
      return "Este e-mail não está cadastrado em nosso sistema.";
    }
    
    // 5. Muitas requisições (Rate Limit)
    if (msg.includes("too many requests") || code === "too_many_requests") {
      return "Muitas tentativas. Por favor, aguarde alguns minutos antes de tentar novamente.";
    }
    
    // 6. Senha curta
    if (msg.includes("Password is too short") || code === "form_password_length") {
      return "A senha digitada é muito curta (deve ter no mínimo 8 caracteres).";
    }
    
    // 7. Requisitos de senha fraca
    if (msg.includes("pwned") || code === "form_password_pwned") {
      return "Esta senha foi identificada como fraca ou vazada na internet. Por favor, escolha outra.";
    }
    
    // 8. Código de verificação inválido ou incorreto
    if (msg.includes("is not valid") || msg.includes("code is incorrect")) {
      return "O código de verificação digitado é inválido ou está incorreto.";
    }
    
    // 9. Código expirado
    if (msg.includes("expired")) {
      return "O código de verificação expirou. Por favor, solicite um novo código.";
    }
    
    // 10. Conta bloqueada
    if (msg.includes("locked") || code === "user_locked") {
      return "Sua conta foi bloqueada temporariamente devido a muitas tentativas. Tente novamente mais tarde.";
    }
    
    // Fallback amigável em português
    return longMsg || msg || "Erro ao realizar login. Verifique suas credenciais.";
  };

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onLoginSubmit = async (values: LoginFormValues) => {
    if (!isLoaded) return;
    
    setIsPending(true);
    try {
      const result = await signIn.create({
        identifier: values.email,
        password: values.password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        toast.success('Login realizado com sucesso!');
        navigate(from, { replace: true });
      } else {
        console.log("Status do login:", result.status, result);
        const statusMsg = result.status === "needs_second_factor" 
          ? "Sua conta exige verificação no painel do Clerk (Client Trust). Por favor, desative essa opção no Clerk para entrar direto."
          : `Status de login não suportado: ${result.status}`;
        toast.error(statusMsg);
      }
    } catch (err: any) {
      console.error("Erro no login Clerk:", err);
      toast.error(translateError(err));
    } finally {
      setIsPending(false);
    }
  };




  // ---- Tela de Login Normal ----
  return (
    <Form {...loginForm}>
      <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
        <FormField control={loginForm.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl><Input type="email" placeholder="seu@email.com" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}/>
        <FormField control={loginForm.control} name="password" render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>Senha</FormLabel>
              <Button 
                variant="link" 
                className="px-0 font-normal text-xs text-primary"
                type="button"
                onClick={() => navigate('/forgot-password')}
              >
                Esqueceu a senha?
              </Button>
            </div>
            <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}/>
        <Button type="submit" variant="gold" className="w-full h-12 text-base font-extrabold shadow-lg transition-all active:scale-[0.98]" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#0B1727]" />}
          Entrar na Plataforma
        </Button>
      </form>
    </Form>
  );
};

// Main Login Page
const Login = () => {
  const { session, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/acoes";

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B1727]">
        <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  if (session) {
    return <Navigate to={from} replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B1727] p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white mb-4 shadow-2xl border border-amber-400/30 overflow-hidden">
            <img 
              src="/uninassau-logo.png" 
              alt="UNINASSAU Logo" 
              className="w-full h-full object-contain p-2"
            />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase">Plano de Ação</h1>
          <span className="text-xs text-[#D4AF37] font-extrabold uppercase tracking-[0.25em] mt-1">UNINASSAU</span>
        </div>
        <Card className="border border-white/10 bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl overflow-hidden">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl font-extrabold text-[#0B1727]">Acesso Corporativo</CardTitle>
            <CardDescription className="text-slate-500 text-xs">Digite suas credenciais institucionais para entrar.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <LoginForm />
          </CardContent>
        </Card>
        <p className="text-center text-xs text-slate-400 font-medium">
          © 2026 Ser Educacional • Desenvolvido por <span className="text-[#D4AF37] font-extrabold">V3L0Z</span>
        </p>
      </div>
    </div>
  );
};

export default Login;