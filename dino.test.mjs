import test from 'node:test';
import assert from 'node:assert/strict';
import { initialDinoState, courseFor, startRace, stepRace, jumpRace } from './dino.mjs';

test('Dino course is shared; jumps have server physics, no double jumps or duplicate input', () => {
  assert.deepEqual(courseFor(78), courseFor(78)); assert.notDeepEqual(courseFor(78), courseFor(79));
  const s = initialDinoState(78); startRace(s, [10, 20], 1000);
  assert.throws(() => jumpRace(s, 10, 1)); stepRace(s, courseFor(78));
  assert.equal(jumpRace(s, 10, 1).accepted, true);
  stepRace(s, courseFor(78)); const velocity = s.players[0].vy;
  assert.equal(jumpRace(s, 10, 1).repeated, true); assert.equal(jumpRace(s, 10, 2).accepted, false);
  assert.equal(s.players[0].vy, velocity); assert.throws(() => jumpRace(s, 30, 1));
  for (let i = 0; i < 16; i++) stepRace(s, courseFor(78));
  assert.equal(s.players[0].y, 0); assert.equal(jumpRace(s, 10, 3).accepted, true);
});

test('Dino collisions and winner determined together; equal collisions draw and 60s is the limit', () => {
  const both = initialDinoState(1); startRace(both, [1, 2], 0);
  const obstacle = [{ x: 94, width: 25, height: 30 }];
  assert.deepEqual(stepRace(both, obstacle), { winner: null }); assert.equal(both.phase, 'finished');
  const one = initialDinoState(1); startRace(one, [1, 2], 0); one.phase = 'running';
  one.players[0].y = 90; one.players[0].vy = 0;
  assert.deepEqual(stepRace(one, obstacle), { winner: 1 });
  const timed = initialDinoState(1); startRace(timed, [1, 2], 0); let result;
  for (let i = 0; i < 1200; i++) result = stepRace(timed, []);
  assert.equal(timed.elapsed, 60000); assert.deepEqual(result, { winner: null }); assert.equal(timed.reason, 'time');
});
