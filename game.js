import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const root = document.getElementById('game-root');
const hud = {
  health: document.getElementById('health'),
  armor: document.getElementById('armor'),
  weapon: document.getElementById('weapon'),
  ammo: document.getElementById('ammo'),
  alive: document.getElementById('alive'),
  kills: document.getElementById('kills'),
  zone: document.getElementById('zone'),
  stamina: document.getElementById('stamina'),
  coins: document.getElementById('coins')
};
const killfeed = document.getElementById('killfeed');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const restartBtn = document.getElementById('restart');

const weapons = {
  rifle: { name: 'Rifle', fireDelay: 0.1, speed: 280, dmg: 24, mag: 35, reserve: 120, spread: 0.009 },
  smg: { name: 'SMG', fireDelay: 0.06, speed: 250, dmg: 15, mag: 50, reserve: 180, spread: 0.018 },
  sniper: { name: 'Sniper', fireDelay: 0.7, speed: 420, dmg: 70, mag: 7, reserve: 35, spread: 0.002 }
};

const world = {
  size: 5000,
  zoneCenter: new THREE.Vector3(0, 0, 0),
  zoneRadius: 2200,
  phase: 1,
  nextShrink: 28,
  time: 0
};

let scene;
let camera;
let renderer;
let clock;
let gameOver = false;

let player;
let bullets = [];
let bots = [];
let lootBoxes = [];
let obstacles = [];
let keys = {};
let mouseDown = false;
let yaw = 0;
let pitch = -0.18;
let feedItems = [];

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x88c5ff);
  scene.fog = new THREE.Fog(0x88b7ef, 800, 3800);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 8000);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  root.innerHTML = '';
  root.appendChild(renderer.domElement);

  clock = new THREE.Clock();

  const hemi = new THREE.HemisphereLight(0xddefff, 0x3d4f2f, 1.05);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(140, 220, 90);
  sun.castShadow = true;
  scene.add(sun);

  makeTerrain();
  spawnObstacles();
  resetGame();

  window.addEventListener('resize', onResize);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', (e) => (keys[e.key.toLowerCase()] = false));
  window.addEventListener('mousedown', () => {
    mouseDown = true;
    renderer.domElement.requestPointerLock();
  });
  window.addEventListener('mouseup', () => (mouseDown = false));
  window.addEventListener('mousemove', onMouseMove);

  restartBtn.addEventListener('click', resetGame);

  animate();
}

function makeTerrain() {
  const g = new THREE.PlaneGeometry(world.size, world.size, 130, 130);
  g.rotateX(-Math.PI / 2);
  const arr = g.attributes.position;
  for (let i = 0; i < arr.count; i++) {
    const x = arr.getX(i);
    const z = arr.getZ(i);
    arr.setY(i, Math.sin(x * 0.005) * 8 + Math.cos(z * 0.007) * 8);
  }
  g.computeVertexNormals();

  const m = new THREE.MeshStandardMaterial({ color: 0x4f8f3f, flatShading: true });
  const ground = new THREE.Mesh(g, m);
  ground.receiveShadow = true;
  scene.add(ground);
}

function spawnObstacles() {
  for (const obj of obstacles) scene.remove(obj.mesh);
  obstacles = [];
  const mats = [
    new THREE.MeshStandardMaterial({ color: 0x715237, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0x56616f, flatShading: true })
  ];

  for (let i = 0; i < 320; i++) {
    const isTree = Math.random() < 0.6;
    const mesh = new THREE.Mesh(
      isTree ? new THREE.CylinderGeometry(2.2, 3.3, 24, 6) : new THREE.BoxGeometry(14, 8, 14),
      mats[isTree ? 0 : 1]
    );
    mesh.position.set((Math.random() - 0.5) * world.size * 0.92, isTree ? 12 : 4, (Math.random() - 0.5) * world.size * 0.92);
    mesh.castShadow = true;
    scene.add(mesh);
    obstacles.push({ mesh, r: isTree ? 6 : 10 });
  }
}

