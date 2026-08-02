import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Envelope, Lock, User } from '@phosphor-icons/react';
import { accountService, queryKeys } from '@/lib/api';
import {
  changePasswordSchema,
  emailChangeSchema,
  profileSchema,
  type ChangePasswordFormValues,
  type EmailChangeFormValues,
  type ProfileFormValues,
} from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { PasswordField } from '@/pages/AuthPage';
import { toast } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCpf, formatPhone } from '@/lib/utils';

/**
 * Meus dados: perfil, senha e e-mail.
 *
 * Os tres endpoints existiam no backend desde o inicio (`PUT /me/profile`,
 * `PATCH /me/password`, `POST /me/email/change-request`) e nao havia nenhuma
 * tela — a cliente nao tinha como corrigir o proprio cadastro.
 */
export function AccountSettingsPage() {
  const customer = useQuery({
    queryKey: queryKeys.customer,
    queryFn: () => accountService.getCustomer(),
  });

  if (customer.isLoading) {
    return <Skeleton className="h-96 w-full rounded-[var(--radius-xl)]" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <ProfileCard
        defaults={{
          name: customer.data?.name ?? '',
          phone: customer.data?.phone ?? '',
          document: customer.data?.document ?? '',
        }}
      />
      <EmailCard currentEmail={customer.data?.email ?? ''} />
      <PasswordCard />
    </div>
  );
}

