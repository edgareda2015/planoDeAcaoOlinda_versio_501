import { useState, useMemo } from 'react';
import { useSignIn } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, GraduationCap, ArrowLeft, Mail, Key, Hash, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ForgotPassword() {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [isPending, setIsPending] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  
  const { isLoaded, signIn, setActive } = useSignIn();
  const navigate = useNavigate();

  // Função para traduzir erros do Clerk
  const translateError = (err: any) => {
    const msg = err.errors?.[0]?.message || "";
    if (msg.includes("is incorrect")) return "O código ou a senha estão incorretos.";
    if (msg.includes("identifier is invalid")) return "E-mail inválido.";
    if (msg.includes("too many requests")) return "Muitas tentativas. Tente novamente mais tarde.";
    if (msg.includes("Password is too short")) return "A senha é muito curta.";
    return "Ocorreu um erro. Por favor, tente novamente.";
  };

  // Regras de validação de senha
  const passwordRules = useMemo(() => [
    { label: "Mínimo 8 caracteres", met: password.length >= 8 },
    { label: "Uma letra maiúscula", met: /[A-Z]/.test(password) },
    { label: "Uma letra minúscula", met: /[a-z]/.test(password) },
    { label: "Um caractere especial (@$!%*?&)", met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ], [password]);

  const isPasswordValid = passwordRules.every(rule => rule.met);
  const isCodeValid = code.length >= 6;

  const onSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !email) return;
    
    setIsPending(true);
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      setStep('code');
      toast.success('Código enviado!', { description: 'Verifique seu e-mail.' });
    } catch (err: any) {
      toast.error(translateError(err));
    } finally {
      setIsPending(false);
    }
  };

  const onResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !code || !isPasswordValid) return;
    
    setIsPending(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: code,
        password: password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        toast.success('Senha alterada com sucesso!');
        navigate('/');
      }
    } catch (err: any) {
      toast.error(translateError(err));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow mb-4 shadow-lg">
            <GraduationCap className="h-9 w-9 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight uppercase">Plano de Ação</h1>
          <p className="text-lg text-primary font-semibold uppercase tracking-widest">Captação</p>
        </div>

        <Card className="border-none shadow-2xl">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => step === 'email' ? navigate('/login') : setStep('email')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-2xl">Recuperar Senha</CardTitle>
            </div>
            <CardDescription>
              {step === 'email' 
                ? 'Informe seu e-mail para receber o código de recuperação.' 
                : 'Insira o código enviado ao seu e-mail e sua nova senha.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'email' ? (
              <form onSubmit={onSendCode} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      className="pl-10" 
                      type="email"
                      placeholder="seu@email.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-6 rounded-xl shadow-lg" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar Código
                </Button>
              </form>
            ) : (
              <form onSubmit={onResetPassword} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Código de Verificação</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      className="pl-10"
                      name="clerk-otp-code"
                      placeholder="Digite o código" 
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      autoComplete="one-time-code"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nova Senha</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        className="pl-10" 
                        type="password" 
                        placeholder="Crie uma senha forte" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                      />
                    </div>
                  </div>

                  {/* Requisitos de Senha Visuais */}
                  <div className="grid grid-cols-1 gap-2 p-3 rounded-lg bg-secondary/50 border border-border/50">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Requisitos de Segurança:</p>
                    {passwordRules.map((rule, index) => (
                      <div key={index} className="flex items-center gap-2">
                        {rule.met ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <X className="h-3 w-3 text-muted-foreground/40" />
                        )}
                        <span className={cn(
                          "text-xs transition-all",
                          rule.met ? "text-green-600 line-through opacity-70" : "text-muted-foreground"
                        )}>
                          {rule.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className={cn(
                    "w-full font-bold py-6 rounded-xl shadow-lg transition-all",
                    isPasswordValid && isCodeValid ? "bg-primary hover:bg-primary/90 text-white" : "bg-muted text-muted-foreground cursor-not-allowed"
                  )} 
                  disabled={isPending || !isPasswordValid || !isCodeValid}
                >
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isPasswordValid && isCodeValid ? 'Redefinir Senha' : 'Siga os requisitos acima'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
