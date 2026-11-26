import Phaser from 'phaser';
import { VIEW_H, VIEW_W } from './game/layout';
import { EndScene } from './game/scenes/EndScene';
import { GameScene } from './game/scenes/GameScene';
import { TitleScene } from './game/scenes/TitleScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#10131a',
  banner: false,
  disableContextMenu: true,
  audio: { noAudio: true },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: VIEW_W,
    height: VIEW_H,
  },
  input: {
    activePointers: 2,
  },
  scene: [TitleScene, GameScene, EndScene],
});

void game;
