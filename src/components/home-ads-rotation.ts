export type RotationPosition = { page: number; index: number };
export function homeAdsPath(page: number) {
  return (
    "/ads?page=" +
    Math.max(1, page) +
    "&sort=" +
    (page === 0 ? "recent_activity" : "oldest")
  );
}
export function moveAd(
  page: number,
  index: number,
  count: number,
  total: number,
  step: -1 | 1,
): RotationPosition {
  const last = Math.min(500, Math.ceil(total / 24));
  if (page > last) return { page: 0, index: 0 };
  if (step > 0 && index + 1 < count) return { page, index: index + 1 };
  if (step < 0 && index > 0) return { page, index: index - 1 };
  if (step > 0) return { page: page < last ? page + 1 : 0, index: 0 };
  const previous = page === 0 ? last : page - 1;
  return { page: previous, index: previous === 0 ? 0 : 23 };
}
