import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const ui = {
  prestart: document.getElementById('prestart'),
  startBtn: document.getElementById('start-btn'),
  hud: document.getElementById('hud'),
  controls: document.getElementById('controls'),
  crosshair: document.getElementById('crosshair'),
  killfeed: document.getElementById('killfeed'),
  overlay: document.getElementById('overlay'),
  overlayTitle: document.getElementById('overlay-title'),
  overlayText: document.getElementById('overlay-text'),
  restart: document.getElementById('restart'),
  setBots: document.getElementById('set-bots'),
  setBotsValue: document.getElementById('set-bots-value'),
  setMap: document.getElementById('set-map'),
  setDifficulty: document.getElementById('set-difficulty'),
  setQuality: document.getElementById('set-quality')
};

const hud = {
  health: document.getElementById('health'), armor: document.getElementById('armor'), weapon: document.getElementById('weapon'),
  ammo: document.getElementById('ammo'), alive: document.getElementById('alive'), kills: document.getElementById('kills'),
  zone: document.getElementById('zone'), stamina: document.getElementById('stamina'), coins: document.getElementById('coins'),
  vehicle: document.getElementById('vehicle')
};

const qualityCfg = {
  low: { pixelRatio: 1, obstacles: 90 },
  medium: { pixelRatio: 1.25, obstacles: 150 },
  high: { pixelRatio: Math.min(2, window.devicePixelRatio || 1.5), obstacles: 220 }
};
const diffCfg = {
  easy: { botSpeed: 14, botDmg: 0.8, botAggro: 280 },
  normal: { botSpeed: 18, botDmg: 1, botAggro: 360 },
  hard: { botSpeed: 22, botDmg: 1.2, botAggro: 460 }
};
const weapons = {
  rifle: { name: 'Rifle', delay: 0.09, dmg: 24, mag: 36, reserve: 120, spread: 0.007 },
  smg: { name: 'SMG', delay: 0.055, dmg: 15, mag: 48, reserve: 170, spread: 0.014 },
  sniper: { name: 'Sniper', delay: 0.58, dmg: 72, mag: 7, reserve: 30, spread: 0.001 }
};

let scene, camera, renderer, clock;
let world = { size: 4200, phase: 1, zoneRadius: 1800, nextShrink: 20, zoneCenter: new THREE.Vector3(0,0,0), time: 0 };
let keys = {}, mouseDown = false, yaw = 0, pitch = -0.2, gameStarted = false, gameOver = false;
let player, bots = [], loots = [], obstacles = [], vehicles = [], feed = [];
const raycaster = new THREE.Raycaster();
const tempV = new THREE.Vector3();
let zoneMesh;

function initRenderer() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87bfff);
  scene.fog = new THREE.Fog(0x8cb6e4, 700, 3500);
  camera = new THREE.PerspectiveCamera(74, innerWidth / innerHeight, 0.1, 7000);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.shadowMap.enabled = true;
  document.getElementById('game-root').appendChild(renderer.domElement);
  clock = new THREE.Clock();

  const hemi = new THREE.HemisphereLight(0xe8f7ff, 0x3c522d, 1.05);
  const sun = new THREE.DirectionalLight(0xffffff, 1.08);
  sun.position.set(160, 210, 110);
  sun.castShadow = true;
  scene.add(hemi, sun);

  zoneMesh = new THREE.Mesh(
    new THREE.RingGeometry(1, 1.01, 120),
    new THREE.MeshBasicMaterial({ color: 0x72c0ff, side: THREE.DoubleSide, transparent: true, opacity: 0.58 })
  );
  zoneMesh.rotation.x = -Math.PI / 2;
  zoneMesh.position.y = 0.3;
  scene.add(zoneMesh);

  window.addEventListener('resize', onResize);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', (e) => (keys[e.key.toLowerCase()] = false));
  window.addEventListener('mousedown', () => { mouseDown = true; if (gameStarted) renderer.domElement.requestPointerLock(); });
  window.addEventListener('mouseup', () => (mouseDown = false));
  window.addEventListener('mousemove', onMouseMove);

  ui.setBots.addEventListener('input', () => (ui.setBotsValue.textContent = ui.setBots.value));
  ui.startBtn.addEventListener('click', startGame);
  ui.restart.addEventListener('click', startGame);

  ui.setBotsValue.textContent = ui.setBots.value;
  onResize();
  animate();
}

