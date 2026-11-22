const canvas = document.querySelector('#game-canvas');
const ctx = canvas.getContext('2d');
const foods = [
  { id: 'berry', name: 'Berries', emoji: '🍓', key: '1', color: '#e87d72' },
  { id: 'carrot', name: 'Carrot', emoji: '🥕', key: '2', color: '#edaa59' },
  { id: 'fish', name: 'Fish', emoji: '🐟', key: '3', color: '#79a9c2' },
  { id: 'apple', name: 'Apple', emoji: '🍎', key: '4', color: '#8ab879' },
];
const animals = [
  { id: 'bunny', name: 'Pip', emoji: '🐰', food: 'berry', x: .64, y: .53, size: 63, color: '#f5e9d8', discovered: false, happy: false, mood: 0 },
  { id: 'fox', name: 'Maple', emoji: '🦊', food: 'carrot', x: .83, y: .69, size: 69, color: '#f4a36f', discovered: false, happy: false, mood: 0 },
  { id: 'turtle', name: 'Moss', emoji: '🐢', food: 'fish', x: .47, y: .73, size: 67, color: '#82ae70', discovered: false, happy: false, mood: 0 },
];
let selectedFood = 'berry';
let coins = 120;
let deliveries = 0;
let throws = 0;
let streak = 0;
let mission = 0;
let rank = 1;
let aim = null;
let isAiming = false;
let projectile = null;
let particles = [];
let lastTime = 0;
let soundOn = true;
let audioContext = null;
let toastTimer;
let feedbackTimer;
let dimensions = { width: 0, height: 0, scale: 1 };
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const snackTray = document.querySelector('#snack-options');
foods.forEach((food, index) => {
  const button = document.createElement('button');
  button.className = `snack-card${food.id === selectedFood ? ' selected' : ''}`;
  button.type = 'button';
  button.setAttribute('aria-pressed', String(food.id === selectedFood));
  button.setAttribute('aria-label', `Choose ${food.name} snack, key ${index + 1}`);
  button.innerHTML = `<span class="snack-hotkey">${food.key}</span><span class="snack-emoji">${food.emoji}</span><span class="snack-label">${food.name}</span>`;
  button.addEventListener('click', () => selectFood(food.id));
  snackTray.append(button);
});

function foodById(id) { return foods.find(food => food.id === id); }
function selectFood(id) {
  selectedFood = id;
  document.querySelectorAll('.snack-card').forEach((button, index) => {
    const active = foods[index].id === id;
    button.classList.toggle('selected', active);
    button.setAttribute('aria-pressed', String(active));
  });
  hideTip();
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  dimensions = { width: rect.width, height: rect.height, scale: Math.min(rect.width / 1000, rect.height / 600) };
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
new ResizeObserver(resizeCanvas).observe(canvas);
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function coordsFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}
canvas.addEventListener('pointerdown', event => {
  if (event.button !== undefined && event.button !== 0) return;
  aim = coordsFromEvent(event);
  isAiming = true;
  canvas.setPointerCapture?.(event.pointerId);
  event.preventDefault();
});
canvas.addEventListener('pointermove', event => {
  if (isAiming) aim = coordsFromEvent(event);
});
canvas.addEventListener('pointerup', event => {
  if (!isAiming) return;
  const point = coordsFromEvent(event);
  isAiming = false;
  aim = point;
  launch(point);
});
canvas.addEventListener('pointercancel', () => { isAiming = false; aim = null; });
window.addEventListener('keydown', event => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
  const index = Number(event.key) - 1;
  if (index >= 0 && index < foods.length) selectFood(foods[index].id);
  if (event.code === 'Space' && aim) { event.preventDefault(); launch(aim); }
  if (event.key === 'Escape') closeModal();
});

function launch(target) {
  if (!target || projectile) return;
  hideTip();
  throws += 1;
  document.querySelector('#throw-count').textContent = throws;
  const { width, height } = dimensions;
  const source = { x: width * .74, y: height * .9 };
  const destination = { x: target.x, y: target.y };
  projectile = { from: source, to: destination, food: selectedFood, elapsed: 0, duration: Math.max(.43, Math.min(.82, Math.hypot(destination.x - source.x, destination.y - source.y) / 760)) };
  aim = target;
  playTone(420, .055, 'triangle');
}

