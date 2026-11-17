export const rankingListConfig = (
  platform: string,
  totalRows: number,
): {
  initialNumToRender: number;
  removeClippedSubviews: boolean;
} =>
  platform === "web"
    ? {
        initialNumToRender: Math.max(12, totalRows),
        removeClippedSubviews: false,
      }
    : {
        initialNumToRender: 12,
        removeClippedSubviews: true,
      };
