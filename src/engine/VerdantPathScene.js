import Phaser from 'phaser';
import { VERDANT_PATH, getVerdantFacing, getVerdantGuidanceStep, getVerdantMovementIntent, getVerdantObjective, getVerdantSlideVelocity, getVerdantTileEvent, getVerdantTileVariant, isVerdantEncounterTile, isVerdantWalkable } from '@/game/verdantPath';
import { playSfx, vibrate } from '@/game/audio';

const { tileSize: TILE, width: MAP_WIDTH, height: MAP_HEIGHT, spawn } = VERDANT_PATH;

export default class VerdantPathScene extends Phaser.Scene {
  constructor() {
    super('VerdantPath');
    this.lastEncounterAt = 0;
    this.lastEncounterRollAt = 0;
    this.bossDefeated = false;
    this.lastBossEventAt = 0;
  }

  create() {
    this.makeTextures();
    this.cameras.main.setBackgroundColor('#10263a');
    this.drawWorld();

    this.player = this.physics.add.sprite(spawn.x * TILE + TILE / 2, spawn.y * TILE + TILE / 2, 'hero-down');
    this.player.setCollideWorldBounds(true).setDepth(5).setScale(1.1);
    this.facing = 'down';
    // Animated water: collect stream tiles and swap frames on a shared clock.
    this.waterTiles = [];
    this.trees = [];
    this.physics.world.setBounds(TILE, TILE, (MAP_WIDTH - 2) * TILE, (MAP_HEIGHT - 2) * TILE);
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D');
    this.touchDirection = null;
    this.setTouchDirection = (direction) => { this.touchDirection = direction; };
    this.clearTouchDirection = () => { this.touchDirection = null; };
    this.registry.events.on('verdant-move-start', this.setTouchDirection);
    this.registry.events.on('verdant-move-end', this.clearTouchDirection);
    this.markBossDefeated = () => {
      this.bossDefeated = true;
      if (this.bossSprite) {
        this.tweens.killTweensOf(this.bossSprite);
        this.bossSprite.setVisible(false);
      }
    };
    this.registry.events.on('verdant-boss-defeated', this.markBossDefeated);
    if (this.registry.get('verdant-boss-defeated')) {
      this.bossDefeated = true;
      this.bossSprite.setVisible(false);
    }
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
    // Shared palette: one color vocabulary for every procedural texture so
    // ground, characters, and landmarks read as a single authored world.
    const PAL = {
      meadow: 0x6d9d56, meadowDeep: 0x689752, meadowShade: 0x61914e,
      grassDark: 0x426d38, grassBlade: 0x8fbd5f, grassShadow: 0x558246,
      canopy: 0x33632f, leaf: 0x457a3c, leafLight: 0x5c9449, leafSun: 0x76a35e,
      waterDeep: 0x315b83, waterMid: 0x35618c, waterLine: 0x8bc4d9, waterLineBright: 0xa9d6e8,
      stone: 0x766b55, stoneLight: 0xb8a981, pebble: 0x93a08a, pebbleLight: 0xa9b39f, pebbleDark: 0x87947d,
      wood: 0x4a3826, woodLid: 0x6b5335, bark: 0x5a4630, ink: 0x2b2117,
      iron: 0x3a3f45, ironLight: 0x565d64,
      gold: 0xd8b45a, goldSoft: 0xf4de8c, goldGlow: 0xffe08a, goldPale: 0xfff3c2,
      wellStone: 0x3a3352, wellStoneA: 0x5a5178, wellStoneB: 0x6a6190, wellDeep: 0x1d2f4a,
      spring: 0x8fe4ee, springPale: 0xd8f7fb, springRing: 0xb9eef5,
    };
    const paint = (key, draw) => {
      if (this.textures.exists(key)) return;
      const g = this.add.graphics();
      draw(g);
      g.generateTexture(key, TILE, TILE);
      g.destroy();
    };
    paint('ground-0', (g) => {
      g.fillStyle(PAL.meadow).fillRect(0, 0, TILE, TILE);
      g.fillStyle(PAL.leafSun, 0.6);
      g.fillTriangle(4, 26, 7, 18, 10, 26);
      g.fillTriangle(20, 29, 23, 21, 26, 29);
    });
    paint('ground-1', (g) => { // flower meadow
      g.fillStyle(PAL.meadow).fillRect(0, 0, TILE, TILE);
      g.fillStyle(PAL.goldPale).fillCircle(8, 20, 2); g.fillStyle(PAL.gold).fillCircle(8, 20, 1);
      g.fillStyle(0xd98ca6).fillCircle(22, 12, 2); g.fillStyle(0xfdf3f5).fillCircle(22, 12, 1);
    });
    paint('ground-2', (g) => { // pebbled clearing
      g.fillStyle(PAL.meadowDeep).fillRect(0, 0, TILE, TILE);
      g.fillStyle(PAL.pebble).fillCircle(11, 22, 2); g.fillStyle(PAL.pebbleLight).fillCircle(24, 15, 1.6); g.fillStyle(PAL.pebbleDark).fillCircle(17, 27, 1.4);
    });
    paint('ground-3', (g) => { // shaded patch
      g.fillStyle(PAL.meadowShade).fillRect(0, 0, TILE, TILE);
      g.fillStyle(PAL.grassShadow, 0.7).fillRect(0, 18, TILE, 14);
      g.fillStyle(PAL.leafSun).fillTriangle(6, 16, 9, 10, 12, 16);
    });
    paint('grass', (g) => { g.fillStyle(PAL.grassDark).fillRect(0, 0, TILE, TILE); g.lineStyle(2, PAL.grassBlade, 0.7); for (let i = 2; i < TILE; i += 7) g.lineBetween(i, 27, i + 3, 12 + (i % 8)); });
    paint('water', (g) => { g.fillStyle(PAL.waterDeep).fillRect(0, 0, TILE, TILE); g.lineStyle(1, PAL.waterLine, 0.65); for (let y = 5; y < TILE; y += 8) g.lineBetween(3, y, 12, y - 2).lineBetween(18, y, 28, y - 2); });
    paint('water-1', (g) => { g.fillStyle(PAL.waterMid).fillRect(0, 0, TILE, TILE); g.lineStyle(1, PAL.waterLineBright, 0.7); for (let y = 7; y < TILE; y += 8) g.lineBetween(5, y, 14, y - 2).lineBetween(20, y + 1, 29, y - 1); });
    paint('stone', (g) => { g.fillStyle(PAL.stone).fillRoundedRect(3, 4, 26, 24, 5); g.lineStyle(2, PAL.stoneLight, 0.6).strokeRoundedRect(3, 4, 26, 24, 5); });
    const hero = (dir) => (g) => {
      const back = dir === 'up';
      const side = dir === 'left' || dir === 'right';
      // Hair + head: eyes only on front/side views.
      g.fillStyle(0x20233a).fillCircle(16, 11, 8);
      g.fillStyle(0xf2c28e).fillCircle(16, 13, 6);
      if (!back) {
        g.fillStyle(0xf6df9f);
        if (side) { g.fillCircle(dir === 'right' ? 19 : 13, 13, 1.4); } else { g.fillCircle(13, 13, 1.4).fillCircle(19, 13, 1.4); }
      }
      if (side && !back) { g.fillStyle(0xb3553e).fillCircle(dir === 'right' ? 20 : 12, 16, 1); } // rosy cheek
      // Hood/cloak trail points opposite of travel for readability.
      g.fillStyle(0xd86847);
      if (dir === 'up') g.fillTriangle(7, 10, 16, 3, 25, 10);
      else if (dir === 'down') g.fillTriangle(7, 14, 16, 21, 25, 14);
      else g.fillTriangle(dir === 'right' ? 9 : 23, 8, dir === 'right' ? 15 : 17, 2, dir === 'right' ? 23 : 9, 8);
      // Body + satchel on the back when facing up.
      g.fillStyle(0x304c84).fillRoundedRect(9, 19, 14, 11, 4);
      if (back) { g.fillStyle(0x8a6a3f).fillRoundedRect(12, 20, 8, 7, 2); }
    };
    paint('hero-down', hero('down'));
    paint('hero-up', hero('up'));
    paint('hero-left', hero('left'));
    paint('hero-right', hero('right'));
    paint('trailblazer', hero('down'));
    // Two-frame walk cycle: a 1px vertical-bob variant stamped from each base
    // frame, so palette and silhouette stay perfectly aligned while walking.
    const stampStepFrame = (fromKey, toKey, dx = 0, dy = 0) => {
      if (this.textures.exists(toKey)) return;
      const src = this.textures.get(fromKey).getSourceImage();
      const frame = this.textures.createCanvas(toKey, TILE, TILE);
      if (!frame || !src) return;
      frame.getContext().drawImage(src, dx, dy);
      frame.refresh();
    };
    ['down', 'up', 'left', 'right'].forEach((dir) => stampStepFrame(`hero-${dir}`, `hero-${dir}-step`, 0, 1));
    // Tree sway: a 1px horizontal-shift variant so canopies breathe in the
    // wind when the scene alternates between the two frames.
    paint('tree', (g) => {
      g.fillStyle(PAL.bark).fillRect(13, 22, 6, 9);
      g.fillStyle(PAL.canopy).fillCircle(16, 13, 11);
      g.fillStyle(PAL.leaf).fillCircle(12, 10, 6); g.fillStyle(PAL.leaf).fillCircle(21, 12, 5);
      g.fillStyle(PAL.leafLight, 0.85).fillCircle(16, 7, 5);
    });
    // Tree sway: a 1px horizontal-shift variant so canopies breathe in the
    // wind when the scene alternates between the two frames.
    stampStepFrame('tree', 'tree-sway', 1, 0);
    paint('leaf', (g) => {
      // A tiny wind-blown leaf for grass rustle feedback.
      g.fillStyle(0x457a3c).fillEllipse(16, 16, 7, 4);
      g.lineStyle(1, 0x5c9449, 0.9); g.lineBetween(13, 16, 19, 15);
    });
    paint('moonwell', (g) => {
      // Stone-ringed pool: layered ring stones, deep water, soft inner glow.
      g.fillStyle(PAL.wellStone).fillCircle(16, 16, 15);
      for (let i = 0; i < 8; i += 1) {
        const angle = (Math.PI * 2 * i) / 8;
        g.fillStyle(i % 2 ? PAL.wellStoneA : PAL.wellStoneB);
        g.fillCircle(16 + Math.cos(angle) * 12.5, 16 + Math.sin(angle) * 12.5, 3.4);
      }
      g.fillStyle(PAL.wellDeep).fillCircle(16, 16, 10.5);
      g.fillStyle(PAL.spring, 0.85).fillCircle(16, 16, 7);
      g.fillStyle(PAL.springPale, 0.9).fillCircle(14, 14, 2.6);
      g.lineStyle(1, PAL.springRing, 0.7); g.strokeCircle(16, 16, 5); g.strokeCircle(16, 16, 8.5);
    });
    paint('warden', (g) => {
      // Moss guardian: bark-plated body, antler crown, glowing eyes, root feet.
      g.fillStyle(PAL.canopy).fillRoundedRect(4, 7, 24, 20, 8); // body base
      g.fillStyle(PAL.leaf); // bark plates
      g.fillRoundedRect(6, 9, 8, 7, 3); g.fillRoundedRect(18, 9, 8, 7, 3); g.fillRoundedRect(12, 17, 8, 8, 3);
      g.fillStyle(0x3d663a, 0.9); // moss patches
      g.fillCircle(8, 22, 2.4); g.fillCircle(23, 20, 2.8); g.fillCircle(13, 8, 2);
      g.lineStyle(2, PAL.bark); // antlers
      g.strokeTriangle(6, 8, 3, 1, 9, 5); g.strokeTriangle(26, 8, 29, 1, 23, 5);
      g.fillStyle(PAL.goldGlow).fillCircle(10, 13, 3).fillCircle(22, 13, 3); // eye glow
      g.fillStyle(0x1c301c).fillCircle(10, 13, 1.4).fillCircle(22, 13, 1.4);
      g.lineStyle(2, 0x1a2b1a, 0.8); g.strokeRoundedRect(4, 7, 24, 20, 8); // rim shadow
      g.fillStyle(PAL.wood); // root feet
      g.fillTriangle(6, 25, 10, 25, 8, 30); g.fillTriangle(14, 25, 18, 25, 16, 31); g.fillTriangle(21, 25, 25, 25, 23, 30);
    });
    // Warden idle pulse: base art plus a brighter eye-glow halo so the boss
    // feels alive even when standing still.
    if (!this.textures.exists('warden-pulse')) {
      const wardenSrc = this.textures.get('warden').getSourceImage();
      const pulse = this.textures.createCanvas('warden-pulse', TILE, TILE);
      if (pulse && wardenSrc) {
        const ctx = pulse.getContext();
        ctx.drawImage(wardenSrc, 0, 0);
        ctx.fillStyle = 'rgba(255, 224, 138, 0.5)';
        ctx.beginPath();
        ctx.arc(10, 13, 4.6, 0, Math.PI * 2);
        ctx.arc(22, 13, 4.6, 0, Math.PI * 2);
        ctx.fill();
        pulse.refresh();
      }
    }
    paint('cache-sealed', (g) => {
      // Iron-banded chest with a heavy lock plate.
      g.fillStyle(PAL.wood).fillRoundedRect(4, 11, 24, 16, 3);
      g.fillStyle(PAL.woodLid).fillRoundedRect(4, 5, 24, 8, 3); // domed lid
      g.fillStyle(PAL.iron); // iron bands
      g.fillRect(6, 5, 3, 22); g.fillRect(23, 5, 3, 22);
      g.fillStyle(PAL.ironLight).fillRect(6, 5, 3, 2); g.fillRect(23, 5, 3, 2); // band highlights
      g.fillStyle(PAL.gold).fillRoundedRect(13, 11, 6, 8, 1.5); // lock plate
      g.fillStyle(PAL.ink).fillCircle(16, 14, 1.2); // keyhole
      g.fillStyle(PAL.goldSoft, 0.5).fillRect(5, 19, 22, 1); // plank sheen
      g.lineStyle(2, PAL.ink).strokeRoundedRect(4, 11, 24, 16, 3);
    });
    paint('cache-open', (g) => {
      // Open lid leaning back; treasure glow spilling out.
      g.fillStyle(PAL.wood).fillRoundedRect(2, 3, 28, 7, 3); // tipped lid
      g.fillStyle(PAL.woodLid).fillRect(4, 4, 24, 2);
      g.fillStyle(PAL.wood).fillRoundedRect(4, 12, 24, 15, 3); // box
      g.fillStyle(PAL.ink).fillRect(6, 13, 20, 6); // dark interior
      g.fillStyle(PAL.goldSoft).fillCircle(11, 17, 2.2).fillCircle(16, 16, 2.6).fillCircle(21, 17, 2.2); // coins
      g.fillStyle(0xc0e86f).fillCircle(13, 15, 1.6); g.fillStyle(0x9fd8ef).fillCircle(19, 15.5, 1.6); // gems
      g.fillStyle(PAL.goldPale, 0.55).fillCircle(16, 16, 5); // spill glow
      g.fillStyle(PAL.iron); g.fillRect(6, 12, 3, 15); g.fillRect(23, 12, 3, 15); // bands
      g.lineStyle(2, PAL.ink).strokeRoundedRect(4, 12, 24, 15, 3);
    });
  }

