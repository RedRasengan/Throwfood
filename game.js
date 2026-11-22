(() => {
  'use strict';

  const canvas = document.querySelector('#game-canvas');
  const ctx = canvas.getContext('2d');

  const FOODS = [
    { id: 'berry', name: 'Berries', emoji: '🍓', key: '1' },
    { id: 'carrot', name: 'Carrot', emoji: '🥕', key: '2' },
    { id: 'fish', name: 'Fish', emoji: '🐟', key: '3' },
    { id: 'apple', name: 'Apple', emoji: '🍎', key: '4' },
  ];

  const SPECIES = [
    { id: 'bunny', name: 'Pip', emoji: '🐰', food: 'berry', tip: 2, rarity: 'common', color: '#f3e8d5' },
    { id: 'fox', name: 'Maple', emoji: '🦊', food: 'carrot', tip: 4, rarity: 'common', color: '#f3b184' },
    { id: 'turtle', name: 'Moss', emoji: '🐢', food: 'fish', tip: 3, rarity: 'common', color: '#a9c997' },
    { id: 'duck', name: 'Puddle', emoji: '🦆', food: 'fish', tip: 2, rarity: 'common', color: '#f2df8f' },
    { id: 'pig', name: 'Truffle', emoji: '🐷', food: 'apple', tip: 4, rarity: 'uncommon', color: '#f1c2b4' },
    { id: 'squirrel', name: 'Acorn', emoji: '🐿️', food: 'berry', tip: 3, rarity: 'uncommon', color: '#d5a575' },
    { id: 'hedgehog', name: 'Bramble', emoji: '🦔', food: 'carrot', tip: 3, rarity: 'uncommon', color: '#cdb69c' },
    { id: 'deer', name: 'Clover', emoji: '🦌', food: 'apple', tip: 6, rarity: 'rare', color: '#d9b58d' },
    { id: 'frog', name: 'Lily', emoji: '🐸', food: 'fish', tip: 3, rarity: 'rare', color: '#b7d88a' },
    { id: 'goat', name: 'Pepper', emoji: '🐐', food: 'carrot', tip: 5, rarity: 'rare', color: '#e7dfc9' },
    { id: 'panda', name: 'Mochi', emoji: '🐼', food: 'apple', tip: 9, rarity: 'epic', color: '#e9e7df' },
  ];

  const UPGRADES = [
    { id: 'sneakers', name: 'Trail Sneakers', icon: '👟', max: 5, base: 45, desc: 'Move 12% faster per level.' },
    { id: 'satchel', name: 'Snack Satchel', icon: '🎒', max: 5, base: 55, desc: 'Throw snacks 45px farther per level.' },
    { id: 'gloves', name: 'Sticky Gloves', icon: '🧤', max: 5, base: 60, desc: 'A wider catch radius for each throw.' },
    { id: 'charm', name: 'Friend Charm', icon: '💛', max: 5, base: 75, desc: '+20% coins from crew tips per level.' },
    { id: 'bell', name: 'Lucky Bell', icon: '🔔', max: 3, base: 140, desc: 'Chance to double a tip payout.' },
  ];

  const QUEST_TEMPLATES = [
    { type: 'tame', target: 3, text: 'Tame 3 meadow friends', reward: 60 },
    { type: 'tips', target: 60, text: 'Earn 60 coins in crew tips', reward: 70 },
    { type: 'tame', target: 4, text: 'Grow your crew by 4 friends', reward: 80 },
    { type: 'upgrade', target: 1, text: 'Buy 1 camp upgrade', reward: 50 },
    { type: 'tame', target: 6, text: 'Tame 6 more wild friends', reward: 110 },
    { type: 'tips', target: 150, text: 'Earn 150 coins in crew tips', reward: 120 },
  ];

  const WORLD = { width: 2400, height: 1600 };
  const POND = { x: 470, y: 1290, rx: 235, ry: 140 };
  const CAMP = { x: 600, y: 800, radius: 150 };
  const PLAYER_START = { x: 760, y: 930 };
  const MAX_WILD = 7;
  const RARITY_WEIGHT = { common: 42, uncommon: 22, rare: 10, epic: 4 };

  const els = {
    snackTray: document.querySelector('#snack-options'),
    coinCount: document.querySelector('#coin-count'),
    incomeCount: document.querySelector('#income-count'),
    rankCount: document.querySelector('#rank-count'),
    rankCopy: document.querySelector('#rank-copy'),
    xpCopy: document.querySelector('#xp-copy'),
    xpProgress: document.querySelector('#xp-progress'),
    crewCount: document.querySelector('#crew-count'),
    crewBadge: document.querySelector('#crew-badge'),
    crewList: document.querySelector('#crew-list'),
    wildCount: document.querySelector('#wild-count'),
    incomeRate: document.querySelector('#income-rate'),
    throwCount: document.querySelector('#throw-count'),
    nextUpgrade: document.querySelector('#next-upgrade'),
    questText: document.querySelector('#quest-text'),
    questProgress: document.querySelector('#quest-progress'),
    questReward: document.querySelector('#quest-reward'),
    feedback: document.querySelector('#feedback'),
    toast: document.querySelector('#toast'),
    throwTip: document.querySelector('#throw-tip'),
    aimHint: document.querySelector('#aim-hint'),
    interactionPrompt: document.querySelector('#interaction-prompt'),
    incomeCard: document.querySelector('.income-card'),
    shopGrid: document.querySelector('#shop-grid'),
    shopCoins: document.querySelector('#shop-coins'),
    guideGrid: document.querySelector('#guide-grid'),
    guideTotal: document.querySelector('#guide-total'),
    shopModal: document.querySelector('#shop-modal'),
    guideModal: document.querySelector('#guide-modal'),
    helpModal: document.querySelector('#help-modal'),
    joystick: document.querySelector('#joystick'),
    joystickKnob: document.querySelector('#joystick-knob'),
    soundToggle: document.querySelector('#sound-toggle'),
  };

  const view = { width: 0, height: 0, dpr: 1, zoom: 1 };
  const camera = { x: 0, y: 0 };
  const player = {
    x: PLAYER_START.x, y: PLAYER_START.y,
    dirX: 0, dirY: 1, walk: 0, moving: false,
  };
  const joystick = { active: false, x: 0, y: 0 };
  const aim = { active: false, held: false, x: 0, y: 0 };

  const game = {
    coins: 120,
    xp: 0,
    rank: 1,
    throws: 0,
    tipsEarned: 0,
    tipTimer: 0,
    cooldown: 0,
    shake: 0,
    selectedFood: 'berry',
    soundOn: true,
    modalOpen: false,
    nearCamp: false,
    questIndex: 0,
    quest: null,
    lastTime: 0,
    lastLaunch: null,
    lastThrow: null,
  };

  let wild = [];
  let crew = [];
  let particles = [];
  let floaters = [];
  let projectile = null;
  let trail = [];
  let toastTimer = 0;
  let feedbackTimer = 0;
  let nextAnimalId = 1;
  let audioContext = null;
  let hoverAnimal = null;

  const collection = Object.fromEntries(SPECIES.map(species => [species.id, { count: 0 }]));
  const levels = Object.fromEntries(UPGRADES.map(upgrade => [upgrade.id, 0]));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Small helpers ──────────────────────────────────────────────────
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const foodById = id => FOODS.find(food => food.id === id);
  const speciesById = id => SPECIES.find(species => species.id === id);
  const xpForRank = rank => 100 + (rank - 1) * 55;
  const upgradeCost = upgrade => Math.round(upgrade.base * (1 + levels[upgrade.id] * 0.8));
  const tipMultiplier = () => 1 + levels.charm * 0.2;
  const maxThrowRange = () => 360 + levels.satchel * 45;
  const hitRadius = () => 46 + levels.gloves * 8;
  const tipAmount = () => Math.round(crew.reduce((sum, friend) => sum + friend.species.tip, 0) * tipMultiplier());

  function inPond(x, y, padding = 1) {
    const nx = (x - POND.x) / POND.rx;
    const ny = (y - POND.y) / POND.ry;
    return nx * nx + ny * ny < padding * padding;
  }

  function visible(x, y, margin = 140) {
    return x > camera.x - margin && x < camera.x + view.width / view.zoom + margin &&
      y > camera.y - margin && y < camera.y + view.height / view.zoom + margin;
  }

  function screenToWorld(x, y) {
    return { x: x / view.zoom + camera.x, y: y / view.zoom + camera.y };
  }

  function nearestWild(point, radius = Infinity) {
    let nearest = null;
    let best = radius;
    wild.forEach(animal => {
      const gap = distance(point, animal);
      if (gap < best) { best = gap; nearest = animal; }
    });
    return nearest;
  }

  function nearestWildToScreen(x, y, radius = 70) {
    let nearest = null;
    let best = radius;
    wild.forEach(animal => {
      const sx = (animal.x - camera.x) * view.zoom;
      const sy = (animal.y - camera.y) * view.zoom;
      const gap = Math.hypot(sx - x, sy - y);
      if (gap < best) { best = gap; nearest = animal; }
    });
    return nearest;
  }

  function roundRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
  }

  function emojiFont(size) {
    return `${size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  }

  function hideTip() {
    els.throwTip.classList.add('faded');
    els.aimHint.classList.add('hidden');
  }

  // ── Resize / camera ────────────────────────────────────────────────
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    view.width = rect.width;
    view.height = rect.height;
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.zoom = clamp(Math.min(rect.width / 980, rect.height / 620), 0.62, 1.08);
    canvas.width = Math.round(rect.width * view.dpr);
    canvas.height = Math.round(rect.height * view.dpr);
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    clampCamera(true);
  }

  function clampCamera(immediate = false) {
    const halfW = view.width / (2 * view.zoom);
    const halfH = view.height / (2 * view.zoom);
    const targetX = clamp(player.x - halfW, 0, Math.max(0, WORLD.width - halfW * 2));
    const targetY = clamp(player.y - halfH, 0, Math.max(0, WORLD.height - halfH * 2));
    if (immediate) {
      camera.x = targetX;
      camera.y = targetY;
    } else {
      const amount = 1 - Math.pow(0.001, 1 / 60);
      camera.x += (targetX - camera.x) * amount;
      camera.y += (targetY - camera.y) * amount;
    }
  }

  new ResizeObserver(resizeCanvas).observe(canvas);
  window.addEventListener('resize', resizeCanvas);

  // ── Snack dock ─────────────────────────────────────────────────────
  function buildSnacks() {
    FOODS.forEach(food => {
      const button = document.createElement('button');
      button.className = `snack-card${food.id === game.selectedFood ? ' selected' : ''}`;
      button.type = 'button';
      button.dataset.food = food.id;
      button.setAttribute('aria-pressed', String(food.id === game.selectedFood));
      button.setAttribute('aria-label', `Choose ${food.name} snack, key ${food.key}`);
      button.innerHTML = `<span class="snack-hotkey">${food.key}</span><span class="snack-emoji">${food.emoji}</span><span class="snack-label">${food.name}</span>`;
      button.addEventListener('click', () => selectFood(food.id));
      els.snackTray.append(button);
    });
  }

  function selectFood(id) {
    game.selectedFood = id;
    document.querySelectorAll('.snack-card').forEach(button => {
      const active = button.dataset.food === id;
      button.classList.toggle('selected', active);
      button.setAttribute('aria-pressed', String(active));
    });
    hideTip();
    playTone(560, 0.04, 'triangle', 0.025);
  }

  // ── HUD ─────────────────────────────────────────────────────────────
  function renderHud() {
    const income = tipAmount();
    els.coinCount.textContent = game.coins;
    els.incomeCount.textContent = income;
    els.rankCount.textContent = game.rank;
    els.rankCopy.textContent = game.rank;
    els.xpCopy.textContent = `${game.xp} / ${xpForRank(game.rank)} XP`;
    els.xpProgress.style.width = `${Math.min(100, game.xp / xpForRank(game.rank) * 100)}%`;
    els.crewCount.textContent = crew.length;
    els.crewBadge.textContent = crew.length;
    els.wildCount.textContent = wild.length;
    els.incomeRate.textContent = income ? `${income} coins` : 'No tips yet';
    els.throwCount.textContent = game.throws;
    if (els.shopCoins) {
      els.shopCoins.textContent = game.coins;
      if (!els.shopModal.hidden) renderShop();
    }
    renderCrewList();
    renderNextUpgrade();
    renderQuest();
  }

  function renderCrewList() {
    if (!crew.length) {
      els.crewList.innerHTML = '<div class="crew-empty"><span>🌱</span><b>No friends yet</b><small>Match the snack in a wild friend’s thought bubble, then toss it over.</small></div>';
      return;
    }
    const counts = {};
    crew.forEach(friend => { counts[friend.species.id] = (counts[friend.species.id] || 0) + 1; });
    els.crewList.innerHTML = SPECIES
      .filter(species => counts[species.id])
      .sort((a, b) => b.tip - a.tip)
      .map(species => {
        const count = counts[species.id];
        const food = foodById(species.food);
        return `<div class="crew-row">
          <span class="crew-avatar" style="background:${species.color}99" aria-hidden="true">${species.emoji}</span>
          <span class="crew-copy"><b>${species.name}${count > 1 ? ` ×${count}` : ''}</b><small>${species.rarity} · loves ${food.emoji} ${food.name}</small></span>
          <span class="crew-tip">+${Math.round(species.tip * count * tipMultiplier())}/3s</span>
        </div>`;
      }).join('');
  }

  function renderNextUpgrade() {
    const next = UPGRADES
      .filter(upgrade => levels[upgrade.id] < upgrade.max)
      .sort((a, b) => upgradeCost(a) - upgradeCost(b))[0];
    if (!next) {
      els.nextUpgrade.innerHTML = '<span class="upgrade-label"><span>🏆</span> CAMP COMPLETE</span><b>Every upgrade maxed!</b><small>Your safari is legendary.</small>';
      return;
    }
    els.nextUpgrade.innerHTML = `<span class="upgrade-label"><span>${next.icon}</span> NEXT UPGRADE</span><b>${next.name} · Lv ${levels[next.id] + 1}</b><small>${next.desc} · ${upgradeCost(next)} coins</small>`;
  }

  function renderQuest() {
    const quest = game.quest;
    if (!quest) return;
    els.questText.textContent = quest.text;
    els.questProgress.style.width = `${Math.min(100, quest.progress / quest.target * 100)}%`;
    els.questReward.textContent = quest.completed ? 'Trail complete! Next trail coming up…' : `Reward +${quest.reward} coins`;
  }

  function setQuest(index) {
    const template = QUEST_TEMPLATES[index % QUEST_TEMPLATES.length];
    game.quest = { ...template, progress: 0, completed: false };
    renderQuest();
  }

  function questProgress(type, amount = 1) {
    const quest = game.quest;
    if (!quest || quest.completed || quest.type !== type) return;
    quest.progress = Math.min(quest.target, quest.progress + amount);
    if (quest.progress >= quest.target) {
      quest.completed = true;
      game.coins += quest.reward;
      showToast(`✦ Trail complete! +${quest.reward} coins`);
      playRankSound();
      renderHud();
      setTimeout(() => {
        game.questIndex += 1;
        setQuest(game.questIndex);
        renderHud();
      }, 1100);
    }
    renderQuest();
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2600);
  }

  function showFeedback(text, worldX, worldY, positive = true) {
    const host = canvas.parentElement.getBoundingClientRect();
    const sx = (worldX - camera.x) * view.zoom;
    const sy = (worldY - camera.y) * view.zoom;
    els.feedback.textContent = text;
    els.feedback.style.left = `${clamp(sx, 72, host.width - 72)}px`;
    els.feedback.style.top = `${clamp(sy, 70, host.height - 70)}px`;
    els.feedback.style.color = positive ? '#fffde9' : '#fff1df';
    els.feedback.classList.remove('show');
    void els.feedback.offsetWidth;
    els.feedback.classList.add('show');
    clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => els.feedback.classList.remove('show'), 1300);
  }

  // ── Sound ──────────────────────────────────────────────────────────
  function ensureAudio() {
    if (!game.soundOn) return null;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') audioContext.resume();
      return audioContext;
    } catch {
      return null;
    }
  }

  function playTone(frequency, duration, type = 'sine', volume = 0.045, delay = 0) {
    const audio = ensureAudio();
    if (!audio) return;
    const start = audio.currentTime + delay;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + duration);
  }

  function playTameSound() {
    playTone(523, 0.12, 'sine', 0.05);
    playTone(659, 0.12, 'sine', 0.045, 0.08);
    playTone(784, 0.18, 'sine', 0.04, 0.16);
  }

  function playTipSound(lucky = false) {
    playTone(lucky ? 880 : 720, 0.08, 'sine', 0.035);
    if (lucky) playTone(1100, 0.12, 'triangle', 0.03, 0.07);
  }

  function playRankSound() {
    playTone(392, 0.12, 'triangle', 0.04);
    playTone(523, 0.14, 'triangle', 0.04, 0.1);
    playTone(784, 0.24, 'sine', 0.035, 0.21);
  }

  function playPurchaseSound() {
    playTone(330, 0.08, 'triangle', 0.04);
    playTone(495, 0.12, 'sine', 0.035, 0.06);
  }

  // ── Modals ─────────────────────────────────────────────────────────
  function hideModals() {
    els.shopModal.hidden = true;
    els.guideModal.hidden = true;
    els.helpModal.hidden = true;
    game.modalOpen = false;
  }

  function openModal(name) {
    hideModals();
    if (name === 'shop') {
      renderShop();
      els.shopModal.hidden = false;
      document.querySelector('#shop-close').focus({ preventScroll: true });
    } else if (name === 'guide') {
      renderGuide();
      els.guideModal.hidden = false;
      document.querySelector('#guide-close').focus({ preventScroll: true });
    } else if (name === 'help') {
      els.helpModal.hidden = false;
      document.querySelector('#help-close').focus({ preventScroll: true });
    }
    game.modalOpen = true;
    keys.clear();
    joystick.active = false;
    joystick.x = 0;
    joystick.y = 0;
    els.joystickKnob.style.transform = 'translate(-50%, -50%)';
  }

  function renderShop() {
    els.shopCoins.textContent = game.coins;
    els.shopGrid.innerHTML = UPGRADES.map(upgrade => {
      const level = levels[upgrade.id];
      const maxed = level >= upgrade.max;
      const cost = upgradeCost(upgrade);
      const dots = Array.from({ length: upgrade.max }, (_, index) => `<i class="${index < level ? 'on' : ''}"></i>`).join('');
      return `<div class="upgrade-card${maxed ? ' maxed' : ''}">
        <span class="upgrade-icon" aria-hidden="true">${upgrade.icon}</span>
        <div class="upgrade-info">
          <div class="upgrade-title"><b>${upgrade.name}</b><span>${maxed ? 'MAX LEVEL' : `LV ${level} / ${upgrade.max}`}</span></div>
          <p>${upgrade.desc}</p>
          <div class="upgrade-levels" aria-hidden="true">${dots}</div>
          <button class="upgrade-buy" type="button" data-upgrade="${upgrade.id}" ${maxed || game.coins < cost ? 'disabled' : ''}>
            ${maxed ? '✓ Fully upgraded' : `Upgrade · ${cost} 🪙`}
          </button>
        </div>
      </div>`;
    }).join('');
    els.shopGrid.querySelectorAll('.upgrade-buy').forEach(button => {
      button.addEventListener('click', () => buyUpgrade(button.dataset.upgrade));
    });
  }

  function buyUpgrade(id) {
    const upgrade = UPGRADES.find(item => item.id === id);
    if (!upgrade) return;
    const level = levels[id];
    if (level >= upgrade.max) return;
    const cost = upgradeCost(upgrade);
    if (game.coins < cost) {
      showToast('Not enough coins yet—tame more friends to grow your tips!');
      playTone(190, 0.12, 'sine', 0.035);
      return;
    }
    game.coins -= cost;
    levels[id] += 1;
    playPurchaseSound();
    burst(player.x, player.y - 24, '#f6d782', 12);
    showFeedback(`${upgrade.icon} ${upgrade.name} Lv ${levels[id]}!`, player.x, player.y - 60, true);
    showToast(`${upgrade.name} upgraded! ${upgrade.desc}`);
    questProgress('upgrade', 1);
    renderHud();
  }

  function renderGuide() {
    const total = crew.length;
    els.guideTotal.textContent = total;
    els.guideGrid.innerHTML = SPECIES.map(species => {
      const count = collection[species.id].count;
      const food = foodById(species.food);
      const locked = count === 0;
      return `<div class="guide-animal${locked ? ' locked' : ''}">
        <span class="guide-avatar" aria-hidden="true">${locked ? '❔' : species.emoji}</span>
        <span class="guide-copy"><b>${locked ? 'Undiscovered' : species.name}</b><small>${locked ? 'Keep exploring the meadow' : `${species.rarity} · loves ${food.emoji} ${food.name}`}</small></span>
        <span class="guide-count${locked ? ' empty' : ''}">${locked ? '—' : `×${count}`}</span>
      </div>`;
    }).join('');
  }

  // ── Input ──────────────────────────────────────────────────────────
  const keys = new Set();

  function moveVector() {
    let x = 0;
    let y = 0;
    if (keys.has('a') || keys.has('arrowleft')) x -= 1;
    if (keys.has('d') || keys.has('arrowright')) x += 1;
    if (keys.has('w') || keys.has('arrowup')) y -= 1;
    if (keys.has('s') || keys.has('arrowdown')) y += 1;
    if (joystick.active) {
      x += joystick.x;
      y += joystick.y;
    }
    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    return { x, y, length: Math.min(1, length) };
  }

  function bindJoystick() {
    let pointerId = null;
    const updateKnob = event => {
      const rect = els.joystick.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = (event.clientX - cx) / (rect.width * 0.36);
      let dy = (event.clientY - cy) / (rect.height * 0.36);
      const length = Math.hypot(dx, dy);
      if (length > 1) {
        dx /= length;
        dy /= length;
      }
      joystick.x = dx;
      joystick.y = dy;
      joystick.active = true;
      els.joystickKnob.style.transform = `translate(calc(-50% + ${dx * 23}px), calc(-50% + ${dy * 23}px))`;
    };
    const release = () => {
      pointerId = null;
      joystick.active = false;
      joystick.x = 0;
      joystick.y = 0;
      els.joystickKnob.style.transform = 'translate(-50%, -50%)';
    };
    els.joystick.addEventListener('pointerdown', event => {
      if (game.modalOpen) return;
      pointerId = event.pointerId;
      els.joystick.setPointerCapture?.(event.pointerId);
      updateKnob(event);
      event.preventDefault();
    });
    els.joystick.addEventListener('pointermove', event => {
      if (event.pointerId === pointerId) updateKnob(event);
    });
    els.joystick.addEventListener('pointerup', release);
    els.joystick.addEventListener('pointercancel', release);
  }

  function bindEvents() {
    const canvasPoint = event => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    canvas.addEventListener('pointerdown', event => {
      if (game.modalOpen) return;
      const point = canvasPoint(event);
      aim.x = point.x;
      aim.y = point.y;
      aim.active = true;
      aim.held = true;
      canvas.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    canvas.addEventListener('pointermove', event => {
      if (game.modalOpen) return;
      if (event.pointerType === 'mouse' || event.buttons) {
        const point = canvasPoint(event);
        aim.x = point.x;
        aim.y = point.y;
        aim.active = true;
      }
    });
    canvas.addEventListener('pointerup', event => {
      if (game.modalOpen) return;
      const point = canvasPoint(event);
      aim.x = point.x;
      aim.y = point.y;
      aim.active = true;
      aim.held = false;
      launchAtAim();
    });
    canvas.addEventListener('pointercancel', () => {
      aim.held = false;
    });
    canvas.addEventListener('pointerleave', () => {
      if (!projectile) {
        aim.active = false;
        aim.held = false;
      }
    });

    window.addEventListener('keydown', event => {
      const key = event.key.toLowerCase();
      if (event.key === 'Escape') {
        hideModals();
        return;
      }
      if (game.modalOpen) return;
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
      if (key === ' ' || event.code === 'Space') {
        launchAtAim();
        return;
      }
      if (key === 'e') {
        if (game.nearCamp) openModal('shop');
        else showToast('Walk to the camp shop tent—or use the shop button up top.');
        return;
      }
      if (/^[1-4]$/.test(key)) {
        selectFood(FOODS[Number(key) - 1].id);
        return;
      }
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) keys.add(key);
    });
    window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
    window.addEventListener('blur', () => keys.clear());

    document.querySelector('#shop-button').addEventListener('click', () => openModal('shop'));
    document.querySelector('#side-shop').addEventListener('click', () => openModal('shop'));
    document.querySelector('#guide-button').addEventListener('click', () => openModal('guide'));
    document.querySelector('#side-guide').addEventListener('click', () => openModal('guide'));
    document.querySelector('#mission-button').addEventListener('click', () => openModal('help'));
    els.interactionPrompt.addEventListener('click', () => {
      if (game.nearCamp && !game.modalOpen) openModal('shop');
    });
    document.querySelector('#toss-button').addEventListener('click', () => launchAtAim());
    document.querySelector('#shop-close').addEventListener('click', hideModals);
    document.querySelector('#guide-close').addEventListener('click', hideModals);
    document.querySelector('#help-close').addEventListener('click', hideModals);
    document.querySelector('#help-start').addEventListener('click', hideModals);
    [els.shopModal, els.guideModal, els.helpModal].forEach(modal => {
      modal.addEventListener('click', event => { if (event.target === modal) hideModals(); });
    });

    els.soundToggle.addEventListener('click', () => {
      game.soundOn = !game.soundOn;
      els.soundToggle.textContent = game.soundOn ? '♫' : '♪';
      els.soundToggle.setAttribute('aria-pressed', String(game.soundOn));
      els.soundToggle.setAttribute('aria-label', `Sound ${game.soundOn ? 'on' : 'off'}`);
      if (game.soundOn) playTone(560, 0.08, 'sine', 0.04);
      showToast(`Sound ${game.soundOn ? 'on' : 'off'}`);
    });

    bindJoystick();
  }

  // ── Wild friends and taming ────────────────────────────────────────
  function pickSpecies() {
    const available = SPECIES.filter(species => wild.filter(animal => animal.species.id === species.id).length < 2);
    const pool = available.length ? available : SPECIES;
    const total = pool.reduce((sum, species) => sum + RARITY_WEIGHT[species.rarity], 0);
    let roll = Math.random() * total;
    for (const species of pool) {
      roll -= RARITY_WEIGHT[species.rarity];
      if (roll <= 0) return species;
    }
    return pool[0];
  }

  function randomWorldPoint(nearPlayer = false) {
    for (let attempt = 0; attempt < 160; attempt += 1) {
      const x = 150 + Math.random() * (WORLD.width - 300);
      const y = 210 + Math.random() * (WORLD.height - 390);
      if (inPond(x, y, 1.45)) continue;
      if (Math.hypot(x - CAMP.x, y - CAMP.y) < 235) continue;
      if (Math.hypot(x - player.x, y - player.y) < 170) continue;
      if (wild.some(animal => Math.hypot(x - animal.x, y - animal.y) < 105)) continue;
      if (nearPlayer && Math.hypot(x - player.x, y - player.y) > 500) continue;
      return { x, y };
    }
    return { x: clamp(player.x + 280, 180, WORLD.width - 180), y: clamp(player.y + 150, 220, WORLD.height - 180) };
  }

  function spawnWild(nearPlayer = false) {
    if (wild.length >= MAX_WILD) return;
    const species = pickSpecies();
    const point = randomWorldPoint(nearPlayer);
    addWild(species, point);
  }

  function addWild(species, point) {
    wild.push({
      id: `wild-${nextAnimalId++}`,
      species,
      x: point.x,
      y: point.y,
      home: { ...point },
      target: { ...point },
      wander: 0.4 + Math.random() * 2.5,
      angry: 0,
      bob: Math.random() * Math.PI * 2,
      facing: Math.random() < 0.5 ? -1 : 1,
      hop: 0,
    });
  }

  function spawnWildAt(speciesId, x, y) {
    if (wild.length >= MAX_WILD) return;
    addWild(speciesById(speciesId), { x, y });
  }

  function addXp(amount) {
    game.xp += amount;
    while (game.xp >= xpForRank(game.rank)) {
      game.xp -= xpForRank(game.rank);
      game.rank += 1;
      game.coins += 35;
      showToast(`🏅 RANK UP! You reached rank ${game.rank}. +35 coins`);
      playRankSound();
    }
  }

  function tameAnimal(animal) {
    const species = animal.species;
    wild = wild.filter(item => item.id !== animal.id);
    collection[species.id].count += 1;
    crew.push({
      id: `crew-${nextAnimalId++}`,
      species,
      x: animal.x,
      y: animal.y,
      bob: Math.random() * Math.PI * 2,
      facing: 1,
    });
    const reward = 12 + species.tip * 3;
    game.coins += reward;
    addXp(20 + species.tip * 3);
    questProgress('tame', 1);
    game.shake = 7;
    burst(animal.x, animal.y - 20, '#ffe39a', 16);
    burst(animal.x, animal.y - 20, '#dff0b9', 10);
    showFeedback(`${species.name} joined your crew! +${reward} coins`, animal.x, animal.y - 55, true);
    showToast(`${species.emoji} ${species.name} joined! They will leave ${species.tip} coins in tips every 3 seconds.`);
    playTameSound();
    renderHud();
    setTimeout(() => spawnWild(), 1500);
  }

  function payout() {
    const base = crew.reduce((sum, friend) => sum + friend.species.tip, 0);
    if (!base) return;
    let amount = Math.round(base * tipMultiplier() * (1 + (game.rank - 1) * 0.02));
    const lucky = Math.random() < levels.bell * 0.07;
    if (lucky) amount *= 2;
    game.coins += amount;
    game.tipsEarned += amount;
    questProgress('tips', amount);
    showFeedback(`+${amount} coins from your crew${lucky ? ' · LUCKY!' : ''}`, player.x, player.y - 64, true);
    burst(player.x, player.y - 35, lucky ? '#ffd56d' : '#f4d383', lucky ? 18 : 10);
    playTipSound(lucky);
    els.incomeCard.classList.remove('payout');
    void els.incomeCard.offsetWidth;
    els.incomeCard.classList.add('payout');
    renderHud();
  }

  // ── Throwing ───────────────────────────────────────────────────────
  function resolveAim() {
    const range = maxThrowRange();
    if (aim.active) {
      const pointed = nearestWildToScreen(aim.x, aim.y, 72);
      const raw = pointed ? { x: pointed.x, y: pointed.y } : screenToWorld(aim.x, aim.y);
      const gap = distance(player, raw);
      const point = gap > range
        ? { x: player.x + (raw.x - player.x) / gap * range, y: player.y + (raw.y - player.y) / gap * range }
        : raw;
      return { point, animal: pointed, tooFar: Boolean(pointed && gap > range) };
    }
    const close = nearestWild(player, range + 30);
    if (close) return { point: { x: close.x, y: close.y }, animal: close, tooFar: false };
    return {
      point: { x: player.x + player.dirX * 170, y: player.y + player.dirY * 170 },
      animal: null,
      tooFar: false,
    };
  }

  function launchAtAim() {
    if (game.modalOpen || projectile || game.cooldown > 0) return;
    const target = resolveAim();
    if (target.tooFar) {
      showToast('That friend is too far away—move a little closer!');
      showFeedback('Move closer!', player.x, player.y - 54, false);
      playTone(190, 0.1, 'sine', 0.03);
      return;
    }
    launch(target.point);
  }

  function launch(point) {
    if (projectile || game.cooldown > 0) return;
    hideTip();
    game.throws += 1;
    game.cooldown = 0.32;
    const direction = { x: point.x - player.x, y: point.y - player.y };
    const length = Math.hypot(direction.x, direction.y) || 1;
    const source = { x: player.x + direction.x / length * 18, y: player.y - 12 + direction.y / length * 8 };
    projectile = {
      from: source,
      to: { x: point.x, y: point.y },
      food: game.selectedFood,
      elapsed: 0,
      duration: clamp(Math.hypot(point.x - source.x, point.y - source.y) / 690, 0.34, 0.78),
      arc: 55 + Math.min(105, Math.hypot(point.x - source.x, point.y - source.y) * 0.14),
    };
    game.lastLaunch = { x: Math.round(point.x), y: Math.round(point.y), food: game.selectedFood };
    aim.active = false;
    playTone(420, 0.055, 'triangle', 0.04);
    renderHud();
  }

  function resolveThrow() {
    if (!projectile) return;
    const landing = projectile.to;
    const target = nearestWild(landing, hitRadius());
    const food = foodById(projectile.food);
    burst(landing.x, landing.y, '#efe0a6', 6);
    if (!target) {
      game.lastThrow = { result: 'miss', landing, food: food.id };
      showFeedback('Almost! Aim at a hungry friend ✨', landing.x, landing.y - 16, false);
      showToast('Try landing the snack closer to a wild friend.');
      playTone(200, 0.11, 'sine', 0.03);
      return;
    }
    if (target.species.food !== food.id) {
      target.angry = 1.35;
      game.lastThrow = { result: 'wrong', target: target.species.name, targetFood: target.species.food, landing, food: food.id };
      const favorite = foodById(target.species.food);
      showFeedback(`${target.species.name} wants ${favorite.name.toLowerCase()}!`, landing.x, landing.y - 30, false);
      showToast(`${target.species.emoji} ${target.species.name}'s favorite is ${favorite.emoji} ${favorite.name.toLowerCase()}.`);
      burst(landing.x, landing.y, '#ffd6a0', 5);
      playTone(220, 0.16, 'sine', 0.035);
      return;
    }
    game.lastThrow = { result: 'tame', target: target.species.name, landing, food: food.id };
    tameAnimal(target);
  }

  // ── Update loop ────────────────────────────────────────────────────
  function updatePlayer(dt) {
    const move = moveVector();
    const speed = 195 * (1 + levels.sneakers * 0.12);
    player.moving = move.length > 0.08;
    if (player.moving) {
      player.x += move.x * speed * dt;
      player.y += move.y * speed * dt;
      player.walk += dt * (8 + move.length * 3);
      if (Math.abs(move.x) > 0.08) player.dirX = move.x;
      if (Math.abs(move.y) > 0.08) player.dirY = move.y;
    }
    player.x = clamp(player.x, 90, WORLD.width - 90);
    player.y = clamp(player.y, 170, WORLD.height - 80);
    if (inPond(player.x, player.y, 1.06)) {
      const nx = (player.x - POND.x) / POND.rx;
      const ny = (player.y - POND.y) / POND.ry;
      const angle = Math.atan2(ny, nx);
      player.x = POND.x + Math.cos(angle) * POND.rx * 1.07;
      player.y = POND.y + Math.sin(angle) * POND.ry * 1.07;
    }
    game.nearCamp = Math.hypot(player.x - CAMP.x, player.y - CAMP.y) < CAMP.radius;
    els.interactionPrompt.hidden = !game.nearCamp || game.modalOpen;
    if (game.nearCamp) els.aimHint.classList.add('hidden');

    const lastTrail = trail[0];
    if (!lastTrail || Math.hypot(player.x - lastTrail.x, player.y - lastTrail.y) > 4) {
      trail.unshift({ x: player.x, y: player.y });
      if (trail.length > 260) trail.pop();
    }
  }

  function updateWild(dt, time) {
    wild.forEach(animal => {
      animal.bob += dt * (1.5 + animal.species.tip * 0.08);
      if (animal.angry > 0) {
        animal.angry -= dt;
        const dx = animal.x - player.x;
        const dy = animal.y - player.y;
        const length = Math.hypot(dx, dy) || 1;
        animal.x += dx / length * 105 * dt;
        animal.y += dy / length * 105 * dt;
        animal.hop += dt * 12;
      } else {
        animal.wander -= dt;
        if (animal.wander <= 0) {
          const radius = 95 + Math.random() * 85;
          const angle = Math.random() * Math.PI * 2;
          animal.target = {
            x: clamp(animal.home.x + Math.cos(angle) * radius, 120, WORLD.width - 120),
            y: clamp(animal.home.y + Math.sin(angle) * radius, 200, WORLD.height - 110),
          };
          animal.wander = 1.8 + Math.random() * 3.4;
        }
        const dx = animal.target.x - animal.x;
        const dy = animal.target.y - animal.y;
        const length = Math.hypot(dx, dy);
        if (length > 5) {
          animal.x += dx / length * 22 * dt;
          animal.y += dy / length * 22 * dt;
          animal.facing = dx < 0 ? -1 : 1;
          animal.hop += dt * 6.5;
        }
      }
      if (inPond(animal.x, animal.y, 1.18)) {
        animal.x = animal.home.x;
        animal.y = animal.home.y;
        animal.target = { ...animal.home };
      }
      animal.x = clamp(animal.x, 110, WORLD.width - 110);
      animal.y = clamp(animal.y, 190, WORLD.height - 100);
    });

    for (let i = 0; i < wild.length; i += 1) {
      for (let j = i + 1; j < wild.length; j += 1) {
        const a = wild[i];
        const b = wild[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const gap = Math.hypot(dx, dy);
        const minGap = 76;
        if (gap > 0.01 && gap < minGap) {
          const push = (minGap - gap) / gap * 0.5;
          a.x -= dx * push;
          a.y -= dy * push;
          b.x += dx * push;
          b.y += dy * push;
        }
      }
    }
    wild.forEach(animal => {
      animal.x = clamp(animal.x, 110, WORLD.width - 110);
      animal.y = clamp(animal.y, 190, WORLD.height - 100);
      if (inPond(animal.x, animal.y, 1.18)) {
        animal.x = animal.home.x;
        animal.y = animal.home.y;
      }
    });
  }

  function updateCrew(dt, time) {
    crew.forEach((friend, index) => {
      friend.bob += dt * (2 + friend.species.tip * 0.05);
      let target;
      const gapToPlayer = distance(friend, player);
      if (!player.moving && gapToPlayer < 230) {
        const side = index % 2 === 0 ? -1 : 1;
        const row = Math.floor(index / 2);
        target = {
          x: player.x + side * (54 + row * 26),
          y: player.y + 20 + row * 13 + Math.sin(time * 0.0016 + index) * 2.5,
        };
      } else {
        const trailIndex = Math.min(trail.length - 1, (index + 1) * 8);
        target = trail[trailIndex] || player;
      }
      const dx = target.x - friend.x;
      const dy = target.y - friend.y;
      const length = Math.hypot(dx, dy);
      if (length > 4) {
        const speed = 180 + Math.min(150, length * 1.4);
        friend.x += dx / length * speed * dt;
        friend.y += dy / length * speed * dt;
        friend.facing = dx < 0 ? -1 : 1;
      }
      const separation = distance(friend, player);
      if (separation > 0.01 && separation < 38) {
        const push = (38 - separation) / separation;
        friend.x += (friend.x - player.x) * push;
        friend.y += (friend.y - player.y) * push;
      }
      if (gapToPlayer > 620) {
        friend.x = player.x + (Math.random() - 0.5) * 80;
        friend.y = player.y + 45 + Math.random() * 50;
      }
      if (inPond(friend.x, friend.y, 1.08)) {
        friend.x = player.x;
        friend.y = player.y + 45;
      }
    });
  }

  function updateParticles(dt) {
    particles = particles.filter(particle => particle.life > 0);
    particles.forEach(particle => {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 135 * dt;
      particle.life -= dt;
    });
    floaters = floaters.filter(floater => floater.life > 0);
    floaters.forEach(floater => {
      floater.y -= 34 * dt;
      floater.life -= dt;
    });
  }

  function update(dt, time) {
    game.cooldown = Math.max(0, game.cooldown - dt);
    game.shake = Math.max(0, game.shake - dt * 24);
    if (!game.modalOpen) updatePlayer(dt);
    else player.moving = false;
    updateWild(dt, time);
    updateCrew(dt, time);
    updateParticles(dt);
    if (projectile) {
      projectile.elapsed += dt;
      if (projectile.elapsed >= projectile.duration) {
        resolveThrow();
        projectile = null;
      }
    }
    clampCamera();
  }

  function burst(x, y, color, count) {
    const amount = reducedMotion ? Math.ceil(count * 0.4) : count;
    for (let index = 0; index < amount; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 110;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        life: 0.6 + Math.random() * 0.5,
        maxLife: 1.1,
        color,
        size: 2 + Math.random() * 3,
        icon: Math.random() < 0.3 ? '♥' : (Math.random() < 0.25 ? '✦' : ''),
      });
    }
  }

  // ── World decoration ───────────────────────────────────────────────
  let seed = 1937;
  function seeded() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  function makeDecor() {
    const tufts = [];
    const flowers = [];
    const trees = [];
    const bushes = [];
    const rocks = [];
    const butterflies = [];
    const patches = [];
    const flowerColors = ['#fff1b8', '#f7e6a0', '#f2c7b8', '#fff9dc', '#eab7ae'];

    for (let index = 0; index < 320; index += 1) {
      const x = 50 + seeded() * (WORLD.width - 100);
      const y = 170 + seeded() * (WORLD.height - 220);
      if (inPond(x, y, 1.25) || Math.hypot(x - CAMP.x, y - CAMP.y) < 175) continue;
      tufts.push({ x, y, s: 0.55 + seeded() * 0.8, tone: seeded() < 0.45 ? '#7fac69' : '#b3d18d' });
    }
    for (let index = 0; index < 115; index += 1) {
      const x = 70 + seeded() * (WORLD.width - 140);
      const y = 200 + seeded() * (WORLD.height - 260);
      if (inPond(x, y, 1.32) || Math.hypot(x - CAMP.x, y - CAMP.y) < 195) continue;
      flowers.push({ x, y, s: 0.7 + seeded() * 0.8, color: flowerColors[Math.floor(seeded() * flowerColors.length)] });
    }
    for (let index = 0; index < 30; index += 1) {
      const side = Math.floor(seeded() * 4);
      let x;
      let y;
      if (side === 0) { x = 40 + seeded() * (WORLD.width - 80); y = 55 + seeded() * 100; }
      else if (side === 1) { x = 40 + seeded() * (WORLD.width - 80); y = WORLD.height - 170 + seeded() * 100; }
      else if (side === 2) { x = 40 + seeded() * 110; y = 140 + seeded() * (WORLD.height - 280); }
      else { x = WORLD.width - 150 + seeded() * 100; y = 140 + seeded() * (WORLD.height - 280); }
      trees.push({ x, y, s: 0.8 + seeded() * 0.7, tone: seeded() < 0.5 ? '#5f9665' : '#6ba36b' });
    }
    [
      { x: 1330, y: 485, s: 1.1 }, { x: 1740, y: 700, s: 0.92 },
      { x: 2040, y: 1190, s: 1.18 }, { x: 1140, y: 1380, s: 0.85 },
      { x: 920, y: 380, s: 0.78 }, { x: 2180, y: 320, s: 1.0 },
    ].forEach(tree => trees.push({ ...tree, tone: '#659a66' }));

    for (let index = 0; index < 22; index += 1) {
      const x = 100 + seeded() * (WORLD.width - 200);
      const y = 220 + seeded() * (WORLD.height - 320);
      if (inPond(x, y, 1.4) || Math.hypot(x - CAMP.x, y - CAMP.y) < 220) continue;
      bushes.push({ x, y, s: 0.6 + seeded() * 0.75 });
    }
    for (let index = 0; index < 30; index += 1) {
      const x = 90 + seeded() * (WORLD.width - 180);
      const y = 240 + seeded() * (WORLD.height - 330);
      if (inPond(x, y, 1.28) || Math.hypot(x - CAMP.x, y - CAMP.y) < 180) continue;
      rocks.push({ x, y, s: 0.55 + seeded() * 0.9 });
    }
    for (let index = 0; index < 11; index += 1) {
      butterflies.push({
        x: 120 + seeded() * (WORLD.width - 240),
        y: 240 + seeded() * (WORLD.height - 360),
        phase: seeded() * Math.PI * 2,
        tone: seeded() < 0.5 ? '#f6d078' : '#f3e9c7',
      });
    }
    for (let index = 0; index < 18; index += 1) {
      patches.push({
        x: 80 + seeded() * (WORLD.width - 160),
        y: 190 + seeded() * (WORLD.height - 280),
        rx: 90 + seeded() * 150,
        ry: 40 + seeded() * 80,
        tone: seeded() < 0.5 ? 'rgba(195, 222, 154, .2)' : 'rgba(126, 173, 100, .12)',
      });
    }
    return { tufts, flowers, trees, bushes, rocks, butterflies, patches };
  }

  const decor = makeDecor();

  function drawTree(tree) {
    ctx.save();
    ctx.translate(tree.x, tree.y);
    ctx.scale(tree.s, tree.s);
    ctx.fillStyle = 'rgba(65, 91, 52, .16)';
    ctx.beginPath();
    ctx.ellipse(8, 14, 42, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8c6e4d';
    ctx.beginPath();
    ctx.roundRect(-6, -33, 12, 44, 4);
    ctx.fill();
    ctx.fillStyle = tree.tone;
    [[-20, -38, 22], [18, -40, 24], [0, -57, 27], [0, -30, 23]].forEach(([x, y, radius], index) => {
      ctx.fillStyle = index % 2 ? tree.tone : '#7cae70';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = 'rgba(255, 249, 197, .2)';
    ctx.beginPath();
    ctx.arc(-8, -63, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBush(bush) {
    ctx.save();
    ctx.translate(bush.x, bush.y);
    ctx.scale(bush.s, bush.s);
    ctx.fillStyle = 'rgba(65, 91, 52, .13)';
    ctx.beginPath();
    ctx.ellipse(0, 7, 35, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    [[-18, -3, 16], [0, -12, 20], [19, -4, 15]].forEach(([x, y, radius], index) => {
      ctx.fillStyle = ['#75a36a', '#88b675', '#6c9b63'][index];
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawGroundDetails() {
    decor.patches.forEach(patch => {
      if (!visible(patch.x, patch.y, 180)) return;
      ctx.fillStyle = patch.tone;
      ctx.beginPath();
      ctx.ellipse(patch.x, patch.y, patch.rx, patch.ry, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.lineCap = 'round';
    ctx.strokeStyle = '#d9cf8c';
    ctx.lineWidth = 156;
    ctx.beginPath();
    ctx.moveTo(-50, 1060);
    ctx.bezierCurveTo(330, 900, 540, 905, 790, 950);
    ctx.bezierCurveTo(1040, 995, 1250, 1060, 1490, 1000);
    ctx.stroke();
    ctx.strokeStyle = '#e8dda0';
    ctx.lineWidth = 122;
    ctx.stroke();

    ctx.strokeStyle = '#d6cc8b';
    ctx.lineWidth = 112;
    ctx.beginPath();
    ctx.moveTo(340, 720);
    ctx.bezierCurveTo(430, 875, 550, 1015, 570, 1240);
    ctx.stroke();
    ctx.strokeStyle = '#e6dca0';
    ctx.lineWidth = 84;
    ctx.stroke();

    decor.tufts.forEach(tuft => {
      if (!visible(tuft.x, tuft.y, 40)) return;
      ctx.strokeStyle = tuft.tone;
      ctx.lineWidth = 1.6 * tuft.s;
      ctx.beginPath();
      ctx.moveTo(tuft.x, tuft.y);
      ctx.quadraticCurveTo(tuft.x - 3 * tuft.s, tuft.y - 7 * tuft.s, tuft.x - 5 * tuft.s, tuft.y - 10 * tuft.s);
      ctx.moveTo(tuft.x + 1, tuft.y);
      ctx.quadraticCurveTo(tuft.x + 2 * tuft.s, tuft.y - 8 * tuft.s, tuft.x + 6 * tuft.s, tuft.y - 11 * tuft.s);
      ctx.stroke();
    });

    decor.flowers.forEach(flower => {
      if (!visible(flower.x, flower.y, 40)) return;
      ctx.strokeStyle = '#6e9b61';
      ctx.lineWidth = 1.7 * flower.s;
      ctx.beginPath();
      ctx.moveTo(flower.x, flower.y + 6 * flower.s);
      ctx.lineTo(flower.x, flower.y - 3 * flower.s);
      ctx.stroke();
      ctx.fillStyle = flower.color;
      ctx.beginPath();
      ctx.arc(flower.x, flower.y - 5 * flower.s, 3.2 * flower.s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e4b85e';
      ctx.beginPath();
      ctx.arc(flower.x, flower.y - 5 * flower.s, 1.1 * flower.s, 0, Math.PI * 2);
      ctx.fill();
    });

    decor.rocks.forEach(rock => {
      if (!visible(rock.x, rock.y, 50)) return;
      ctx.fillStyle = 'rgba(75, 92, 63, .14)';
      ctx.beginPath();
      ctx.ellipse(rock.x + 2, rock.y + 3, 12 * rock.s, 5 * rock.s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b7b99f';
      ctx.beginPath();
      ctx.ellipse(rock.x, rock.y, 10 * rock.s, 6 * rock.s, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#cfd0b7';
      ctx.beginPath();
      ctx.ellipse(rock.x - 2, rock.y - 2, 5 * rock.s, 2.7 * rock.s, -0.2, 0, Math.PI * 2);
      ctx.fill();
    });

    decor.bushes.forEach(bush => { if (visible(bush.x, bush.y, 80)) drawBush(bush); });
    decor.trees.forEach(tree => { if (visible(tree.x, tree.y, 110)) drawTree(tree); });

    decor.butterflies.forEach(butterfly => {
      if (!visible(butterfly.x, butterfly.y, 70)) return;
      const x = butterfly.x + Math.sin(performance.now() * 0.0006 + butterfly.phase) * 24;
      const y = butterfly.y + Math.cos(performance.now() * 0.0008 + butterfly.phase) * 15;
      const flap = Math.sin(performance.now() * 0.012 + butterfly.phase);
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = butterfly.tone;
      ctx.beginPath();
      ctx.ellipse(-4, 0, 4, 2.8 * Math.abs(flap), -0.35, 0, Math.PI * 2);
      ctx.ellipse(4, 0, 4, 2.8 * Math.abs(flap), 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawPond(time) {
    if (!visible(POND.x, POND.y, 300)) return;
    ctx.fillStyle = '#d8d093';
    ctx.beginPath();
    ctx.ellipse(POND.x, POND.y + 7, POND.rx + 18, POND.ry + 15, 0, 0, Math.PI * 2);
    ctx.fill();
    const water = ctx.createRadialGradient(POND.x - 55, POND.y - 40, 20, POND.x, POND.y, POND.rx);
    water.addColorStop(0, '#a8d9cf');
    water.addColorStop(0.55, '#7fc1b8');
    water.addColorStop(1, '#5da7a4');
    ctx.fillStyle = water;
    ctx.beginPath();
    ctx.ellipse(POND.x, POND.y, POND.rx, POND.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 253, 222, .3)';
    ctx.lineWidth = 2;
    for (let index = 0; index < 3; index += 1) {
      const wobble = Math.sin(time * 0.001 + index) * 5;
      ctx.beginPath();
      ctx.ellipse(POND.x - 40 + index * 48, POND.y - 20 + index * 24, 42 + wobble, 12, -0.1, 0, Math.PI * 2);
      ctx.stroke();
    }
    [[-105, 30, 17], [80, 48, 20], [25, -55, 15], [-42, -8, 12]].forEach(([x, y, radius]) => {
      ctx.fillStyle = '#74ad68';
      ctx.beginPath();
      ctx.ellipse(POND.x + x, POND.y + y, radius, radius * 0.55, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f3d8c7';
      ctx.beginPath();
      ctx.arc(POND.x + x + radius * 0.25, POND.y + y - 1, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.strokeStyle = '#7da866';
    ctx.lineWidth = 3;
    [[-205, -80], [-190, -35], [196, -45], [214, 30]].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.moveTo(POND.x + x, POND.y + y + 32);
      ctx.quadraticCurveTo(POND.x + x - 6, POND.y + y, POND.x + x + 3, POND.y + y - 24);
      ctx.stroke();
    });
  }

  function drawCamp(time) {
    if (!visible(CAMP.x, CAMP.y, 260)) return;
    const near = game.nearCamp && !game.modalOpen;
    ctx.save();
    ctx.translate(CAMP.x, CAMP.y);
    if (near) {
      const glow = ctx.createRadialGradient(0, 0, 20, 0, 0, 185);
      glow.addColorStop(0, 'rgba(255, 240, 167, .18)');
      glow.addColorStop(1, 'rgba(255, 240, 167, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 185, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(62, 83, 50, .17)';
    ctx.beginPath();
    ctx.ellipse(0, 63, 145, 31, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tent
    ctx.fillStyle = '#d77f64';
    ctx.beginPath();
    ctx.moveTo(-104, 54);
    ctx.lineTo(-12, -72);
    ctx.lineTo(78, 54);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#efae82';
    ctx.beginPath();
    ctx.moveTo(-12, -72);
    ctx.lineTo(34, 54);
    ctx.lineTo(78, 54);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#7f5b43';
    ctx.beginPath();
    ctx.moveTo(-27, 54);
    ctx.lineTo(-8, 4);
    ctx.lineTo(15, 54);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fff0c8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-104, 54);
    ctx.lineTo(-12, -72);
    ctx.lineTo(78, 54);
    ctx.stroke();
    ctx.strokeStyle = '#d9a16e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-12, -72);
    ctx.lineTo(-12, 54);
    ctx.stroke();

    // Sign
    ctx.fillStyle = '#8b6a49';
    ctx.fillRect(105, -7, 8, 72);
    ctx.fillStyle = '#f4e6bd';
    roundRect(64, -31, 96, 44, 10);
    ctx.fill();
    ctx.strokeStyle = '#b99662';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#5a704f';
    ctx.font = '700 10px "DM Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CAMP SHOP', 112, -16);
    ctx.font = emojiFont(13);
    ctx.fillStyle = '#000';
    ctx.fillText('🪙', 112, 0);

    // Campfire
    ctx.fillStyle = '#73573e';
    ctx.beginPath();
    ctx.ellipse(132, 76, 28, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6f5139';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(116, 84);
    ctx.lineTo(148, 70);
    ctx.moveTo(116, 70);
    ctx.lineTo(148, 84);
    ctx.stroke();
    const flame = 11 + Math.sin(time * 0.009) * 3;
    ctx.fillStyle = '#f6aa4c';
    ctx.beginPath();
    ctx.moveTo(132, 53);
    ctx.quadraticCurveTo(146, 67, 132, 77);
    ctx.quadraticCurveTo(118, 67, 132, 53);
    ctx.fill();
    ctx.fillStyle = '#ffe69b';
    ctx.beginPath();
    ctx.moveTo(132, 63);
    ctx.quadraticCurveTo(138 + flame * 0.2, 70, 132, 76);
    ctx.quadraticCurveTo(126, 70, 132, 63);
    ctx.fill();

    // Crates and little garden fence
    ctx.fillStyle = '#b28758';
    ctx.fillRect(-148, 26, 34, 28);
    ctx.fillRect(-143, 17, 25, 13);
    ctx.strokeStyle = '#916b43';
    ctx.lineWidth = 2;
    ctx.strokeRect(-148, 26, 34, 28);
    ctx.beginPath();
    ctx.moveTo(-148, 40);
    ctx.lineTo(-114, 40);
    ctx.stroke();
    ctx.strokeStyle = '#f0dfb8';
    ctx.lineWidth = 3;
    for (let index = 0; index < 4; index += 1) {
      ctx.beginPath();
      ctx.moveTo(-175 + index * 20, 75);
      ctx.lineTo(-175 + index * 20, 58);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-175, 66);
    ctx.lineTo(-115, 66);
    ctx.stroke();
    ctx.restore();
  }

  function drawPicnic() {
    const x = 1000;
    const y = 1035;
    if (!visible(x, y, 130)) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.06);
    ctx.fillStyle = 'rgba(64, 84, 50, .13)';
    ctx.beginPath();
    ctx.ellipse(2, 9, 63, 27, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f6edce';
    roundRect(-60, -38, 120, 76, 8);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-60, -38, 120, 76, 8);
    ctx.clip();
    ctx.fillStyle = '#e9a18d';
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 6; col += 1) {
        if ((row + col) % 2 === 0) ctx.fillRect(-60 + col * 20, -38 + row * 19, 20, 19);
      }
    }
    ctx.restore();
    ctx.fillStyle = '#b98855';
    roundRect(18, -18, 30, 25, 5);
    ctx.fill();
    ctx.strokeStyle = '#8d6742';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(33, -18, 12, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#f5d27f';
    ctx.beginPath();
    ctx.arc(-24, 5, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e68472';
    ctx.beginPath();
    ctx.arc(-24, 5, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Characters ─────────────────────────────────────────────────────
  function drawWildAnimal(animal, time) {
    if (!visible(animal.x, animal.y, 90)) return;
    const bob = Math.sin(time * 0.0022 + animal.bob) * 2.2 + (animal.angry > 0 ? Math.sin(time * 0.04) * 2 : 0);
    const x = animal.x;
    const y = animal.y + bob;
    const species = animal.species;
    const size = species.rarity === 'epic' ? 34 : species.rarity === 'rare' ? 31 : 29;
    const favorite = foodById(species.food);
    const matching = species.food === game.selectedFood;

    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(54, 79, 48, .18)';
    ctx.beginPath();
    ctx.ellipse(0, size * 0.88, size * 0.9, size * 0.27, 0, 0, Math.PI * 2);
    ctx.fill();

    if (animal.angry > 0) {
      ctx.strokeStyle = 'rgba(224, 117, 92, .75)';
      ctx.lineWidth = 3;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, size + 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = species.color;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff8df';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, size - 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, .18)';
    ctx.beginPath();
    ctx.arc(-size * 0.28, -size * 0.3, size * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = emojiFont(size * 1.32);
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(species.emoji, 0, 3);

    const plaqueWidth = Math.max(43, species.name.length * 7.3 + 19);
    ctx.fillStyle = 'rgba(255, 253, 240, .9)';
    roundRect(-plaqueWidth / 2, size + 5, plaqueWidth, 19, 9);
    ctx.fill();
    ctx.fillStyle = animal.angry > 0 ? '#b76b58' : '#496950';
    ctx.font = '700 10px "DM Sans", sans-serif';
    ctx.fillText(species.name, 0, size + 15);

    const bubbleY = -size - 26 + Math.sin(time * 0.002 + animal.bob) * 2;
    ctx.shadowColor = 'rgba(45, 63, 40, .15)';
    ctx.shadowBlur = 9;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = animal.angry > 0 ? '#fbe1d5' : '#fffdf2';
    roundRect(-20, bubbleY - 17, 40, 34, 12);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = animal.angry > 0 ? '#e6a28b' : (matching ? '#9cc183' : '#f0e5c6');
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-5, bubbleY + 16);
    ctx.lineTo(0, bubbleY + 22);
    ctx.lineTo(5, bubbleY + 16);
    ctx.fillStyle = animal.angry > 0 ? '#fbe1d5' : '#fffdf2';
    ctx.fill();
    if (animal.angry > 0) {
      ctx.fillStyle = '#c97962';
      ctx.font = '700 20px "Fredoka", sans-serif';
      ctx.fillText('!', 0, bubbleY + 1);
    } else {
      ctx.font = emojiFont(21);
      ctx.fillStyle = '#000';
      ctx.fillText(favorite.emoji, 0, bubbleY + 1);
    }
    ctx.restore();
  }

  function drawFollower(friend, time) {
    if (!visible(friend.x, friend.y, 80)) return;
    const bob = Math.sin(time * 0.0026 + friend.bob) * 1.6;
    const x = friend.x;
    const y = friend.y + bob;
    const size = 22;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(54, 79, 48, .15)';
    ctx.beginPath();
    ctx.ellipse(0, size * 0.9, size * 0.9, size * 0.27, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = friend.species.color;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 248, 223, .95)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, size - 1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = emojiFont(28);
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(friend.species.emoji, 0, 2);
    ctx.restore();
  }

  function drawPlayer(time) {
    const step = player.moving ? Math.sin(player.walk) * 4 : 0;
    const bob = player.moving ? Math.abs(Math.sin(player.walk)) * 2.3 : Math.sin(time * 0.002) * 1.1;
    const x = player.x;
    const y = player.y + bob;
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = 'rgba(45, 70, 43, .2)';
    ctx.beginPath();
    ctx.ellipse(0, 23, 22, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Backpack and legs
    ctx.fillStyle = '#a9754e';
    roundRect(-20, -16, 15, 29, 7);
    ctx.fill();
    ctx.fillStyle = '#80593e';
    ctx.fillRect(-16, -7, 9, 3);
    ctx.strokeStyle = '#6b7e56';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, 10);
    ctx.lineTo(-6 + step * 0.4, 22);
    ctx.moveTo(7, 10);
    ctx.lineTo(7 - step * 0.4, 22);
    ctx.stroke();
    ctx.strokeStyle = '#4e5c3c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-7, 22);
    ctx.lineTo(-10 + step * 0.4, 23);
    ctx.moveTo(8, 22);
    ctx.lineTo(11 - step * 0.4, 23);
    ctx.stroke();

    // Body
    ctx.fillStyle = '#5f8e66';
    roundRect(-14, -18, 29, 33, 10);
    ctx.fill();
    ctx.fillStyle = '#7da878';
    roundRect(-14, -18, 10, 33, 9);
    ctx.fill();
    ctx.fillStyle = '#e5b36b';
    roundRect(-14, 2, 29, 7, 3);
    ctx.fill();
    ctx.fillStyle = '#f0c55d';
    ctx.beginPath();
    ctx.arc(0, 4, 3, 0, Math.PI * 2);
    ctx.fill();

    // Arms
    ctx.strokeStyle = '#e8b78e';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-13, -7);
    ctx.quadraticCurveTo(-20, 2, -18, 10);
    ctx.moveTo(13, -7);
    ctx.quadraticCurveTo(21, 1, 18, 9);
    ctx.stroke();

    // Head
    ctx.fillStyle = '#f0c49d';
    ctx.beginPath();
    ctx.arc(0, -30, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8b18a';
    ctx.beginPath();
    ctx.arc(-10, -27, 3.2, 0, Math.PI * 2);
    ctx.arc(10, -27, 3.2, 0, Math.PI * 2);
    ctx.fill();

    // Explorer hat
    ctx.fillStyle = '#c88b4c';
    ctx.beginPath();
    ctx.ellipse(0, -39, 20, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#dc9f5b';
    roundRect(-12, -51, 24, 15, 8);
    ctx.fill();
    ctx.fillStyle = '#f0c574';
    ctx.fillRect(-12, -41, 24, 3.5);

    // Face
    ctx.fillStyle = '#405847';
    ctx.beginPath();
    ctx.arc(-4.5, -29, 1.6, 0, Math.PI * 2);
    ctx.arc(4.5, -29, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b66f5b';
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.arc(0, -25, 4, 0.25, Math.PI - 0.25);
    ctx.stroke();
    ctx.fillStyle = 'rgba(224, 137, 116, .35)';
    ctx.beginPath();
    ctx.arc(-8, -25, 2.7, 0, Math.PI * 2);
    ctx.arc(8, -25, 2.7, 0, Math.PI * 2);
    ctx.fill();

    // Scarf
    ctx.fillStyle = '#e48b6e';
    roundRect(-10, -17, 20, 5, 2.5);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8, -14);
    ctx.lineTo(15, -8);
    ctx.lineTo(9, -7);
    ctx.fill();

    // Snack in hand
    const food = foodById(game.selectedFood);
    ctx.font = emojiFont(15);
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(food.emoji, 19, 10);

    ctx.fillStyle = 'rgba(255, 253, 235, .8)';
    roundRect(-16, 31, 32, 14, 7);
    ctx.fill();
    ctx.fillStyle = '#55765b';
    ctx.font = '700 8px "DM Sans", sans-serif';
    ctx.fillText('YOU', 0, 38);
    ctx.restore();
  }

  function drawEntities(time) {
    const drawables = [];
    wild.forEach(animal => drawables.push({ y: animal.y, draw: () => drawWildAnimal(animal, time) }));
    crew.slice(-10).forEach(friend => drawables.push({ y: friend.y, draw: () => drawFollower(friend, time) }));
    drawables.push({ y: player.y, draw: () => drawPlayer(time) });
    drawables.sort((a, b) => a.y - b.y);
    drawables.forEach(item => item.draw());

    if (crew.length > 10) {
      const x = player.x;
      const y = player.y - 66;
      ctx.save();
      ctx.fillStyle = 'rgba(255, 253, 240, .9)';
      roundRect(x - 27, y - 11, 54, 21, 10);
      ctx.fill();
      ctx.fillStyle = '#57795e';
      ctx.font = '700 9px "DM Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`+${crew.length - 10} crew`, x, y);
      ctx.restore();
    }
  }

  // ── Aim, flight and effects ────────────────────────────────────────
  function drawAim() {
    hoverAnimal = null;
    if (!aim.active || projectile || game.modalOpen) return;
    const target = resolveAim();
    hoverAnimal = target.animal;
    if (!aim.held && !target.animal) return;
    const matching = target.animal && target.animal.species.food === game.selectedFood;

    ctx.save();
    if (aim.held) {
      const startX = player.x;
      const startY = player.y - 8;
      const controlX = (startX + target.point.x) / 2;
      const controlY = Math.min(startY, target.point.y) - 72;
      ctx.strokeStyle = 'rgba(255, 252, 226, .8)';
      ctx.lineWidth = 2 / view.zoom;
      ctx.setLineDash([6 / view.zoom, 7 / view.zoom]);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(controlX, controlY, target.point.x, target.point.y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = 'rgba(255, 248, 217, .72)';
      ctx.lineWidth = 1.5 / view.zoom;
      ctx.beginPath();
      ctx.arc(target.point.x, target.point.y, 22 / view.zoom, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 251, 226, .9)';
      ctx.beginPath();
      ctx.arc(target.point.x, target.point.y, 2.7 / view.zoom, 0, Math.PI * 2);
      ctx.fill();
    }

    if (target.animal) {
      const ringColor = target.tooFar ? '#f1a18a' : matching ? '#f7e4a0' : '#fff8d9';
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 2.4 / view.zoom;
      ctx.setLineDash([5 / view.zoom, 5 / view.zoom]);
      ctx.beginPath();
      ctx.arc(target.animal.x, target.animal.y, 42, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  function drawProjectile() {
    if (!projectile) return;
    const t = Math.min(1, projectile.elapsed / projectile.duration);
    const x = projectile.from.x + (projectile.to.x - projectile.from.x) * t;
    const groundY = projectile.from.y + (projectile.to.y - projectile.from.y) * t;
    const y = groundY - Math.sin(t * Math.PI) * projectile.arc;

    for (let index = 3; index >= 1; index -= 1) {
      const past = Math.max(0, t - index * 0.035);
      const tx = projectile.from.x + (projectile.to.x - projectile.from.x) * past;
      const ty = projectile.from.y + (projectile.to.y - projectile.from.y) * past - Math.sin(past * Math.PI) * projectile.arc;
      ctx.fillStyle = `rgba(255, 249, 217, ${0.26 - index * 0.055})`;
      ctx.beginPath();
      ctx.arc(tx, ty, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(54, 79, 48, .16)';
    ctx.beginPath();
    ctx.ellipse(x + 3, groundY + 10, 10 * (1 - t * 0.2), 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = emojiFont(28 * (1 - t * 0.08));
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(foodById(projectile.food).emoji, x, y);
  }

  function drawParticles() {
    particles.forEach(particle => {
      const alpha = Math.max(0, particle.life / particle.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      if (particle.icon) {
        ctx.font = `${particle.size * 4.3}px "DM Sans", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(particle.icon, particle.x, particle.y);
      } else {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  function drawFloaters() {
    floaters.forEach(floater => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, floater.life / floater.maxLife);
      ctx.fillStyle = floater.color;
      ctx.font = '700 15px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(floater.text, floater.x, floater.y);
      ctx.restore();
    });
  }

  function drawWorld(time) {
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.clearRect(0, 0, view.width, view.height);
    const shakeX = game.shake ? (Math.random() - 0.5) * game.shake : 0;
    const shakeY = game.shake ? (Math.random() - 0.5) * game.shake : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);
    ctx.scale(view.zoom, view.zoom);
    ctx.translate(-camera.x, -camera.y);

    const grass = ctx.createLinearGradient(0, 0, 0, WORLD.height);
    grass.addColorStop(0, '#acd28c');
    grass.addColorStop(0.48, '#a1c980');
    grass.addColorStop(1, '#92bd70');
    ctx.fillStyle = grass;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);

    drawGroundDetails();
    drawPond(time);
    drawCamp(time);
    drawPicnic();
    drawEntities(time);
    drawAim();
    drawProjectile();
    drawParticles();
    drawFloaters();

    ctx.restore();
  }

  function frame(time) {
    const dt = clamp((time - game.lastTime) / 1000 || 0, 0, 0.1);
    game.lastTime = time;
    update(dt, time);
    drawWorld(time);
    requestAnimationFrame(frame);
  }

  function init() {
    buildSnacks();
    bindEvents();
    resizeCanvas();
    trail = [{ x: player.x, y: player.y }];
    spawnWildAt('bunny', player.x - 160, player.y + 50);
    spawnWildAt('fox', player.x + 205, player.y + 90);
    spawnWildAt('turtle', player.x - 210, player.y + 170);
    spawnWildAt('duck', player.x + 235, player.y - 150);
    spawnWildAt('squirrel', player.x + 60, player.y - 230);
    spawnWildAt('pig', player.x - 60, player.y + 245);
    while (wild.length < MAX_WILD) spawnWild(false);
    setQuest(0);
    renderHud();
    clampCamera(true);
    setInterval(() => { if (crew.length) payout(); }, 3000);
    window.__snackSafari = {
      get state() {
        return {
          coins: game.coins,
          xp: game.xp,
          rank: game.rank,
          throws: game.throws,
          tipsEarned: game.tipsEarned,
          crew: crew.length,
          wild: wild.length,
          selectedFood: game.selectedFood,
          quest: { ...game.quest },
          upgrades: { ...levels },
          player: { x: player.x, y: player.y },
          nearCamp: game.nearCamp,
          lastLaunch: game.lastLaunch,
          lastThrow: game.lastThrow,
        };
      },
      player,
      get wild() { return wild; },
      get crew() { return crew; },
      get collection() { return collection; },
      levels,
      camera,
      view,
      screenPoint(animal) {
        return { x: (animal.x - camera.x) * view.zoom, y: (animal.y - camera.y) * view.zoom };
      },
      selectFood,
      launchAtAim,
      spawnWild,
      buyUpgrade,
      openModal,
    };
    requestAnimationFrame(frame);
  }

  init();
})();