function nearestAnimal(point) {
  const { width, height, scale } = dimensions;
  let nearest = null;
  let nearestDistance = Infinity;
  animals.forEach(animal => {
    const position = animalPosition(animal, width, height, scale);
    const distance = Math.hypot(point.x - position.x, point.y - position.y);
    const radius = animal.size * scale * .8 + 14;
    if (distance < radius && distance < nearestDistance) { nearest = animal; nearestDistance = distance; }
  });
  return nearest;
}
function animalPosition(animal, width, height, scale) {
  const artW = 1000 * scale;
  const artH = 600 * scale;
  const offsetX = (width - artW) / 2;
  const offsetY = (height - artH) / 2;
  return { x: animal.x * width, y: animal.y * height, offsetX, offsetY, artW, artH };
}

function resolveThrow() {
  if (!projectile) return;
  const landing = projectile.to;
  const target = nearestAnimal(landing);
  const food = foodById(projectile.food);
  if (!target) {
    streak = 0;
    showFeedback('Almost! Aim for a friend ✨', landing.x, landing.y, false);
    showToast('Try landing your snack a little closer!');
    playTone(190, .12, 'sine');
    return;
  }
  if (target.food !== food.id) {
    streak = 0;
    target.mood = -.45;
    showFeedback(`Hmm… ${target.name} wants ${foodById(target.food).name.toLowerCase()}!`, landing.x, landing.y - 22, false);
    showToast(`${target.name}'s favorite is ${foodById(target.food).name.toLowerCase()} ${foodById(target.food).emoji}`);
    burst(landing.x, landing.y, '#fff0b8', 5);
    playTone(220, .16, 'sine');
    return;
  }
  if (target.happy) {
    coins += 3;
    streak += 1;
    target.mood = 1;
    showFeedback(`A little extra for ${target.name}!`, landing.x, landing.y - 20, true);
    showToast(`You made ${target.name}'s day again! +3 coins`);
    burst(landing.x, landing.y, '#f8dc85', 8);
    playTone(660, .12, 'sine');
    refreshHud();
    return;
  }
  target.happy = true;
  target.discovered = true;
  target.mood = 1;
  deliveries += 1;
  mission += 1;
  streak += 1;
  const reward = 18 + Math.min(streak - 1, 5) * 2;
  coins += reward;
  showFeedback(`${target.name} loves it! +${reward} ✦`, landing.x, landing.y - 21, true);
  showToast(`${target.name} is your new friend! +${reward} coins`);
  burst(landing.x, landing.y, '#ffe49a', 13);
  burst(landing.x, landing.y, '#d7f0bc', 8);
  playHappySound();
  if (deliveries % 5 === 0) {
    rank += 1;
    coins += 35;
    showToast(`RANK UP! You're a Meadow Keeper — +35 coins`);
  }
  if (mission >= 5) {
    mission = 0;
    coins += 80;
    showToast('MISSION COMPLETE! Picnic bonus +80 coins');
  }
  if (animals.every(animal => animal.happy)) {
    animals.forEach(animal => { animal.happy = false; animal.food = foods[Math.floor(Math.random() * foods.length)].id; });
    showToast('The meadow friends are hungry again! New favorites to discover.');
  }
  refreshHud();
}

function refreshHud() {
  document.querySelector('#coin-count').textContent = coins;
  document.querySelector('#level-count').textContent = String(rank).padStart(2, '0');
  document.querySelector('#mission-count').textContent = `${mission} / 5`;
  document.querySelector('#mission-progress').style.width = `${mission / 5 * 100}%`;
  document.querySelector('#combo-count').textContent = streak;
  document.querySelector('#combo-badge').classList.toggle('active', streak >= 2);
  const discovered = animals.filter(animal => animal.discovered).length;
  document.querySelector('#journal-copy').textContent = discovered === 3 ? 'You met all 3 meadow friends!' : `${discovered} of 3 meadow friends met`;
  const requests = document.querySelector('#request-list');
  requests.innerHTML = '';
  animals.forEach(animal => {
    const food = foodById(animal.food);
    const card = document.createElement('div');
    card.className = `request-card${animal.happy ? ' happy' : ''}`;
    card.innerHTML = `<span class="animal-avatar" aria-hidden="true">${animal.emoji}</span><span class="request-info"><span class="request-name">${animal.name}</span><span class="request-wants">${animal.happy ? 'Feeling loved!' : `Wants <b>${food.emoji} ${food.name}</b>`}</span></span><span class="request-status" aria-label="${animal.happy ? 'Happy' : 'Hungry'}">${animal.happy ? '♥' : '♡'}</span>`;
    requests.append(card);
  });
}
refreshHud();

