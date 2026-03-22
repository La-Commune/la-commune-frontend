import { getSupabase, NEGOCIO_ID } from "@/lib/supabase";
import { MenuSection, MenuItem } from "@/models/menu.model";

// ── Queries ────────────────────────────────────────────

export async function getFullMenu(options?: { forAdmin?: boolean }): Promise<MenuSection[]> {
  const supabase = getSupabase();
  const forAdmin = options?.forAdmin ?? false;

  // Fetch categories (admin sees all, public sees only active)
  let catQuery = supabase
    .from("categorias_menu")
    .select("*")
    .eq("negocio_id", NEGOCIO_ID)
    .is("eliminado_en", null)
    .order("orden", { ascending: true });

  if (!forAdmin) {
    catQuery = catQuery.eq("activo", true);
  }

  const { data: categories, error: catError } = await catQuery;

  if (catError) throw catError;
  if (!categories) return [];

  // Fetch products + sizes in parallel
  // Admin sees ALL products (including hidden/unavailable)
  // Public sees only visible AND available
  let prodQuery = supabase
    .from("productos")
    .select("*")
    .eq("negocio_id", NEGOCIO_ID)
    .is("eliminado_en", null)
    .order("orden", { ascending: true });

  if (!forAdmin) {
    prodQuery = prodQuery.eq("disponible", true).eq("visible_menu", true);
  }

  const [productsRes, sizesRes] = await Promise.all([
    prodQuery,
    supabase
      .from("opciones_tamano")
      .select("*")
      .order("orden", { ascending: true }),
  ]);

  if (productsRes.error) throw productsRes.error;
  if (sizesRes.error) throw sizesRes.error;

  const products = productsRes.data || [];
  const allSizes = sizesRes.data || [];

  // Index sizes by producto_id (raw adicional values)
  const rawSizesByProduct = new Map<string, { label: string; adicional: number }[]>();
  for (const s of allSizes) {
    const arr = rawSizesByProduct.get(s.producto_id) || [];
    arr.push({ label: s.nombre, adicional: s.precio_adicional ?? 0 });
    rawSizesByProduct.set(s.producto_id, arr);
  }

  // Build sections with products
  return categories.map((cat) => {
    const catProducts = products.filter((p) => p.categoria_id === cat.id);

    return {
      id: cat.id,
      title: cat.nombre,
      description: cat.descripcion ?? "",
      type: cat.tipo ?? "drink",
      order: cat.orden ?? 0,
      active: cat.activo,
      items: catProducts.map((p) => {
        const rawSizes = rawSizesByProduct.get(p.id);
        // Compute full price: precio_base + precio_adicional
        const sizes = rawSizes?.map((s) => ({
          label: s.label,
          price: (p.precio_base ?? 0) + s.adicional,
        }));
        return {
          id: p.id,
          name: p.nombre,
          price: p.precio_base,
          sizes: sizes && sizes.length > 0 ? sizes : undefined,
          ingredients: p.ingredientes || [],
          optional: p.opcionales || [],
          note: p.nota ?? p.descripcion ?? "",
          imageUrl: p.imagen_url,
          available: p.disponible,
          visible: p.visible_menu ?? true,
          tags: p.etiquetas || [],
          highlight: p.destacado || false,
          seasonal: p.estacional || false,
          order: p.orden ?? 0,
          schemaVersion: 1,
        };
      }),
      schemaVersion: 1,
    } as MenuSection;
  });
}

// ── Field mapping (model → DB column) ──────────────────

const FIELD_TO_COLUMN: Record<string, string> = {
  name: "nombre",
  price: "precio_base",
  ingredients: "ingredientes",
  optional: "opcionales",
  note: "nota",
  imageUrl: "imagen_url",
  available: "disponible",
  visible: "visible_menu",
  tags: "etiquetas",
  highlight: "destacado",
  seasonal: "estacional",
  order: "orden",
  // sizes se maneja aparte (tabla opciones_tamano)
};

// ── Mutations: productos ───────────────────────────────