function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof User;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cream-light text-terracotta">
          <Icon size={20} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-display-xs text-graphite">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-graphite-soft">{description}</p>}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ProfileCard({ defaults }: { defaults: ProfileFormValues }) {
  const queryClient = useQueryClient();
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: defaults,
  });

  const save = useMutation({
    mutationFn: (values: ProfileFormValues) =>
      accountService.updateCustomer({
        name: values.name,
        phone: values.phone,
        document: values.document,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.customer, updated);
      toast.success('Dados atualizados');
    },
    onError: (error) =>
      toast.error({
        title: 'Não foi possível salvar',
        description: (error as Error).message || 'Tente novamente em instantes.',
      }),
  });

  return (
    <SettingsCard
      icon={User}
      title="Dados pessoais"
      description="Usamos o CPF apenas para emitir a nota fiscal do seu pedido."
    >
      <form
        onSubmit={form.handleSubmit((values) => save.mutate(values))}
        className="flex flex-col gap-4"
      >
        <Field label="Nome completo" error={form.formState.errors.name?.message} required>
          {(id, describedBy) => (
            <Input id={id} autoComplete="name" aria-describedby={describedBy} {...form.register('name')} />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Telefone / WhatsApp" error={form.formState.errors.phone?.message} required>
            {(id, describedBy) => (
              <Input
                id={id}
                inputMode="numeric"
                placeholder="(11) 99999-9999"
                aria-describedby={describedBy}
                {...form.register('phone', {
                  onChange: (event) => form.setValue('phone', formatPhone(event.target.value)),
                })}
              />
            )}
          </Field>

          <Field label="CPF" error={form.formState.errors.document?.message} required>
            {(id, describedBy) => (
              <Input
                id={id}
                inputMode="numeric"
                placeholder="000.000.000-00"
                aria-describedby={describedBy}
                {...form.register('document', {
                  onChange: (event) => form.setValue('document', formatCpf(event.target.value)),
                })}
              />
            )}
          </Field>
        </div>

        <Button
          type="submit"
          loading={save.isPending}
          disabled={!form.formState.isDirty}
          className="self-start"
        >
          Salvar alterações
        </Button>
      </form>
    </SettingsCard>
  );
}

function EmailCard({ currentEmail }: { currentEmail: string }) {
  const [requestedFor, setRequestedFor] = useState<string>();
  const [devToken, setDevToken] = useState<string>();
  const form = useForm<EmailChangeFormValues>({ resolver: zodResolver(emailChangeSchema) });

  const request = useMutation({
    mutationFn: (values: EmailChangeFormValues) =>
      accountService.requestEmailChange(values.newEmail),
    onSuccess: (result, values) => {
      setRequestedFor(values.newEmail);
      setDevToken(result?.devConfirmationToken);
      form.reset();
    },
    onError: (error) =>
      toast.error({
        title: 'Não foi possível solicitar a troca',
        description: (error as Error).message || 'Tente novamente em instantes.',
      }),
  });

  const cancel = useMutation({
    mutationFn: () => accountService.cancelEmailChange(),
    onSuccess: () => {
      setRequestedFor(undefined);
      setDevToken(undefined);
      toast.success('Troca de e-mail cancelada');
    },
    onError: (error) => toast.error((error as Error).message || 'Não foi possível cancelar.'),
  });

  return (
    <SettingsCard
      icon={Envelope}
      title="E-mail de acesso"
      description={currentEmail ? `Atualmente: ${currentEmail}` : undefined}
    >
      {requestedFor ? (
        <div className="rounded-[var(--radius-lg)] bg-cream-light p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-graphite">
            <CheckCircle size={18} weight="fill" className="text-success" aria-hidden />
            Confirmação enviada para {requestedFor}
          </p>
          <p className="mt-1 text-sm text-graphite-soft">
            O e-mail só muda depois que você abrir o link de confirmação. Até lá, continue entrando
            com o endereço atual.
          </p>

          {devToken && (
            /* Só em desenvolvimento, quando o backend devolve o token. */
            <a
              href={`/confirmar-email?token=${encodeURIComponent(devToken)}`}
              className="mt-3 inline-block break-all text-xs font-medium text-cinnamon hover:underline"
            >
              Ambiente de desenvolvimento: abrir link de confirmação
            </a>
          )}

          <button
            type="button"
            onClick={() => cancel.mutate()}
            className="mt-3 block text-sm font-medium text-danger underline underline-offset-2"
          >
            Cancelar troca
          </button>
        </div>
      ) : (
        <form
          onSubmit={form.handleSubmit((values) => request.mutate(values))}
          className="flex flex-col gap-4"
        >
          <Field
            label="Novo e-mail"
            hint="Enviaremos um link de confirmação para o novo endereço."
            error={form.formState.errors.newEmail?.message}
            required
          >
            {(id, describedBy) => (
              <Input
                id={id}
                type="email"
                autoComplete="email"
                aria-describedby={describedBy}
                {...form.register('newEmail')}
              />
            )}
          </Field>
          <Button type="submit" variant="outline" loading={request.isPending} className="self-start">
            Solicitar troca
          </Button>
        </form>
      )}
    </SettingsCard>
  );
}

function PasswordCard() {
  const form = useForm<ChangePasswordFormValues>({ resolver: zodResolver(changePasswordSchema) });

  const change = useMutation({
    mutationFn: (values: ChangePasswordFormValues) =>
      accountService.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }),
    onSuccess: () => {
      form.reset();
      toast.success('Senha alterada');
    },
    onError: (error) =>
      toast.error({
        title: 'Não foi possível alterar a senha',
        description: (error as Error).message || 'Confira a senha atual e tente de novo.',
      }),
  });

  return (
    <SettingsCard icon={Lock} title="Senha" description="Recomendamos trocar a cada seis meses.">
      <form
        onSubmit={form.handleSubmit((values) => change.mutate(values))}
        className="flex flex-col gap-4"
      >
        <PasswordField
          label="Senha atual"
          autoComplete="current-password"
          error={form.formState.errors.currentPassword?.message}
          registration={form.register('currentPassword')}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordField
            label="Nova senha"
            hint="Ao menos 8 caracteres"
            autoComplete="new-password"
            error={form.formState.errors.newPassword?.message}
            registration={form.register('newPassword')}
          />
          <PasswordField
            label="Confirmar nova senha"
            autoComplete="new-password"
            error={form.formState.errors.confirm?.message}
            registration={form.register('confirm')}
          />
        </div>
        <Button type="submit" loading={change.isPending} className="self-start">
          Alterar senha
        </Button>
      </form>
    </SettingsCard>
  );
}
