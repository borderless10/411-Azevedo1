import { useEffect, useState } from "react";
import { consultationRequestService } from "../services/consultationRequestService";
import { ConsultationSchedulingRequest } from "../types/consultationRequest";
import { useAuth } from "./useAuth";

export const useUserConsultationRequest = (userId?: string | null) => {
  const [request, setRequest] = useState<ConsultationSchedulingRequest | null>(
    null,
  );

  useEffect(() => {
    if (!userId) {
      setRequest(null);
      return;
    }

    return consultationRequestService.subscribeUserRequest(userId, setRequest);
  }, [userId]);

  return request;
};

export const usePendingConsultationRequests = (options?: {
  enabled?: boolean;
}) => {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin === true || user?.role === "admin";
  const isConsultor = user?.role === "consultor";
  const isSupervisor = user?.role === "supervisor";
  const enabled =
    options?.enabled !== false &&
    !!user?.id &&
    (isAdmin || isConsultor || isSupervisor);

  const [requests, setRequests] = useState<ConsultationSchedulingRequest[]>(
    [],
  );

  useEffect(() => {
    if (!enabled || !user?.id) {
      setRequests([]);
      return;
    }

    return consultationRequestService.subscribePendingRequests(
      {
        // Supervisor vê todas as solicitações (paridade ampla com consultor).
        adminView: isAdmin || isSupervisor,
        consultantId: isConsultor ? user.id : null,
      },
      setRequests,
    );
  }, [enabled, isAdmin, isConsultor, isSupervisor, user?.id]);

  return requests;
};
