import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CheckCircle, Eye, EyeSlash } from '@phosphor-icons/react';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/lib/api';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  type ForgotPasswordFormValues,
  type LoginFormValues,
  type RegisterFormValues,
} from '@/lib/validation';
import { Container } from '@/components/ui/Layout';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Logo } from '@/components/layout/Logo';
import { toast } from '@/components/ui/Toast';
import { usePageMeta } from '@/hooks/usePageMeta';
import { analytics } from '@/lib/analytics';

type Mode = 'login' | 'register' | 'forgot';

const TITLES: Record<Mode, { title: string; subtitle: string }> = {
  login: {
    title: 'Entrar na sua conta',
    subtitle: 'Acompanhe pedidos, salve endereços e finalize a compra mais rápido.',
  },
  register: {
    title: 'Criar conta',
    subtitle: 'Leva menos de um minuto e deixa suas próximas compras mais rápidas.',
  },
  forgot: {
    title: 'Recuperar senha',
    subtitle: 'Enviamos um link de redefinição para o seu e-mail.',
  },
};

export function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  usePageMeta({ title: TITLES[mode].title, noIndex: true });

  return (
    <Container className="py-section-sm">
      <div className="mx-auto max-w-md">
        <div className="flex flex-col items-center text-center">
          <Logo size="lg" animated={false} />
          <h1 className="mt-6 font-display text-display-md text-graphite">{TITLES[mode].title}</h1>
          <p className="mt-2 text-fluid-base text-graphite-soft">{TITLES[mode].subtitle}</p>
        </div>

        <div className="mt-8 rounded-[var(--radius-xl)] border border-border bg-surface p-5 sm:p-8">
          {mode === 'login' && <LoginForm onForgot={() => setMode('forgot')} />}
          {mode === 'register' && <RegisterForm />}
          {mode === 'forgot' && <ForgotForm onBack={() => setMode('login')} />}
        </div>

        {mode !== 'forgot' && (
          <p className="mt-6 text-center text-sm text-graphite-soft">
            {mode === 'login' ? 'Ainda não tem conta?' : 'Já tem uma conta?'}{' '}
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="font-medium text-terracotta hover:underline"
            >
              {mode === 'login' ? 'Criar agora' : 'Entrar'}
            </button>
          </p>
        )}
      </div>
    </Container>
  );
}

/* -------------------------------------------------------------------------- */

function LoginForm({ onForgot }: { onForgot: () => void }) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const form = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = (values: LoginFormValues) =>
    login.mutate(values, {
      onSuccess: () => {
        analytics.login();
        navigate('/minha-conta');
      },
      onError: (error) =>
        toast.error({
          title: 'Não foi possível entrar',
          // A mensagem do backend costuma ser mais util que um texto generico.
          description: (error as Error).message || 'Confira o e-mail e a senha e tente de novo.',
        }),
    });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Field label="E-mail" error={form.formState.errors.email?.message} required>
        {(id, describedBy) => (
          <Input
            id={id}
            type="email"
            autoComplete="email"
            aria-describedby={describedBy}
            {...form.register('email')}
          />
        )}
      </Field>

      <PasswordField
        label="Senha"
        autoComplete="current-password"
        error={form.formState.errors.password?.message}
        registration={form.register('password')}
      />

      <button
        type="button"
        onClick={onForgot}
        className="-mt-1 self-end text-sm text-cinnamon hover:underline"
      >
        Esqueci minha senha
      </button>

      <Button type="submit" size="lg" fullWidth loading={login.isPending}>
        Entrar
      </Button>
    </form>
  );
}

