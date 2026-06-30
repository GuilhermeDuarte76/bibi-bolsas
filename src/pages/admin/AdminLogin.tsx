import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from '@phosphor-icons/react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Logo } from '@/components/layout/Logo';
import { toast } from '@/components/ui/Toast';

interface Values {
  email: string;
  password: string;
  otp: string;
}

export function AdminLogin() {
  const navigate = useNavigate();
  const { adminLogin } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({
    defaultValues: { email: 'guilherme@maqnelson.com.br', password: '', otp: '' },
  });

  const onSubmit = (v: Values) =>
    adminLogin.mutate(v, {
      onSuccess: () => { toast.success('Acesso administrativo liberado'); navigate('/admin'); },
      onError: () => toast.error('Credenciais inválidas.'),
    });

  return (
    <div className="grid min-h-screen place-items-center bg-graphite px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center">
          <Logo tone="cream" />
          <h1 className="mt-6 font-display text-3xl text-cream-light">Painel administrativo</h1>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-cream-light/70">
            <ShieldCheck size={16} /> Acesso protegido por MFA
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-4 rounded-[var(--radius-xl)] bg-surface p-6 sm:p-8">
          <Field label="E-mail" error={errors.email?.message} required>
            {(id, d) => <Input id={id} type="email" aria-describedby={d} {...register('email', { required: 'Informe o e-mail' })} />}
          </Field>
          <Field label="Senha" error={errors.password?.message} required>
            {(id, d) => <Input id={id} type="password" aria-describedby={d} {...register('password', { required: 'Informe a senha' })} />}
          </Field>
          <Field label="Código MFA" hint="Código de 6 dígitos do app autenticador" error={errors.otp?.message}>
            {(id, d) => <Input id={id} inputMode="numeric" maxLength={6} placeholder="000000" aria-describedby={d} {...register('otp')} />}
          </Field>
          <Button type="submit" size="lg" fullWidth loading={adminLogin.isPending}>Entrar no painel</Button>
          <p className="text-center text-xs text-graphite-soft">Demonstração: qualquer senha funciona com dados mockados.</p>
        </form>
      </div>
    </div>
  );
}
