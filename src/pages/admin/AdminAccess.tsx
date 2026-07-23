import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowClockwise,
  CheckCircle,
  Eye,
  PencilSimple,
  Plus,
  ShieldCheck,
  ShieldWarning,
  WarningCircle,
  XCircle,
} from '@phosphor-icons/react';
import { adminService, queryKeys } from '@/lib/api';
import type {
  AdminAuditFilters,
  AdminEmployeeInput,
  AdminEmployeePermissionUpdateInput,
  AdminEmployeeUpdateInput,
  AdminUserFilters,
} from '@/lib/api/admin.service';
import type {
  AdminEmployeePermissionMatrix,
  AdminPermissionDefinition,
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
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
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
  'Permissions.EmployeeUpdated': 'Permissões atualizadas',
  'Alerts.Resolved': 'Alerta resolvido',
  'Alerts.Ignored': 'Alerta ignorado',
  'Reports.ViewCustomers': 'Relatório de clientes consultado',
  'Reports.ExportCreated': 'Exportação criada',
  'Customers.StatusChanged': 'Status do cliente alterado',
  'Customers.Anonymized': 'Cliente anonimizado',
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

const USER_ROLE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'Admin', label: 'Administradores' },
  { value: 'Employee', label: 'Funcionários' },
  { value: 'Customer', label: 'Clientes' },
];

const USER_STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'inactive', label: 'Inativos' },
];

const AUDIT_ACTION_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'Users.EmployeeCreated', label: 'Funcionário criado' },
  { value: 'Users.EmployeeUpdated', label: 'Funcionário atualizado' },
  { value: 'Users.StatusChanged', label: 'Status de usuário' },
  { value: 'Permissions.EmployeeUpdated', label: 'Permissões atualizadas' },
  { value: 'Alerts.Resolved', label: 'Alerta resolvido' },
  { value: 'Alerts.Ignored', label: 'Alerta ignorado' },
  { value: 'Reports.ViewCustomers', label: 'Relatório de clientes' },
  { value: 'Reports.ExportCreated', label: 'Exportação criada' },
  { value: 'Customers.StatusChanged', label: 'Status de cliente' },
  { value: 'Customers.Anonymized', label: 'Cliente anonimizado' },
];

