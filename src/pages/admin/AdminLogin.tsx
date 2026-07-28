import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { ShieldCheck, LockKey, Sparkle } from '@phosphor-icons/react';
import { useAuth } from '@/hooks/useAuth';
import { USE_MOCK } from '@/lib/api/config';
import { Logo } from '@/components/layout/Logo';
import { Banner, Button, Field, Input, toast } from '@/components/admin/ui';

interface Values {
  email: string;
  password: string;
  otp: string;
}

const HIGHLIGHTS = [
  'Catálogo, pedidos e estoque em um só lugar',
  'Cupons, promoções e relatórios de vendas',
  'Integrações de frete, pagamento e fiscal',
];

export function AdminLogin() {
  const navigate = useNavigate();
  const { adminLogin } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    defaultValues: { email: '', password: '', otp: '' },
  });

  const onSubmit = (v: Values) =>
    adminLogin.mutate(v, {
      onSuccess: () => {
        toast.success({ title: 'Acesso liberado', description: 'Bem-vindo ao painel administrativo.' });
        navigate('/admin');
      },
      onError: () =>
        toast.error({ title: 'Não foi possível entrar', description: 'Verifique suas credenciais e tente novamente.' }),
    });

  return (
    <div className="grid min-h-screen lg:grid-cols-2" style={{ fontFamily: 'var(--font-sans)' }}>
      {/* Painel de marca */}
      <aside
        className="relative hidden flex-col justify-between overflow-hidden p-12 text-cream-light lg:flex"
        style={{ backgroundImage: 'linear-gradient(160deg, #303132 0%, #232425 60%, #1d1e1f 100%)' }}
      >
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #a5603f 0%, transparent 70%)' }}
          aria-hidden
        />
        <Logo tone="cream" />
        <div className="relative">
          <p className="eyebrow mb-4 text-terracotta-soft">Painel administrativo</p>
          <h1 className="font-display text-4xl leading-tight text-cream-light">
            Gerencie a Bibi Bolsas
            <br />
            com clareza e controle.
          </h1>
          <ul className="mt-8 flex flex-col gap-3">
            {HIGHLIGHTS.map((h) => (
              <li key={h} className="flex items-center gap-3 text-sm text-cream-light/75">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-terracotta/20 text-terracotta-soft">
                  <Sparkle size={14} weight="fill" />
                </span>
                {h}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative flex items-center gap-1.5 text-xs text-cream-light/50">
          <ShieldCheck size={14} /> Ambiente protegido · Bibi Bolsas
        </p>
      </aside>

      {/* Formulário */}
      <main className="flex items-center justify-center bg-bg px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <Logo />
          </div>

          <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-soft)] sm:p-8">
            <div className="mb-6 flex flex-col items-center text-center">
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-terracotta/10 text-terracotta">
                <LockKey size={24} weight="fill" />
              </span>
              <h2 className="font-display text-2xl text-graphite">Entrar no painel</h2>
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-graphite-soft">
                <ShieldCheck size={15} /> Acesso protegido por MFA
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <Field label="E-mail" error={errors.email?.message} required>
                {(id, d) => (
                  <Input
                    id={id}
                    type="email"
                    autoComplete="username"
                    placeholder="seu@email.com"
                    aria-describedby={d}
                    {...register('email', { required: 'Informe o e-mail' })}
                  />
                )}
              </Field>
              <Field label="Senha" error={errors.password?.message} required>
                {(id, d) => (
                  <Input
                    id={id}
                    type="password"
                    autoComplete="current-password"
                    aria-describedby={d}
                    {...register('password', { required: 'Informe a senha' })}
                  />
                )}
              </Field>
              <Field label="Código MFA" hint="Código de 6 dígitos do app autenticador" error={errors.otp?.message}>
                {(id, d) => (
                  <Input
                    id={id}
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    aria-describedby={d}
                    {...register('otp')}
                  />
                )}
              </Field>
              <Button type="submit" size="lg" fullWidth loading={adminLogin.isPending} className="mt-1">
                Entrar no painel
              </Button>
            </form>

            {USE_MOCK && (
              <Banner tone="info" className="mt-5">
                <span className="text-[0.8rem]">
                  Modo demonstração ativo — qualquer senha funciona com dados fictícios.
                </span>
              </Banner>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
