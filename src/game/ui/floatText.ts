import { FONT } from '../theme';

export function floatText(scene: Phaser.Scene, x: number, y: number, message: string, color: string): void {
  const text = scene.add
    .text(x, y, message, {
      fontFamily: FONT,
      fontSize: '15px',
      color,
      fontStyle: 'bold',
      stroke: '#10131a',
      strokeThickness: 3,
    })
    .setOrigin(0.5)
    .setDepth(90);
  scene.tweens.add({
    targets: text,
    y: y - 30,
    alpha: 0,
    duration: 760,
    onComplete: () => text.destroy(),
  });
}