function showFeedback(text, x, y, positive) {
  const feedback = document.querySelector('#feedback');
  const area = canvas.getBoundingClientRect();
  const host = canvas.parentElement.getBoundingClientRect();
  feedback.textContent = text;
  feedback.style.left = `${Math.max(20, Math.min(host.width - 20, x + area.left - host.left))}px`;
  feedback.style.top = `${Math.max(72, Math.min(host.height - 60, y + area.top - host.top - 32))}px`;
  feedback.style.color = positive ? '#fffde9' : '#fff4e8';
  feedback.classList.remove('show');
  void feedback.offsetWidth;
  feedback.classList.add('show');
  clearTimeout(feedbackTimer);
  feedbackTimer = setTimeout(() => feedback.classList.remove('show'), 1250);
}
function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}
function hideTip() {
  document.querySelector('#scene-tip').classList.add('faded');
  document.querySelector('#aim-hint').classList.add('hidden');
}
function burst(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 28 + Math.random() * 105;
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 36, life: .55 + Math.random() * .45, maxLife: .9, color, size: 2 + Math.random() * 3, icon: Math.random() < .28 ? '♥' : '✦' });
  }
}
function ensureAudio() {
  if (!soundOn) return null;
  try { audioContext ||= new (window.AudioContext || window.webkitAudioContext)(); if (audioContext.state === 'suspended') audioContext.resume(); return audioContext; } catch { return null; }
}
function playTone(frequency, duration, type) {
  const audio = ensureAudio();
  if (!audio) return;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(.055, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
  oscillator.connect(gain); gain.connect(audio.destination);
  oscillator.start(); oscillator.stop(audio.currentTime + duration);
}
function playHappySound() {
  playTone(523, .14, 'sine');
  setTimeout(() => playTone(659, .14, 'sine'), 80);
  setTimeout(() => playTone(784, .2, 'sine'), 160);
}
document.querySelector('#sound-toggle').addEventListener('click', event => {
  soundOn = !soundOn;
  event.currentTarget.innerHTML = `${soundOn ? '♫' : '♪'} <span>Sound ${soundOn ? 'on' : 'off'}</span>`;
  if (soundOn) playTone(520, .08, 'sine');
});
document.querySelector('#mission-button').addEventListener('click', openModal);
document.querySelector('#modal-close').addEventListener('click', closeModal);
document.querySelector('#got-it').addEventListener('click', closeModal);
document.querySelector('#modal-backdrop').addEventListener('click', event => { if (event.target.id === 'modal-backdrop') closeModal(); });
function openModal() { document.querySelector('#modal-backdrop').hidden = false; }
function closeModal() { document.querySelector('#modal-backdrop').hidden = true; }

function drawBackground(time) {
  const { width: w, height: h, scale } = dimensions;
  if (!w || !h) return;
  const artW = 1000 * scale, artH = 600 * scale;
  const ox = (w - artW) / 2, oy = (h - artH) / 2;
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);
  const sky = ctx.createLinearGradient(0, 0, 0, 600);
  sky.addColorStop(0, '#b8e4ba'); sky.addColorStop(.58, '#d6edb1'); sky.addColorStop(1, '#a7ce8c');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, 1000, 600);
  // Distant hills and warm morning haze.
  ctx.fillStyle = '#c9e6a5'; ctx.beginPath(); ctx.moveTo(0, 320); ctx.bezierCurveTo(140, 230, 240, 278, 335, 318); ctx.bezierCurveTo(470, 240, 590, 258, 710, 316); ctx.bezierCurveTo(825, 237, 925, 256, 1000, 292); ctx.lineTo(1000, 600); ctx.lineTo(0, 600); ctx.fill();
  ctx.fillStyle = '#a8d38c'; ctx.beginPath(); ctx.moveTo(0, 372); ctx.bezierCurveTo(190, 280, 300, 360, 420, 356); ctx.bezierCurveTo(590, 335, 680, 278, 825, 332); ctx.bezierCurveTo(900, 363, 950, 362, 1000, 335); ctx.lineTo(1000, 600); ctx.lineTo(0, 600); ctx.fill();
  const ground = ctx.createLinearGradient(0, 330, 0, 600);
  ground.addColorStop(0, '#a8d184'); ground.addColorStop(.45, '#a0c97a'); ground.addColorStop(1, '#91bd70');
  ctx.fillStyle = ground; ctx.fillRect(0, 365, 1000, 235);
  // Soft meadow path.
  ctx.fillStyle = '#d8d492'; ctx.beginPath(); ctx.moveTo(0, 560); ctx.bezierCurveTo(215, 478, 270, 438, 462, 435); ctx.bezierCurveTo(631, 431, 691, 493, 1000, 500); ctx.lineTo(1000, 600); ctx.lineTo(0, 600); ctx.fill();
  ctx.fillStyle = '#e6dda2'; ctx.beginPath(); ctx.moveTo(0, 570); ctx.bezierCurveTo(229, 498, 283, 463, 472, 457); ctx.bezierCurveTo(620, 454, 735, 509, 1000, 518); ctx.lineTo(1000, 600); ctx.lineTo(0, 600); ctx.fill();
  // Sunlit cloud puffs.
  ctx.globalAlpha = .52;
  [[430,93,29],[465,89,38],[500,96,26],[735,134,18],[758,129,24],[782,138,17]].forEach(([x,y,r]) => { ctx.fillStyle = '#faffdc'; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); });
  ctx.globalAlpha = 1;
  // Distant trees and shrubs.
  drawTree(105, 345, .7, '#80b77b', '#a8c987'); drawTree(254, 335, .5, '#89bb79', '#bad494');
  drawTree(911, 341, .65, '#76a96e', '#9fc481'); drawTree(805, 325, .43, '#8cbd7d', '#bdd896');
  drawBush(360, 379, .8); drawBush(704, 372, .7); drawBush(950, 402, .8); drawBush(66, 414, .55);
  // Meadow flowers / grass details.
  const flowers = [[75,495,'#f8e9ae'],[169,422,'#f4f3d0'],[334,526,'#e9b9a2'],[420,388,'#fff0c1'],[585,534,'#f8e9ae'],[692,427,'#f7efe0'],[887,477,'#f0c0a3'],[958,540,'#fff1c8'],[291,403,'#fff0bf'],[748,558,'#e9f1c4']];
  flowers.forEach(([x,y,color], i) => { const sway = Math.sin(time * .0014 + i) * 2; ctx.strokeStyle = '#719c61'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x,y+8); ctx.lineTo(x+sway,y); ctx.stroke(); ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x+sway,y,4,0,Math.PI*2); ctx.fill(); ctx.fillStyle = '#eccb74'; ctx.beginPath(); ctx.arc(x+sway,y,1.5,0,Math.PI*2); ctx.fill(); });
  drawPlayer(750, 523, time);
  animals.forEach(animal => drawAnimal(animal, time));
  ctx.restore();
  // Flight, aim guides and sparkles use viewport pixels rather than scene units.
  drawAim();
  drawProjectile();
  drawParticles(time);
}

