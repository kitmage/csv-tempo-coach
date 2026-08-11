const URL_SCHEME = /^[A-Za-z][A-Za-z\d+.-]*:/;

function normalizeFile(file) {
  if (typeof file !== 'string') return null;

  const value = file.trim();
  if (
    !value
    || !value.toLowerCase().endsWith('.csv')
    || value.startsWith('/')
    || value.includes('\\')
    || value.includes('?')
    || value.includes('#')
    || URL_SCHEME.test(value)
  ) return null;

  try {
    const segments = value.split('/').map((segment) => decodeURIComponent(segment));
    if (segments.some((segment) => segment === '..')) return null;
  } catch {
    return null;
  }

  return value;
}

/**
 * Return the valid, normalized records from an untrusted workout manifest.
 * The first record for a file wins so the catalog cannot contain duplicate
 * options for the same workout.
 */
export function normalizeWorkoutManifest(manifest) {
  if (!Array.isArray(manifest)) {
    throw new TypeError('Workout list must be an array.');
  }

  const files = new Set();
  const workouts = [];

  for (const entry of manifest) {
    const name = typeof entry?.name === 'string' ? entry.name.trim() : '';
    const file = normalizeFile(entry?.file);
    if (!name || !file || files.has(file)) continue;

    files.add(file);
    workouts.push({ name, file });
  }

  return workouts;
}