  drawWorld() {
    for (let y = 0; y < MAP_HEIGHT; y += 1) {
      for (let x = 0; x < MAP_WIDTH; x += 1) {
        const px = x * TILE + TILE / 2;
        const py = y * TILE + TILE / 2;
        const stream = x >= 15 && x <= 16 && y >= 2 && y <= 14;
        const bridge = stream && y === 10;
        const edge = !isVerdantWalkable(x, y);
        const variant = getVerdantTileVariant(x, y);
        const texture = bridge ? 'stone' : stream ? 'water' : isVerdantEncounterTile(x, y) ? 'grass' : `ground-${variant}`;
        const tileImage = this.add.image(px, py, texture).setDepth(0);
        if (stream && !bridge) this.waterTiles.push(tileImage);
        if (edge && !stream) {
          // Border stones gain an authored canopy when the hash asks for one,
          // softening the world edge without blocking any walkable route.
          if (getVerdantTileVariant(x + 31, y) === 0) {
            this.trees.push(this.add.image(px, py - 6, 'tree').setDepth(7));
          } else {
            this.add.image(px, py, 'stone').setTint(0x5a6250).setDepth(2);
          }
        }
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
    // Reduced-motion players get calm feedback: no shake, flash, or idle tweens.
    // Must be set before any tween is created below.
    this.reducedMotion = typeof window !== 'undefined'
      && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.bossSprite = this.add.image(bossX * TILE + TILE / 2, bossY * TILE + TILE / 2, 'warden').setDepth(6);
    if (!this.reducedMotion && !this.bossDefeated) {
      this.tweens.add({ targets: this.bossSprite, y: '-=4', duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    if (this.registry.get('verdant-cache-opened')) this.cacheOpened = true;
    if (this.bossDefeated) this.cacheSprite.setTexture('cache-open');
    this.announceObjective();
    this.add.text(bossX * TILE - 26, bossY * TILE - 22, 'Grove Warden', { fontFamily: 'Georgia, serif', fontSize: '9px', color: '#ffd9c2', stroke: '#1b2a1c', strokeThickness: 3 }).setDepth(4);

    // Authored pacing: a small guide sprite hovers toward the objective.
    this.guidanceArrow = this.add.text(0, 0, '➤', { fontSize: '14px', color: '#ffe9a8', stroke: '#172316', strokeThickness: 3 }).setDepth(19).setAlpha(0.9);
  }

  announceObjective() {
    const cacheOpened = this.bossDefeated && this.cacheSprite.texture.key === 'cache-open' && this.cacheOpened;
    const objective = getVerdantObjective({ bossDefeated: this.bossDefeated, cacheOpened });
    this.registry.events.emit('verdant-objective', objective.label);
  }

  update(time) {
    // The warden's eyes pulse on a slow clock while it still stands.
    if (this.bossSprite && !this.bossDefeated && !this.reducedMotion) {
      this.bossSprite.setTexture(Math.floor(time / 900) % 2 ? 'warden-pulse' : 'warden');
    }
    // Canopies breathe: alternate sway frames on a slow clock, phase-offset
    // per tree so the grove moves organically rather than in lockstep.
    if (!this.reducedMotion) {
      const swayFrame = Math.floor(time / 600) % 2 === 1;
      this.trees?.forEach((tree, i) => tree.setTexture(swayFrame !== (i % 2 === 0) ? 'tree-sway' : 'tree'));
    }
    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const up = this.cursors.up.isDown || this.keys.W.isDown;
    const down = this.cursors.down.isDown || this.keys.S.isDown;
    const { x, y } = getVerdantMovementIntent({ left, right, up, down, touchDirection: this.touchDirection });
    this.facing = getVerdantFacing({ x, y }, this.facing);
    // Two-frame walk cycle: alternate the bobbed step frame while moving,
    // settled on the base frame when idle.
    const walkFrame = moving && Math.floor(time / 140) % 2 === 1 ? '-step' : '';
    this.player.setTexture(`hero-${this.facing}${walkFrame}`);
    const moving = x !== 0 || y !== 0;
    // Walk bob: a gentle squash-and-stretch while travelling reads as steps.
    const bobScale = moving ? 1.1 + Math.sin(time / 90) * 0.04 : 1.1;
    this.player.setScale(bobScale);
    const movement = new Phaser.Math.Vector2(x, y).normalize().scale(125);
    // Axis-separated collision: blocked axis stops, the free axis slides —
    // hugging walls and coasting along the stream feels smooth, not sticky.
    const slide = getVerdantSlideVelocity(this.player.x, this.player.y, movement.x, movement.y);
    this.player.setVelocity(slide.x, slide.y);
    // Soft footsteps while actually moving; throttled so it stays a rhythm,
    // not a buzz. Silent for reduced-motion players who prefer calm worlds.
    if (moving && !this.reducedMotion && time - (this.lastStepAt || 0) > 300) {
      this.lastStepAt = time;
      playSfx('footstep');
    }

    const currentTileX = Math.floor(this.player.x / TILE);
    const currentTileY = Math.floor(this.player.y / TILE);

    // Water shimmer: alternate the authored second frame every ~600ms.
    const waterFrame = Math.floor(time / 600) % 2 === 0 ? 'water' : 'water-1';
    for (const tile of this.waterTiles) {
      if (tile.texture.key !== waterFrame) tile.setTexture(waterFrame);
    }
    if (isVerdantEncounterTile(currentTileX, currentTileY) && movement.lengthSq() > 0) {
      // Grass rustle: little leaves kick up while wading through tall grass.
      if (!this.reducedMotion && time - (this.rustleAt || 0) > 260) {
        this.rustleAt = time;
        const leaf = this.add.image(
          this.player.x + Phaser.Math.Between(-8, 8),
          this.player.y + 6,
          'leaf',
        ).setDepth(12).setAlpha(0.9);
        this.tweens.add({
          targets: leaf,
          y: leaf.y - 10,
          angle: Phaser.Math.Between(-40, 40),
          alpha: 0,
          duration: 420,
          ease: 'Sine.easeOut',
          onComplete: () => leaf.destroy(),
        });
      }
      // Time-based roll: identical encounter odds on 60 Hz and 120 Hz screens.
      if (time - this.lastEncounterRollAt > 400) {
        this.lastEncounterRollAt = time;
        if (Math.random() < 0.15) {
          this.lastEncounterAt = time;
          if (!this.reducedMotion) this.cameras.main.flash(180, 230, 250, 208);
          playSfx('encounter');
          vibrate(35);
          this.registry.events.emit('verdant-encounter');
        }
      }
    }

    const tileEvent = getVerdantTileEvent(currentTileX, currentTileY, { bossDefeated: this.bossDefeated });

    // The guide arrow drifts above the player, pointing one cardinal step
    // toward the current authored objective.
    if (this.guidanceArrow) {
      const objective = getVerdantObjective({ bossDefeated: this.bossDefeated, cacheOpened: this.cacheOpened });
      const step = getVerdantGuidanceStep(currentTileX, currentTileY, objective);
      const angles = { north: -90, east: 0, south: 90, west: 180 };
      this.guidanceArrow.setPosition(this.player.x, this.player.y - 30).setAngle(step ? angles[step] : 0).setAlpha(step ? 0.9 : 0.35);
    }

    if (tileEvent && time - this.lastBossEventAt > 4000) {
      this.lastBossEventAt = time;
      if (tileEvent === 'boss') {
        if (!this.reducedMotion) this.cameras.main.shake(220, 0.008);
        playSfx('boss-roar');
        vibrate([60, 40, 90]);
        this.registry.events.emit('verdant-boss');
      } else if (tileEvent === 'reward' && !this.cacheOpened) {
        // The cache opens exactly once — no farming potions by idling on it.
        this.cacheSprite.setTexture('cache-open');
        this.cacheOpened = true;
        if (!this.reducedMotion) this.cameras.main.flash(240, 255, 236, 170);
        playSfx('cache-open');
        vibrate(50);
        this.registry.events.emit('verdant-reward');
        this.announceObjective();
      }
    }
  }
}
