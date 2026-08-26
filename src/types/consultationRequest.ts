export type ConsultationRequestStatus = "pending" | "resolved";

export interface ConsultationSchedulingRequest {
  id: string;
  userId: string;
  userDisplayName: string;
  userEmail: string;
  consultantId?: string | null;
  accountType?: string;
  status: ConsultationRequestStatus;
  createdAt: Date;
  updatedAt: Date;
  lastRequestedAt: Date;
}

export interface CreateConsultationRequestInput {
  userId: string;
  userDisplayName: string;
  userEmail: string;
  consultantId?: string | null;
  accountType?: string;
}
