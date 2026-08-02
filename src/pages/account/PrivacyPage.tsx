import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRinging, Megaphone, ShieldWarning } from '@phosphor-icons/react';
import { accountService, queryKeys, type NotificationPreferences } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

/**
 * Privacidade e avisos.
 *
 * Reune os direitos que a LGPD garante ao titular e que o backend ja
 * implementava sem nenhuma tela: revogar o aceite de marketing, escolher quais
 * avisos receber e pedir a exclusao dos dados.
 */
export function PrivacyPage() {
  return (
    <div className="flex flex-col gap-6">
      <MarketingCard />
      <NotificationsCard />
      <DeletionCard />
    </div>
  );
}

function Card({
  icon: Icon,
  title,
  description,
  tone = 'default',
  children,
}: {
  icon: typeof BellRinging;
  title: string;
  description?: string;
  tone?: 'default' | 'danger';
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        'rounded-[var(--radius-xl)] border bg-surface p-5 sm:p-6',
        tone === 'danger' ? 'border-danger/30' : 'border-border',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'grid h-10 w-10 shrink-0 place-items-center rounded-full',
            tone === 'danger' ? 'bg-danger-soft text-danger' : 'bg-cream-light text-terracotta',
          )}
        >
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

function MarketingCard() {
  const queryClient = useQueryClient();
  const customer = useQuery({
    queryKey: queryKeys.customer,
    queryFn: () => accountService.getCustomer(),
  });

  const update = useMutation({
    mutationFn: (accepted: boolean) => accountService.setMarketingConsent(accepted),
    onSuccess: (_, accepted) => {
      queryClient.setQueryData(queryKeys.customer, (current: unknown) =>
        current ? { ...(current as object), marketingAccepted: accepted } : current,
      );
      toast.success(accepted ? 'Você passará a receber novidades' : 'Consentimento revogado');
    },
    onError: (error) => toast.error((error as Error).message || 'Não foi possível salvar.'),
  });

  const accepted = customer.data?.marketingAccepted ?? false;

  return (
    <Card
      icon={Megaphone}
      title="Comunicações de marketing"
      description="Novidades, lançamentos e ofertas. Você pode revogar quando quiser."
    >
      {customer.isLoading ? (
        <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />
      ) : (
        <ToggleRow
          label="Quero receber novidades e ofertas por e-mail"
          checked={accepted}
          disabled={update.isPending}
          onChange={(value) => update.mutate(value)}
        />
      )}
    </Card>
  );
}

function NotificationsCard() {
  const queryClient = useQueryClient();
  const preferences = useQuery({
    queryKey: queryKeys.notificationPreferences,
    queryFn: () => accountService.getNotificationPreferences(),
  });

  const [draft, setDraft] = useState<NotificationPreferences>();

  useEffect(() => {
    if (preferences.data) setDraft(preferences.data);
  }, [preferences.data]);

  const save = useMutation({
    mutationFn: (values: NotificationPreferences) =>
      accountService.updateNotificationPreferences(values),
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKeys.notificationPreferences, saved);
      toast.success('Preferências salvas');
    },
    onError: (error) => toast.error((error as Error).message || 'Não foi possível salvar.'),
  });

  const saved = preferences.data;
  const dirty =
    !!draft &&
    !!saved &&
    (draft.orderUpdates !== saved.orderUpdates ||
      draft.promotions !== saved.promotions ||
      draft.abandonedCart !== saved.abandonedCart);

  return (
    <Card
      icon={BellRinging}
      title="Avisos que você recebe"
      description="Escolha sobre o que falamos com você."
    >
      {!draft ? (
        <Skeleton className="h-32 w-full rounded-[var(--radius-md)]" />
      ) : (
        <div className="flex flex-col gap-1">
          <ToggleRow
            label="Atualizações dos meus pedidos"
            hint="Confirmação, envio e entrega. Recomendamos manter ativo."
            checked={draft.orderUpdates}
            onChange={(value) => setDraft({ ...draft, orderUpdates: value })}
          />
          <ToggleRow
            label="Promoções e lançamentos"
            checked={draft.promotions}
            onChange={(value) => setDraft({ ...draft, promotions: value })}
          />
          <ToggleRow
            label="Lembrete de sacola abandonada"
            hint="Avisamos se você deixar itens na sacola."
            checked={draft.abandonedCart}
            onChange={(value) => setDraft({ ...draft, abandonedCart: value })}
          />

          <Button
            className="mt-4 self-start"
            loading={save.isPending}
            disabled={!dirty}
            onClick={() => save.mutate(draft)}
          >
            Salvar preferências
          </Button>
        </div>
      )}
    </Card>
  );
}

function DeletionCard() {
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');
  const [requested, setRequested] = useState(false);

  const request = useMutation({
    mutationFn: () => accountService.requestAccountDeletion(reason.trim() || undefined),
    onSuccess: () => {
      setRequested(true);
      setConfirming(false);
    },
    onError: (error) =>
      toast.error({
        title: 'Não foi possível enviar a solicitação',
        description: (error as Error).message || 'Tente novamente em instantes.',
      }),
  });

  return (
    <Card
      icon={ShieldWarning}
      tone="danger"
      title="Excluir meus dados"
      description="Direito garantido pela LGPD (Lei 13.709/2018, art. 18)."
    >
      {requested ? (
        <p className="rounded-[var(--radius-md)] bg-cream-light p-4 text-sm text-graphite-soft">
          Solicitação registrada. Nossa equipe vai analisar e responder pelo seu e-mail de cadastro.
        </p>
      ) : (
        <>
          <p className="text-sm text-graphite-soft">
            A exclusão não é imediata: registros de venda precisam ser mantidos por prazo legal
            mesmo depois do encerramento da conta. Detalhamos o que é guardado e por quanto tempo na{' '}
            <Link
              to="/institucional/privacidade"
              className="font-medium text-terracotta hover:underline"
            >
              política de privacidade
            </Link>
            .
          </p>

          {confirming ? (
            <div className="mt-4 flex flex-col gap-3">
              <label className="text-sm text-graphite">
                Conta o motivo? <span className="text-graphite-soft">(opcional)</span>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={3}
                  className="mt-1.5 w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-graphite focus:outline-none"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button variant="danger" loading={request.isPending} onClick={() => request.mutate()}>
                  Confirmar solicitação
                </Button>
                <Button variant="ghost" onClick={() => setConfirming(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="mt-4" onClick={() => setConfirming(true)}>
              Solicitar exclusão
            </Button>
          )}
        </>
      )}
    </Card>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      className={cn(
        'flex min-h-touch cursor-pointer items-start gap-3 rounded-[var(--radius-md)] py-2.5 text-sm',
        disabled && 'pointer-events-none opacity-60',
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-terracotta"
      />
      <span className="min-w-0">
        <span className="block text-graphite">{label}</span>
        {hint && <span className="block text-xs text-graphite-soft">{hint}</span>}
      </span>
    </label>
  );
}
