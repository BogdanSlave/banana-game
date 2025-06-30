// ===================================================================================
// G A M E   C O N F I G U R A T I O N
// ===================================================================================
const GAME_SPEED = 100;
const POWER_UP_DURATION = 120;
const DEATH_ANIMATION_DURATION = 1200;
const EAT_ANIMATION_DURATION = 500;
const UI_VERTICAL_SPACE = 250;

// ===================================================================================
// M A P   C O N F I G U R A T I O N
// ===================================================================================
const MAP_LAYOUT = [
    "#####################", "#o  .#     .        #", "# ### ### ##### ### ### #",
    "  #.  #   #.  #. o#. ", "# ### ###.### ### ### #", "#.          P      .#",
    "# ###.#.#########.# ### #", "      #   . G     #  ", "#####.### ##### ### #####",
    ".  o# #   #   #   #  ", "##### #.######### # #####", "#          G     .  #",
    "#.### ### ##### ### ### #", "#o  #     #.  #.    #", "### # ### ### ### # ###",
    "#  .#  .#     #   #o#", "#.##### # ### # ##### #", "        #. G .#.     ",
    "#####################",
];

const MAP_SPRITES = {
    '#': 'assets/wall.jpg',
    '.': 'assets/white-cat.gif',
    'o': 'assets/banana.gif',
};