function makeBot(id) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(8, 10, 6), new THREE.MeshStandardMaterial({ color: 0xea564f, flatShading: true }));
  const head = new THREE.Mesh(new THREE.BoxGeometry(5, 4, 5), new THREE.MeshStandardMaterial({ color: 0x212733, flatShading: true }));
  body.position.y = 10;
  head.position.y = 17;
  group.add(body, head);
  group.castShadow = true;
  scene.add(group);

  return {
    id,
    mesh: group,
    pos: new THREE.Vector3((Math.random() - 0.5) * world.size * 0.7, 5, (Math.random() - 0.5) * world.size * 0.7),
    vel: new THREE.Vector3(),
    hp: 100,
    armor: Math.random() < 0.45 ? 50 : 15,
    speed: 26 + Math.random() * 8,
    nextWander: 0,
    dir: new THREE.Vector3(1, 0, 0),
    weapon: Math.random() < 0.7 ? 'smg' : 'rifle',
    shootCd: 0,
    alive: true,
    level: 1 + Math.floor(Math.random() * 3)
  };
}

function spawnLoot(x, z, elite = false) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 6), new THREE.MeshStandardMaterial({ color: elite ? 0xffd94d : 0x9c7a54, emissive: elite ? 0x403000 : 0x000000 }));
  mesh.position.set(x, 3, z);
  scene.add(mesh);
  lootBoxes.push({ mesh, opened: false, elite });
}

function resetGame() {
  for (const b of bots) scene.remove(b.mesh);
  for (const l of lootBoxes) scene.remove(l.mesh);
  for (const b of bullets) scene.remove(b.mesh);
  bots = [];
  lootBoxes = [];
  bullets = [];
  feedItems = [];
  killfeed.innerHTML = '';

  player = {
    pos: new THREE.Vector3(0, 5, 0),
    velY: 0,
    hp: 100,
    armor: 35,
    kills: 0,
    coins: 0,
    stamina: 100,
    medkits: 2,
    weapon: 'rifle',
    ammo: { rifle: weapons.rifle.mag, smg: weapons.smg.mag, sniper: weapons.sniper.mag },
    reserve: { rifle: weapons.rifle.reserve, smg: weapons.smg.reserve, sniper: weapons.sniper.reserve },
    cd: 0,
    reloadTimer: 0,
    dashCd: 0
  };

  for (let i = 0; i < 54; i++) bots.push(makeBot(i));
  for (let i = 0; i < 180; i++) spawnLoot((Math.random() - 0.5) * world.size * 0.85, (Math.random() - 0.5) * world.size * 0.85, Math.random() < 0.12);

  world.zoneCenter.set(0, 0, 0);
  world.zoneRadius = 2200;
  world.phase = 1;
  world.nextShrink = 28;
  world.time = 0;

  yaw = 0;
  pitch = -0.18;
  gameOver = false;
  overlay.classList.add('hidden');
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(e) {
  if (document.pointerLockElement !== renderer.domElement) return;
  yaw -= e.movementX * 0.0022;
  pitch -= e.movementY * 0.0022;
  pitch = Math.max(-1.2, Math.min(0.6, pitch));
}

function onKeyDown(e) {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (k === 'r') reload();
  if (k === '1') player.weapon = 'rifle';
  if (k === '2') player.weapon = 'smg';
  if (k === '3') player.weapon = 'sniper';
  if (k === 'f') openLoot();
  if (k === 'e') useMedkit();
  if (k === 'q') dash();
}

function useMedkit() {
  if (player.medkits <= 0 || player.hp >= 95) return;
  player.medkits--;
  player.hp = Math.min(100, player.hp + 45);
  addFeed('Medkit kullandın +45 HP');
}

function dash() {
  if (player.dashCd > 0 || player.stamina < 20) return;
  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  player.pos.addScaledVector(forward, 45);
  player.stamina -= 20;
  player.dashCd = 4;
}

function reload() {
  if (player.reloadTimer > 0) return;
  const key = player.weapon;
  const gun = weapons[key];
  const miss = gun.mag - player.ammo[key];
  if (miss <= 0 || player.reserve[key] <= 0) return;
  player.reloadTimer = key === 'sniper' ? 1.5 : 1.1;
}

function fire(dt) {
  player.cd -= dt;
  if (player.reloadTimer > 0) {
    player.reloadTimer -= dt;
    if (player.reloadTimer <= 0) {
      const key = player.weapon;
      const gun = weapons[key];
      const need = gun.mag - player.ammo[key];
      const add = Math.min(need, player.reserve[key]);
      player.ammo[key] += add;
      player.reserve[key] -= add;
    }
    return;
  }
  if (!mouseDown || player.cd > 0) return;
  const gun = weapons[player.weapon];
  if (player.ammo[player.weapon] <= 0) return;

  player.cd = gun.fireDelay;
  player.ammo[player.weapon]--;

  const dir = new THREE.Vector3(Math.sin(yaw), Math.sin(pitch), Math.cos(yaw)).normalize();
  dir.x += (Math.random() - 0.5) * gun.spread;
  dir.y += (Math.random() - 0.5) * gun.spread;
  dir.z += (Math.random() - 0.5) * gun.spread;
  dir.normalize();

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.8, 6, 6), new THREE.MeshBasicMaterial({ color: 0xfff2a0 }));
  mesh.position.copy(player.pos).add(new THREE.Vector3(0, 8, 0));
  scene.add(mesh);

  bullets.push({ mesh, pos: mesh.position.clone(), vel: dir.multiplyScalar(gun.speed), dmg: gun.dmg, life: 3.5, fromPlayer: true });
}

