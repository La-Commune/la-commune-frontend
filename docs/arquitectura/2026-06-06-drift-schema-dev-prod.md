# Drift de schema dev ↔ prod — barrido completo · 2026-06-06

> Hallazgo del loop de día. Barrido sistemático de `information_schema.columns` en las
> 10 tablas que el frontend toca, comparando **dev** (`ntfmubmmykpzbltbeujv`) vs **prod**
> (`vzreodbrwksaoqmsnnqk`). Surgió al verificar el módulo de promos contra datos reales.
>
> **Causa probable:** features agregadas en dev cuyas migraciones (`ALTER TABLE`) nunca se
> aplicaron a producción. Prod quedó con un schema más viejo. El frontend se escribió
> contra dev → sus escrituras fallan en prod para las tablas con columnas faltantes.
>
> ⚠️ Ningún DDL ejecutado. Todo esto requiere decisión de David + coordinación con el POS
> (tablas compartidas). Solo lectura de `information_schema`.

## Resumen

| Tabla | Estado | Impacto |
|-------|--------|---------|
| **promociones** | 🔴 drift fuerte | Crear/editar promos desde el admin **falla** en prod |
| **productos** | 🔴 drift | Crear producto desde el admin **falla**; badges Especial/Temporada no salen |
| clientes | 🟢 inocuo | dev tiene `puntos`, prod no — el frontend no lo usa |
| opciones_tamano | 🟢 inocuo | dev tiene `creado_en`, prod no — el frontend no lo usa |
| categorias_menu, eventos_sello, recompensas, tarjetas, usuarios, push_subscriptions | ✅ idénticas | — |

## 🔴 promociones

| Campo frontend | dev | prod |
|---|---|---|
| título | `nombre` | `titulo` |
| valor | `valor_descuento` | `valor` |
| es_porcentaje | ✅ | **falta** |
| appliesTo | `aplica_a` | **falta** |
| días vigencia | `dias_semana` | **falta** |

- **Leer** (`getPromotions`, `select("*")`): mapea `row.nombre`/`valor_descuento`/`aplica_a`/
  `dias_semana` → todos `undefined`/`[]` en prod. Banner con título/valor vacíos.
- **Crear/editar** (`addPromotion`/`updatePromotion`): escriben `nombre`,`valor_descuento`,
  `es_porcentaje`,`aplica_a`,`dias_semana` → **columnas inexistentes → INSERT/UPDATE FALLA**.
- Estado: latente (prod tiene 0 promos). Muerde al crear la primera promo en prod.

## 🔴 productos

Prod **carece** de 4 columnas que el frontend mapea (`FIELD_TO_COLUMN` en menu.service.ts):
`destacado` (highlight), `estacional` (seasonal), `nota` (note), `opcionales` (optional).

- **Leer** (`getFullMenu`): `destacado`/`estacional` → undefined → los badges "Especial" y
  "Temporada" NUNCA salen en prod (cosmético). `nota`/`opcionales` → vacíos (info faltante).
- **Crear** (`addMenuItem`, líneas 215-223): escribe SIEMPRE `nota`,`opcionales`,`destacado`,
  `estacional` → **INSERT FALLA en prod**. El admin del frontend NO puede agregar productos
  nuevos en producción.
- **Editar** (`updateMenuItem`): escribe esas columnas solo si el form las envía; si el
  EditItemModal manda highlight/seasonal/note/optional, el UPDATE también falla.
- Estado: prod tiene 6 productos (seedeados directo con el schema de prod). Se muestran ok
  salvo los badges. El problema es el WRITE desde el admin frontend.
- Nota: el menú es "unificado con el POS" — el POS gestiona el menú con SU schema. Si el
  alta de productos en prod se hace SOLO por el POS, el impacto es menor; si David usa el
  admin del frontend para alta de productos en prod, falla. (Investigar el POS está fuera
  del alcance de hoy.)

## Recomendación para David

1. **Reconciliar prod con el schema de dev** (el frontend asume dev): aplicar las
   migraciones faltantes a prod —
   - `promociones`: renombrar `titulo→nombre`, `valor→valor_descuento`; agregar
     `es_porcentaje BOOLEAN`, `aplica_a TEXT`, `dias_semana INT[]` (o el tipo que use dev).
   - `productos`: agregar `destacado BOOLEAN`, `estacional BOOLEAN`, `nota TEXT`,
     `opcionales TEXT[]` (verificar tipos exactos contra dev).
2. **ANTES de tocar:** confirmar que el POS no dependa de `promociones.titulo`/`valor` ni
   del schema actual de prod — la tabla es compartida. Esto puede requerir alinear POS +
   frontend a un solo schema. **Decisión de arquitectura de datos, no un fix mecánico.**
3. **Prevención:** el `supabase/schemas/schema-production.sql` del POS debería ser la
   fuente única de verdad y mantenerse al día con cada `ALTER TABLE` de dev, para que prod
   no vuelva a quedar atrás. Considerar un check de CI que compare schemas.

Es el mismo patrón que ya apareció en el informe de seguridad (categorias_menu sin policies
anon, columnas `activo`/`descripcion` que faltaban en prod y se agregaron 22-Mar): **el
drift dev↔prod es recurrente** y vale un proceso, no fixes puntuales.
