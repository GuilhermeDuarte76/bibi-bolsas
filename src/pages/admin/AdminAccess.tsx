import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowClockwise,
  CheckCircle,
  PencilSimple,
  Plus,
  ShieldCheck,
  ShieldWarning,
  WarningCircle,
  XCircle,
} from '@phosphor-icons/react';
import { adminService, queryKeys } from '@/lib/api';
import type { AdminEmployeeInput, AdminEmployeeUpdateInput } from '@/lib/api/admin.service';
import type {
  AdminRole,
  AdminUser,
  AuditEntry,
  IntegrationStatus,
  ProductionReadiness,
  ProductionReadinessCheck,
  ProductionReadinessStatus,
} from '@/types';
import { PageHeader, AdminTable, Panel, StatCard } from '@/components/admin/AdminUI';
import { Pill } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';

const ROLE_LABEL: Record<AdminRole, string> = {
  Admin: 'Administrador',
  Employee: 'Funcionário',
  Customer: 'Cliente',
  owner: 'Owner / Super Admin',
  gerente: 'Gerente',
  atendimento: 'Atendimento',
  catalogo: 'Catálogo / Estoque',
  financeiro: 'Financeiro',
  logistica: 'Logística',
  marketing: 'Marketing',
};

const ACTION_LABEL: Record<string, string> = {
  'Users.EmployeeCreated': 'Funcionário criado',
  'Users.EmployeeUpdated': 'Funcionário atualizado',
  'Users.StatusChanged': 'Status alterado',
  'Alerts.Resolved': 'Alerta resolvido',
  'Alerts.Ignored': 'Alerta ignorado',
};

const READINESS_LABEL: Record<string, string> = {
  Ready: 'Pronto',
  Warning: 'Atenção',
  Blocked: 'Bloqueado',
};

const INTEGRATION_KIND_LABEL: Record<IntegrationStatus['kind'], string> = {
  pagamento: 'Pagamento',
  frete: 'Frete',
  fiscal: 'Fiscal',
  notificacao: 'Notificação',
  automacao: 'Automação',
  storage: 'Storage',
  monitoramento: 'Monitoramento',
  backup: 'Backup',
};

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  isActive: true,
};

type UserFormState = typeof EMPTY_FORM;

function roleLabel(role: AdminRole): string {
  return ROLE_LABEL[role] ?? role;
}

function roleTone(role: AdminRole): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (role === 'Admin' || role === 'owner') return 'danger';
  if (role === 'Employee') return 'info';
  if (role === 'Customer') return 'neutral';
  return 'warning';
}

function actionLabel(action: string): string {
  return ACTION_LABEL[action] ?? action;
}

function readinessLabel(status?: ProductionReadinessStatus): string {
  return READINESS_LABEL[String(status)] ?? String(status ?? '-');
}

function readinessTone(status?: ProductionReadinessStatus): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'Ready') return 'success';
  if (status === 'Blocked') return 'danger';
  return 'warning';
}

function integrationTone(status: IntegrationStatus['status']): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'ok') return 'success';
  if (status === 'down') return 'danger';
  return 'warning';
}

function integrationStatusLabel(status: IntegrationStatus['status']): string {
  if (status === 'ok') return 'Operacional';
  if (status === 'down') return 'Bloqueado';
  return 'Pendente';
}

function passwordMeetsPolicy(password: string): boolean {
  return password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password);
}

