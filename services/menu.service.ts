import {
  Firestore,
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  query,
  orderBy,
} from "firebase/firestore";
import { MenuSection, MenuItem } from "@/models/menu.model";

export async function getFullMenu(firestore: Firestore): Promise<MenuSection[]> {
  const sectionsSnap = await getDocs(
    query(collection(firestore, "menu-sections"), orderBy("order"))
  );

  const sections = await Promise.all(
    sectionsSnap.docs.map(async (sectionDoc) => {
      const section = { id: sectionDoc.id, ...sectionDoc.data() } as MenuSection;

      const itemsSnap = await getDocs(
        query(
          collection(firestore, "menu-sections", sectionDoc.id, "items"),
          orderBy("order")
        )
      );

      section.items = itemsSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as MenuItem)
      );

      return section;
    })
  );

  return sections;
}

export async function updateMenuItem(
  firestore: Firestore,
  sectionId: string,
  itemId: string,
  data: Partial<MenuItem>,
  clearFields?: (keyof MenuItem)[]
): Promise<void> {
  const ref = doc(firestore, "menu-sections", sectionId, "items", itemId);
  const update: any = { ...data };
  if (clearFields) {
    for (const field of clearFields) {
      update[field] = deleteField();
    }
  }
  await updateDoc(ref, update);
}

export async function addMenuItem(
  firestore: Firestore,
  sectionId: string,
  data: Omit<MenuItem, "id">
): Promise<string> {
  const ref = collection(firestore, "menu-sections", sectionId, "items");
  const docRef = await addDoc(ref, data);
  return docRef.id;
}

export async function deleteMenuItem(
  firestore: Firestore,
  sectionId: string,
  itemId: string
): Promise<void> {
  await deleteDoc(doc(firestore, "menu-sections", sectionId, "items", itemId));
}

export async function addMenuSection(
  firestore: Firestore,
  data: Omit<MenuSection, "id" | "items">
): Promise<string> {
  const ref = await addDoc(collection(firestore, "menu-sections"), data);
  return ref.id;
}

export async function updateMenuSection(
  firestore: Firestore,
  sectionId: string,
  data: Partial<MenuSection>
): Promise<void> {
  const { items: _items, ...rest } = data;
  await updateDoc(doc(firestore, "menu-sections", sectionId), rest as any);
}

export async function deleteMenuSection(
  firestore: Firestore,
  sectionId: string
): Promise<void> {
  // Borrar todos los items primero, luego la sección
  const itemsSnap = await getDocs(
    collection(firestore, "menu-sections", sectionId, "items")
  );
  await Promise.all(itemsSnap.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(firestore, "menu-sections", sectionId));
}