export async function updateMenuItem(
  sectionId: string,
  itemId: string,
  data: Partial<MenuItem>,
  clearFields?: (keyof MenuItem)[]
): Promise<void> {
  const supabase = getSupabase();
  const updateData: Record<string, unknown> = {};

  // Map model fields → DB columns
  if (data.name !== undefined) updateData.nombre = data.name;
  if (data.price !== undefined) updateData.precio_base = data.price;
  if (data.ingredients !== undefined) updateData.ingredientes = data.ingredients;
  if (data.optional !== undefined) updateData.opcionales = data.optional;
  if (data.note !== undefined) updateData.nota = data.note;
  if (data.imageUrl !== undefined) updateData.imagen_url = data.imageUrl;
  if (data.available !== undefined) updateData.disponible = data.available;
  if (data.visible !== undefined) updateData.visible_menu = data.visible;
  if (data.tags !== undefined) updateData.etiquetas = data.tags;
  if (data.highlight !== undefined) updateData.destacado = data.highlight;
  if (data.seasonal !== undefined) updateData.estacional = data.seasonal;
  if (data.order !== undefined) updateData.orden = data.order;

  // Handle field clearing
  if (clearFields) {
    for (const field of clearFields) {
      if (field === "sizes") continue; // sizes se maneja abajo
      if (field === "price") continue; // precio_base is NOT NULL, never clear it
      const col = FIELD_TO_COLUMN[field] || field;
      updateData[col] = null;
    }
  }

  // Update product record
  if (Object.keys(updateData).length > 0) {
    updateData.actualizado_en = new Date().toISOString();
    const { error } = await supabase
      .from("productos")
      .update(updateData)
      .eq("id", itemId)
      .eq("negocio_id", NEGOCIO_ID);
    if (error) throw error;
  }

  // Handle sizes — replace all sizes for this product
  if (data.sizes !== undefined || clearFields?.includes("sizes")) {
    // Delete existing sizes
    await supabase
      .from("opciones_tamano")
      .delete()
      .eq("producto_id", itemId);

    // Insert new sizes (if any)
    // sizes[].price contains the FULL price, we need to subtract precio_base to get adicional
    if (data.sizes && data.sizes.length > 0) {
      // Get current precio_base to compute adicional
      let precioBase = data.price ?? 0;
      if (data.price === undefined) {
        const { data: prod } = await supabase
          .from("productos")
          .select("precio_base")
          .eq("id", itemId)
          .single();
        precioBase = prod?.precio_base ?? 0;
      }
      const sizeRows = data.sizes.map((s, i) => ({
        producto_id: itemId,
        nombre: s.label,
        precio_adicional: Math.max(0, (s.price ?? 0) - precioBase),
        orden: i,
      }));
      const { error: sizeError } = await supabase
        .from("opciones_tamano")
        .insert(sizeRows);
      if (sizeError) throw sizeError;
    }
  }
}

export async function addMenuItem(
  sectionId: string,
  data: Omit<MenuItem, "id">
): Promise<string> {
  const supabase = getSupabase();

  const insertData = {
    negocio_id: NEGOCIO_ID,
    categoria_id: sectionId,
    nombre: data.name,
    precio_base: data.price ?? 0,
    descripcion: data.note || "",
    nota: data.note || "",
    ingredientes: data.ingredients || [],
    opcionales: data.optional || [],
    imagen_url: data.imageUrl,
    disponible: data.available ?? true,
    visible_menu: data.visible ?? true,
    etiquetas: data.tags || [],
    destacado: data.highlight || false,
    estacional: data.seasonal || false,
    orden: data.order ?? 0,
  };

  const { data: result, error } = await supabase
    .from("productos")
    .insert([insertData])
    .select()
    .single();

  if (error) throw error;

  // Insert sizes if any
  // sizes[].price contains the FULL price, subtract precio_base to get adicional
  if (data.sizes && data.sizes.length > 0) {
    const precioBase = data.price ?? 0;
    const sizeRows = data.sizes.map((s, i) => ({
      producto_id: result.id,
      nombre: s.label,
      precio_adicional: Math.max(0, (s.price ?? 0) - precioBase),
      orden: i,
    }));
    await supabase.from("opciones_tamano").insert(sizeRows);
  }

  return result.id;
}

export async function deleteMenuItem(
  sectionId: string,
  itemId: string
): Promise<void> {
  const supabase = getSupabase();

  // Soft delete (set eliminado_en)
  const { error } = await supabase
    .from("productos")
    .update({ eliminado_en: new Date().toISOString() })
    .eq("id", itemId)
    .eq("negocio_id", NEGOCIO_ID);

  if (error) throw error;
}

// ── Mutations: categorías ──────────────────────────────

export async function addMenuSection(
  data: Omit<MenuSection, "id" | "items">
): Promise<string> {
  const supabase = getSupabase();

  const insertData = {
    negocio_id: NEGOCIO_ID,
    nombre: data.title,
    descripcion: data.description,
    tipo: data.type,
    orden: data.order ?? 0,
    activo: data.active ?? true,
  };

  const { data: result, error } = await supabase
    .from("categorias_menu")
    .insert([insertData])
    .select()
    .single();

  if (error) throw error;
  return result.id;
}

export async function updateMenuSection(
  sectionId: string,
  data: Partial<MenuSection>
): Promise<void> {
  const supabase = getSupabase();

  const updateData: Record<string, unknown> = {};

  if (data.title !== undefined) updateData.nombre = data.title;
  if (data.description !== undefined) updateData.descripcion = data.description;
  if (data.type !== undefined) updateData.tipo = data.type;
  if (data.order !== undefined) updateData.orden = data.order;
  if (data.active !== undefined) updateData.activo = data.active;

  updateData.actualizado_en = new Date().toISOString();

  const { error } = await supabase
    .from("categorias_menu")
    .update(updateData)
    .eq("id", sectionId)
    .eq("negocio_id", NEGOCIO_ID);

  if (error) throw error;
}

export async function deleteMenuSection(
  sectionId: string
): Promise<void> {
  const supabase = getSupabase();

  // Soft delete productos in this category
  const { error: itemsError } = await supabase
    .from("productos")
    .update({ eliminado_en: new Date().toISOString() })
    .eq("categoria_id", sectionId)
    .eq("negocio_id", NEGOCIO_ID);

  if (itemsError) throw itemsError;

  // Soft delete the category
  const { error: catError } = await supabase
    .from("categorias_menu")
    .update({ eliminado_en: new Date().toISOString() })
    .eq("id", sectionId)
    .eq("negocio_id", NEGOCIO_ID);

  if (catError) throw catError;
}
