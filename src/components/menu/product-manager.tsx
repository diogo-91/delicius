"use client";

import { useEffect, useState } from "react";
import { ImagePlus, Pencil, Plus, RotateCcw, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { deleteProduct, getCategories, getProducts, saveCategory, saveProduct } from "@/lib/data/mock-store";
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
    const next = saveCategory(category);
    setCategories(next);
    setForm((current) => ({ ...current, categoryId: category.id }));
    setNewCategoryName("");
    saveMenuSnapshot(restaurantSlug, next, items).catch((error) => {
      setUploadMessage(error instanceof Error ? `Categoria criada localmente, mas nao publicada: ${error.message}` : "Categoria criada localmente, mas nao publicada.");
    });
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