function RegisterForm() {
  const navigate = useNavigate();
  const { register: registerAccount } = useAuth();
  const form = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = (values: RegisterFormValues) =>
    registerAccount.mutate(
      {
        name: values.name,
        email: values.email,
        password: values.password,
        // O aceite finalmente sai da tela: antes o checkbox nao ia a lugar nenhum.
        marketingConsent: values.consent ?? false,
      },
      {
        onSuccess: () => {
          analytics.signUp();
          toast.success('Conta criada com sucesso!');
          navigate('/minha-conta');
        },
        onError: (error) =>
          toast.error({
            title: 'Não foi possível criar a conta',
            description: (error as Error).message || 'Tente novamente em instantes.',
          }),
      },
    );

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Field label="Nome completo" error={form.formState.errors.name?.message} required>
        {(id, describedBy) => (
          <Input id={id} autoComplete="name" aria-describedby={describedBy} {...form.register('name')} />
        )}
      </Field>

      <Field label="E-mail" error={form.formState.errors.email?.message} required>
        {(id, describedBy) => (
          <Input
            id={id}
            type="email"
            autoComplete="email"
            aria-describedby={describedBy}
            {...form.register('email')}
          />
        )}
      </Field>

      <PasswordField
        label="Senha"
        autoComplete="new-password"
        hint="Mínimo de 6 caracteres"
        error={form.formState.errors.password?.message}
        registration={form.register('password')}
      />

      <PasswordField
        label="Confirmar senha"
        autoComplete="new-password"
        error={form.formState.errors.confirm?.message}
        registration={form.register('confirm')}
      />

      <label className="flex items-start gap-2.5 text-sm text-graphite-soft">
        <input
          type="checkbox"
          {...form.register('consent')}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-terracotta"
        />
        Quero receber novidades e ofertas por e-mail (opcional, pode cancelar quando quiser).
      </label>

      <Button type="submit" size="lg" fullWidth loading={registerAccount.isPending}>
        Criar conta
      </Button>
    </form>
  );
}

function ForgotForm({ onBack }: { onBack: () => void }) {
  const [sentTo, setSentTo] = useState<string>();
  const [devToken, setDevToken] = useState<string>();
  const form = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const request = useMutation({
    mutationFn: (values: ForgotPasswordFormValues) => authService.requestPasswordReset(values.email),
    onSuccess: (result, values) => {
      setSentTo(values.email);
      setDevToken(result?.devResetToken);
    },
    onError: () => toast.error('Não foi possível enviar o link agora. Tente novamente.'),
  });

  if (sentTo) {
    return (
      <div className="flex flex-col items-center text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-success-soft text-success">
          <CheckCircle size={28} weight="light" aria-hidden />
        </span>
        <p className="mt-4 font-medium text-graphite">Link enviado</p>
        <p className="mt-1 text-sm text-graphite-soft">
          Se existir uma conta com <strong className="text-graphite">{sentTo}</strong>, o link de
          redefinição chega em instantes. Confira também o spam.
        </p>

        {devToken && (
          /* Só aparece em desenvolvimento, quando o backend devolve o token —
             permite testar o fluxo sem caixa de entrada configurada. */
          <a
            href={`/redefinir-senha?token=${encodeURIComponent(devToken)}&email=${encodeURIComponent(sentTo)}`}
            className="mt-4 break-all rounded-[var(--radius-md)] bg-cream-light px-3 py-2 text-xs font-medium text-cinnamon hover:underline"
          >
            Ambiente de desenvolvimento: abrir link de redefinição
          </a>
        )}

        <button
          type="button"
          onClick={onBack}
          className="mt-6 inline-flex min-h-touch items-center gap-1.5 text-sm font-medium text-terracotta hover:underline"
        >
          <ArrowLeft size={16} aria-hidden /> Voltar para o login
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit((values) => request.mutate(values))} className="flex flex-col gap-4">
      <Field label="E-mail da conta" error={form.formState.errors.email?.message} required>
        {(id, describedBy) => (
          <Input
            id={id}
            type="email"
            autoComplete="email"
            aria-describedby={describedBy}
            {...form.register('email')}
          />
        )}
      </Field>

      <Button type="submit" size="lg" fullWidth loading={request.isPending}>
        Enviar link de redefinição
      </Button>

      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-touch items-center justify-center gap-1.5 text-sm font-medium text-graphite-soft hover:text-graphite"
      >
        <ArrowLeft size={16} aria-hidden /> Voltar para o login
      </button>
    </form>
  );
}

/** Campo de senha com botao de revelar — reduz erro de digitacao no celular. */
export function PasswordField({
  label,
  hint,
  error,
  autoComplete,
  registration,
}: {
  label: string;
  hint?: string;
  error?: string;
  autoComplete: string;
  registration: ReturnType<ReturnType<typeof useForm>['register']>;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <Field label={label} hint={hint} error={error} required>
      {(id, describedBy) => (
        <div className="relative">
          <Input
            id={id}
            type={visible ? 'text' : 'password'}
            autoComplete={autoComplete}
            aria-describedby={describedBy}
            className="pr-12"
            {...registration}
          />
          <button
            type="button"
            onClick={() => setVisible((value) => !value)}
            aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={visible}
            className="tactile absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-graphite-soft hover:text-graphite"
          >
            {visible ? <EyeSlash size={18} /> : <Eye size={18} />}
          </button>
        </div>
      )}
    </Field>
  );
}
