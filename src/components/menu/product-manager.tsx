"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Check, ImagePlus, Pencil, Plus, RotateCcw, ToggleLeft, ToggleRight, Trash2, X } from "lucide-react";
import { deleteProduct, getCategories, getProducts, saveCategories, saveCategory, saveProduct } from "@/lib/data/mock-store";
import { getMenuSnapshot, saveMenuSnapshot } from "@/lib/data/supabase-menu";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn, formatCurrency } from "@/lib/utils";
import type { Category, Product } from "@/types/domain";
import { AdminBadge } from "@/components/admin/ui/badge";
import { AdminButton } from "@/components/admin/ui/button";
import { AdminInput, AdminSelect, AdminTextarea } from "@/components/admin/ui/input";

const defaultProductImageUrl = "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1080&h=1080&q=85";
const assetsBucket = "restaurant-assets";
const restaurantId = "rest_001";
const restaurantSlug = "delicious-gourmet-bolos-e-salgados";
const maxImageSizeInBytes = 5 * 1024 * 1024;
const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function ProductManager() {
  const [items, setItems] = useState<Product[]>(getProducts());
  const [categories, setCategories] = useState<Category[]>(getCategories());
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    stock: "20",
    categoryId: getCategories()[0]?.id ?? "",
    imageUrl: defaultProductImageUrl
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");

  useEffect(() => {
    let ignore = false;
    async function loadMenu() {
      const snapshot = await getMenuSnapshot(restaurantSlug);
      if (!ignore && snapshot && snapshot.products.length > 0) {
        setItems(snapshot.products);
        if (snapshot.categories.length > 0) setCategories(snapshot.categories);
        return;
      }
      if (!ignore) setItems(getProducts());
    }
    loadMenu();
    return () => {
      ignore = true;
    };
  }, []);

  function addCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    const category: Category = {
      id: `cat_${Date.now()}`,
      restaurantId,
      name,
      sortOrder: categories.length + 1,
      active: true
    };
    // Parte das categorias/produtos vive apenas no snapshot do Supabase e nunca
    // e escrita no localStorage. Por isso a nova categoria precisa ser mesclada
    // no estado atual (que veio do snapshot) e nao no retorno de saveCategory,
    // que reidrata a partir do seed e apagaria as categorias reais.
    const next = [...categories, category];
    saveCategory(category);
    setCategories(next);
    setForm((current) => ({ ...current, categoryId: category.id }));
    setNewCategoryName("");
    saveMenuSnapshot(restaurantSlug, next, items).catch((error) => {
      setUploadMessage(error instanceof Error ? `Categoria criada localmente, mas nao publicada: ${error.message}` : "Categoria criada localmente, mas nao publicada.");
    });
  }

  function persistCategories(next: Category[], failureMessage: string) {
    setCategories(next);
    saveCategories(next);
    saveMenuSnapshot(restaurantSlug, next, items).catch((error) => {
      setUploadMessage(error instanceof Error ? `${failureMessage}: ${error.message}` : failureMessage);
    });
  }

  function moveCategory(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    const reordered = [...categories];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const normalized = reordered.map((category, position) => ({ ...category, sortOrder: position + 1 }));
    persistCategories(normalized, "Ordem alterada localmente, mas nao publicada");
  }

  function startRenameCategory(category: Category) {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
  }

  function saveRenameCategory() {
    const name = editingCategoryName.trim();
    if (!editingCategoryId || !name) return;
    const next = categories.map((category) => (category.id === editingCategoryId ? { ...category, name } : category));
    setEditingCategoryId(null);
    setEditingCategoryName("");
    persistCategories(next, "Nome alterado localmente, mas nao publicado");
  }

  function deleteCategory(category: Category) {
    const productCount = items.filter((item) => item.categoryId === category.id).length;
    if (productCount > 0) {
      setUploadMessage(`Nao e possivel excluir "${category.name}": mova ou exclua os ${productCount} produto(s) desta categoria antes.`);
      return;
    }
    if (!window.confirm(`Excluir a categoria "${category.name}"?`)) return;
    const next = categories
      .filter((current) => current.id !== category.id)
      .map((current, position) => ({ ...current, sortOrder: position + 1 }));
    if (form.categoryId === category.id) setForm((current) => ({ ...current, categoryId: next[0]?.id ?? "" }));
    if (editingCategoryId === category.id) setEditingCategoryId(null);
    persistCategories(next, "Categoria excluida localmente, mas nao publicada");
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      name: "",
      description: "",
      price: "",
      stock: "20",
      categoryId: categories[0]?.id ?? "",
      imageUrl: defaultProductImageUrl
    });
    setImageFile(null);
    setUploadMessage("");
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    setPreviewObjectUrl(null);
  }

  async function uploadProductImage(productId: string) {
    if (!imageFile) return { url: form.imageUrl, message: "Produto salvo sem alterar a imagem." };
    const selectedImageFile = imageFile;
    const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    async function uploadLocalFallback(messagePrefix?: string) {
      const body = new FormData();
      body.append("file", selectedImageFile);
      body.append("productId", productId);
      const response = await fetch("/api/uploads/product-image", {
        method: "POST",
        body
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Nao foi possivel salvar a imagem localmente.");
      }

      const data = (await response.json()) as { url: string };
      return {
        url: data.url,
        message: messagePrefix ?? "Imagem salva no projeto e preservada para novas alteracoes."
      };
    }

    if (!supabaseConfigured) {
      return uploadLocalFallback("Imagem salva no projeto. Configure o Supabase Storage para salvar em producao.");
    }

    const extension = selectedImageFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `restaurants/${restaurantId}/products/${productId}-${Date.now()}.${extension}`;
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.storage.from(assetsBucket).upload(path, selectedImageFile, {
      cacheControl: "3600",
      contentType: selectedImageFile.type,
      upsert: true
    });

    if (error) {
      return uploadLocalFallback(`Supabase Storage nao aceitou o upload: ${error.message}. A imagem foi salva no projeto.`);
    }

    const { data } = supabase.storage.from(assetsBucket).getPublicUrl(path);
    return {
      url: `${data.publicUrl}?v=${Date.now()}`,
      message: `Imagem salva definitivamente no Supabase Storage em ${assetsBucket}/${path}.`
    };
  }

  async function submitProduct() {
    if (!form.name || !form.price) return;
    const existing = editingId ? items.find((item) => item.id === editingId) : null;
    const productId = editingId ?? `prod_${Date.now()}`;
    setUploading(true);
    setUploadMessage("");
    try {
      const uploadResult = await uploadProductImage(productId);
      const updatedProduct: Product = {
        id: productId,
        restaurantId: existing?.restaurantId ?? restaurantId,
        categoryId: form.categoryId,
        name: form.name,
        description: form.description,
        imageUrl: uploadResult.url,
        price: Number(form.price),
        stock: Math.max(Number(form.stock) || 0, 0),
        active: existing?.active ?? true,
        requiresNote: existing?.requiresNote ?? false,
        variations: existing?.variations ?? [],
        addons: existing?.addons ?? []
      };
      const next = existing
        ? items.map((item) => (item.id === productId ? updatedProduct : item))
        : [updatedProduct, ...items];
      saveProduct(updatedProduct);
      setItems(next);
      resetForm();
      try {
        await saveMenuSnapshot(restaurantSlug, categories, next);
        setUploadMessage(`${uploadResult.message} Cardapio publicado no Supabase para desktop e mobile.`);
      } catch (error) {
        setUploadMessage(error instanceof Error ? `${uploadResult.message} Produto salvo localmente, mas nao publicado: ${error.message}` : uploadResult.message);
      }
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "Nao foi possivel salvar o produto.");
    } finally {
      setUploading(false);
    }
  }

  function toggleProduct(product: Product) {
    const updated = { ...product, active: !product.active };
    const next = items.map((item) => (item.id === product.id ? updated : item));
    saveProduct(updated);
    setItems(next);
    saveMenuSnapshot(restaurantSlug, categories, next).catch((error) => {
      setUploadMessage(error instanceof Error ? `Produto alterado localmente, mas nao publicado: ${error.message}` : "Produto alterado localmente, mas nao publicado.");
    });
  }

  function removeProduct(product: Product) {
    if (!window.confirm(`Excluir "${product.name}" definitivamente?`)) return;
    const next = items.filter((item) => item.id !== product.id);
    deleteProduct(product.id);
    setItems(next);
    if (editingId === product.id) resetForm();
    saveMenuSnapshot(restaurantSlug, categories, next).catch((error) => {
      setUploadMessage(error instanceof Error ? `Produto excluido localmente, mas nao publicado: ${error.message}` : "Produto excluido localmente, mas nao publicado.");
    });
  }

  function editProduct(product: Product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description,
      price: String(product.price),
      stock: String(product.stock ?? 20),
      categoryId: product.categoryId,
      imageUrl: product.imageUrl
    });
    setImageFile(null);
    setUploadMessage("");
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    setPreviewObjectUrl(null);
  }

  function handleImageFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadMessage("Selecione um arquivo de imagem.");
      return;
    }
    if (!allowedImageTypes.includes(file.type)) {
      setUploadMessage("Use JPG, PNG, WebP ou GIF.");
      return;
    }
    if (file.size > maxImageSizeInBytes) {
      setUploadMessage("A imagem deve ter no maximo 5 MB.");
      return;
    }

    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    const previewUrl = URL.createObjectURL(file);
    setImageFile(file);
    setPreviewObjectUrl(previewUrl);
    setUploadMessage("Imagem pronta para upload ao salvar.");
  }

  return (
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-[#111827] lg:text-[32px]">Produtos</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Cadastre e ajuste os itens do seu cardápio público.</p>
      </div>

      <div className="scrollbar-clean lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <section className="h-fit rounded-card border border-[#E5E7EB] bg-white p-5 shadow-card xl:sticky xl:top-0">
          <div className="flex items-center gap-2.5 border-b border-[#E5E7EB]/50 pb-4">
            <ImagePlus className="h-4 w-4 text-[#6B7280]" />
            <div>
              <h2 className="text-sm font-semibold text-[#111827]">{editingId ? "Editar produto" : "Novo produto"}</h2>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <AdminInput placeholder="Nome" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <AdminTextarea placeholder="Descrição" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            <AdminInput placeholder="Preço" type="number" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
            <AdminInput placeholder="Quantidade disponível" type="number" min="0" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} />
            <AdminSelect value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </AdminSelect>
            <div className="flex items-center gap-2">
              <AdminInput
                placeholder="Nova categoria"
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addCategory();
                  }
                }}
              />
              <AdminButton variant="secondary" className="shrink-0 px-3 h-9" disabled={!newCategoryName.trim()} onClick={addCategory} type="button">
                <Plus className="h-3.5 w-3.5" />
                Categoria
              </AdminButton>
            </div>
            {categories.length > 0 && (
              <div className="rounded-xl border border-[#E5E7EB]/50 bg-slate-50/50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">Categorias do cardápio</p>
                <p className="mt-0.5 text-[10px] leading-normal text-[#6B7280]">Use as setas para ordenar. O lápis renomeia e a lixeira exclui (só categorias sem produtos).</p>
                <ul className="scrollbar-clean mt-2 max-h-[260px] space-y-1.5 overflow-y-auto pr-1">
                  {categories.map((category, index) => {
                    const productCount = items.filter((item) => item.categoryId === category.id).length;
                    return (
                      <li key={category.id} className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB]/60 bg-white px-2 py-1.5">
                        <span className="w-4 shrink-0 text-center text-[11px] font-semibold text-[#6B7280]">{index + 1}</span>
                        {editingCategoryId === category.id ? (
                          <>
                            <AdminInput
                              autoFocus
                              className="h-7 flex-1 text-xs"
                              value={editingCategoryName}
                              onChange={(event) => setEditingCategoryName(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  saveRenameCategory();
                                }
                                if (event.key === "Escape") setEditingCategoryId(null);
                              }}
                            />
                            <button
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#E5E7EB] text-green-600 transition hover:bg-slate-50 disabled:opacity-30"
                              disabled={!editingCategoryName.trim()}
                              onClick={saveRenameCategory}
                              aria-label="Salvar nome"
                              type="button"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#E5E7EB] text-[#6B7280] transition hover:bg-slate-50"
                              onClick={() => setEditingCategoryId(null)}
                              aria-label="Cancelar"
                              type="button"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="min-w-0 flex-1 truncate text-xs font-medium text-[#111827]">
                              {category.name}
                              {productCount > 0 && <span className="ml-1 text-[10px] font-normal text-[#6B7280]">({productCount})</span>}
                            </span>
                            <button
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#E5E7EB] text-[#6B7280] transition hover:bg-slate-50 disabled:opacity-30"
                              disabled={index === 0}
                              onClick={() => moveCategory(index, -1)}
                              aria-label={`Mover ${category.name} para cima`}
                              type="button"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#E5E7EB] text-[#6B7280] transition hover:bg-slate-50 disabled:opacity-30"
                              disabled={index === categories.length - 1}
                              onClick={() => moveCategory(index, 1)}
                              aria-label={`Mover ${category.name} para baixo`}
                              type="button"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#E5E7EB] text-[#6B7280] transition hover:bg-slate-50"
                              onClick={() => startRenameCategory(category)}
                              aria-label={`Renomear ${category.name}`}
                              type="button"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#E5E7EB] text-red-500 transition hover:bg-red-50 disabled:opacity-30"
                              disabled={productCount > 0}
                              title={productCount > 0 ? "Mova ou exclua os produtos desta categoria antes" : undefined}
                              onClick={() => deleteCategory(category)}
                              aria-label={`Excluir ${category.name}`}
                              type="button"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <div className="rounded-xl border border-[#E5E7EB]/50 bg-slate-50/50 p-4">
              <div className="aspect-square w-full overflow-hidden rounded-lg bg-white border border-[#E5E7EB]/60">
                <img src={previewObjectUrl ?? form.imageUrl} alt="Preview do produto" width={1080} height={1080} className="h-full w-full object-cover" />
              </div>
              <label className="mt-3 flex h-9 cursor-pointer items-center justify-center gap-2 rounded-control border border-[#E5E7EB] bg-white px-3 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50">
                <ImagePlus className="h-3.5 w-3.5 text-[#6B7280]" />
                Escolher imagem
                <input className="sr-only" type="file" accept="image/*" onChange={(event) => handleImageFile(event.target.files?.[0])} />
              </label>
              <p className="mt-2 text-[10px] text-[#6B7280] leading-normal">Padrão recomendado: imagem quadrada 1080x1080px, até 5 MB.</p>
              {uploadMessage && <p className="mt-2 text-xs font-medium text-amber-700">{uploadMessage}</p>}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <AdminButton className="w-full" disabled={uploading} onClick={submitProduct} type="button"><Plus className="h-4 w-4" /> {uploading ? "Enviando..." : editingId ? "Salvar produto" : "Adicionar"}</AdminButton>
              {editingId && (
                <AdminButton variant="secondary" className="w-full" onClick={resetForm} type="button">
                  <RotateCcw className="h-4 w-4" />
                  Cancelar edição
                </AdminButton>
              )}
            </div>
          </div>
        </section>
        <section className="rounded-card border border-[#E5E7EB] bg-white p-6 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB]/50 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-[#111827]">Cardápio</h2>
              <p className="text-xs text-[#6B7280]">{items.length} produtos cadastrados</p>
            </div>
            <AdminBadge tone="neutral">Vitrine online</AdminBadge>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {items.map((product) => (
              <article key={product.id} className="overflow-hidden rounded-card border border-[#E5E7EB]/60 bg-white shadow-card transition-all duration-150 hover:-translate-y-0.5 hover:shadow-card-hover">
                <div className="mx-auto aspect-square w-full max-w-[180px] overflow-hidden bg-slate-50 border-b border-[#E5E7EB]/40 mt-3 rounded-lg">
                  <img src={product.imageUrl} alt={product.name} width={1080} height={1080} className="h-full w-full object-cover" />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 text-sm font-semibold text-[#111827]">{product.name}</h3>
                      <p className="mt-1 line-clamp-2 text-xs text-[#6B7280]">{product.description}</p>
                    </div>
                    <AdminBadge tone={product.active ? "success" : "neutral"}>{product.active ? "Ativo" : "Inativo"}</AdminBadge>
                  </div>
                  <div className="mt-4 grid gap-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-base font-semibold text-[#111827]">{formatCurrency(product.price)}</strong>
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        (product.stock ?? 20) > 0 ? "bg-slate-100 text-[#111827]" : "bg-red-50 text-red-700"
                      )}>
                        {(product.stock ?? 20) > 0 ? `${product.stock ?? 20} un` : "Sem estoque"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 pt-2 border-t border-[#E5E7EB]/40">
                      <button className="flex items-center justify-center gap-1 text-[11px] font-medium text-[#6B7280] hover:text-[#111827] transition-colors py-1" onClick={() => toggleProduct(product)} type="button">
                        {product.active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                        Status
                      </button>
                      <button className="flex items-center justify-center gap-1 text-[11px] font-medium text-[#6B7280] hover:text-[#111827] transition-colors py-1" onClick={() => editProduct(product)} type="button">
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>
                      <button className="flex items-center justify-center gap-1 text-[11px] font-medium text-red-600 hover:text-red-700 transition-colors py-1" onClick={() => removeProduct(product)} type="button">
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
      </div>
    </div>
  );
}