function botShoot(bot, dt) {
  bot.shootCd -= dt;
  if (bot.shootCd > 0) return;
  const d = bot.pos.distanceTo(player.pos);
  if (d > 340) return;

  bot.shootCd = weapons[bot.weapon].fireDelay + Math.random() * 0.15;

  const dir = player.pos.clone().sub(bot.pos).add(new THREE.Vector3((Math.random() - 0.5) * 7, 6, (Math.random() - 0.5) * 7)).normalize();
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.7, 5, 5), new THREE.MeshBasicMaterial({ color: 0xff7f6d }));
  mesh.position.copy(bot.pos).add(new THREE.Vector3(0, 9, 0));
  scene.add(mesh);
  bullets.push({ mesh, pos: mesh.position.clone(), vel: dir.multiplyScalar(weapons[bot.weapon].speed * 0.9), dmg: weapons[bot.weapon].dmg, life: 3.2, fromPlayer: false, shooter: bot.id });
}

function obstaclePush(pos, radius = 6) {
  for (const o of obstacles) {
    const d = new THREE.Vector2(pos.x - o.mesh.position.x, pos.z - o.mesh.position.z);
    const minD = radius + o.r;
    const len = d.length();
    if (len > 0 && len < minD) {
      d.normalize().multiplyScalar(minD - len + 0.5);
      pos.x += d.x;
      pos.z += d.y;
    }
  }
}

function updatePlayer(dt) {
  const speed = keys.shift && player.stamina > 1 ? 30 : 17;
  if (keys.shift && (keys.w || keys.a || keys.s || keys.d)) player.stamina = Math.max(0, player.stamina - 24 * dt);
  else player.stamina = Math.min(100, player.stamina + 16 * dt);

  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const right = new THREE.Vector3(forward.z, 0, -forward.x);
  const move = new THREE.Vector3();

  if (keys.w) move.add(forward);
  if (keys.s) move.sub(forward);
  if (keys.a) move.sub(right);
  if (keys.d) move.add(right);
  if (move.lengthSq() > 0) move.normalize().multiplyScalar(speed * dt);

  if (keys[' '] && player.pos.y <= 5.01) player.velY = 18;
  player.velY -= 40 * dt;
  player.pos.y += player.velY * dt;
  if (player.pos.y < 5) {
    player.pos.y = 5;
    player.velY = 0;
  }

  player.pos.add(move);
  player.pos.x = Math.max(-world.size * 0.49, Math.min(world.size * 0.49, player.pos.x));
  player.pos.z = Math.max(-world.size * 0.49, Math.min(world.size * 0.49, player.pos.z));
  obstaclePush(player.pos, 5.2);

  player.dashCd = Math.max(0, player.dashCd - dt);

  const zoneDist = player.pos.distanceTo(world.zoneCenter);
  if (zoneDist > world.zoneRadius) player.hp -= 7 * dt;

  const camOffset = new THREE.Vector3(Math.sin(yaw + Math.PI) * 22, 14 + Math.sin(-pitch) * 7, Math.cos(yaw + Math.PI) * 22);
  camera.position.copy(player.pos).add(camOffset);
  camera.lookAt(player.pos.clone().add(new THREE.Vector3(Math.sin(yaw) * 20, 8 + Math.sin(pitch) * 10, Math.cos(yaw) * 20)));
}

