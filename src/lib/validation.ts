import { z } from 'zod';

/** Schemas Zod compartilhados (PLANEJAMENTO.md secao 13: validacao com Zod no front). */

export const addressSchema = z.object({
  label: z.string().min(1, 'Informe um apelido para o endereço'),
  recipient: z.string().min(3, 'Informe o nome de quem recebe'),
  zip: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido'),
  street: z.string().min(3, 'Informe a rua'),
  number: z.string().min(1, 'Informe o número'),
  complement: z.string().optional(),
  district: z.string().min(2, 'Informe o bairro'),
  city: z.string().min(2, 'Informe a cidade'),
  state: z.string().length(2, 'UF'),
  isDefault: z.boolean().optional(),
});
export type AddressFormValues = z.infer<typeof addressSchema>;

export const identitySchema = z.object({
  name: z.string().min(3, 'Informe seu nome completo'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().min(14, 'Telefone inválido'),
  document: z.string().min(11, 'CPF inválido'),
});
export type IdentityFormValues = z.infer<typeof identitySchema>;

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo de 6 caracteres'),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z.string().min(3, 'Informe seu nome completo'),
    email: z.string().email('E-mail inválido'),
    password: z.string().min(6, 'Mínimo de 6 caracteres'),
    confirm: z.string(),
    consent: z.boolean().optional(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'As senhas não conferem',
    path: ['confirm'],
  });
export type RegisterFormValues = z.infer<typeof registerSchema>;

export const reviewSchema = z.object({
  rating: z.number().min(1, 'Dê uma nota').max(5),
  title: z.string().min(3, 'Escreva um título'),
  body: z.string().min(10, 'Conte um pouco mais sobre sua experiência'),
});
export type ReviewFormValues = z.infer<typeof reviewSchema>;
