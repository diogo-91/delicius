import type { Category, Product } from "@/types/domain";

const promoCategoryNames = ["promoção do dia", "promocao do dia"];
const crossSellCategoryNames = ["bebidas", "salgados", "docinhos por cento", "docinhos"];

/**
 * Nao existe sinal real de "mais vendido" no modelo de dados hoje (sem coluna
 * featured/order_count). Heuristica documentada: produtos da categoria "Promocao
 * do dia" primeiro, depois um produto por categoria (round-robin) para variar,
 * ate completar `count`. Nunca chamar isso de "mais vendido" na UI.
 */
export function getHighlightProducts(categories: Category[], products: Product[], excludeIds: string[] = [], count = 6): Product[] {
  const promoCategory = categories.find(
    (category) => promoCategoryNames.includes(category.name.trim().toLowerCase()) || category.id === "cat_promocao"
  );

  const active = products.filter((product) => product.active && !excludeIds.includes(product.id));
  const result: Product[] = [];
  const seen = new Set<string>();

  if (promoCategory) {
    for (const product of active.filter((p) => p.categoryId === promoCategory.id)) {
      if (result.length >= count) break;
      if (seen.has(product.id)) continue;
      result.push(product);
      seen.add(product.id);
    }
  }

  const otherCategories = categories.filter((category) => category.id !== promoCategory?.id).sort((a, b) => a.sortOrder - b.sortOrder);
  let round = 0;
  while (result.length < count && round < 20) {
    let addedAny = false;
    for (const category of otherCategories) {
      if (result.length >= count) break;
      const candidate = active.filter((p) => p.categoryId === category.id)[round];
      if (candidate && !seen.has(candidate.id)) {
        result.push(candidate);
        seen.add(candidate.id);
        addedAny = true;
      }
    }
    if (!addedAny) break;
    round += 1;
  }

  return result.slice(0, count);
}

/**
 * Sem tabela de combos/cross-sell no banco. Heuristica documentada: produtos
 * mais baratos das categorias de bebidas/salgados/docinhos, excluindo o que ja
 * esta no carrinho. Nao e um dado real de "combina bem com X".
 */
export function getCrossSellProducts(categories: Category[], products: Product[], excludeIds: string[] = [], count = 3): Product[] {
  const crossSellCategoryIds = new Set(
    categories.filter((category) => crossSellCategoryNames.some((name) => category.name.trim().toLowerCase().includes(name))).map((c) => c.id)
  );

  return products
    .filter((product) => product.active && crossSellCategoryIds.has(product.categoryId) && !excludeIds.includes(product.id))
    .sort((a, b) => (a.variations[0]?.price ?? a.price) - (b.variations[0]?.price ?? b.price))
    .slice(0, count);
}