// ===================================================================================
// C H A R A C T E R   S P R I T E   C O N F I G U R A T I O N
// ===================================================================================
const PACMAN_CONFIG = {
    spriteSheet: 'assets/pacman_sprites.png', frameWidth: 32, frameHeight: 32, animationSpeed: 3,
    animations: {
        right: { row: 0, frames: [0, 1] }, up:    { row: 0, frames: [0, 1] }, down:  { row: 0, frames: [0, 1] },
        death: { row: 1, frames: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, eat_powerup: { row: 2, frames: [0, 1] },
        power_right: { row: 3, frames: [0], sWidth: 32, sHeight: 96 },
        power_up: { row: 3, frames: [0, 1], sWidth: 32, sHeight: 96 },
        power_down: { row: 3, frames: [0, 1], sWidth: 32, sHeight: 96 },
    },
};
const GHOST_CONFIG = {
    spriteSheet: 'assets/ghost_sprites.png', frameWidth: 32, frameHeight: 32, animationSpeed: 3,
    animations: {
        down: { row: 0, frames: [0, 1] }, up: { row: 0, frames: [0, 1] }, right: { row: 0, frames: [0, 1] },
        frightened: { row: 0, frames: [0, 1] }, eaten: { row: 1, frames: [2] },
    },
};

// ===================================================================================
// W I N   S E Q U E N C E   C O N F I G
// ===================================================================================
const WIN_SEQUENCE_CONFIG = [
    { type: 'gif', src: 'assets/happy-happy-happy-cat.gif', x: 50, y: 150, width: 100, height: 100 },
    { type: 'gif', src: 'assets/happy-happy-happy-cat.gif', x: 260, y: 90, width: 100, height: 100 },
	{ type: 'gif', src: 'assets/happy-happy-happy-cat.gif', x: 500, y: 150, width: 100, height: 100 },
	{ type: 'gif', src: 'assets/happy-happy-happy-cat.gif', x: 50, y: 390, width: 100, height: 100 },
    { type: 'gif', src: 'assets/happy-happy-happy-cat.gif', x: 260, y: 460, width: 100, height: 100 },
	{ type: 'gif', src: 'assets/happy-happy-happy-cat.gif', x: 500, y: 390, width: 100, height: 100 }
];

// ===================================================================================
// S O U N D   C O N F I G U R A T I O N
// ===================================================================================
const SOUND_CONFIG = {
    music: 'assets/Intense.mp3',      eatDot: 'assets/Meow.ogg',
    eatGhost: 'assets/hit.ogg', powerUp: 'assets/nyam.wav',
    death: 'assets/lose.wav',      winMusic: 'assets/purrs.wav',
};
// ===================================================================================
// H E L P E R S
// ===================================================================================
function debounce(func, wait) { let timeout; return function executedFunction(...args) { const later = () => { clearTimeout(timeout); func(...args); }; clearTimeout(timeout); timeout = setTimeout(later, wait); }; }
class SoundManager {
    constructor(config) { this.sounds = {}; this.isMuted = false; this.loadSounds(config); }
    loadSounds(config) { for (const key in config) { if (config.hasOwnProperty(key)) { this.sounds[key] = new Audio(config[key]); this.sounds[key].onerror = () => { console.warn(`Could not load sound: ${config[key]}`); delete this.sounds[key]; }; } } }
    playSound(name) { if (this.sounds[name] && !this.isMuted) { this.sounds[name].currentTime = 0; this.sounds[name].play().catch(e => console.error(`Error playing sound: ${name}`, e)); } }
    playMusic() { if (this.sounds.music && !this.isMuted) { this.sounds.music.loop = true; this.sounds.music.play().catch(e => console.error("Music play failed", e)); } }
    stopMusic() { if (this.sounds.music) { this.sounds.music.pause(); this.sounds.music.currentTime = 0; } }
}

// ===================================================================================
// G A M E   E N G I N E
// ===================================================================================
class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId); this.ctx = this.canvas.getContext('2d');
        this.dotsContainer = document.getElementById('dots-container'); this.winContainer = document.getElementById('win-sequence-container');
        this.tileSize = 32; this.gameState = 'LOADING';
        this.map = new Map(MAP_LAYOUT, this.tileSize, this.dotsContainer);
        this.pacman = null; this.ghosts = []; this.score = 0; this.lives = 3; this.frightenedTimer = 0;
        this.soundManager = new SoundManager(SOUND_CONFIG);
        this.totalDots = 0; this.dotsCollected = 0;
        this.scoreTextEl = document.getElementById('score-text'); this.livesEl = document.getElementById('lives');
        this.gameOverEl = document.getElementById('game-over'); this.winEl = document.getElementById('you-win');
        this.init(); this.resizeGame(); this.setupControls();
    }
    resizeGame() {
        const oldTileSize = this.tileSize;
        const availableWidth = window.innerWidth * 0.95; const availableHeight = window.innerHeight - UI_VERTICAL_SPACE;
        const tileSizeByWidth = Math.floor(availableWidth / this.map.cols); const tileSizeByHeight = Math.floor(availableHeight / this.map.rows);
        const newTileSize = Math.max(8, Math.min(tileSizeByWidth, tileSizeByHeight));
        if (newTileSize === oldTileSize && this.gameState !== 'LOADING') return;
        this.tileSize = newTileSize; const ratio = newTileSize / oldTileSize;
        this.setupCanvas();
        this.map.resize(newTileSize);
        if (this.pacman) this.pacman.resize(newTileSize, ratio);
        if (this.ghosts.length > 0) this.ghosts.forEach(g => g.resize(newTileSize, ratio));
        this.draw();
    }
    setupCanvas() { const canvasWidth = this.map.cols * this.tileSize; const canvasHeight = this.map.rows * this.tileSize; this.canvas.width = canvasWidth; this.canvas.height = canvasHeight; this.dotsContainer.style.width = `${canvasWidth}px`; this.dotsContainer.style.height = `${canvasHeight}px`; this.winContainer.style.width = `${canvasWidth}px`; this.winContainer.style.height = `${canvasHeight}px`; }
    init() {
        this.gameState = 'READY'; this.soundManager.stopMusic(); this.score = 0; this.lives = 3;
        this.gameOverEl.classList.add('hidden'); this.winEl.classList.add('hidden');
        this.winContainer.innerHTML = ''; this.winContainer.classList.add('hidden');
        this.map.reset(this.tileSize); this.totalDots = this.map.countTotalDots(); this.dotsCollected = 0;
        this.updateUI();
        this.pacman = new Pacman(this.map.pacmanStart.x, this.map.pacmanStart.y, this.tileSize, this.map);
        this.ghosts = this.map.ghostStarts.map(pos => new Ghost(pos.x, pos.y, this.tileSize, this.map));
        if (!this.gameLoopInterval) { this.gameLoopInterval = setInterval(() => this.gameLoop(), GAME_SPEED); }
    }
    startGame() { if (this.gameState === 'READY') { this.gameState = 'PLAYING'; this.soundManager.playMusic(); } }
    gameLoop() { if (this.gameState === 'PLAYING') { this.update(); } this.draw(); }
    update() { this.pacman.update(); this.ghosts.forEach(ghost => ghost.update(this.pacman)); if (this.frightenedTimer > 0) { this.frightenedTimer--; if (this.frightenedTimer === 0) { this.pacman.setPoweredUp(false); this.ghosts.forEach(ghost => ghost.unfrighten()); } } this.checkCollisions(); this.checkWinCondition(); }
    draw() { this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); this.map.draw(this.ctx); if (this.gameState !== 'PACMAN_DYING' && this.gameState !== 'WIN') { this.ghosts.forEach(ghost => ghost.draw(this.ctx)); } if (this.gameState !== 'WIN') { this.pacman.draw(this.ctx); } if (this.gameState === 'READY') { this.ctx.fillStyle = 'yellow'; this.ctx.font = '45px "Press Start 2P"'; this.ctx.textAlign = 'center'; this.ctx.fillText('СПАСАЙТЕ КОТИКАВ!', this.canvas.width / 2, this.canvas.height / 2+15); } }
    checkCollisions() {
        const pacmanGridX = Math.round(this.pacman.x / this.tileSize); const pacmanGridY = Math.round(this.pacman.y / this.tileSize);
        const tile = this.map.getTile(pacmanGridX, pacmanGridY);
        if (tile === '.' || tile === 'o') {
            if (tile === '.') { this.score += 10; this.soundManager.playSound('eatDot'); this.dotsCollected++; }
            else { this.score += 50; this.soundManager.playSound('powerUp'); this.startPowerUpSequence(); }
            this.map.setTile(pacmanGridX, pacmanGridY, ' '); this.updateUI();
        }
        this.ghosts.forEach(ghost => { const ghostGridX = Math.round(ghost.x / this.tileSize); const ghostGridY = Math.round(ghost.y / this.tileSize); if (pacmanGridX === ghostGridX && pacmanGridY === ghostGridY) { if (ghost.isFrightened) { ghost.eat(); this.score += 200; this.soundManager.playSound('eatGhost'); this.updateUI(); } else if (!ghost.isEaten) { this.loseLife(); } } });
    }
    startPowerUpSequence() { this.gameState = 'POWERING_UP'; this.pacman.animator.setAnimation('eat_powerup'); this.frightenedTimer = POWER_UP_DURATION; this.ghosts.forEach(ghost => ghost.frighten()); setTimeout(() => { this.pacman.setPoweredUp(true); this.gameState = 'PLAYING'; }, EAT_ANIMATION_DURATION); }
    loseLife() { if (this.gameState !== 'PLAYING') return; this.gameState = 'PACMAN_DYING'; this.soundManager.stopMusic(); this.soundManager.playSound('death'); this.pacman.setPoweredUp(false); this.pacman.animator.setAnimation('death'); this.lives--; this.updateUI(); setTimeout(() => { if (this.lives <= 0) { this.gameOver(); } else { this.resetPositions(); this.gameState = 'PLAYING'; this.soundManager.playMusic(); } }, DEATH_ANIMATION_DURATION); }
    gameOver() { this.gameState = 'GAME_OVER'; this.gameOverEl.classList.remove('hidden'); setTimeout(() => this.init(), 3000); }
    checkWinCondition() { if (this.dotsCollected === this.totalDots && this.gameState === 'PLAYING') { this.gameState = 'WIN'; this.soundManager.stopMusic(); this.soundManager.playSound('winMusic'); this.showWinSequence(); } }
    showWinSequence() {
        this.winEl.classList.remove('hidden'); this.winContainer.classList.remove('hidden');
        WIN_SEQUENCE_CONFIG.forEach(asset => { const gif = document.createElement('img'); gif.src = asset.src; gif.className = 'win-gif'; gif.style.left = `${asset.x}px`; gif.style.top = `${asset.y}px`; gif.style.width = `${asset.width}px`; gif.style.height = `${asset.height}px`; this.winContainer.appendChild(gif); });
    }
    resetPositions() { this.pacman.reset(); this.ghosts.forEach(g => g.reset()); this.frightenedTimer = 0; }
    updateUI() { this.scoreTextEl.textContent = `${this.dotsCollected} / ${this.totalDots}`; this.livesEl.textContent = `LIVES: ${this.lives}`; }
    setupControls() { const handleInput = (dir) => { if (this.gameState === 'READY') { this.startGame(); } if (this.gameState === 'PLAYING') { this.pacman.setDirection(dir); } }; document.addEventListener('keydown', (e) => { switch (e.key) { case 'ArrowUp': case 'w': handleInput('up'); break; case 'ArrowDown': case 's': handleInput('down'); break; case 'ArrowLeft': case 'a': handleInput('left'); break; case 'ArrowRight': case 'd': handleInput('right'); break; } }); const controls = [{ id: 'touch-up', direction: 'up' }, { id: 'touch-down', direction: 'down' }, { id: 'touch-left', direction: 'left' }, { id: 'touch-right', direction: 'right' }]; controls.forEach(control => { const button = document.getElementById(control.id); if (button) { button.addEventListener('touchstart', (e) => { e.preventDefault(); handleInput(control.direction); }); button.addEventListener('click', (e) => { e.preventDefault(); handleInput(control.direction); }); } }); const debouncedResize = debounce(() => this.resizeGame(), 250); window.addEventListener('resize', debouncedResize); }
}

