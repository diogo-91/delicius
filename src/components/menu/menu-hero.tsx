import { ArrowRight, Heart, MapPin, Minus, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Category, Product, Restaurant } from "@/types/domain";
import { Button } from "@/components/ui/button";

const promoCategoryNames = ["promoção do dia", "promocao do dia"];

export function getHeroProduct(categories: Category[], products: Product[]): Product | null {
  const activeProducts = products.filter((product) => product.active);
  if (activeProducts.length === 0) return null;

  const promoCategory = categories.find(
    (category) => promoCategoryNames.includes(category.name.trim().toLowerCase()) || category.id === "cat_promocao"
  );

  if (promoCategory) {
    const promoCandidates = activeProducts.filter((product) => product.categoryId === promoCategory.id).sort((a, b) => a.id.localeCompare(b.id));
    if (promoCandidates.length > 0) return promoCandidates[0];
  }

  // Sem categoria de promocao com produto ativo: usa o primeiro produto ativo
  // real do cardapio (por ordem de categoria) em vez de deixar o banner vazio.
  const orderedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
  for (const category of orderedCategories) {
    const candidate = activeProducts.find((product) => product.categoryId === category.id);
    if (candidate) return candidate;
  }

  return activeProducts[0] ?? null;
}

export function MenuHero({
  restaurant,
  displayName,
  heroProduct,
  quantityInCart,
  onAdd,
  onIncrement,
  onDecrement,
  onOpenInfo
}: {
  restaurant: Restaurant;
  displayName: string;
  heroProduct: Product | null;
  quantityInCart: number;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  onOpenInfo: () => void;
}) {
  if (!heroProduct) {
    return (
      <section className="mx-auto mt-4 w-full max-w-[1500px] px-4 md:mt-6 xl:w-[94%]">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line2 bg-white px-5 py-4">
          <p className="text-sm font-semibold text-ink2">Confira nosso cardápio abaixo</p>
          <button
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted2 underline-offset-2 hover:underline"
            onClick={onOpenInfo}
            type="button"
          >
            <MapPin className="h-4 w-4" />
            {restaurant.address}
          </button>
        </div>
      </section>
    );
  }

  const price = heroProduct.variations[0]?.price ?? heroProduct.price;

  return (
    <section className="mx-auto mt-2 w-full max-w-[1500px] px-4 md:mt-4 xl:w-[94%]">
      <div className="grid gap-6 py-6 md:grid-cols-2 md:items-center md:gap-10 md:py-10">
        <div className="flex flex-col items-start gap-3 md:order-1">
          <span className="inline-flex w-fit items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink2/70">
            <span className="h-px w-6 bg-ink2/30" />O queridinho da {displayName} <Heart className="h-3.5 w-3.5 fill-cta text-cta" />
            <span className="h-px w-6 bg-ink2/30" />
          </span>
          <h1 className="font-display text-4xl font-bold leading-[1.05] text-ink2 md:text-[54px]">{heroProduct.name}</h1>
          {heroProduct.description && <p className="max-w-md text-base leading-6 text-muted2">{heroProduct.description}</p>}
          <strong className="mt-1 text-3xl font-bold text-cta md:text-4xl">{formatCurrency(price)}</strong>

          {quantityInCart === 0 ? (
            <Button variant="cta" className="mt-2 h-12 w-fit gap-2 rounded-xl px-6 text-base" onClick={onAdd} type="button">
              QUERO PEDIR
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <div className="mt-2 flex h-12 w-fit items-center gap-4 rounded-xl bg-white px-4 shadow-sm">
              <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-paper text-ink2" onClick={onDecrement} type="button">
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-[1.5rem] text-center text-base font-bold text-ink2">{quantityInCart}</span>
              <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-paper text-ink2" onClick={onIncrement} type="button">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        <div className="aspect-[4/3] w-full overflow-hidden rounded-3xl md:order-2 md:aspect-square">
          <img src={heroProduct.imageUrl} alt={heroProduct.name} className="h-full w-full object-cover" />
        </div>
      </div>
    </section>
  );
}
