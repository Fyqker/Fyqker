const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const hud = {
  health: document.getElementById('health'),
  armor: document.getElementById('armor'),
  weapon: document.getElementById('weapon'),
  ammo: document.getElementById('ammo'),
  alive: document.getElementById('alive'),
  kills: document.getElementById('kills'),
  zone: document.getElementById('zone')
};

const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const restartBtn = document.getElementById('restart');

const world = {
  width: 2200,
  height: 1400,
  cameraX: 0,
  cameraY: 0,
  safeZone: { x: 1100, y: 700, radius: 900 },
  phase: 1,
  nextShrinkAt: performance.now() + 18000
};

const keys = {};
const mouse = { x: 0, y: 0, down: false };

const weapons = {
  rifle: { name: 'Rifle', magSize: 30, fireDelay: 105, bulletSpeed: 12, damage: 18, color: '#ffd56a' },
  smg: { name: 'SMG', magSize: 40, fireDelay: 70, bulletSpeed: 14, damage: 11, color: '#9ee7ff' }
};

let player;
let bots;
let bullets;
let loots;
let particles;
let gameOver = false;

function resetGame() {
  player = {
    x: world.width / 2,
    y: world.height / 2,
    w: 22,
    h: 22,
    speed: 3.5,
    health: 100,
    armor: 0,
    kills: 0,
    weaponKey: 'rifle',
    ammo: { rifle: 30, smg: 40 },
    reserve: { rifle: 90, smg: 120 },
    lastShot: 0,
    reloadUntil: 0
  };

  bots = Array.from({ length: 20 }, (_, i) => spawnBot(i));
  bullets = [];
  particles = [];
  loots = Array.from({ length: 16 }, spawnLoot);

  world.safeZone = { x: 1100, y: 700, radius: 900 };
  world.phase = 1;
  world.nextShrinkAt = performance.now() + 18000;
  gameOver = false;
  overlay.classList.add('hidden');
}

function spawnBot(i) {
  return {
    id: i,
    x: Math.random() * world.width,
    y: Math.random() * world.height,
    w: 20,
    h: 20,
    health: 100,
    armor: Math.random() < 0.35 ? 25 : 0,
    speed: 2 + Math.random() * 1.2,
    dirX: 0,
    dirY: 0,
    nextDirAt: 0,
    lastShot: 0,
    weapon: Math.random() < 0.5 ? 'rifle' : 'smg',
    alive: true
  };
}

function spawnLoot() {
  return {
    x: 120 + Math.random() * (world.width - 240),
    y: 120 + Math.random() * (world.height - 240),
    size: 28,
    opened: false
  };
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
  if (e.key.toLowerCase() === 'r') reload();
  if (e.key === '1') player.weaponKey = 'rifle';
  if (e.key === '2') player.weaponKey = 'smg';
  if (e.key.toLowerCase() === 'f') tryOpenLoot();
});
window.addEventListener('keyup', (e) => (keys[e.key.toLowerCase()] = false));
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
});
canvas.addEventListener('mousedown', () => (mouse.down = true));
canvas.addEventListener('mouseup', () => (mouse.down = false));
restartBtn.addEventListener('click', resetGame);

function reload() {
  if (gameOver) return;
  if (performance.now() < player.reloadUntil) return;
  const key = player.weaponKey;
  const gun = weapons[key];
  const missing = gun.magSize - player.ammo[key];
  if (missing <= 0 || player.reserve[key] <= 0) return;
  player.reloadUntil = performance.now() + 1200;
  setTimeout(() => {
    const add = Math.min(missing, player.reserve[key]);
    player.ammo[key] += add;
    player.reserve[key] -= add;
  }, 1200);
}

function tryOpenLoot() {
  for (const box of loots) {
    if (!box.opened && Math.hypot(box.x - player.x, box.y - player.y) < 46) {
      box.opened = true;
      const roll = Math.random();
      if (roll < 0.4) player.health = Math.min(100, player.health + 30);
      else if (roll < 0.7) player.armor = Math.min(100, player.armor + 35);
      else {
        player.reserve.rifle += 40;
        player.reserve.smg += 50;
      }
      burst(box.x, box.y, '#9cff8a');
      return;
    }
  }
}

