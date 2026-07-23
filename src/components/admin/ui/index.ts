/**
 * Kit de UI do admin — novo design system editorial (Bibi Bolsas).
 * Ponto único de importação para padronizar a estilização entre as telas.
 *
 *   import { PageHeader, SectionCard, DataTable, toast } from '@/components/admin/ui';
 */

// Layout & superfícies
export { Card, SectionCard } from './Card';
export { PageHeader, type Crumb } from './PageHeader';

// Listagens
export { Toolbar, ToolbarSpacer, SearchInput } from './Toolbar';
export { DataTable, type Column, type SortState } from './DataTable';

// Indicadores
export { StatCard } from './StatCard';
export { StatusBadge, type Tone } from './StatusBadge';
export { Tabs, type TabItem } from './Tabs';
export { Steps, SegmentedControl, type StepItem } from './Steps';

// Campos especializados
export { NumberInput, MoneyInput } from './NumberInput';
export { ColorInput } from './ColorInput';

// Sobreposições
export { Modal, ConfirmDialog } from './Modal';

// Feedback
export { Banner, feedback, errorMessage, toast } from './Feedback';

// Estados
export { EmptyState, ErrorState, LoadingState } from './States';

// Formulários
export { FormGrid, FormSection, FormActions } from './Forms';

// Primitivos compartilhados (reexportados para import único no admin)
export { Button, ButtonLink } from '@/components/ui/Button';
export { Field, Input, Textarea, Select } from '@/components/ui/Field';
