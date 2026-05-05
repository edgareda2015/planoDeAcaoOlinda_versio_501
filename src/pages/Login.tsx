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
    const msg = err.errors?.[0]?.message || err.message || "";
    if (msg.includes("is incorrect")) return "E-mail ou senha incorretos.";
    if (msg.includes("identifier is invalid")) return "E-mail inválido.";
    if (msg.includes("Password is too short")) return "A senha é muito curta.";
    if (msg.includes("is not valid")) return "Código de verificação inválido.";
    if (msg.includes("expired")) return "Código expirado. Tente fazer login novamente.";
    return "Erro ao realizar login. Verifique suas credenciais.";
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
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-6 rounded-xl shadow-lg transition-all active:scale-[0.98]" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Entrar
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
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (session) {
    return <Navigate to={from} replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white mb-4 shadow-xl border border-border overflow-hidden">
            <img 
              src="/uninassau-logo.png" 
              alt="UNINASSAU Logo" 
              className="w-full h-full object-contain p-2"
            />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight uppercase">Plano de Ação</h1>
          <p className="text-lg text-primary font-semibold uppercase tracking-widest">Captação</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Bem-vindo!</CardTitle>
            <CardDescription>Acesse sua conta para continuar.</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;