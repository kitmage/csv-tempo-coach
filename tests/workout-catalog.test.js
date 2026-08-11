import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveWorkoutEntry, resolveWorkoutFile } from '../workout-catalog.js';

const base = 'https://coach.example/app/index.html';

test('resolves CSV workout files only beneath the known workouts base', () => {
  assert.equal(
    resolveWorkoutFile('plans/intervals.csv', base),
    'https://coach.example/app/workouts/plans/intervals.csv',
  );
  assert.deepEqual(resolveWorkoutEntry({ name: ' Intervals ', file: 'intervals.csv' }, base), {
    name: 'Intervals',
    url: 'https://coach.example/app/workouts/intervals.csv',
  });
});

test('rejects absolute paths, traversal, URL schemes, and non-CSV values', () => {
  const invalid = [
    '/tmp/workout.csv',
    '\\server\\workout.csv',
    '../workout.csv',
    'plans/../workout.csv',
    'plans/a..b.csv',
    'https://evil.example/workout.csv',
    'data:text/csv,workout.csv',
    '//evil.example/workout.csv',
    'workout.txt',
    'workout.csv?download=.csv',
    'workout#name.csv',
  ];

  for (const value of invalid) assert.equal(resolveWorkoutFile(value, base), null, value);
});

test('rejects malformed catalog entries', () => {
  assert.equal(resolveWorkoutEntry({ name: '', file: 'workout.csv' }, base), null);
  assert.equal(resolveWorkoutEntry({ name: 'Workout', file: 42 }, base), null);
  assert.equal(resolveWorkoutEntry(null, base), null);
});
