import { Link, useNavigate, useSearchParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { WarningCircle } from '@phosphor-icons/react';
import { authService } from '@/lib/api';
import { resetPasswordSchema, type ResetPasswordFormValues } from '@/lib/validation';
import { Container } from '@/components/ui/Layout';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Logo } from '@/components/layout/Logo';
import { toast } from '@/components/ui/Toast';
import { usePageMeta } from '@/hooks/usePageMeta';
import { PasswordField } from './AuthPage';

/**
 * Destino do link enviado por e-mail: /redefinir-senha?token=...&email=...
 *
 * Pagina publica de proposito — quem chega aqui esqueceu a senha e, por
 * definicao, nao consegue autenticar.
 */
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  const email = params.get('email');

  usePageMeta({ title: 'Redefinir senha', noIndex: true });

  const form = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema) });

  const reset = useMutation({
    mutationFn: (values: ResetPasswordFormValues) =>
      authService.resetPassword({ email: email!, token: token!, password: values.password }),
    onSuccess: () => {
      toast.success({
        title: 'Senha redefinida',
        description: 'Entre com a nova senha para continuar.',
      });
      navigate('/entrar', { replace: true });
    },
    onError: (error) =>
      toast.error({
        title: 'Não foi possível redefinir',
        description:
          (error as Error).message ||
          'O link pode ter expirado. Peça um novo em "Esqueci minha senha".',
      }),
  });

  const linkIsValid = !!token && !!email;

  return (
    <Container className="py-section-sm">
      <div className="mx-auto max-w-md">
        <div className="flex flex-col items-center text-center">
          <Logo size="lg" animated={false} />
          <h1 className="mt-6 font-display text-display-md text-graphite">Redefinir senha</h1>
          {linkIsValid && (
            <p className="mt-2 text-fluid-base text-graphite-soft">
              Escolha uma nova senha para <strong className="text-graphite">{email}</strong>.
            </p>
          )}
        </div>

        <div className="mt-8 rounded-[var(--radius-xl)] border border-border bg-surface p-5 sm:p-8">
          {linkIsValid ? (
            <form
              onSubmit={form.handleSubmit((values) => reset.mutate(values))}
              className="flex flex-col gap-4"
            >
              <PasswordField
                label="Nova senha"
                hint="Use ao menos 8 caracteres"
                autoComplete="new-password"
                error={form.formState.errors.password?.message}
                registration={form.register('password')}
              />
              <PasswordField
                label="Confirmar nova senha"
                autoComplete="new-password"
                error={form.formState.errors.confirm?.message}
                registration={form.register('confirm')}
              />
              <Button type="submit" size="lg" fullWidth loading={reset.isPending}>
                Salvar nova senha
              </Button>
            </form>
          ) : (
            /* Sem token ou sem e-mail nao ha o que redefinir — melhor dizer
               isso do que mostrar um formulario que vai falhar no envio. */
            <div className="flex flex-col items-center text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-danger-soft text-danger">
                <WarningCircle size={28} weight="light" aria-hidden />
              </span>
              <p className="mt-4 font-medium text-graphite">Link inválido ou incompleto</p>
              <p className="mt-1 text-sm text-graphite-soft">
                Abra o link direto do e-mail que enviamos. Se ele expirou, peça um novo.
              </p>
              <ButtonLink to="/entrar" variant="outline" className="mt-6">
                Pedir novo link
              </ButtonLink>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-graphite-soft">
          Lembrou a senha?{' '}
          <Link to="/entrar" className="font-medium text-terracotta hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </Container>
  );
}