/** Linha do tempo de auditoria (AuditTimeline). */
function AuditTimeline({ entries }: { entries: AuditEntry[] }) {
  return (
    <ol className="flex flex-col gap-4">
      {entries.map((e, i) => (
        <li key={e.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="h-2.5 w-2.5 rounded-full bg-terracotta" />
            {i < entries.length - 1 && <span className="w-px flex-1 bg-border" />}
          </div>
          <div className="pb-1">
            <p className="text-sm text-graphite">
              <strong className="font-medium">{e.actor}</strong> · {actionLabel(e.action)} em <strong className="font-medium">{e.target}</strong>
            </p>
            {e.meta && <p className="text-xs text-graphite-soft">{e.meta}</p>}
            <p className="text-xs text-store-gray">{formatDate(e.at)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function AdminUsers() {
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);

  const usersQuery = useQuery({ queryKey: queryKeys.admin.users, queryFn: () => adminService.listUsers() });
  const isEditing = !!editingUser;

  const createEmployee = useMutation({
    mutationFn: (input: AdminEmployeeInput) => adminService.createEmployee(input),
    onSuccess: () => {
      toast.success('Funcionário criado com segurança.');
      setForm(EMPTY_FORM);
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.audit });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Nao foi possivel criar o funcionário.'),
  });

  const updateEmployee = useMutation({
    mutationFn: (input: { id: string; data: AdminEmployeeUpdateInput }) => adminService.updateEmployee(input.id, input.data),
    onSuccess: () => {
      toast.success('Funcionário atualizado.');
      setEditingUser(null);
      setForm(EMPTY_FORM);
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.audit });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Nao foi possivel atualizar o funcionário.'),
  });

  const updateStatus = useMutation({
    mutationFn: (input: { id: string; isActive: boolean }) => adminService.updateUserStatus(input.id, input.isActive),
    onSuccess: () => {
      toast.success('Status atualizado.');
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.audit });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Nao foi possivel atualizar o status.'),
  });

  const startCreate = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
  };

  const startEdit = (user: AdminUser) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      confirmPassword: '',
      isActive: user.active,
    });
  };

  const submit = () => {
    const name = form.name.trim();
    const email = form.email.trim();

    if (!name || !email) {
      toast.error('Informe nome e e-mail.');
      return;
    }

    if (isEditing && editingUser) {
      updateEmployee.mutate({
        id: editingUser.id,
        data: { name, email, isActive: form.isActive },
      });
      return;
    }

    if (!passwordMeetsPolicy(form.password)) {
      toast.error('A senha precisa ter maiúscula, minúscula, número, caractere especial e 8 caracteres.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error('A confirmação de senha não confere.');
      return;
    }

    createEmployee.mutate({ name, email, password: form.password, confirmPassword: form.confirmPassword });
  };

  return (
    <div>
      <PageHeader
        title="Usuários"
        subtitle="Contas com acesso administrativo e operacional."
        action={<Button onClick={startCreate}><Plus size={16} /> Novo funcionário</Button>}
      />

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <Panel title="Acessos">
          {usersQuery.isLoading ? <Skeleton className="h-64 w-full rounded-[var(--radius-lg)]" /> : (
            <AdminTable<AdminUser>
              rowKey={(u) => u.id}
              rows={usersQuery.data ?? []}
              columns={[
                { key: 'name', header: 'Usuário', render: (u) => <div><p className="font-medium">{u.name}</p><p className="text-xs text-graphite-soft">{u.email}</p></div> },
                { key: 'role', header: 'Perfil', render: (u) => <Pill tone={roleTone(u.role)}>{roleLabel(u.role)}</Pill> },
                { key: 'mfa', header: 'E-mail', render: (u) => u.emailConfirmed ? <Pill tone="success"><ShieldCheck size={12} weight="fill" /> Confirmado</Pill> : <Pill tone="danger"><ShieldWarning size={12} weight="fill" /> Pendente</Pill> },
                { key: 'created', header: 'Criado em', render: (u) => u.createdAt ? formatDate(u.createdAt) : '-' },
                { key: 'last', header: 'Último acesso', render: (u) => u.lastLogin ? formatDate(u.lastLogin) : '-' },
                { key: 'status', header: 'Status', render: (u) => <Pill tone={u.active ? 'success' : 'neutral'}>{u.active ? 'Ativo' : 'Inativo'}</Pill> },
                { key: 'actions', header: 'Ações', render: (u) => (
                  <div className="flex flex-wrap gap-2">
                    {u.role === 'Employee' ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => startEdit(u)}>
                          <PencilSimple size={15} /> Editar
                        </Button>
                        <Button
                          size="sm"
                          variant={u.active ? 'ghost' : 'outline'}
                          loading={updateStatus.isPending}
                          onClick={() => updateStatus.mutate({ id: u.id, isActive: !u.active })}
                        >
                          {u.active ? 'Inativar' : 'Ativar'}
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-graphite-soft">Protegido</span>
                    )}
                  </div>
                ) },
              ]}
            />
          )}
        </Panel>

        <Panel title={isEditing ? 'Editar funcionário' : 'Novo funcionário'}>
          <div className="space-y-4">
            <Field label="Nome" required>
              {(id, describedBy) => (
                <Input id={id} aria-describedby={describedBy} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
              )}
            </Field>
            <Field label="E-mail" required>
              {(id, describedBy) => (
                <Input id={id} aria-describedby={describedBy} type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
              )}
            </Field>

            {isEditing ? (
              <label className="flex items-center gap-2 text-sm font-medium text-graphite">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                  className="h-4 w-4 rounded border-border text-terracotta"
                />
                Funcionário ativo
              </label>
            ) : (
              <>
                <Field label="Senha provisória" required hint="Mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial.">
                  {(id, describedBy) => (
                    <Input id={id} aria-describedby={describedBy} type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
                  )}
                </Field>
                <Field label="Confirmar senha" required>
                  {(id, describedBy) => (
                    <Input id={id} aria-describedby={describedBy} type="password" value={form.confirmPassword} onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))} />
                  )}
                </Field>
              </>
            )}

            <div className="flex flex-wrap gap-2">
              <Button loading={createEmployee.isPending || updateEmployee.isPending} onClick={submit}>
                <CheckCircle size={16} /> {isEditing ? 'Salvar alterações' : 'Criar funcionário'}
              </Button>
              {isEditing && (
                <Button variant="outline" onClick={startCreate}>
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

const PERMISSIONS = ['Dashboard', 'Pedidos', 'Produtos', 'Clientes', 'Cupons', 'Financeiro', 'Configurações'];
const MATRIX: Record<'Admin' | 'Employee' | 'Customer', boolean[]> = {
  Admin: [true, true, true, true, true, true, true],
  Employee: [true, true, true, false, false, false, false],
  Customer: [false, false, false, false, false, false, false],
};

export function AdminPermissions() {
  const { data, isLoading } = useQuery({ queryKey: queryKeys.admin.audit, queryFn: () => adminService.listAudit() });
  return (
    <div>
      <PageHeader title="Permissões" subtitle="Políticas administrativas aplicadas pelo backend." />
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Panel title="Matriz atual">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-3 py-2 font-semibold text-graphite-soft">Perfil</th>
                  {PERMISSIONS.map((p) => <th key={p} className="px-3 py-2 text-center font-semibold text-graphite-soft">{p}</th>)}
                </tr>
              </thead>
              <tbody>
                {(Object.keys(MATRIX) as ('Admin' | 'Employee' | 'Customer')[]).map((role) => (
                  <tr key={role} className="border-b border-border/60">
                    <td className="px-3 py-2.5 font-medium text-graphite">{roleLabel(role)}</td>
                    {MATRIX[role].map((allowed, i) => (
                      <td key={i} className="px-3 py-2.5 text-center">
                        <span className={`inline-block h-2.5 w-2.5 rounded-full ${allowed ? 'bg-success' : 'bg-border'}`} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Auditoria recente">
          {isLoading ? <Skeleton className="h-48 w-full" /> : <AuditTimeline entries={data ?? []} />}
        </Panel>
      </div>
    </div>
  );
}

export function AdminSettings() {
  const readinessQuery = useQuery({
    queryKey: queryKeys.admin.readiness,
    queryFn: () => adminService.getProductionReadiness(),
  });

  const readiness = readinessQuery.data;
  const blockingChecks = readiness?.checks.filter((check) => check.isBlocking && check.status !== 'Ready').length ?? 0;
  const pendingIntegrations = readiness?.integrations.filter((integration) => integration.status !== 'ok').length ?? 0;

  return (
    <div>
      <PageHeader
        title="Configurações"
        subtitle="Prontidão operacional da loja antes de publicar."
        action={(
          <Button
            type="button"
            variant="outline"
            loading={readinessQuery.isFetching}
            onClick={() => readinessQuery.refetch()}
          >
            <ArrowClockwise size={16} /> Atualizar
          </Button>
        )}
      />

      {readinessQuery.isLoading ? (
        <Skeleton className="h-96 w-full rounded-[var(--radius-lg)]" />
      ) : readinessQuery.isError ? (
        <Panel>
          <div className="flex items-center gap-3 text-danger">
            <XCircle size={24} weight="fill" />
            <p className="font-medium">Não foi possível consultar a prontidão de produção.</p>
          </div>
        </Panel>
      ) : readiness ? (
        <div className="flex flex-col gap-6">
          <ReadinessSummary
            readiness={readiness}
            blockingChecks={blockingChecks}
            pendingIntegrations={pendingIntegrations}
          />

          <div className="grid gap-6 xl:grid-cols-[1fr_1.15fr]">
            <Panel title="Integrações">
              <AdminTable<IntegrationStatus>
                rows={readiness.integrations}
                rowKey={(item) => item.id}
                columns={[
                  {
                    key: 'name',
                    header: 'Integração',
                    render: (item) => (
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-graphite-soft">{INTEGRATION_KIND_LABEL[item.kind]}</p>
                      </div>
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (item) => <Pill tone={integrationTone(item.status)}>{integrationStatusLabel(item.status)}</Pill>,
                  },
                  {
                    key: 'required',
                    header: 'Produção',
                    render: (item) => item.requiredForProduction ? 'Obrigatória' : 'Opcional',
                  },
                  {
                    key: 'message',
                    header: 'Resultado',
                    render: (item) => (
                      <span className="text-sm text-graphite-soft">{item.message ?? '-'}</span>
                    ),
                  },
                ]}
              />
            </Panel>

            <Panel title="Checklist">
              <AdminTable<ProductionReadinessCheck>
                rows={readiness.checks}
                rowKey={(item) => item.key}
                columns={[
                  {
                    key: 'key',
                    header: 'Item',
                    render: (item) => (
                      <div>
                        <p className="font-medium">{item.key}</p>
                        <p className="text-xs text-graphite-soft">{item.isBlocking ? 'Bloqueante' : 'Recomendado'}</p>
                      </div>
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (item) => <Pill tone={readinessTone(item.status)}>{readinessLabel(item.status)}</Pill>,
                  },
                  {
                    key: 'message',
                    header: 'Resultado',
                    render: (item) => <span className="text-sm text-graphite-soft">{item.message}</span>,
                  },
                ]}
              />
            </Panel>
          </div>

          <Panel title="Segurança">
            <div className="grid gap-4 md:grid-cols-3">
              <SecurityNote icon="key" label="Credenciais" value="Somente no backend e em variáveis de ambiente." />
              <SecurityNote icon="cors" label="CORS" value="Origens explícitas no front local e produção." />
              <SecurityNote icon="audit" label="Auditoria" value="Ações administrativas preservadas em log." />
            </div>
          </Panel>
        </div>
      ) : null}
      <p className="mt-6 text-xs text-graphite-soft">Segredos e credenciais ficam fora do front-end, protegidos no backend.</p>
    </div>
  );
}

function ReadinessSummary({
  readiness,
  blockingChecks,
  pendingIntegrations,
}: {
  readiness: ProductionReadiness;
  blockingChecks: number;
  pendingIntegrations: number;
}) {
  const overallIcon = readiness.overallStatus === 'Ready'
    ? CheckCircle
    : readiness.overallStatus === 'Blocked'
      ? XCircle
      : WarningCircle;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Status geral"
        value={readinessLabel(readiness.overallStatus)}
        hint={readiness.environment}
        icon={overallIcon}
      />
      <StatCard
        label="Boot em produção"
        value={readiness.canBootInProduction ? 'Liberado' : 'Pendente'}
        hint={readiness.isProduction ? 'ambiente produção' : 'ambiente atual'}
        icon={readiness.canBootInProduction ? CheckCircle : ShieldWarning}
      />
      <StatCard
        label="Checks bloqueantes"
        value={String(blockingChecks)}
        hint="pendentes"
        icon={ShieldCheck}
      />
      <StatCard
        label="Integrações pendentes"
        value={String(pendingIntegrations)}
        hint={`atualizado em ${formatDate(readiness.checkedAt)}`}
        icon={WarningCircle}
      />
    </div>
  );
}

function SecurityNote({
  icon,
  label,
  value,
}: {
  icon: 'key' | 'cors' | 'audit';
  label: string;
  value: string;
}) {
  const Icon = icon === 'key' ? ShieldCheck : icon === 'cors' ? WarningCircle : CheckCircle;

  return (
    <div className="flex gap-3 rounded-[var(--radius-md)] border border-border bg-cream-light/40 p-4">
      <Icon size={22} className="mt-0.5 text-cinnamon" />
      <div>
        <p className="font-medium text-graphite">{label}</p>
        <p className="mt-1 text-sm leading-6 text-graphite-soft">{value}</p>
      </div>
    </div>
  );
}
