import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildTimeline } from '../csv.js';
import { normalizeWorkoutManifest } from '../workouts.js';

test('normalizes valid workout records', () => {
  assert.deepEqual(normalizeWorkoutManifest([
    { name: ' Intervals ', file: ' intervals.csv ' },
    { name: 'Hill repeats', file: 'plans/HILLS.CSV' },
  ]), [
    { name: 'Intervals', file: 'intervals.csv' },
    { name: 'Hill repeats', file: 'plans/HILLS.CSV' },
  ]);
});

test('omits records with missing names or file values', () => {
  assert.deepEqual(normalizeWorkoutManifest([
    { file: 'missing-name.csv' },
    { name: '', file: 'empty-name.csv' },
    { name: 'Whitespace', file: '   ' },
    { name: 'Missing file' },
    { name: 'Wrong types', file: 42 },
    null,
  ]), []);
});

test('omits non-CSV files', () => {
  assert.deepEqual(normalizeWorkoutManifest([
    { name: 'Text', file: 'workout.txt' },
    { name: 'No extension', file: 'workout' },
  ]), []);
});

test('omits absolute URLs and paths', () => {
  const files = [
    'https://example.com/workout.csv',
    'data:text/csv,workout.csv',
    '/tmp/workout.csv',
    '//example.com/workout.csv',
    'C:\\workout.csv',
    '\\\\server\\workout.csv',
  ];

  assert.deepEqual(normalizeWorkoutManifest(
    files.map((file) => ({ name: file, file })),
  ), []);
});

test('omits parent traversal segments', () => {
  const files = [
    '../workout.csv',
    'plans/../workout.csv',
    'plans/%2e%2e/workout.csv',
  ];

  assert.deepEqual(normalizeWorkoutManifest(
    files.map((file) => ({ name: file, file })),
  ), []);
});

test('keeps only the first entry for a duplicate file', () => {
  assert.deepEqual(normalizeWorkoutManifest([
    { name: 'First', file: 'same.csv' },
    { name: 'Second', file: 'same.csv' },
  ]), [{ name: 'First', file: 'same.csv' }]);
});

test('rejects malformed manifest roots', () => {
  for (const manifest of [null, {}, 'workouts', 42]) {
    assert.throws(
      () => normalizeWorkoutManifest(manifest),
      { name: 'TypeError', message: 'Workout list must be an array.' },
    );
  }
});

test('every premade workout exists and contains a valid timeline', async () => {
  const manifest = JSON.parse(await readFile(
    new URL('../workouts/index.json', import.meta.url),
    'utf8',
  ));
  const workouts = normalizeWorkoutManifest(manifest);

  assert.equal(workouts.length, manifest.length);
  for (const workout of workouts) {
    const contents = await readFile(
      new URL(`../workouts/${workout.file}`, import.meta.url),
      'utf8',
    );
    const result = buildTimeline(contents);
    assert.deepEqual(result.errors, [], workout.file);
    assert.ok(result.timeline.length > 1, workout.file);
  }
});
