import { Image } from '@phosphor-icons/react';

/** Fallback quando um produto nao possui midias cadastradas. */
export function ProductGalleryFallback() {
  return (
    <div className="grid aspect-square w-full place-items-center rounded-[var(--radius-xl)] bg-cream-light text-store-gray">
      <div className="flex flex-col items-center gap-2">
        <Image size={40} weight="light" />
        <span className="text-sm">Imagem indisponível</span>
      </div>
    </div>
  );
}
