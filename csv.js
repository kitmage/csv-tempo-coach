export function parseCsv(input) {
  const rows = []; let row = []; let field = ''; let quoted = false;
  const text = input.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field === '') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += char;
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted field.');
  if (field || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  return rows.filter((item) => item.some((value) => value.trim() !== ''));
}

export function parseTimestamp(value) {
  const match = String(value).trim().match(/^(?:(\d+):)?([0-5]?\d):([0-5]\d)$/);
  if (!match) return null;
  return (Number(match[1] || 0) * 3600) + (Number(match[2]) * 60) + Number(match[3]);
}

export function buildTimeline(input) {
  const rows = parseCsv(input);
  if (!rows.length) throw new Error('The CSV is empty.');
  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const required = ['timestamp', 'bpm', 'text'];
  const missing = required.filter((header) => !headers.includes(header));
  if (missing.length) throw new Error(`Missing required column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.`);
  const indices = Object.fromEntries(required.map((name) => [name, headers.indexOf(name)]));
  const errors = []; const warnings = []; const timeline = [];
  rows.slice(1).forEach((row, index) => {
    const line = index + 2; const timestamp = (row[indices.timestamp] ?? '').trim();
    const time = parseTimestamp(timestamp); const bpmText = (row[indices.bpm] ?? '').trim(); const bpm = Number(bpmText);
    if (time === null) errors.push(`Row ${line}: invalid timestamp “${timestamp}”. Use MM:SS or HH:MM:SS.`);
    if (!bpmText || !Number.isFinite(bpm)) errors.push(`Row ${line}: invalid BPM “${bpmText}”.`);
    else if (bpm < 20 || bpm > 300) errors.push(`Row ${line}: BPM ${bpm} is outside the supported 20–300 range.`);
    if (time !== null && Number.isFinite(bpm) && bpm >= 20 && bpm <= 300) timeline.push({ time, bpm, text: row[indices.text] ?? '', sourceOrder:index });
  });
  if (errors.length) return { timeline:[], errors, warnings };
  timeline.sort((a,b) => a.time - b.time || a.sourceOrder - b.sourceOrder);
  const duplicates = [...new Set(timeline.filter((item,i) => i && item.time === timeline[i-1].time).map((item) => item.time))];
  if (duplicates.length) warnings.push('Duplicate timestamps found; the later row at each time controls the active tempo.');
  if (!timeline.length) errors.push('The CSV does not contain any cue rows.');
  return { timeline, errors, warnings };
}

export function formatTime(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600); const minutes = Math.floor((seconds % 3600) / 60); const rest = seconds % 60;
  return `${hours ? `${String(hours).padStart(2,'0')}:` : ''}${String(minutes).padStart(2,'0')}:${String(rest).padStart(2,'0')}`;
}