function updateBots(dt) {
  for (const bot of bots) {
    if (!bot.alive) continue;

    const toP = player.pos.clone().sub(bot.pos);
    const dist = toP.length();

    if (dist < 440) {
      toP.y = 0;
      toP.normalize();
      bot.dir.copy(toP);
    } else if (world.time > bot.nextWander) {
      bot.nextWander = world.time + 1.5 + Math.random() * 2.6;
      bot.dir.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
    }

    bot.pos.addScaledVector(bot.dir, bot.speed * dt);
    bot.pos.x = Math.max(-world.size * 0.49, Math.min(world.size * 0.49, bot.pos.x));
    bot.pos.z = Math.max(-world.size * 0.49, Math.min(world.size * 0.49, bot.pos.z));
    obstaclePush(bot.pos, 5.5);

    const zoneDist = bot.pos.distanceTo(world.zoneCenter);
    if (zoneDist > world.zoneRadius) bot.hp -= 5.5 * dt;

    botShoot(bot, dt);

    bot.mesh.position.copy(bot.pos);
    bot.mesh.lookAt(bot.pos.clone().add(bot.dir));

    if (bot.hp <= 0) {
      bot.alive = false;
      scene.remove(bot.mesh);
      player.coins += 4 + bot.level;
      spawnLoot(bot.pos.x, bot.pos.z, Math.random() < 0.25);
      addFeed(`Bot #${bot.id} elendi (+${4 + bot.level} coin)`);
      player.kills++;
    }
  }
}

function updateBullets(dt) {
  for (const b of bullets) {
    b.life -= dt;
    b.pos.addScaledVector(b.vel, dt);
    b.mesh.position.copy(b.pos);

    if (b.fromPlayer) {
      for (const bot of bots) {
        if (!bot.alive) continue;
        if (b.pos.distanceTo(bot.pos.clone().add(new THREE.Vector3(0, 8, 0))) < 5.8) {
          let dmg = b.dmg;
          if (bot.armor > 0) {
            const absorb = Math.min(bot.armor, dmg * 0.45);
            bot.armor -= absorb;
            dmg -= absorb;
          }
          bot.hp -= dmg;
          b.life = 0;
          break;
        }
      }
    } else if (b.pos.distanceTo(player.pos.clone().add(new THREE.Vector3(0, 8, 0))) < 4.8) {
      let dmg = b.dmg;
      if (player.armor > 0) {
        const absorb = Math.min(player.armor, dmg * 0.5);
        player.armor -= absorb;
        dmg -= absorb;
      }
      player.hp -= dmg;
      b.life = 0;
    }
  }

  bullets = bullets.filter((b) => {
    const alive = b.life > 0 && Math.abs(b.pos.x) < world.size * 0.6 && Math.abs(b.pos.z) < world.size * 0.6;
    if (!alive) scene.remove(b.mesh);
    return alive;
  });
}