function setupWorld() {
  clearWorld();
  world = { size: Number(ui.setMap.value), phase: 1, zoneRadius: Number(ui.setMap.value) * 0.42, nextShrink: 22, zoneCenter: new THREE.Vector3(0,0,0), time: 0 };

  const quality = qualityCfg[ui.setQuality.value];
  renderer.setPixelRatio(quality.pixelRatio);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(world.size, world.size, 80, 80), new THREE.MeshStandardMaterial({ color: 0x4f9340, flatShading: true }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  for (let i = 0; i < quality.obstacles; i++) {
    const tree = Math.random() < 0.6;
    const mesh = tree
      ? new THREE.Mesh(new THREE.CylinderGeometry(2, 3.5, 20, 6), new THREE.MeshStandardMaterial({ color: 0x72563d, flatShading: true }))
      : new THREE.Mesh(new THREE.BoxGeometry(10, 8, 10), new THREE.MeshStandardMaterial({ color: 0x5d6f7d, flatShading: true }));
    mesh.position.set((Math.random()-0.5)*world.size*0.9, tree ? 10 : 4, (Math.random()-0.5)*world.size*0.9);
    scene.add(mesh);
    obstacles.push({ mesh, r: tree ? 5.5 : 8 });
  }

  const botCount = Number(ui.setBots.value);
  for (let i = 0; i < botCount; i++) bots.push(spawnBot(i));
  for (let i = 0; i < Math.max(55, Math.floor(botCount * 2)); i++) spawnLoot((Math.random()-0.5)*world.size*0.86, (Math.random()-0.5)*world.size*0.86, Math.random()<0.16);

  spawnVehicle('buggy', -40, 25);
  spawnVehicle('truck', 35, -30);
}

function clearWorld() {
  for (const b of bots) scene.remove(b.mesh);
  for (const l of loots) scene.remove(l.mesh);
  for (const o of obstacles) scene.remove(o.mesh);
  for (const v of vehicles) scene.remove(v.mesh);
  bots = []; loots = []; obstacles = []; vehicles = []; feed = [];
  ui.killfeed.innerHTML = '';
}

function createCharacter(colorBody = 0x56d5ff) {
  const g = new THREE.Group();
  const matBody = new THREE.MeshStandardMaterial({ color: colorBody, flatShading: true });
  const matHead = new THREE.MeshStandardMaterial({ color: 0x1f2431, flatShading: true });
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.8, 6, 3.2), matBody);
  const head = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3, 3), matHead);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(1.4, 3.4, 1.4), matBody);
  const legR = legL.clone();
  body.position.y = 7.5; head.position.y = 12; legL.position.set(-1, 3.5, 0); legR.position.set(1, 3.5, 0);
  g.add(body, head, legL, legR);
  return g;
}

function spawnBot(id) {
  const diff = diffCfg[ui.setDifficulty.value];
  const mesh = createCharacter(0xe85a52);
  scene.add(mesh);
  return {
    id, mesh,
    pos: new THREE.Vector3((Math.random()-0.5)*world.size*0.75, 0, (Math.random()-0.5)*world.size*0.75),
    hp: 100, armor: 35, alive: true,
    speed: diff.botSpeed + Math.random() * 3,
    shootCd: 0, dir: new THREE.Vector3(1,0,0), weapon: Math.random()<0.7 ? 'smg' : 'rifle'
  };
}

function spawnLoot(x, z, elite) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(5,5,5), new THREE.MeshStandardMaterial({ color: elite ? 0xffd44e : 0x8f6945, emissive: elite ? 0x3d2e00 : 0x000000 }));
  mesh.position.set(x, 2.5, z);
  scene.add(mesh);
  loots.push({ mesh, elite, opened: false });
}

function spawnVehicle(type, x, z) {
  const g = new THREE.Group();
  const color = type === 'buggy' ? 0xe8c751 : 0x6ca5e8;
  const body = new THREE.Mesh(new THREE.BoxGeometry(type === 'buggy' ? 12 : 16, 4.5, type === 'buggy' ? 8 : 10), new THREE.MeshStandardMaterial({ color, flatShading: true }));
  const top = new THREE.Mesh(new THREE.BoxGeometry(type === 'buggy' ? 8 : 10, 3, 6), new THREE.MeshStandardMaterial({ color: 0x263349, flatShading: true }));
  body.position.y = 3.5; top.position.y = 6.8;
  g.add(body, top);
  scene.add(g);
  vehicles.push({ type, mesh: g, pos: new THREE.Vector3(x,0,z), rot: 0, speed: 0, max: type === 'buggy' ? 50 : 36, acc: type === 'buggy' ? 42 : 28, turn: type === 'buggy' ? 1.8 : 1.2 });
}