class Map {
    constructor(layout, tileSize, dotsContainer) { this.originalLayout = layout.map(row => row.split('')); this.tileSize = tileSize; this.rows = layout.length; this.cols = layout[0].length; this.pacmanStart = { x: 0, y: 0 }; this.ghostStarts = []; this.dotsContainer = dotsContainer; this.dotElements = {}; this.wallImage = new Image(); this.wallImage.src = MAP_SPRITES['#']; this.reset(this.tileSize); }
    countTotalDots() { let count = 0; for (let y = 0; y < this.rows; y++) { for (let x = 0; x < this.cols; x++) { if (this.originalLayout[y][x] === '.') { count++; } } } return count; }
    findStartPositions(currentTileSize) { this.ghostStarts = []; for (let y = 0; y < this.rows; y++) { for (let x = 0; x < this.cols; x++) { if (this.originalLayout[y][x] === 'P') { this.pacmanStart = { x: x * currentTileSize, y: y * currentTileSize }; } else if (this.originalLayout[y][x] === 'G') { this.ghostStarts.push({ x: x * currentTileSize, y: y * currentTileSize }); } } } }
    reset(tileSize) { this.tileSize = tileSize; this.findStartPositions(this.tileSize); this.layout = this.originalLayout.map(row => [...row]); this.dotsContainer.innerHTML = ''; this.dotElements = {}; for (let y = 0; y < this.rows; y++) { for (let x = 0; x < this.cols; x++) { const tileChar = this.layout[y][x]; if (tileChar === '.' || tileChar === 'o') { const dotImg = document.createElement('img'); dotImg.src = MAP_SPRITES[tileChar]; dotImg.className = 'dot-sprite'; dotImg.style.left = `${x * this.tileSize}px`; dotImg.style.top = `${y * this.tileSize}px`; dotImg.style.width = `${this.tileSize}px`; dotImg.style.height = `${this.tileSize}px`; this.dotsContainer.appendChild(dotImg); this.dotElements[`${x},${y}`] = dotImg; } } } }
    resize(newTileSize) { this.tileSize = newTileSize; this.findStartPositions(newTileSize); for (const key in this.dotElements) { const [x, y] = key.split(',').map(Number); const dotImg = this.dotElements[key]; dotImg.style.left = `${x * this.tileSize}px`; dotImg.style.top = `${y * this.tileSize}px`; dotImg.style.width = `${this.tileSize}px`; dotImg.style.height = `${this.tileSize}px`; } }
    getTile(x, y) { if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return '#'; return this.layout[y][x]; }
    setTile(x, y, tile) { if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) { this.layout[y][x] = tile; if (tile === ' ') { const dotElement = this.dotElements[`${x},${y}`]; if (dotElement) { dotElement.remove(); delete this.dotElements[`${x},${y}`]; } } } }
    draw(ctx) { for (let y = 0; y < this.rows; y++) { for (let x = 0; x < this.cols; x++) { if (this.getTile(x, y) === '#') { if (this.wallImage.complete) { ctx.drawImage(this.wallImage, x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize); } } } } }
}

