export interface Recommendation {
  id: string;
  userId: string;
  consultantId: string;
  recommendationDate: Date;
  topics: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RecommendationFirestore {
  userId: string;
  consultantId: string;
  recommendationDate: any;
  topics: string[];
  createdAt: any;
  updatedAt: any;
}

export interface CreateRecommendationData {
  recommendationDate: Date;
  topics: string[];
}

export interface UpdateRecommendationData {
  recommendationDate: Date;
  topics: string[];
}
