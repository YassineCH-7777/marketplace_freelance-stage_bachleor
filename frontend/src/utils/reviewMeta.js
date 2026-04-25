export const reviewAxes = [
  {
    key: 'qualityRating',
    label: 'Qualite',
    helper: 'Resultat final et niveau de soin',
  },
  {
    key: 'punctualityRating',
    label: 'Ponctualite',
    helper: 'Respect des delais et de la presence sur place',
  },
  {
    key: 'communicationRating',
    label: 'Communication',
    helper: 'Clarte, reactivite et coordination',
  },
];

export function getReviewAverage(review) {
  if (!review) {
    return null;
  }

  const values = reviewAxes
    .map(({ key }) => Number(review[key]))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (values.length === 0) {
    const fallback = Number(review.rating);
    return Number.isFinite(fallback) ? fallback : null;
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.round(average * 10) / 10;
}

export function getReviewAxisAverages(reviews = []) {
  return reviewAxes.map((axis) => {
    const values = reviews
      .map((review) => Number(review?.[axis.key]))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (values.length === 0) {
      return { ...axis, average: null };
    }

    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    return { ...axis, average: Math.round(average * 10) / 10 };
  });
}

export function formatReviewScore(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(1) : '--';
}
