export type ClientSearchFields = {
  nickname?: string | null;
  name?: string | null;
  email?: string | null;
};

export const matchesClientSearch = (
  client: ClientSearchFields,
  term: string,
  consultantName?: string | null,
): boolean => {
  const query = term.trim().toLowerCase();
  if (!query) return true;
  const fields = [client.nickname, client.name, client.email, consultantName];
  return fields.some((field) =>
    String(field || "")
      .toLowerCase()
      .includes(query),
  );
};
