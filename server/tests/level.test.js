const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calculateLevel, xpIntoLevel, roadmapProgressPercent } = require('../utils/level');

test('level formula is exact', () => {
  assert.equal(calculateLevel(0), 1);
  assert.equal(calculateLevel(99), 1);
  assert.equal(calculateLevel(100), 2);
  assert.equal(calculateLevel(400), 5);
  assert.equal(calculateLevel(500), 6);
});

test('xpIntoLevel is exact', () => {
  assert.equal(xpIntoLevel(0), 0);
  assert.equal(xpIntoLevel(99), 99);
  assert.equal(xpIntoLevel(100), 0);
  assert.equal(xpIntoLevel(150), 50);
  assert.equal(xpIntoLevel(400), 0);
});

test('roadmap progress uses completed published steps, not XP', () => {
  assert.equal(roadmapProgressPercent(1, 20), 5);
  assert.equal(roadmapProgressPercent(0, 0), 0);
  assert.equal(roadmapProgressPercent(0, 20), 0);
});
