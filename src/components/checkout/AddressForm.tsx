import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addressSchema, type AddressFormValues } from '@/lib/validation';
import { Field, Input, Select } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { formatZip } from '@/lib/utils';

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export function AddressForm({
  defaultValues,
  onSubmit,
  submitting,
  submitLabel = 'Salvar endereço',
}: {
  defaultValues?: Partial<AddressFormValues>;
  onSubmit: (values: AddressFormValues) => void;
  submitting?: boolean;
  submitLabel?: string;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: { isDefault: false, ...defaultValues },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Apelido (ex.: Casa)" error={errors.label?.message} required>
          {(id, d) => <Input id={id} aria-describedby={d} {...register('label')} placeholder="Casa, Trabalho…" />}
        </Field>
        <Field label="Quem recebe" error={errors.recipient?.message} required>
          {(id, d) => <Input id={id} aria-describedby={d} {...register('recipient')} />}
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
        <Field label="CEP" error={errors.zip?.message} required>
          {(id, d) => (
            <Input
              id={id}
              aria-describedby={d}
              inputMode="numeric"
              placeholder="00000-000"
              {...register('zip', {
                onChange: (e) => setValue('zip', formatZip(e.target.value)),
              })}
            />
          )}
        </Field>
        <Field label="Rua / Logradouro" error={errors.street?.message} required>
          {(id, d) => <Input id={id} aria-describedby={d} {...register('street')} />}
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Número" error={errors.number?.message} required>
          {(id, d) => <Input id={id} aria-describedby={d} {...register('number')} />}
        </Field>
        <Field label="Complemento" error={errors.complement?.message} className="sm:col-span-2">
          {(id, d) => <Input id={id} aria-describedby={d} {...register('complement')} placeholder="Apto, bloco…" />}
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_120px]">
        <Field label="Bairro" error={errors.district?.message} required>
          {(id, d) => <Input id={id} aria-describedby={d} {...register('district')} />}
        </Field>
        <Field label="Cidade" error={errors.city?.message} required>
          {(id, d) => <Input id={id} aria-describedby={d} {...register('city')} />}
        </Field>
        <Field label="UF" error={errors.state?.message} required>
          {(id, d) => (
            <Select id={id} aria-describedby={d} {...register('state')} defaultValue="">
              <option value="" disabled>UF</option>
              {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
            </Select>
          )}
        </Field>
      </div>

      <label className="flex items-center gap-2.5 text-sm text-graphite">
        <input type="checkbox" {...register('isDefault')} checked={watch('isDefault')} className="h-4 w-4 rounded border-border accent-terracotta" />
        Definir como endereço padrão
      </label>

      <Button type="submit" loading={submitting} className="self-start">
        {submitLabel}
      </Button>
    </form>
  );
}
