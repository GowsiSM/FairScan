import {
  doc,
  setDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { User } from "firebase/auth";
import type { AnalysisResult } from "./types";

/** Guard: returns true if Firestore is available */
function requireDb(): boolean {
  if (!db) {
    console.warn("Firestore not configured — skipping operation");
    return false;
  }
  return true;
}

/**
 * Upsert user profile document. Called on every sign-in/auth state change.
 */
export async function saveUserProfile(user: User): Promise<void> {
  if (!requireDb()) return;
  const userRef = doc(db!, "users", user.uid);
  await setDoc(
    userRef,
    {
      displayName: user.displayName ?? "",
      email: user.email ?? "",
      photoURL: user.photoURL ?? "",
      lastLogin: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Save a completed analysis result to Firestore.
 * Returns the Firestore document ID.
 */
export async function saveAnalysis(
  userId: string,
  result: AnalysisResult
): Promise<string> {
  if (!requireDb()) return "";
  const docRef = await addDoc(collection(db!, "analyses"), {
    userId,
    sessionId: result.session_id,
    domain: result.domain,
    sensitiveAttr: result.sensitive_attr,
    labelCol: result.label_col,
    privilegedGroup: result.privileged_group,
    unprivilegedGroup: result.unprivileged_group,
    biasScore: result.bias_score,
    headline: result.headline,
    summary: result.summary,
    metrics: result.metrics,
    groupStats: result.group_stats,
    biasContributors: result.bias_contributors ?? [],
    analysisType: result.analysis_type ?? "dataset",
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Delete an analysis document from Firestore.
 */
export async function deleteAnalysis(firestoreId: string): Promise<void> {
  if (!requireDb()) return;
  await deleteDoc(doc(db!, "analyses", firestoreId));
}

/**
 * Fetch the 20 most recent analyses for a user, newest first.
 */
export async function getUserAnalyses(
  userId: string
): Promise<(AnalysisResult & { firestoreId: string; createdAt: any })[]> {
  if (!requireDb()) return [];
  const q = query(
    collection(db!, "analyses"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(20)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      firestoreId: d.id,
      isReadOnly: true,
      session_id: data.sessionId,
      domain: data.domain,
      sensitive_attr: data.sensitiveAttr,
      label_col: data.labelCol,
      privileged_group: data.privilegedGroup,
      unprivileged_group: data.unprivilegedGroup,
      bias_score: data.biasScore,
      headline: data.headline,
      summary: data.summary,
      metrics: data.metrics,
      group_stats: data.groupStats,
      bias_contributors: data.biasContributors,
      analysis_type: data.analysisType,
      createdAt: data.createdAt,
    } as any;
  });
}
