import Phaser from 'phaser';
import { VERDANT_PATH, getVerdantMovementIntent, getVerdantTileEvent, isVerdantEncounterTile, isVerdantWalkable } from '@/game/verdantPath';

const { tileSize: TILE, width: MAP_WIDTH, height: MAP_HEIGHT, spawn } = VERDANT_PATH;

export default class VerdantPathScene extends Phaser.Scene {
  constructor() {
    super('VerdantPath');
    this.lastEncounterAt = 0;
    this.bossDefeated = false;
    this.lastBossEventAt = 0;
  }

  create() {
    this.makeTextures();
    this.cameras.main.setBackgroundColor('#10263a');
    this.drawWorld();

    this.player = this.physics.add.sprite(spawn.x * TILE + TILE / 2, spawn.y * TILE + TILE / 2, 'trailblazer');
    this.player.setCollideWorldBounds(true).setDepth(5).setScale(1.1);
    this.physics.world.setBounds(TILE, TILE, (MAP_WIDTH - 2) * TILE, (MAP_HEIGHT - 2) * TILE);
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D');
    this.touchDirection = null;
    this.setTouchDirection = (direction) => { this.touchDirection = direction; };
    this.clearTouchDirection = () => { this.touchDirection = null; };
    this.registry.events.on('verdant-move-start', this.setTouchDirection);
    this.registry.events.on('verdant-move-end', this.clearTouchDirection);
    this.markBossDefeated = () => { this.bossDefeated = true; };
    this.registry.events.on('verdant-boss-defeated', this.markBossDefeated);
    if (this.registry.get('verdant-boss-defeated')) this.bossDefeated = true;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.registry.events.off('verdant-move-start', this.setTouchDirection);
      this.registry.events.off('verdant-move-end', this.clearTouchDirection);
      this.registry.events.off('verdant-boss-defeated', this.markBossDefeated);
    });

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1.45);
    this.cameras.main.setBounds(0, 0, MAP_WIDTH * TILE, MAP_HEIGHT * TILE);

    this.add.text(20, 18, 'VERDANT PATH', { fontFamily: 'Georgia, serif', fontSize: '18px', fontStyle: 'bold', color: '#fff5ca', stroke: '#172316', strokeThickness: 5 }).setScrollFactor(0).setDepth(20);
    this.add.text(20, 43, 'WASD / ARROWS  •  Find the moonwell', { fontFamily: 'monospace', fontSize: '10px', color: '#cfdfc4' }).setScrollFactor(0).setDepth(20);
  }

  makeTextures() {
    const paint = (key, draw) => {
      if (this.textures.exists(key)) return;
      const g = this.add.graphics();
      draw(g);
      g.generateTexture(key, TILE, TILE);
      g.destroy();
    };
    paint('ground', (g) => { g.fillStyle(0x6d9d56).fillRect(0, 0, TILE, TILE); g.fillStyle(0x83ad63, 0.45); for (let i = 0; i < 7; i += 1) g.fillCircle((i * 11) % TILE, (i * 17) % TILE, 1); });
    paint('grass', (g) => { g.fillStyle(0x426d38).fillRect(0, 0, TILE, TILE); g.lineStyle(2, 0x8fbd5f, 0.7); for (let i = 2; i < TILE; i += 7) g.lineBetween(i, 27, i + 3, 12 + (i % 8)); });
    paint('water', (g) => { g.fillStyle(0x315b83).fillRect(0, 0, TILE, TILE); g.lineStyle(1, 0x8bc4d9, 0.65); for (let y = 5; y < TILE; y += 8) g.lineBetween(3, y, 12, y - 2).lineBetween(18, y, 28, y - 2); });
    paint('stone', (g) => { g.fillStyle(0x766b55).fillRoundedRect(3, 4, 26, 24, 5); g.lineStyle(2, 0xb8a981, 0.6).strokeRoundedRect(3, 4, 26, 24, 5); });
    paint('trailblazer', (g) => { g.fillStyle(0x20233a).fillCircle(16, 11, 8); g.fillStyle(0xf2c28e).fillCircle(16, 12, 6); g.fillStyle(0xd86847).fillTriangle(7, 8, 16, 1, 25, 8); g.fillStyle(0x304c84).fillRoundedRect(9, 18, 14, 12, 4); g.fillStyle(0xf6df9f).fillCircle(13, 12, 1).fillCircle(19, 12, 1); });
    paint('moonwell', (g) => { g.fillStyle(0x493e70).fillCircle(16, 16, 14); g.lineStyle(3, 0xb6a7e4).strokeCircle(16, 16, 12); g.fillStyle(0x8fe4ee).fillCircle(16, 16, 7); });
    paint('warden', (g) => { g.fillStyle(0x2c4a2e).fillRoundedRect(3, 6, 26, 22, 8); g.fillStyle(0xd9ecb2).fillCircle(10, 13, 3).fillCircle(22, 13, 3); g.fillStyle(0x1c301c).fillCircle(10, 13, 1.4).fillCircle(22, 13, 1.4); g.lineStyle(3, 0xa4d07c); g.strokeRoundedRect(3, 6, 26, 22, 8); g.fillStyle(0x7ea75f); g.fillTriangle(8, 24, 16, 30, 24, 24); });
    paint('cache-sealed', (g) => { g.fillStyle(0x5a4630).fillRoundedRect(4, 10, 24, 17, 4); g.fillStyle(0x7a603f).fillRoundedRect(4, 5, 24, 8, 3); g.fillStyle(0xd8b45a).fillRect(14, 10, 4, 8); g.lineStyle(2, 0x3a2c1c).strokeRoundedRect(4, 10, 24, 17, 4); });
    paint('cache-open', (g) => { g.fillStyle(0x5a4630).fillRoundedRect(4, 14, 24, 13, 4); g.fillStyle(0x2b2117).fillRect(6, 15, 20, 5); g.fillStyle(0xf4de8c).fillCircle(12, 17, 2).fillCircle(20, 17, 2); g.fillStyle(0xd8b45a).fillRect(14, 14, 4, 6); });
  }

  drawWorld() {
    for (let y = 0; y < MAP_HEIGHT; y += 1) {
      for (let x = 0; x < MAP_WIDTH; x += 1) {
        const px = x * TILE + TILE / 2;
        const py = y * TILE + TILE / 2;
        const stream = x >= 15 && x <= 16 && y >= 2 && y <= 14;
        const bridge = stream && y === 10;
        const edge = !isVerdantWalkable(x, y);
        const texture = bridge ? 'stone' : stream ? 'water' : isVerdantEncounterTile(x, y) ? 'grass' : 'ground';
        this.add.image(px, py, texture).setDepth(0);
        if (edge && !stream) this.add.image(px, py, 'stone').setTint(0x5a6250).setDepth(2);
      }
    }
    for (let x = VERDANT_PATH.bossArena.x; x < VERDANT_PATH.bossArena.x + VERDANT_PATH.bossArena.width; x += 1) {
      for (let y = VERDANT_PATH.bossArena.y; y < VERDANT_PATH.bossArena.y + VERDANT_PATH.bossArena.height; y += 1) {
        this.add.image(x * TILE + TILE / 2, y * TILE + TILE / 2, 'grass').setTint(0x8fae74).setDepth(0);
      }
    }
    for (const landmark of VERDANT_PATH.landmarks) {
      this.add.image(landmark.x * TILE + TILE / 2, landmark.y * TILE + TILE / 2, landmark.label === 'Moonwell' ? 'moonwell' : 'stone').setDepth(3);
      this.add.text(landmark.x * TILE - 17, landmark.y * TILE - 18, landmark.label, { fontFamily: 'Georgia, serif', fontSize: '9px', color: '#fff5ca', stroke: '#1b2a1c', strokeThickness: 3 }).setDepth(4);
    }
    const bossX = VERDANT_PATH.bossArena.x + 2;
    const bossY = VERDANT_PATH.bossArena.y + 1;
    this.bossSprite = this.add.image(bossX * TILE + TILE / 2, bossY * TILE + TILE / 2, 'warden').setDepth(6);
    this.tweens.add({ targets: this.bossSprite, y: '-=4', duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.cacheSprite = this.add.image(VERDANT_PATH.rewardCache.x * TILE + TILE / 2, VERDANT_PATH.rewardCache.y * TILE + TILE / 2, 'cache-sealed').setDepth(6);
    if (this.bossDefeated) this.cacheSprite.setTexture('cache-open');
    this.add.text(bossX * TILE - 26, bossY * TILE - 22, 'Grove Warden', { fontFamily: 'Georgia, serif', fontSize: '9px', color: '#ffd9c2', stroke: '#1b2a1c', strokeThickness: 3 }).setDepth(4);
  }

  update(time) {
    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const up = this.cursors.up.isDown || this.keys.W.isDown;
    const down = this.cursors.down.isDown || this.keys.S.isDown;
    const { x, y } = getVerdantMovementIntent({ left, right, up, down, touchDirection: this.touchDirection });
    const movement = new Phaser.Math.Vector2(x, y).normalize().scale(125);
    const nextX = this.player.x + movement.x * 0.02;
    const nextY = this.player.y + movement.y * 0.02;
    const tileX = Math.floor(nextX / TILE);
    const tileY = Math.floor(nextY / TILE);
    if (isVerdantWalkable(tileX, tileY)) this.player.setVelocity(movement.x, movement.y);
    else this.player.setVelocity(0, 0);

    const currentTileX = Math.floor(this.player.x / TILE);
    const currentTileY = Math.floor(this.player.y / TILE);
    if (isVerdantEncounterTile(currentTileX, currentTileY) && movement.lengthSq() > 0 && time - this.lastEncounterAt > 5000 && Math.random() < 0.006) {
      this.lastEncounterAt = time;
      this.cameras.main.flash(180, 230, 250, 208);
      this.registry.events.emit('verdant-encounter');
    }

    const tileEvent = getVerdantTileEvent(currentTileX, currentTileY, { bossDefeated: this.bossDefeated });
    if (tileEvent && time - this.lastBossEventAt > 4000) {
      this.lastBossEventAt = time;
      if (tileEvent === 'boss') {
        this.cameras.main.shake(220, 0.008);
        this.registry.events.emit('verdant-boss');
      } else if (tileEvent === 'reward') {
        this.cacheSprite.setTexture('cache-open');
        this.cameras.main.flash(240, 255, 236, 170);
        this.registry.events.emit('verdant-reward');
      }
    }
  }
}
