const URL_SCHEME = /^[A-Za-z][A-Za-z\d+.-]*:/;

/**
 * Resolve an untrusted manifest file value beneath the application's workouts
 * directory. Invalid values return null rather than becoming fetch targets.
 */
export function resolveWorkoutFile(file, documentBase) {
  if (typeof file !== 'string') return null;

  const value = file.trim();
  if (
    !value
    || !value.toLowerCase().endsWith('.csv')
    || value.includes('..')
    || value.includes('\\')
    || value.startsWith('/')
    || URL_SCHEME.test(value)
  ) return null;

  const workoutsBase = new URL('./workouts/', documentBase);
  const resolved = new URL(value, workoutsBase);
  const isUnderBase = resolved.origin === workoutsBase.origin
    && resolved.pathname.startsWith(workoutsBase.pathname)
    && resolved.pathname.toLowerCase().endsWith('.csv')
    && !resolved.search
    && !resolved.hash;

  return isUnderBase ? resolved.href : null;
}

export function resolveWorkoutEntry(entry, documentBase) {
  if (!entry || typeof entry.name !== 'string') return null;
  const name = entry.name.trim();
  const url = resolveWorkoutFile(entry.file, documentBase);
  return name && url ? { name, url } : null;
}
