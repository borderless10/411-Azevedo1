import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  ConsultationSchedulingRequest,
  CreateConsultationRequestInput,
} from "../types/consultationRequest";
import { getCoupleDisplayName, isCoupleAccount } from "../utils/coupleAccount";
import { profileDisplayName } from "../utils/chatDisplayNames";

const COLLECTION = "consultationSchedulingRequests";

const resolveDisplayName = (data: any): string => {
  const userLike = {
    accountType: data?.accountType,
    coupleMember1Name: data?.coupleMember1Name,
    coupleMember2Name: data?.coupleMember2Name,
    nickname: data?.nickname,
    name: data?.name,
  };

  if (isCoupleAccount(userLike as any)) {
    return getCoupleDisplayName(userLike as any);
  }

  return profileDisplayName(userLike as any, "Cliente");
};

const mapRequestFromUser = (
  id: string,
  data: any,
): ConsultationSchedulingRequest | null => {
  if (data?.consultationSchedulingRequestPending !== true) return null;
  if (String(data?.consultationSchedulingUrl || "").trim()) return null;

  return {
    id,
    userId: id,
    userDisplayName: resolveDisplayName(data),
    userEmail: data?.email || "",
    consultantId: data?.consultantId ?? null,
    accountType: data?.accountType || "individual",
    status: "pending",
    createdAt: data?.consultationSchedulingRequestedAt?.toDate?.() || new Date(),
    updatedAt: data?.updatedAt?.toDate?.() || new Date(),
    lastRequestedAt:
      data?.consultationSchedulingRequestedAt?.toDate?.() || new Date(),
  };
};

const mapRequest = (id: string, data: any): ConsultationSchedulingRequest => ({
  id,
  userId: data?.userId || id,
  userDisplayName: data?.userDisplayName || "",
  userEmail: data?.userEmail || "",
  consultantId: data?.consultantId ?? null,
  accountType: data?.accountType || "",
  status: data?.status === "resolved" ? "resolved" : "pending",
  createdAt: data?.createdAt?.toDate?.() || new Date(),
  updatedAt: data?.updatedAt?.toDate?.() || new Date(),
  lastRequestedAt: data?.lastRequestedAt?.toDate?.() || new Date(),
});

const writeCollectionRequest = async (
  input: CreateConsultationRequestInput,
  now: Timestamp,
): Promise<void> => {
  const ref = doc(db, COLLECTION, input.userId);
  const existing = await getDoc(ref);

  const payload = {
    userId: input.userId,
    userDisplayName: input.userDisplayName,
    userEmail: input.userEmail,
    consultantId: input.consultantId ?? null,
    accountType: input.accountType || "individual",
    status: "pending" as const,
    lastRequestedAt: now,
    updatedAt: now,
    ...(existing.exists() ? {} : { createdAt: now }),
  };

  if (existing.exists()) {
    await updateDoc(ref, payload);
    return;
  }

  await setDoc(ref, payload);
};

export const consultationRequestService = {
  async requestSchedulingAccess(
    input: CreateConsultationRequestInput,
  ): Promise<void> {
    const now = Timestamp.now();
    const userRef = doc(db, "users", input.userId);

    await updateDoc(userRef, {
      consultationSchedulingRequestPending: true,
      consultationSchedulingRequestedAt: now,
      updatedAt: now,
    });

    try {
      await writeCollectionRequest(input, now);
    } catch (error) {
      console.warn(
        "[CONSULTATION REQUEST] Falha ao espelhar solicitação na collection:",
        error,
      );
    }
  },

  async resolveRequest(userId: string): Promise<void> {
    if (!userId) return;

    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      consultationSchedulingRequestPending: false,
      updatedAt: Timestamp.now(),
    });

    try {
      const ref = doc(db, COLLECTION, userId);
      const snap = await getDoc(ref);
      if (snap.exists() && snap.data()?.status !== "resolved") {
        await updateDoc(ref, {
          status: "resolved",
          updatedAt: Timestamp.now(),
        });
      }
    } catch (error) {
      console.warn(
        "[CONSULTATION REQUEST] Falha ao resolver solicitação na collection:",
        error,
      );
    }
  },

  subscribeUserRequest(
    userId: string | null,
    onChange: (request: ConsultationSchedulingRequest | null) => void,
  ): () => void {
    if (!userId) {
      onChange(null);
      return () => undefined;
    }

    const userRef = doc(db, "users", userId);
    return onSnapshot(
      userRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          onChange(null);
          return;
        }
        onChange(mapRequestFromUser(snapshot.id, snapshot.data()));
      },
      (error) => {
        console.error("[CONSULTATION REQUEST] Erro ao ouvir solicitação:", error);
        onChange(null);
      },
    );
  },

  subscribePendingRequests(
    options: {
      consultantId?: string | null;
      adminView?: boolean;
    },
    onChange: (requests: ConsultationSchedulingRequest[]) => void,
  ): () => void {
    const usersRef = collection(db, "users");
    const q = query(
      usersRef,
      where("consultationSchedulingRequestPending", "==", true),
    );

    return onSnapshot(
      q,
      (snapshot) => {
        let requests = snapshot.docs
          .map((item) => mapRequestFromUser(item.id, item.data()))
          .filter((item): item is ConsultationSchedulingRequest => item !== null);

        if (!options.adminView && options.consultantId) {
          requests = requests.filter(
            (item) => item.consultantId === options.consultantId,
          );
        }

        requests.sort(
          (a, b) => b.lastRequestedAt.getTime() - a.lastRequestedAt.getTime(),
        );
        onChange(requests);
      },
      (error) => {
        console.error(
          "[CONSULTATION REQUEST] Erro ao listar solicitações pendentes:",
          error,
        );
        onChange([]);
      },
    );
  },
};
