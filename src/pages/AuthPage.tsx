import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/useAuth';
import {
  loginSchema,
  registerSchema,
  type LoginFormValues,
  type RegisterFormValues,
} from '@/lib/validation';
import { Container } from '@/components/ui/Layout';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Logo } from '@/components/layout/Logo';
import { toast } from '@/components/ui/Toast';

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const navigate = useNavigate();
  const { login, register: registerAccount } = useAuth();

  const loginForm = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  const onLogin = (v: LoginFormValues) =>
    login.mutate(v, {
      onSuccess: () => { toast.success('Bem-vinda de volta!'); navigate('/minha-conta'); },
      onError: () => toast.error('Não foi possível entrar. Verifique seus dados.'),
    });

  const onRegister = (v: RegisterFormValues) =>
    registerAccount.mutate(
      { name: v.name, email: v.email, password: v.password },
      {
        onSuccess: () => { toast.success('Conta criada com sucesso!'); navigate('/minha-conta'); },
        onError: () => toast.error('Não foi possível criar a conta.'),
      },
    );

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-md">
        <div className="flex flex-col items-center">
          <Logo />
          <h1 className="mt-6 font-display text-3xl text-graphite">
            {mode === 'login' ? 'Entrar na sua conta' : 'Criar conta'}
          </h1>
          <p className="mt-2 text-center text-sm text-graphite-soft">
            {mode === 'login'
              ? 'Acompanhe pedidos, salve endereços e avalie produtos.'
              : 'Leva menos de um minuto e deixa suas próximas compras mais rápidas.'}
          </p>
        </div>

        <div className="mt-8 rounded-[var(--radius-xl)] border border-border bg-surface p-6 sm:p-8">
          {mode === 'login' ? (
            <form onSubmit={loginForm.handleSubmit(onLogin)} className="flex flex-col gap-4">
              <Field label="E-mail" error={loginForm.formState.errors.email?.message} required>
                {(id, d) => <Input id={id} type="email" autoComplete="email" aria-describedby={d} {...loginForm.register('email')} />}
              </Field>
              <Field label="Senha" error={loginForm.formState.errors.password?.message} required>
                {(id, d) => <Input id={id} type="password" autoComplete="current-password" aria-describedby={d} {...loginForm.register('password')} />}
              </Field>
              <button type="button" className="self-end text-sm text-cinnamon hover:underline">Esqueci minha senha</button>
              <Button type="submit" size="lg" fullWidth loading={login.isPending}>Entrar</Button>
            </form>
          ) : (
            <form onSubmit={registerForm.handleSubmit(onRegister)} className="flex flex-col gap-4">
              <Field label="Nome completo" error={registerForm.formState.errors.name?.message} required>
                {(id, d) => <Input id={id} autoComplete="name" aria-describedby={d} {...registerForm.register('name')} />}
              </Field>
              <Field label="E-mail" error={registerForm.formState.errors.email?.message} required>
                {(id, d) => <Input id={id} type="email" autoComplete="email" aria-describedby={d} {...registerForm.register('email')} />}
              </Field>
              <Field label="Senha" error={registerForm.formState.errors.password?.message} required>
                {(id, d) => <Input id={id} type="password" autoComplete="new-password" aria-describedby={d} {...registerForm.register('password')} />}
              </Field>
              <Field label="Confirmar senha" error={registerForm.formState.errors.confirm?.message} required>
                {(id, d) => <Input id={id} type="password" autoComplete="new-password" aria-describedby={d} {...registerForm.register('confirm')} />}
              </Field>
              <label className="flex items-start gap-2.5 text-sm text-graphite-soft">
                <input type="checkbox" {...registerForm.register('consent')} className="mt-0.5 h-4 w-4 rounded border-border accent-terracotta" />
                Quero receber novidades e ofertas por e-mail (opcional).
              </label>
              <Button type="submit" size="lg" fullWidth loading={registerAccount.isPending}>Criar conta</Button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-graphite-soft">
          {mode === 'login' ? 'Ainda não tem conta?' : 'Já tem uma conta?'}{' '}
          <button
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="font-medium text-terracotta hover:underline"
          >
            {mode === 'login' ? 'Criar agora' : 'Entrar'}
          </button>
        </p>
      </div>
    </Container>
  );
}
