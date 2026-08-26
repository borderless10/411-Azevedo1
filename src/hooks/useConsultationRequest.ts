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
  const enabled =
    options?.enabled !== false && !!user?.id && (isAdmin || isConsultor);

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
        adminView: isAdmin,
        consultantId: isConsultor ? user.id : null,
      },
      setRequests,
    );
  }, [enabled, isAdmin, isConsultor, user?.id]);

  return requests;
};