function drawTree(x,y,s,leaf,light) {
  ctx.save(); ctx.translate(x,y); ctx.scale(s,s);
  ctx.fillStyle = '#72945e'; ctx.beginPath(); ctx.ellipse(0,7,30,7,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#997d58'; ctx.fillRect(-5,-35,10,42);
  [[0,-51,24],[ -17,-38,17],[16,-37,18],[0,-25,19]].forEach(([cx,cy,r],i)=>{ctx.fillStyle=i%2?light:leaf;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();});
  ctx.restore();
}
function drawBush(x,y,s) {
  ctx.save(); ctx.translate(x,y); ctx.scale(s,s);
  ctx.fillStyle='#779f67'; ctx.beginPath(); ctx.ellipse(0,8,35,8,0,0,Math.PI*2); ctx.fill();
  [[-20,-4,16],[0,-12,21],[21,-5,17]].forEach(([cx,cy,r],i)=>{ctx.fillStyle=['#7eaf71','#92bf79','#73a469'][i];ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();});
  ctx.restore();
}

function drawAnimal(animal, time) {
  const { width, height, scale } = dimensions;
  const position = animalPosition(animal, width, height, scale);
  const x = (position.x - position.offsetX) / scale;
  const y = (position.y - position.offsetY) / scale;
  const bob = Math.sin(time * .002 + animal.mood * 2 + x) * 3;
  const size = animal.size;
  ctx.save(); ctx.translate(x, y + bob);
  ctx.fillStyle = '#57794b35'; ctx.beginPath(); ctx.ellipse(0, size * .5, size * .66, size * .18, 0, 0, Math.PI * 2); ctx.fill();
  // Soft illustrated character medallion behind each friend.
  ctx.fillStyle = animal.color; ctx.beginPath(); ctx.arc(0, 0, size * .56, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#fff8df'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, size * .56 - 2, 0, Math.PI * 2); ctx.stroke();
  ctx.font = `${size * .82}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(animal.emoji, 0, 4);
  // Name plaque.
  const plaqueW = animal.name.length * 9 + 24;
  ctx.fillStyle = '#fffdf1'; roundedRect(ctx, -plaqueW / 2, size * .48, plaqueW, 24, 12); ctx.fill();
  ctx.fillStyle = '#476b4e'; ctx.font = '700 12px "DM Sans",sans-serif'; ctx.textBaseline = 'middle'; ctx.fillText(animal.name, 0, size * .48 + 12);
  // Favorite snack bubble floats over each animal.
  const bubbleY = -size * .63 + Math.sin(time * .0018 + x) * 2;
  ctx.fillStyle = '#fffdf5'; ctx.beginPath(); ctx.arc(size * .45, bubbleY, 20, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#f6edce'; ctx.lineWidth = 2; ctx.stroke();
  ctx.font = '20px "Apple Color Emoji","Segoe UI Emoji",sans-serif'; ctx.fillText(foodById(animal.food).emoji, size * .45, bubbleY + 1);
  if (animal.happy) {
    ctx.fillStyle = '#f6bd63'; ctx.font = '700 17px sans-serif'; ctx.fillText('♥', -size * .42, -size * .55 + Math.sin(time * .004) * 3);
  }
  ctx.restore();
}

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath(); context.roundRect(x, y, width, height, radius);
}
function drawPlayer(x, y, time) {
  ctx.save(); ctx.translate(x, y + Math.sin(time * .003) * 1.5);
  ctx.fillStyle='#546f4730'; ctx.beginPath(); ctx.ellipse(0,24,24,8,0,0,Math.PI*2); ctx.fill();
  // Tiny explorer backpack and waving arm, the player's toss origin.
  ctx.fillStyle='#cc8154'; roundedRect(ctx,-19,-10,38,31,11); ctx.fill();
  ctx.fillStyle='#709562'; ctx.beginPath(); ctx.arc(0,-17,15,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#f0c5a1'; ctx.beginPath(); ctx.arc(2,-17,9,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#e2b18a'; ctx.lineWidth=5; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(14,-4); ctx.quadraticCurveTo(26,-15,21,-24); ctx.stroke();
  ctx.fillStyle='#fff4c9'; ctx.font='700 9px "DM Sans",sans-serif'; ctx.textAlign='center'; ctx.fillText('YOU',0,36);
  ctx.restore();
}

function drawAim() {
  if (!isAiming || !aim || projectile) return;
  const target = nearestAnimal(aim);
  ctx.save();
  ctx.strokeStyle = target ? '#fff9dfc9' : '#fff9df99';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.moveTo(dimensions.width * .74, dimensions.height * .9);
  ctx.quadraticCurveTo((dimensions.width * .74 + aim.x) / 2, aim.y - 65, aim.x, aim.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(aim.x, aim.y, target ? 25 : 17, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = target ? '#fff9df' : '#fff9dfbb';
  ctx.beginPath(); ctx.arc(aim.x, aim.y, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawProjectile() {
  if (!projectile) return;
  const t = Math.min(1, projectile.elapsed / projectile.duration);
  const x = projectile.from.x + (projectile.to.x - projectile.from.x) * t;
  const y = projectile.from.y + (projectile.to.y - projectile.from.y) * t - Math.sin(t * Math.PI) * Math.min(100, 44 + Math.abs(projectile.to.y - projectile.from.y) * .18);
  ctx.save();
  ctx.fillStyle = '#44552a30'; ctx.beginPath(); ctx.ellipse(x + 5, y + 14, 11 * (1 - t * .24), 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.font = `${25 * (1 - t * .1)}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(foodById(projectile.food).emoji, x, y);
  ctx.restore();
}
function drawParticles() {
  particles.forEach(particle => {
    const opacity = Math.max(0, particle.life / particle.maxLife);
    ctx.save(); ctx.globalAlpha = opacity; ctx.fillStyle = particle.color;
    if (particle.icon === '♥') {
      ctx.font = `${particle.size * 5}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('♥', particle.x, particle.y);
    } else {
      ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  });
}
function update(delta) {
  animals.forEach(animal => { animal.mood *= Math.pow(.001, delta); });
  if (projectile) {
    projectile.elapsed += delta;
    if (projectile.elapsed >= projectile.duration) { resolveThrow(); projectile = null; }
  }
  particles = particles.filter(particle => particle.life > 0);
  particles.forEach(particle => { particle.x += particle.vx * delta; particle.y += particle.vy * delta; particle.vy += 120 * delta; particle.life -= delta; });
}
function frame(time) {
  const delta = Math.min(.04, (time - lastTime) / 1000 || 0);
  lastTime = time;
  if (!reducedMotion) update(delta);
  drawBackground(time);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