const AUDIT_ENTITY_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'User', label: 'Usuário' },
  { value: 'EmployeePermission', label: 'Permissão de funcionário' },
  { value: 'AdminAlert', label: 'Alerta administrativo' },
  { value: 'CustomerProfile', label: 'Cliente' },
  { value: 'CustomerReport', label: 'Relatório de clientes' },
  { value: 'ReportExport', label: 'Exportação' },
];

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
  if (entries.length === 0) return <p className="text-sm text-graphite-soft">Nenhum evento no período.</p>;

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
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);

  const filters = useMemo<AdminUserFilters>(() => ({
    search: search.trim() || undefined,
    role: role || undefined,
    isActive: status === 'active' ? true : status === 'inactive' ? false : undefined,
    page: 1,
    pageSize: 100,
  }), [role, search, status]);

  const usersQuery = useQuery({
    queryKey: queryKeys.admin.usersList(filters),
    queryFn: () => adminService.listUsers(filters),
  });
  const isEditing = !!editingUser;
  const users = usersQuery.data ?? [];
  const adminCount = users.filter((user) => user.role === 'Admin').length;
  const employeeCount = users.filter((user) => user.role === 'Employee').length;
  const inactiveCount = users.filter((user) => !user.active).length;

  const createEmployee = useMutation({
    mutationFn: (input: AdminEmployeeInput) => adminService.createEmployee(input),
    onSuccess: () => {
      toast.success('Funcionário criado com segurança.');
      setForm(EMPTY_FORM);
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.employeePermissionMatrices });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.employeePermissionMatrices });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.audit });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Nao foi possivel atualizar o funcionário.'),
  });

  const updateStatus = useMutation({
    mutationFn: (input: { id: string; isActive: boolean }) => adminService.updateUserStatus(input.id, input.isActive),
    onSuccess: () => {
      toast.success('Status atualizado.');
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.employeePermissionMatrices });
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

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Administradores" value={String(adminCount)} icon={ShieldCheck} />
        <StatCard label="Funcionários" value={String(employeeCount)} icon={CheckCircle} />
        <StatCard label="Inativos neste filtro" value={String(inactiveCount)} icon={XCircle} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <Panel title="Acessos">
          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_180px_180px]">
            <Field label="Buscar">
              {(id, describedBy) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Nome ou e-mail"
                />
              )}
            </Field>
            <Field label="Perfil">
              {(id, describedBy) => (
                <Select id={id} aria-describedby={describedBy} value={role} onChange={(event) => setRole(event.target.value)}>
                  {USER_ROLE_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Status">
              {(id, describedBy) => (
                <Select id={id} aria-describedby={describedBy} value={status} onChange={(event) => setStatus(event.target.value)}>
                  {USER_STATUS_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
                </Select>
              )}
            </Field>
          </div>

          {usersQuery.isLoading ? <Skeleton className="h-64 w-full rounded-[var(--radius-lg)]" /> : (
            <AdminTable<AdminUser>
              rowKey={(u) => u.id}
              rows={users}
              empty="Nenhum usuário encontrado."
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

function allowedKeysFromMatrix(matrix?: AdminEmployeePermissionMatrix): Set<string> {
  return new Set(
    matrix?.permissions
      .filter((permission) => permission.isAllowed && !permission.isAdminOnly)
      .map((permission) => permission.key) ?? [],
  );
}

function sameStringSet(first: Set<string>, second: Set<string>): boolean {
  if (first.size !== second.size) return false;
  return [...first].every((item) => second.has(item));
}

export function AdminPermissions() {
  const queryClient = useQueryClient();
  const [selectedAuditId, setSelectedAuditId] = useState<string | undefined>();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set<string>());
  const [reason, setReason] = useState('');
  const [filters, setFilters] = useState({
    action: '',
    entityName: '',
    actorUserId: '',
    from: '',
    to: '',
  });

  const auditFilters = useMemo<AdminAuditFilters>(() => ({
    action: filters.action || undefined,
    entityName: filters.entityName || undefined,
    actorUserId: filters.actorUserId.trim() || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    page: 1,
    pageSize: 50,
  }), [filters]);

  const catalogQuery = useQuery({
    queryKey: queryKeys.admin.permissionCatalog,
    queryFn: () => adminService.listPermissionCatalog(),
  });
  const matricesQuery = useQuery({
    queryKey: queryKeys.admin.employeePermissionMatrices,
    queryFn: () => adminService.listEmployeePermissionMatrices(),
  });
  const auditQuery = useQuery({
    queryKey: queryKeys.admin.auditList(auditFilters),
    queryFn: () => adminService.listAudit(auditFilters),
  });
  const detailQuery = useQuery({
    queryKey: queryKeys.admin.auditEntry(selectedAuditId ?? ''),
    queryFn: () => adminService.getAuditEntry(selectedAuditId!),
    enabled: !!selectedAuditId,
  });

  const catalog = catalogQuery.data ?? [];
  const matrices = matricesQuery.data ?? [];
  const selectedMatrix = useMemo(
    () => matrices.find((matrix) => matrix.userId === selectedEmployeeId) ?? matrices[0],
    [matrices, selectedEmployeeId],
  );
  const originalAllowedKeys = useMemo(() => allowedKeysFromMatrix(selectedMatrix), [selectedMatrix]);
  const permissionGroups = useMemo(() => {
    const grouped = new Map<string, AdminPermissionDefinition[]>();
    catalog.forEach((permission) => {
      const current = grouped.get(permission.area) ?? [];
      current.push(permission);
      grouped.set(permission.area, current);
    });

    return [...grouped.entries()].map(([area, permissions]) => [
      area,
      [...permissions].sort((a, b) => a.sortOrder - b.sortOrder),
    ] as const);
  }, [catalog]);

  useEffect(() => {
    if (!selectedEmployeeId && matrices.length > 0) {
      setSelectedEmployeeId(matrices[0].userId);
    }
  }, [matrices, selectedEmployeeId]);

  useEffect(() => {
    if (!selectedMatrix) return;
    setSelectedKeys(allowedKeysFromMatrix(selectedMatrix));
    setReason('');
  }, [selectedMatrix]);

  const updatePermissions = useMutation({
    mutationFn: (input: { userId: string; data: AdminEmployeePermissionUpdateInput }) =>
      adminService.updateEmployeePermissions(input.userId, input.data),
    onSuccess: (matrix) => {
      toast.success('Permissões atualizadas com auditoria.');
      setReason('');
      setSelectedKeys(allowedKeysFromMatrix(matrix));
      queryClient.setQueryData(queryKeys.admin.employeePermissionMatrix(matrix.userId), matrix);
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.employeePermissionMatrices });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.audit });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Nao foi possivel atualizar as permissões.'),
  });

  const entries = auditQuery.data ?? [];
  const grantableCount = catalog.filter((permission) => !permission.isAdminOnly).length;
  const adminOnlyCount = catalog.filter((permission) => permission.isAdminOnly).length;
  const hasChanges = !sameStringSet(selectedKeys, originalAllowedKeys);
  const reasonError = hasChanges && reason.trim().length > 0 && reason.trim().length < 10
    ? 'Informe pelo menos 10 caracteres.'
    : undefined;
  const canSave = !!selectedMatrix && hasChanges && reason.trim().length >= 10 && !updatePermissions.isPending;
  const matrixLoading = catalogQuery.isLoading || matricesQuery.isLoading;
  const resetFilters = () => setFilters({ action: '', entityName: '', actorUserId: '', from: '', to: '' });
  const resetLocalPermissions = () => {
    setSelectedKeys(new Set(originalAllowedKeys));
    setReason('');
  };

  const togglePermission = (permission: AdminPermissionDefinition) => {
    if (permission.isAdminOnly) return;

    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(permission.key)) next.delete(permission.key);
      else next.add(permission.key);
      return next;
    });
  };

  const savePermissions = () => {
    if (!selectedMatrix) return;

    if (reason.trim().length < 10) {
      toast.error('Informe uma justificativa com pelo menos 10 caracteres.');
      return;
    }

    updatePermissions.mutate({
      userId: selectedMatrix.userId,
      data: {
        allowedPermissionKeys: [...selectedKeys],
        reason,
      },
    });
  };

  return (
    <div>
      <PageHeader title="Permissões" subtitle="Matriz granular de acessos operacionais com trilha de auditoria." />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Permissões gerenciáveis" value={String(grantableCount)} icon={ShieldCheck} />
        <StatCard label="Liberadas no perfil" value={String(selectedKeys.size)} icon={CheckCircle} />
        <StatCard label="Eventos no filtro" value={String(entries.length)} icon={WarningCircle} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
        <div className="flex flex-col gap-6">
          <Panel title="Funcionários">
            {matricesQuery.isLoading ? (
              <Skeleton className="h-32 w-full rounded-[var(--radius-lg)]" />
            ) : matrices.length === 0 ? (
              <p className="text-sm text-graphite-soft">Nenhum funcionário encontrado para configurar permissões.</p>
            ) : (
              <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
                <Field label="Selecionar funcionário">
                  {(id, describedBy) => (
                    <Select
                      id={id}
                      aria-describedby={describedBy}
                      value={selectedMatrix?.userId ?? ''}
                      onChange={(event) => setSelectedEmployeeId(event.target.value)}
                    >
                      {matrices.map((matrix) => (
                        <option key={matrix.userId} value={matrix.userId}>
                          {matrix.name}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>

                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {matrices.map((matrix) => {
                    const isSelected = matrix.userId === selectedMatrix?.userId;
                    const allowedCount = matrix.permissions.filter((permission) => permission.isAllowed && !permission.isAdminOnly).length;

                    return (
                      <button
                        key={matrix.userId}
                        type="button"
                        onClick={() => setSelectedEmployeeId(matrix.userId)}
                        className={`rounded-[var(--radius-md)] border p-3 text-left transition-colors ${
                          isSelected
                            ? 'border-terracotta bg-terracotta/10 text-graphite'
                            : 'border-border bg-surface text-graphite hover:border-terracotta/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">{matrix.name}</p>
                            <p className="text-xs text-graphite-soft">{matrix.email}</p>
                          </div>
                          <Pill tone={matrix.isActive ? 'success' : 'neutral'}>{matrix.isActive ? 'Ativo' : 'Inativo'}</Pill>
                        </div>
                        <p className="mt-2 text-xs text-graphite-soft">{allowedCount} permissões liberadas</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </Panel>

          <Panel title="Matriz editável">
            {matrixLoading ? (
              <Skeleton className="h-96 w-full rounded-[var(--radius-lg)]" />
            ) : catalogQuery.isError || matricesQuery.isError ? (
              <div className="flex items-center gap-3 text-danger">
                <XCircle size={24} weight="fill" />
                <p className="font-medium">Não foi possível carregar as permissões.</p>
              </div>
            ) : selectedMatrix ? (
              <div className="space-y-5">
                <div className="rounded-[var(--radius-md)] border border-border bg-cream-light p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-medium text-graphite">{selectedMatrix.name}</p>
                      <p className="text-sm text-graphite-soft">{selectedMatrix.email}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Pill tone="info">{selectedKeys.size} liberadas</Pill>
                      <Pill tone="danger">{adminOnlyCount} somente Admin</Pill>
                      {hasChanges && <Pill tone="warning">Alterações pendentes</Pill>}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {permissionGroups.map(([area, permissions]) => {
                    const grantableInArea = permissions.filter((permission) => !permission.isAdminOnly).length;
                    const allowedInArea = permissions.filter((permission) => selectedKeys.has(permission.key) && !permission.isAdminOnly).length;

                    return (
                      <section key={area} className="rounded-[var(--radius-md)] border border-border bg-surface">
                        <div className="flex flex-col gap-2 border-b border-border px-4 py-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <h3 className="font-medium text-graphite">{area}</h3>
                            <p className="text-xs text-graphite-soft">{allowedInArea} de {grantableInArea} permissões liberadas</p>
                          </div>
                          <Pill tone={allowedInArea === grantableInArea && grantableInArea > 0 ? 'success' : 'neutral'}>
                            {allowedInArea === grantableInArea && grantableInArea > 0 ? 'Completo' : 'Parcial'}
                          </Pill>
                        </div>

                        <div className="grid gap-3 p-4 md:grid-cols-2">
                          {permissions.map((permission) => {
                            const currentPermission = selectedMatrix.permissions.find((item) => item.key === permission.key);
                            const allowed = selectedKeys.has(permission.key) && !permission.isAdminOnly;

                            return (
                              <label
                                key={permission.key}
                                className={`flex min-h-[116px] gap-3 rounded-[var(--radius-md)] border p-3 transition-colors ${
                                  permission.isAdminOnly
                                    ? 'border-border bg-cream-light text-store-gray'
                                    : allowed
                                      ? 'border-success/40 bg-success/5 text-graphite'
                                      : 'border-border bg-surface text-graphite hover:border-terracotta/60'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="mt-1 h-4 w-4 accent-terracotta disabled:cursor-not-allowed"
                                  checked={allowed}
                                  disabled={permission.isAdminOnly}
                                  onChange={() => togglePermission(permission)}
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block font-medium">{permission.action}</span>
                                  <span className="mt-1 block text-sm leading-5 text-graphite-soft">{permission.description}</span>
                                  <span className="mt-3 flex flex-wrap gap-2">
                                    <PermissionPill allowed={allowed} />
                                    {permission.defaultForEmployee && <Pill tone="info">Padrão funcionário</Pill>}
                                    {permission.isAdminOnly && <Pill tone="danger">Somente Admin</Pill>}
                                    {currentPermission?.isExplicit && !permission.isAdminOnly && <Pill tone="warning">Customizada</Pill>}
                                  </span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>

                <Field
                  label="Justificativa"
                  required
                  error={reasonError}
                  hint="Essa justificativa fica registrada na auditoria."
                >
                  {(id, describedBy) => (
                    <Textarea
                      id={id}
                      aria-describedby={describedBy}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="Ex.: Ajuste de acesso para operação de estoque e pedidos."
                    />
                  )}
                </Field>

                <div className="flex flex-wrap justify-end gap-3">
                  <Button type="button" variant="outline" disabled={!hasChanges || updatePermissions.isPending} onClick={resetLocalPermissions}>
                    Desfazer
                  </Button>
                  <Button type="button" disabled={!canSave} loading={updatePermissions.isPending} onClick={savePermissions}>
                    <ShieldCheck size={16} /> Salvar permissões
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-graphite-soft">Selecione um funcionário para configurar a matriz.</p>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="Auditoria">
            <div className="mb-4 grid gap-3 md:grid-cols-2">
              <Field label="Ação">
                {(id, describedBy) => (
                  <Select id={id} aria-describedby={describedBy} value={filters.action} onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value }))}>
                    {AUDIT_ACTION_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
                  </Select>
                )}
              </Field>
              <Field label="Entidade">
                {(id, describedBy) => (
                  <Select id={id} aria-describedby={describedBy} value={filters.entityName} onChange={(event) => setFilters((current) => ({ ...current, entityName: event.target.value }))}>
                    {AUDIT_ENTITY_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
                  </Select>
                )}
              </Field>
              <Field label="Usuário ID">
                {(id, describedBy) => (
                  <Input id={id} aria-describedby={describedBy} inputMode="numeric" value={filters.actorUserId} onChange={(event) => setFilters((current) => ({ ...current, actorUserId: event.target.value.replace(/\D/g, '') }))} />
                )}
              </Field>
              <Field label="De">
                {(id, describedBy) => (
                  <Input id={id} aria-describedby={describedBy} type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} />
                )}
              </Field>
              <Field label="Até">
                {(id, describedBy) => (
                  <Input id={id} aria-describedby={describedBy} type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} />
                )}
              </Field>
            </div>

            <div className="mb-4 flex justify-end">
              <Button variant="outline" size="sm" onClick={resetFilters}>Limpar filtros</Button>
            </div>

            {auditQuery.isLoading ? <Skeleton className="h-64 w-full rounded-[var(--radius-lg)]" /> : (
              <AdminTable<AuditEntry>
                rowKey={(entry) => entry.id}
                rows={entries}
                empty="Nenhum evento de auditoria encontrado."
                columns={[
                  { key: 'actor', header: 'Autor', render: (entry) => <div><p className="font-medium">{entry.actor}</p><p className="text-xs text-graphite-soft">{entry.actorRole ?? '-'}</p></div> },
                  { key: 'action', header: 'Ação', render: (entry) => actionLabel(entry.action) },
                  { key: 'reason', header: 'Motivo', render: (entry) => entry.reason || entry.meta || '-' },
                  { key: 'at', header: 'Quando', render: (entry) => formatDate(entry.at) },
                  { key: 'detail', header: 'Detalhe', render: (entry) => (
                    <Button size="sm" variant="outline" onClick={() => setSelectedAuditId(entry.id)}>
                      <Eye size={15} /> Ver
                    </Button>
                  ) },
                ]}
              />
            )}
          </Panel>

          <Panel title="Detalhe da auditoria">
            {!selectedAuditId ? (
              <div className="flex items-start gap-3 text-sm leading-6 text-graphite-soft">
                <Eye size={21} className="mt-0.5 text-cinnamon" />
                <p>Selecione um evento para consultar motivo, IP, correlação e mudanças registradas.</p>
              </div>
            ) : detailQuery.isLoading ? (
              <Skeleton className="h-72 w-full rounded-[var(--radius-lg)]" />
            ) : detailQuery.data ? (
              <AuditDetail entry={detailQuery.data} />
            ) : (
              <p className="text-sm text-graphite-soft">Evento não encontrado.</p>
            )}
          </Panel>

          <Panel title="Linha do tempo">
            {auditQuery.isLoading ? <Skeleton className="h-48 w-full" /> : <AuditTimeline entries={entries.slice(0, 6)} />}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function PermissionPill({ allowed }: { allowed: boolean }) {
  return (
    <Pill tone={allowed ? 'success' : 'neutral'}>
      {allowed ? <CheckCircle size={12} weight="fill" /> : <XCircle size={12} weight="fill" />}
      {allowed ? 'Sim' : 'Não'}
    </Pill>
  );
}

function AuditDetail({ entry }: { entry: AuditEntry }) {
  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-graphite">{actionLabel(entry.action)}</p>
          <p className="text-xs text-graphite-soft">{entry.target}</p>
        </div>
        <Pill tone="info">#{entry.id}</Pill>
      </div>

      <div className="grid gap-2">
        <DetailRow label="Autor" value={entry.actor} />
        <DetailRow label="Perfil" value={entry.actorRole} />
        <DetailRow label="Motivo" value={entry.reason || entry.meta} />
        <DetailRow label="IP" value={entry.ipAddress} />
        <DetailRow label="Correlação" value={entry.correlationId} />
        <DetailRow label="Quando" value={formatDate(entry.at)} />
      </div>

      <JsonBlock title="Antes" value={entry.oldValueJson} />
      <JsonBlock title="Depois" value={entry.newValueJson} />
      {entry.userAgent && <p className="break-words text-xs text-graphite-soft">User agent: {entry.userAgent}</p>}
    </div>
  );
}

function JsonBlock({ title, value }: { title: string; value?: string }) {
  if (!value) return null;

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-graphite-soft">{title}</p>
      <pre className="max-h-56 overflow-auto rounded-[var(--radius-md)] bg-graphite p-3 text-xs leading-5 text-cream-light">
        {value}
      </pre>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-2 last:border-0">
      <span className="text-graphite-soft">{label}</span>
      <span className="break-words text-right font-medium text-graphite">{value || '-'}</span>
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