function shoot(from, tx, ty, weaponKey, isPlayer) {
  const gun = weapons[weaponKey];
  const dx = tx - from.x;
  const dy = ty - from.y;
  const len = Math.hypot(dx, dy) || 1;
  bullets.push({
    x: from.x,
    y: from.y,
    vx: (dx / len) * gun.bulletSpeed,
    vy: (dy / len) * gun.bulletSpeed,
    life: 80,
    damage: gun.damage,
    color: gun.color,
    fromPlayer: isPlayer
  });
}

function applyDamage(target, amount) {
  let dmg = amount;
  if (target.armor > 0) {
    const absorbed = Math.min(target.armor, dmg * 0.55);
    target.armor -= absorbed;
    dmg -= absorbed;
  }
  target.health -= dmg;
}

function updatePlayer() {
  let dx = 0;
  let dy = 0;
  if (keys['w']) dy -= 1;
  if (keys['s']) dy += 1;
  if (keys['a']) dx -= 1;
  if (keys['d']) dx += 1;
  const len = Math.hypot(dx, dy) || 1;
  player.x += (dx / len) * player.speed;
  player.y += (dy / len) * player.speed;
  player.x = clamp(player.x, 16, world.width - 16);
  player.y = clamp(player.y, 16, world.height - 16);

  const gun = weapons[player.weaponKey];
  if (mouse.down && performance.now() - player.lastShot >= gun.fireDelay && player.ammo[player.weaponKey] > 0 && performance.now() > player.reloadUntil) {
    player.lastShot = performance.now();
    player.ammo[player.weaponKey]--;
    shoot(player, mouse.x + world.cameraX, mouse.y + world.cameraY, player.weaponKey, true);
  }

  const zoneDist = Math.hypot(player.x - world.safeZone.x, player.y - world.safeZone.y);
  if (zoneDist > world.safeZone.radius) player.health -= 0.08;
}

function updateBots() {
  for (const bot of bots) {
    if (!bot.alive) continue;

    const zoneDist = Math.hypot(bot.x - world.safeZone.x, bot.y - world.safeZone.y);
    if (zoneDist > world.safeZone.radius) bot.health -= 0.06;

    if (performance.now() > bot.nextDirAt) {
      bot.nextDirAt = performance.now() + 700 + Math.random() * 900;
      const angle = Math.random() * Math.PI * 2;
      bot.dirX = Math.cos(angle);
      bot.dirY = Math.sin(angle);
    }

    const target = dist(bot, player) < 420 ? player : null;
    if (target) {
      const dx = target.x - bot.x;
      const dy = target.y - bot.y;
      const l = Math.hypot(dx, dy) || 1;
      bot.dirX = dx / l;
      bot.dirY = dy / l;

      const gun = weapons[bot.weapon];
      if (performance.now() - bot.lastShot > gun.fireDelay + Math.random() * 180) {
        bot.lastShot = performance.now();
        shoot(bot, player.x + (Math.random() - 0.5) * 30, player.y + (Math.random() - 0.5) * 30, bot.weapon, false);
      }
    }

    bot.x += bot.dirX * bot.speed;
    bot.y += bot.dirY * bot.speed;
    bot.x = clamp(bot.x, 16, world.width - 16);
    bot.y = clamp(bot.y, 16, world.height - 16);

    if (bot.health <= 0) {
      bot.alive = false;
      loots.push({ x: bot.x, y: bot.y, size: 26, opened: false });
      burst(bot.x, bot.y, '#ff8478');
    }
  }
}

function updateBullets() {
  for (const b of bullets) {
    b.x += b.vx;
    b.y += b.vy;
    b.life--;

    if (b.fromPlayer) {
      for (const bot of bots) {
        if (!bot.alive) continue;
        if (Math.hypot(b.x - bot.x, b.y - bot.y) < 14) {
          applyDamage(bot, b.damage);
          b.life = 0;
          if (bot.health <= 0 && bot.alive) {
            bot.alive = false;
            player.kills++;
            loots.push({ x: bot.x, y: bot.y, size: 26, opened: false });
          }
          break;
        }
      }
    } else if (Math.hypot(b.x - player.x, b.y - player.y) < 14) {
      applyDamage(player, b.damage);
      b.life = 0;
    }
  }

  bullets = bullets.filter((b) => b.life > 0 && b.x >= 0 && b.x <= world.width && b.y >= 0 && b.y <= world.height);
}

function updateZone() {
  if (performance.now() > world.nextShrinkAt && world.safeZone.radius > 140) {
    world.phase++;
    world.nextShrinkAt = performance.now() + 16000;
    world.safeZone.radius -= 90;
    world.safeZone.x = clamp(world.safeZone.x + (Math.random() - 0.5) * 260, 250, world.width - 250);
    world.safeZone.y = clamp(world.safeZone.y + (Math.random() - 0.5) * 200, 220, world.height - 220);
  }
}