class Animator {
    constructor(config) { this.spriteSheet = new Image(); this.spriteSheet.src = config.spriteSheet; this.frameWidth = config.frameWidth; this.frameHeight = config.frameHeight; this.animations = config.animations; this.animationSpeed = config.animationSpeed; this.currentAnimation = 'right'; this.frameIndex = 0; this.tickCounter = 0; }
    setAnimation(name) { if (this.currentAnimation !== name) { this.currentAnimation = name; this.frameIndex = 0; this.tickCounter = 0; } }
    update() { this.tickCounter++; if (this.tickCounter > this.animationSpeed) { this.tickCounter = 0; const anim = this.animations[this.currentAnimation]; if (anim) { this.frameIndex = (this.frameIndex + 1) % anim.frames.length; } } }
    draw(ctx, x, y, destWidth, destHeight, orientation = 1) { destHeight = destHeight || destWidth; let animName = this.currentAnimation; if (orientation === -1 && !this.animations[animName]?.sWidth) { let rightVersion = animName.replace('left', 'right'); if (this.animations[rightVersion]) animName = rightVersion; } const anim = this.animations[animName]; if (!anim || !this.spriteSheet.complete || this.spriteSheet.naturalHeight === 0) return; const sourceWidth = anim.sWidth || this.frameWidth; const sourceHeight = anim.sHeight || this.frameHeight; const frame = anim.frames[this.frameIndex]; const sourceX = frame * sourceWidth; const sourceY = anim.row * this.frameHeight; ctx.save(); ctx.translate(x + destWidth / 2, y + destHeight / 2); ctx.scale(orientation, 1); ctx.drawImage(this.spriteSheet, sourceX, sourceY, sourceWidth, sourceHeight, -destWidth / 2, -destHeight / 2, destWidth, destHeight); ctx.restore(); }
}