function openLoot() {
  for (const l of lootBoxes) {
    if (l.opened) continue;
    const d = l.mesh.position.distanceTo(player.pos);
    if (d < 16) {
      l.opened = true;
      scene.remove(l.mesh);
      const roll = Math.random();
      if (roll < 0.2) {
        player.medkits++;
        addFeed('Loot: +1 Medkit');
      } else if (roll < 0.45) {
        player.armor = Math.min(100, player.armor + (l.elite ? 45 : 25));
        addFeed(`Loot: +${l.elite ? 45 : 25} armor`);
      } else if (roll < 0.72) {
        player.hp = Math.min(100, player.hp + (l.elite ? 40 : 20));
        addFeed(`Loot: +${l.elite ? 40 : 20} hp`);
      } else {
        player.reserve.rifle += l.elite ? 80 : 35;
        player.reserve.smg += l.elite ? 120 : 50;
        player.reserve.sniper += l.elite ? 14 : 5;
        player.coins += l.elite ? 12 : 4;
        addFeed('Loot: ammo + coin');
      }
      return;
    }
  }
}

function updateZone(dt) {
  world.time += dt;
  world.nextShrink -= dt;
  if (world.nextShrink <= 0 && world.zoneRadius > 200) {
    world.phase++;
    world.nextShrink = 24;
    world.zoneRadius -= 190;
    world.zoneCenter.x += (Math.random() - 0.5) * 350;
    world.zoneCenter.z += (Math.random() - 0.5) * 350;
    world.zoneCenter.x = Math.max(-1300, Math.min(1300, world.zoneCenter.x));
    world.zoneCenter.z = Math.max(-1300, Math.min(1300, world.zoneCenter.z));
    addFeed(`Zone daraldı! Faz ${world.phase}`);
  }
}

function drawZoneRing() {
  if (scene.getObjectByName('zoneRing')) scene.remove(scene.getObjectByName('zoneRing'));
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(world.zoneRadius - 5, world.zoneRadius + 5, 120),
    new THREE.MeshBasicMaterial({ color: 0x66b9ff, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
  );
  ring.name = 'zoneRing';
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(world.zoneCenter.x, 0.3, world.zoneCenter.z);
  scene.add(ring);
}

function addFeed(text) {
  feedItems.unshift({ text, t: 5 });
  if (feedItems.length > 6) feedItems.pop();
  renderFeed();
}

function renderFeed() {
  killfeed.innerHTML = '';
  for (const item of feedItems) {
    const div = document.createElement('div');
    div.className = 'item';
    div.textContent = item.text;
    killfeed.appendChild(div);
  }
}

function updateFeed(dt) {
  for (const f of feedItems) f.t -= dt;
  feedItems = feedItems.filter((f) => f.t > 0);
  renderFeed();
}

function endGame(win) {
  gameOver = true;
  overlay.classList.remove('hidden');
  overlayTitle.textContent = win ? 'WINNER WINNER PIXEL DINNER' : 'ELENDİN';
  overlayText.textContent = win
    ? `Çok iyi! ${player.kills} kill, ${player.coins} coin topladın.`
    : `Skor: ${player.kills} kill, ${player.coins} coin. Medkit sayın: ${player.medkits}`;
}

function updateHud() {
  hud.health.textContent = Math.max(0, Math.round(player.hp));
  hud.armor.textContent = Math.max(0, Math.round(player.armor));
  hud.weapon.textContent = weapons[player.weapon].name;
  hud.ammo.textContent = `${player.ammo[player.weapon]} / ${player.reserve[player.weapon]}`;
  hud.alive.textContent = bots.filter((b) => b.alive).length + 1;
  hud.kills.textContent = player.kills;
  hud.zone.textContent = world.phase;
  hud.stamina.textContent = Math.round(player.stamina);
  hud.coins.textContent = player.coins;
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.035, clock.getDelta());

  if (!gameOver) {
    fire(dt);
    updatePlayer(dt);
    updateBots(dt);
    updateBullets(dt);
    updateZone(dt);
    updateFeed(dt);
    drawZoneRing();
    updateHud();

    if (player.hp <= 0) endGame(false);
    if (bots.filter((b) => b.alive).length === 0) endGame(true);
  }

  renderer.render(scene, camera);
}

init();
