import Phaser from 'phaser';
import './fonts.css';
import { VIEW_H, VIEW_W } from './game/layout';
import { CityScene } from './game/scenes/CityScene';
import { CommanderScene } from './game/scenes/CommanderScene';
import { EndScene } from './game/scenes/EndScene';
import { GameScene } from './game/scenes/GameScene';
import { HqScene } from './game/scenes/HqScene';
import { MapScene } from './game/scenes/MapScene';
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
  scene: [TitleScene, CommanderScene, MapScene, HqScene, CityScene, GameScene, EndScene],
});

void game;