function burst(x, y, color) {
  for (let i = 0; i < 14; i++) {
    particles.push({ x, y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 30 + Math.random() * 20, color });
  }
}

function updateParticles() {
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    p.vx *= 0.97;
    p.vy *= 0.97;
  }
  particles = particles.filter((p) => p.life > 0);
}

function updateCamera() {
  world.cameraX = clamp(player.x - canvas.width / 2, 0, world.width - canvas.width);
  world.cameraY = clamp(player.y - canvas.height / 2, 0, world.height - canvas.height);
}

function drawWorld() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let x = 0; x < world.width; x += 60) {
    for (let y = 0; y < world.height; y += 60) {
      const sx = x - world.cameraX;
      const sy = y - world.cameraY;
      if (sx < -60 || sy < -60 || sx > canvas.width || sy > canvas.height) continue;
      ctx.fillStyle = (x / 60 + y / 60) % 2 === 0 ? '#5b8742' : '#57803f';
      ctx.fillRect(sx, sy, 60, 60);
    }
  }

  ctx.strokeStyle = '#6fb8ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(world.safeZone.x - world.cameraX, world.safeZone.y - world.cameraY, world.safeZone.radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(39, 76, 140, 0.22)';
  ctx.beginPath();
  ctx.rect(0, 0, canvas.width, canvas.height);
  ctx.arc(world.safeZone.x - world.cameraX, world.safeZone.y - world.cameraY, world.safeZone.radius, 0, Math.PI * 2, true);
  ctx.fill('evenodd');

  for (const box of loots) {
    if (box.opened) continue;
    const x = box.x - world.cameraX;
    const y = box.y - world.cameraY;
    ctx.fillStyle = '#74481f';
    ctx.fillRect(x - box.size / 2, y - box.size / 2, box.size, box.size);
    ctx.fillStyle = '#d8a56f';
    ctx.fillRect(x - box.size / 2 + 4, y - box.size / 2 + 4, box.size - 8, 6);
  }

  for (const bot of bots) {
    if (!bot.alive) continue;
    const x = bot.x - world.cameraX;
    const y = bot.y - world.cameraY;
    ctx.fillStyle = '#d94848';
    ctx.fillRect(x - 10, y - 10, 20, 20);
    ctx.fillStyle = '#111';
    ctx.fillRect(x - 3, y - 12, 6, 4);
  }

  const px = player.x - world.cameraX;
  const py = player.y - world.cameraY;
  ctx.fillStyle = '#56d1ff';
  ctx.fillRect(px - 11, py - 11, 22, 22);
  ctx.fillStyle = '#123f60';
  ctx.fillRect(px - 3, py - 13, 6, 4);

  for (const b of bullets) {
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x - world.cameraX - 2, b.y - world.cameraY - 2, 4, 4);
  }

  for (const p of particles) {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - world.cameraX, p.y - world.cameraY, 3, 3);
  }
}

function updateHud() {
  hud.health.textContent = Math.max(0, Math.round(player.health));
  hud.armor.textContent = Math.max(0, Math.round(player.armor));
  hud.weapon.textContent = weapons[player.weaponKey].name;
  hud.ammo.textContent = `${player.ammo[player.weaponKey]} / ${player.reserve[player.weaponKey]}`;
  hud.alive.textContent = bots.filter((b) => b.alive).length + 1;
  hud.kills.textContent = player.kills;
  hud.zone.textContent = world.phase;
}

function endGame(win) {
  gameOver = true;
  overlay.classList.remove('hidden');
  overlayTitle.textContent = win ? 'Winner Winner Pixel Dinner!' : 'Elendin';
  overlayText.textContent = win
    ? `Tebrikler! ${player.kills} rakibi eledin.`
    : `Skorun: ${player.kills}. Tekrar dene ve son hayatta kalan ol.`;
}

function tick() {
  if (!gameOver) {
    updatePlayer();
    updateBots();
    updateBullets();
    updateParticles();
    updateZone();
    updateCamera();
    drawWorld();
    updateHud();

    if (player.health <= 0) endGame(false);
    if (bots.filter((b) => b.alive).length === 0) endGame(true);
  }
  requestAnimationFrame(tick);
}

resetGame();
requestAnimationFrame(tick);
