import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { projectPin, yawPitchFor } from '../src/game/art/sphere';

describe('globe projection', () => {
  it('puts the facing point at the center and hides the far side', () => {
    const front = projectPin(0, 0, 0, 0, 1, 200, 200, 80);
    assert.ok(front);
    assert.ok(Math.abs(front.x - 200) < 2);
    assert.ok(Math.abs(front.y - 200) < 2);
    assert.equal(projectPin(0, 180, 0, 0, 1, 200, 200, 80), null);
  });

  it('aims a site at the middle of the disc', () => {
    const aim = yawPitchFor(40, -100);
    const spot = projectPin(40, -100, aim.yaw, aim.pitch, 1, 200, 200, 80);
    assert.ok(spot);
    assert.ok(Math.abs(spot.x - 200) < 3);
    assert.ok(Math.abs(spot.y - 200) < 3);
  });
});
