import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, GraduationCap } from 'lucide-react';

// Schema
const LoginSchema = z.object({
  email: z.string().email({ message: 'Email inválido.' }),
  password: z.string().min(1, { message: 'Senha é obrigatória.' }),
});

type LoginFormValues = z.infer<typeof LoginSchema>;

// Login Form Component
const LoginForm = () => {
  const navigate = useNavigate();
  const [isPending, setIsPending] = useState(false);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsPending(true);
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Login realizado com sucesso!');
      navigate('/');
    }
    setIsPending(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl><Input type="email" placeholder="seu@email.com" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}/>
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem>
            <FormLabel>Senha</FormLabel>
            <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}/>
        <Button type="submit" className="w-full" disabled={isPending}>
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow mb-4 shadow-lg">
            <GraduationCap className="h-9 w-9 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">UNINASSAU</h1>
          <p className="text-lg text-muted-foreground">OLINDA</p>
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