const MEDIA_SECTION_TITLE = 'Medias et portfolio';
const KNOWN_SECTION_TITLES = new Set([
  'Ce qui est inclus',
  "Ce qui n'est pas inclus",
  'Tarification',
  'Disponibilite et delais',
  'Conditions du service',
  'Sous-categorie',
]);

function getLines(description) {
  return String(description || '').split(/\r?\n/);
}

function readMediaBlock(description) {
  const lines = getLines(description);
  const mediaLines = [];
  let isReadingMedia = false;

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (trimmed === MEDIA_SECTION_TITLE) {
      isReadingMedia = true;
      return;
    }

    if (isReadingMedia && KNOWN_SECTION_TITLES.has(trimmed)) {
      isReadingMedia = false;
      return;
    }

    if (isReadingMedia && trimmed) {
      mediaLines.push(trimmed);
    }
  });

  return mediaLines;
}

function extractUrl(line) {
  const withoutBullet = line.replace(/^-\s*/, '').trim();
  const possibleUrl = withoutBullet.includes(':')
    ? withoutBullet.substring(withoutBullet.indexOf(':') + 1).trim()
    : withoutBullet;

  return /^https?:\/\//i.test(possibleUrl) ? possibleUrl : null;
}

export function stripServiceMediaSection(description) {
  const lines = getLines(description);
  const keptLines = [];
  let isSkippingMedia = false;

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (trimmed === MEDIA_SECTION_TITLE) {
      isSkippingMedia = true;
      return;
    }

    if (isSkippingMedia && KNOWN_SECTION_TITLES.has(trimmed)) {
      isSkippingMedia = false;
      keptLines.push(line);
      return;
    }

    if (!isSkippingMedia) {
      keptLines.push(line);
    }
  });

  return keptLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function getLegacyCoverImageUrl(description) {
  const coverLine = readMediaBlock(description).find((line) => line.replace(/^-\s*/, '').startsWith('Image de couverture:'));
  return coverLine ? extractUrl(coverLine) : null;
}

export function getLegacyGalleryImageUrls(description) {
  return readMediaBlock(description)
    .filter((line) => !line.replace(/^-\s*/, '').startsWith('Image de couverture:'))
    .map(extractUrl)
    .filter(Boolean);
}

export function getServiceCoverImageUrl(service) {
  return service?.coverImageUrl || getLegacyCoverImageUrl(service?.description);
}

export function getServiceGalleryImageUrls(service) {
  const savedImages = Array.isArray(service?.galleryImageUrls) ? service.galleryImageUrls : [];
  const legacyImages = getLegacyGalleryImageUrls(service?.description);
  return [...new Set([...savedImages, ...legacyImages])];
}
