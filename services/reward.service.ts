import {
  Firestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { Reward } from "@/models/reward.model";

const COL = "rewards";
const DEFAULT_ID = "default";

export async function getDefaultReward(
  firestore: Firestore,
): Promise<(Reward & { id: string }) | null> {
  const snap = await getDoc(doc(firestore, COL, DEFAULT_ID));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Reward) };
}

/**
 * Crea o actualiza el reward "default".
 * Usa setDoc con merge para que funcione tanto la primera vez como en updates.
 */
export async function upsertDefaultReward(
  firestore: Firestore,
  data: Partial<Reward>,
): Promise<void> {
  await setDoc(doc(firestore, COL, DEFAULT_ID), data, { merge: true });
}

export async function updateRewardStamps(
  firestore: Firestore,
  requiredStamps: number,
): Promise<void> {
  await updateDoc(doc(firestore, COL, DEFAULT_ID), { requiredStamps });
}
