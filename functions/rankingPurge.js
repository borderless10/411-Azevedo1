const formatDateKeyBr = (dateKey) => {
  if (!dateKey || typeof dateKey !== "string") return null;
  const parts = dateKey.split("-");
  if (parts.length !== 3) return dateKey;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const nextDayKey = (dateKey) => {
  if (!dateKey || typeof dateKey !== "string") return null;
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() + 1);
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

export const seasonPeriodLabel = (season) => {
  const number = Number(season?.seasonNumber) || 0;
  const startKey = season?.previousCutoffDateKey
    ? nextDayKey(season.previousCutoffDateKey) || season.previousCutoffDateKey
    : null;
  const endKey = season?.cutoffDateKey || null;
  const start = formatDateKeyBr(startKey);
  const end = formatDateKeyBr(endKey);
  const period =
    start && end
      ? `${start} a ${end}`
      : end
        ? `até ${end}`
        : "período indefinido";
  return `Edição ${number} (${period})`;
};

export const normalizeSeasonNumbers = (value) => {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .map((entry) => Number(entry))
        .filter((entry) => Number.isInteger(entry) && entry > 0),
    ),
  ].sort((a, b) => a - b);
};

export const resolvePurgeTargets = ({
  seasons,
  seasonNumbers,
  deleteAll,
}) => {
  const catalog = (Array.isArray(seasons) ? seasons : []).filter(
    (season) => Number(season?.seasonNumber) > 0,
  );
  if (deleteAll === true) {
    return {
      targets: catalog,
      missing: [],
    };
  }
  const wanted = normalizeSeasonNumbers(seasonNumbers);
  const byNumber = new Map(
    catalog.map((season) => [Number(season.seasonNumber), season]),
  );
  const targets = [];
  const missing = [];
  wanted.forEach((number) => {
    const found = byNumber.get(number);
    if (found) targets.push(found);
    else missing.push(number);
  });
  return { targets, missing };
};

export const remainingSeasonCounter = (seasons, deletedNumbers) => {
  const deleted = new Set(deletedNumbers.map(Number));
  const remaining = (Array.isArray(seasons) ? seasons : [])
    .map((season) => Number(season?.seasonNumber) || 0)
    .filter((number) => number > 0 && !deleted.has(number));
  if (remaining.length === 0) return 0;
  return Math.max(...remaining);
};
