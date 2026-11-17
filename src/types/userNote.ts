export interface UserNote {
  id: string;
  userId: string;
  title: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserNoteInput {
  title: string;
  body: string;
}