class Character {
    constructor(x, y, tileSize, map) { this.startX = x; this.startY = y; this.x = x; this.y = y; this.tileSize = tileSize; this.map = map; this.speed = tileSize / 8; this.direction = 'right'; this.nextDirection = 'right'; this.orientation = 1; this.animator = null; }
    resize(newTileSize, ratio) { this.x *= ratio; this.y *= ratio; this.startX *= ratio; this.startY *= ratio; this.tileSize = newTileSize; this.speed = newTileSize / 8; }
    setDirection(dir) { this.nextDirection = dir; }
    isNextTileWall(dir) { let gridX = Math.floor(this.x / this.tileSize); let gridY = Math.floor(this.y / this.tileSize); switch (dir) { case 'up': gridY--; break; case 'down': gridY++; break; case 'left': gridX--; break; case 'right': gridX++; break; } if (gridX < 0 || gridX >= this.map.cols) return false; return this.map.getTile(gridX, gridY) === '#'; }
    update() {
        if (this.x > this.map.cols * this.tileSize) { this.x = -this.tileSize; } else if (this.x < -this.tileSize) { this.x = this.map.cols * this.tileSize; }
        const gridX = Math.round(this.x / this.tileSize); const gridY = Math.round(this.y / this.tileSize);
        const xOffset = this.x - gridX * this.tileSize; const yOffset = this.y - gridY * this.tileSize;
        const onGrid = Math.abs(xOffset) < this.speed && Math.abs(yOffset) < this.speed;
        if (onGrid) { this.x = gridX * this.tileSize; this.y = gridY * this.tileSize; if (!this.isNextTileWall(this.nextDirection)) { this.direction = this.nextDirection; } if (!this.isNextTileWall(this.direction)) { this.move(); } } else { this.move(); }
        if (this.direction === 'left') this.orientation = -1; if (this.direction === 'right') this.orientation = 1;
        if (this.animator) { let anim = (this.direction === 'left') ? 'right' : this.direction; this.animator.setAnimation(anim); this.animator.update(); }
    }
    move() { const speed = Math.max(1, this.speed); switch (this.direction) { case 'up': this.y -= speed; break; case 'down': this.y += speed; break; case 'left': this.x -= speed; break; case 'right': this.x += speed; break; } }
    reset() { this.x = this.startX; this.y = this.startY; this.direction = 'right'; this.nextDirection = 'right'; }
    draw(ctx) { if (this.animator) { this.animator.draw(ctx, this.x, this.y, this.tileSize, this.tileSize, this.orientation); } }
}

