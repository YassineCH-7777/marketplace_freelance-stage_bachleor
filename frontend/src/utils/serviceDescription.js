const MEDIA_SECTION_TITLE = 'Medias et portfolio';
const DESCRIPTION_SECTION_TITLES = [
  'Ce qui est inclus',
  "Ce qui n'est pas inclus",
  'Tarification',
  'Disponibilite et delais',
  'Conditions du service',
  'Sous-categorie',
];
const SECTION_TITLE_ALIASES = new Map(
  DESCRIPTION_SECTION_TITLES.map((title) => [title, title])
);

SECTION_TITLE_ALIASES.set('Disponibilité et délais', 'Disponibilite et delais');
SECTION_TITLE_ALIASES.set('Sous-catégorie', 'Sous-categorie');

function getCanonicalSectionTitle(title) {
  return SECTION_TITLE_ALIASES.get(title) || null;
}

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

    if (isReadingMedia && getCanonicalSectionTitle(trimmed)) {
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

    if (isSkippingMedia && getCanonicalSectionTitle(trimmed)) {
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

function cleanDescriptionLine(line) {
  return line.replace(/^-\s*/, '').trim();
}

function toDescriptionItem(line) {
  const text = cleanDescriptionLine(line);

  if (/^https?:\/\//i.test(text)) {
    return { label: null, value: text, raw: text };
  }

  const separatorIndex = text.indexOf(':');

  if (separatorIndex > 0) {
    const label = text.slice(0, separatorIndex).trim();
    const value = text.slice(separatorIndex + 1).trim();

    if (label && value) {
      return { label, value, raw: text };
    }
  }

  return { label: null, value: text, raw: text };
}

function uniqueItems(items) {
  const seen = new Set();

  return items.filter((item) => {
    const key = `${item.label || ''}:${item.value}`.toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function parseServiceDescription(description) {
  const fallback =
    'Ce freelance n a pas encore detaille son approche. Envoyez une demande avec votre contexte pour obtenir une reponse adaptee.';
  const lines = getLines(stripServiceMediaSection(description || fallback));
  const intro = [];
  const sections = [];
  const sectionByTitle = new Map();
  let introLines = [];
  let currentSection = null;

  const pushIntro = () => {
    if (introLines.length > 0) {
      intro.push(introLines.join(' '));
      introLines = [];
    }
  };

  const getSection = (title) => {
    if (sectionByTitle.has(title)) {
      return sectionByTitle.get(title);
    }

    const section = { title, items: [] };
    sectionByTitle.set(title, section);
    sections.push(section);
    return section;
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      if (!currentSection) {
        pushIntro();
      }
      return;
    }

    const sectionTitle = getCanonicalSectionTitle(trimmed);

    if (sectionTitle) {
      pushIntro();
      currentSection = getSection(sectionTitle);
      return;
    }

    if (currentSection) {
      const item = toDescriptionItem(trimmed);

      if (item.value) {
        currentSection.items.push(item);
      }
      return;
    }

    introLines.push(trimmed);
  });

  pushIntro();

  return {
    intro,
    sections: sections
      .map((section) => ({ ...section, items: uniqueItems(section.items) }))
      .filter((section) => section.items.length > 0),
  };
}