function resetPlayer() {
  player = {
    pos: new THREE.Vector3(0,0,0), hp: 100, armor: 35, kills: 0, coins: 0,
    stamina: 100, medkits: 2, weapon: 'rifle',
    ammo: { rifle: weapons.rifle.mag, smg: weapons.smg.mag, sniper: weapons.sniper.mag },
    reserve: { rifle: weapons.rifle.reserve, smg: weapons.smg.reserve, sniper: weapons.sniper.reserve },
    cd: 0, reload: 0, velY: 0, dashCd: 0, inVehicle: null, speedScale: 1
  };
}

function startGame() {
  gameStarted = true; gameOver = false;
  ui.prestart.classList.add('hidden');
  ui.hud.classList.remove('hidden'); ui.controls.classList.remove('hidden'); ui.crosshair.classList.remove('hidden'); ui.killfeed.classList.remove('hidden');
  ui.overlay.classList.add('hidden');
  setupWorld();
  resetPlayer();
}

function onResize() {
  if (!renderer || !camera) return;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

function onMouseMove(e) {
  if (!gameStarted || document.pointerLockElement !== renderer.domElement) return;
  yaw -= e.movementX * 0.0021;
  pitch -= e.movementY * 0.002;
  pitch = Math.max(-1.2, Math.min(0.48, pitch));
}

function onKeyDown(e) {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (!gameStarted) return;
  if (k === 'r') doReload();
  if (k === '1') player.weapon = 'rifle';
  if (k === '2') player.weapon = 'smg';
  if (k === '3') player.weapon = 'sniper';
  if (k === 'f') tryInteract();
  if (k === 'e') useMedkit();
  if (k === 'q') dash();
}

function addFeed(text) {
  feed.unshift({ text, t: 4.5 }); if (feed.length > 6) feed.length = 6;
  ui.killfeed.innerHTML = feed.map((x) => `<div class="item">${x.text}</div>`).join('');
}

function tryInteract() {
  if (player.inVehicle) { player.inVehicle = null; return; }
  for (const v of vehicles) if (v.pos.distanceTo(player.pos) < 14) { player.inVehicle = v; addFeed(`Araca bindin: ${v.type}`); return; }
  for (const l of loots) {
    if (!l.opened && l.mesh.position.distanceTo(player.pos) < 14) {
      l.opened = true; scene.remove(l.mesh);
      const r = Math.random();
      if (r < 0.25) { player.medkits++; addFeed('+1 medkit'); }
      else if (r < 0.5) { player.hp = Math.min(100, player.hp + (l.elite ? 40 : 20)); addFeed('HP yenilendi'); }
      else if (r < 0.75) { player.armor = Math.min(100, player.armor + (l.elite ? 45 : 25)); addFeed('Zırh arttı'); }
      else {
        player.reserve.rifle += l.elite ? 90 : 40; player.reserve.smg += l.elite ? 120 : 60; player.reserve.sniper += l.elite ? 18 : 6; player.coins += l.elite ? 14 : 4;
        addFeed('Mermi + coin');
      }
      return;
    }
  }
}

function useMedkit() { if (player.medkits > 0 && player.hp < 95) { player.medkits--; player.hp = Math.min(100, player.hp + 45); addFeed('Medkit kullanıldı'); } }
function dash() {
  if (player.inVehicle || player.dashCd > 0 || player.stamina < 20) return;
  tempV.set(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(34);
  player.pos.add(tempV); player.stamina -= 20; player.dashCd = 3.8;
}
function doReload() {
  if (player.reload > 0) return;
  const gun = weapons[player.weapon];
  const need = gun.mag - player.ammo[player.weapon];
  if (need <= 0 || player.reserve[player.weapon] <= 0) return;
  player.reload = player.weapon === 'sniper' ? 1.4 : 1.0;
}

function resolveReload(dt) {
  if (player.reload <= 0) return;
  player.reload -= dt;
  if (player.reload <= 0) {
    const gun = weapons[player.weapon], need = gun.mag - player.ammo[player.weapon], add = Math.min(need, player.reserve[player.weapon]);
    player.ammo[player.weapon] += add; player.reserve[player.weapon] -= add;
  }
}

function movePlayer(dt) {
  player.dashCd = Math.max(0, player.dashCd - dt);
  if (player.inVehicle) return moveVehicle(dt, player.inVehicle);

  const d = diffCfg[ui.setDifficulty.value];
  const base = d.botSpeed * 0.92; // kullanıcı-bot hız orantısı
  const sprint = keys.shift && player.stamina > 1;
  const speed = (sprint ? base * 1.45 : base) * player.speedScale;

  if (sprint && (keys.w || keys.a || keys.s || keys.d)) player.stamina = Math.max(0, player.stamina - 22 * dt);
  else player.stamina = Math.min(100, player.stamina + 15 * dt);

  tempV.set(0,0,0);
  const f = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const r = new THREE.Vector3(f.z, 0, -f.x);
  if (keys.w) tempV.add(f); if (keys.s) tempV.sub(f); if (keys.a) tempV.sub(r); if (keys.d) tempV.add(r);
  if (tempV.lengthSq() > 0) tempV.normalize().multiplyScalar(speed * dt);

  if (keys[' '] && player.pos.y <= 0.01) player.velY = 16;
  player.velY -= 34 * dt; player.pos.y += player.velY * dt;
  if (player.pos.y < 0) { player.pos.y = 0; player.velY = 0; }

  player.pos.add(tempV);
  clampToMap(player.pos, 8);
  pushFromObstacles(player.pos, 4.4);
}

function moveVehicle(dt, v) {
  const throttle = (keys.w ? 1 : 0) - (keys.s ? 0.7 : 0);
  const steer = (keys.a ? 1 : 0) - (keys.d ? 1 : 0);
  v.speed += throttle * v.acc * dt;
  v.speed *= 0.985;
  v.speed = Math.max(-v.max * 0.35, Math.min(v.max, v.speed));
  v.rot += steer * v.turn * dt * (Math.abs(v.speed) / (v.max || 1));
  v.pos.x += Math.sin(v.rot) * v.speed * dt;
  v.pos.z += Math.cos(v.rot) * v.speed * dt;
  clampToMap(v.pos, 10);
  v.mesh.position.set(v.pos.x, 0, v.pos.z);
  v.mesh.rotation.y = v.rot;
  player.pos.set(v.pos.x, 0, v.pos.z);
}

function fire(dt) {
  if (player.inVehicle) return;
  player.cd -= dt;
  if (!mouseDown || player.cd > 0 || player.reload > 0) return;
  const gun = weapons[player.weapon];
  if (player.ammo[player.weapon] <= 0) return;

  player.cd = gun.delay;
  player.ammo[player.weapon]--;

  const dir = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize();
  dir.x += (Math.random()-0.5) * gun.spread;
  dir.y += (Math.random()-0.5) * gun.spread;
  dir.z += (Math.random()-0.5) * gun.spread;
  dir.normalize();

  raycaster.set(camera.position, dir);
  const targets = bots.filter((b) => b.alive).map((b) => b.mesh);
  const hit = raycaster.intersectObjects(targets, true)[0];
  if (!hit) return;
  const bot = bots.find((b) => b.alive && (hit.object === b.mesh || b.mesh.children.includes(hit.object) || hit.object.parent === b.mesh));
  if (!bot) return;
  let dmg = gun.dmg;
  if (bot.armor > 0) {
    const absorb = Math.min(bot.armor, dmg * 0.45);
    bot.armor -= absorb; dmg -= absorb;
  }
  bot.hp -= dmg;
  if (bot.hp <= 0) {
    bot.alive = false; scene.remove(bot.mesh); player.kills++; player.coins += 5;
    spawnLoot(bot.pos.x, bot.pos.z, Math.random() < 0.25);
    addFeed(`Bot #${bot.id} elendi`);
  }
}

function botLogic(dt) {
  const dcfg = diffCfg[ui.setDifficulty.value];
  for (const b of bots) {
    if (!b.alive) continue;
    const toP = player.pos.clone().sub(b.pos); const dist = toP.length(); toP.y = 0;
    // hepsi kullanıcıya geliyor
    if (dist > 0.5) b.dir.copy(toP.normalize());
    b.pos.addScaledVector(b.dir, b.speed * dt);
    clampToMap(b.pos, 7); pushFromObstacles(b.pos, 4.2);

    b.mesh.position.set(b.pos.x, 0, b.pos.z);
    b.mesh.lookAt(player.pos.x, 0, player.pos.z);

    b.shootCd -= dt;
    if (dist < dcfg.botAggro && b.shootCd <= 0) {
      b.shootCd = weapons[b.weapon].delay + Math.random() * 0.25;
      let dmg = weapons[b.weapon].dmg * dcfg.botDmg;
      if (player.inVehicle) dmg *= 0.5;
      if (player.armor > 0) {
        const absorb = Math.min(player.armor, dmg * 0.5); player.armor -= absorb; dmg -= absorb;
      }
      player.hp -= dmg * 0.08; // frame-smooth
    }

    if (b.pos.distanceTo(world.zoneCenter) > world.zoneRadius) b.hp -= 4.8 * dt;
    if (b.hp <= 0) {
      b.alive = false; scene.remove(b.mesh); player.kills++; player.coins += 4;
      spawnLoot(b.pos.x, b.pos.z, Math.random() < 0.2);
    }
  }
}

function updateZone(dt) {
  world.time += dt; world.nextShrink -= dt;
  if (world.nextShrink <= 0 && world.zoneRadius > 180) {
    world.phase++; world.nextShrink = 20; world.zoneRadius -= world.size * 0.05;
    world.zoneCenter.x = THREE.MathUtils.clamp(world.zoneCenter.x + (Math.random()-0.5)*200, -world.size*0.18, world.size*0.18);
    world.zoneCenter.z = THREE.MathUtils.clamp(world.zoneCenter.z + (Math.random()-0.5)*200, -world.size*0.18, world.size*0.18);
    addFeed(`Zone daraldı (Faz ${world.phase})`);
  }
  if (player.pos.distanceTo(world.zoneCenter) > world.zoneRadius) player.hp -= 7 * dt;

  zoneMesh.position.set(world.zoneCenter.x, 0.3, world.zoneCenter.z);
  zoneMesh.scale.set(world.zoneRadius, world.zoneRadius, 1);
}

function updateVehicles(dt) {
  for (const v of vehicles) {
    if (player.inVehicle === v) continue;
    v.speed *= 0.97;
    v.pos.x += Math.sin(v.rot) * v.speed * dt;
    v.pos.z += Math.cos(v.rot) * v.speed * dt;
    v.mesh.position.set(v.pos.x, 0, v.pos.z);
  }
}

function updateCamera() {
  const back = player.inVehicle ? 32 : 18;
  const h = player.inVehicle ? 15 : 11;
  const camPos = new THREE.Vector3(player.pos.x - Math.sin(yaw) * back, player.pos.y + h, player.pos.z - Math.cos(yaw) * back);
  camera.position.lerp(camPos, 0.24);
  camera.lookAt(player.pos.x + Math.sin(yaw) * 18, player.pos.y + 7 + Math.sin(pitch) * 8, player.pos.z + Math.cos(yaw) * 18);
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
  hud.vehicle.textContent = player.inVehicle ? player.inVehicle.type : 'Yaya';
}

function updateFeed(dt) {
  let dirty = false;
  for (const f of feed) { f.t -= dt; if (f.t <= 0) dirty = true; }
  if (dirty) { feed = feed.filter((x) => x.t > 0); ui.killfeed.innerHTML = feed.map((x) => `<div class="item">${x.text}</div>`).join(''); }
}

function endGame(win) {
  gameOver = true;
  ui.overlay.classList.remove('hidden');
  ui.overlayTitle.textContent = win ? 'KAZANDIN' : 'ELENDİN';
  ui.overlayText.textContent = win ? `Mükemmel! ${player.kills} kill / ${player.coins} coin` : `Skor: ${player.kills} kill / ${player.coins} coin`;
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock ? clock.getDelta() : 0.016, 0.033);

  if (gameStarted && !gameOver) {
    resolveReload(dt);
    movePlayer(dt);
    fire(dt);
    botLogic(dt);
    updateVehicles(dt);
    updateZone(dt);
    updateCamera();
    updateHud();
    updateFeed(dt);

    if (player.hp <= 0) endGame(false);
    if (bots.filter((b) => b.alive).length === 0) endGame(true);
  }

  if (renderer && scene && camera) renderer.render(scene, camera);
}

function clampToMap(pos, pad) {
  const m = world.size * 0.49;
  pos.x = Math.max(-m + pad, Math.min(m - pad, pos.x));
  pos.z = Math.max(-m + pad, Math.min(m - pad, pos.z));
}

function pushFromObstacles(pos, radius) {
  for (const o of obstacles) {
    const dx = pos.x - o.mesh.position.x;
    const dz = pos.z - o.mesh.position.z;
    const d2 = dx * dx + dz * dz;
    const r = radius + o.r;
    if (d2 > 0.0001 && d2 < r * r) {
      const d = Math.sqrt(d2);
      const push = (r - d) + 0.2;
      pos.x += (dx / d) * push;
      pos.z += (dz / d) * push;
    }
  }
}

initRenderer();