class Pacman extends Character {
    constructor(x, y, tileSize, map) { super(x, y, tileSize, map); this.animator = new Animator(PACMAN_CONFIG); this.isPoweredUp = false; }
    setPoweredUp(value) { this.isPoweredUp = value; }
    update() { super.update(); if (this.animator) { let animPrefix = this.isPoweredUp ? 'power_' : ''; let animDirection = (this.direction === 'left') ? 'right' : this.direction; let finalAnimName = animPrefix + animDirection; if (!this.animator.animations[finalAnimName]) { finalAnimName = animDirection; } if (this.animator.currentAnimation !== 'death' && this.animator.currentAnimation !== 'eat_powerup') { this.animator.setAnimation(finalAnimName); } } }
    draw(ctx) { if (this.animator) { let drawY = this.y; let drawHeight = this.tileSize; if (this.isPoweredUp && this.animator.currentAnimation !== 'eat_powerup') { drawHeight = this.tileSize * 3; drawY = (this.y + this.tileSize) - drawHeight; } this.animator.draw(ctx, this.x, drawY, this.tileSize, drawHeight, this.orientation); } }
    reset() { super.reset(); this.setPoweredUp(false); }
}

class Ghost extends Character {
    constructor(x, y, tileSize, map) {
        super(x, y, tileSize, map);
        // FIX: This line was missing, causing the crash. It is now restored.
        this.animator = new Animator(GHOST_CONFIG);
        this.state = 'chase'; this.eatenTimer = 0;
    }
    get isFrightened() { return this.state === 'frightened'; }
    get isEaten() { return this.state === 'eaten'; }
    update(pacman) {
        if (this.isEaten) { this.eatenTimer--; if (this.eatenTimer <= 0) { this.reset(); } this.animator.setAnimation('eaten'); return; }
        this.ai(pacman);
        super.update();
        if (this.animator) { let anim = this.state === 'frightened' ? 'frightened' : (this.direction === 'left') ? 'right' : this.direction; this.animator.setAnimation(anim); }
    }
    ai(target) {
        // FIX: Replaced the faulty '%' check with the robust grid-snapping check
        const gridX = Math.round(this.x / this.tileSize); const gridY = Math.round(this.y / this.tileSize);
        const onGrid = Math.abs(this.x - gridX * this.tileSize) < this.speed && Math.abs(this.y - gridY * this.tileSize) < this.speed;
        if (!onGrid) return; // Only "think" when on a grid intersection
        
        const possibleDirections = ['up', 'down', 'left', 'right']; const oppositeDir = { up: 'down', down: 'up', left: 'right', right: 'left' };
        const validDirections = possibleDirections.filter(dir => !this.isNextTileWall(dir) && dir !== oppositeDir[this.direction]);
        if (validDirections.length === 0) { this.setDirection(oppositeDir[this.direction] || 'right'); return; }
        let bestDirection = validDirections[0]; let targetMetric = this.state === 'frightened' ? -Infinity : Infinity;
        for (const dir of validDirections) {
            let newX = gridX, newY = gridY;
            if (dir === 'up') newY--; else if (dir === 'down') newY++; else if (dir === 'left') newX--; else if (dir === 'right') newX++;
            const distance = Math.hypot(newX - Math.round(target.x/this.tileSize), newY - Math.round(target.y/this.tileSize));
            if (this.state === 'frightened') { if (distance > targetMetric) { targetMetric = distance; bestDirection = dir; } }
            else { if (distance < targetMetric) { targetMetric = distance; bestDirection = dir; } }
        }
        this.setDirection(bestDirection);
    }
    frighten() { if (this.state !== 'eaten') this.state = 'frightened'; }
    unfrighten() { if (this.state === 'frightened') this.state = 'chase'; }
    eat() { this.state = 'eaten'; this.eatenTimer = 200; }
    reset() { super.reset(); this.state = 'chase'; this.eatenTimer = 0; }
}

window.addEventListener('DOMContentLoaded', () => {
    new Game('gameCanvas');
});