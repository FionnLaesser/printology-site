// Grundlegende Spiellogik für das Story Game
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Spielerbild (ersetze 'player.jpg' durch dein eigenes Bild im gleichen Ordner)
const playerImg = new Image();
playerImg.src = 'player.jpg';

// Gegnerbild (enemy.jpg im gleichen Ordner)
const enemyImg = new Image();
enemyImg.src = 'enemy.jpg';

// Schwertbild (sword.png im gleichen Ordner)
const swordImg = new Image();
swordImg.src = 'sword.png';

const player = {
    x: 400,
    y: 300,
    width: 50,
    height: 50,
    speed: 4,
    direction: 'down',
    attacking: false
};

const sword = {
    length: 40,
    width: 10
};

let wave = 1;
let enemies = [];
let enemySpeed = 1.2;
let swordSwing = {
    swinging: false,
    angle: 0,
    maxAngle: Math.PI * 2, // 360 Grad
    direction: 1,
    swingSpeed: 0.25,
    lastDirection: 'down'
};

let playerLives = 3;
let invincible = false;
let invincibleTimer = 0;
const INVINCIBLE_TIME = 40; // frames

// Menü-Variablen
let showMenu = true;
let menuName = '';
let menuLives = 3;
let menuDifficulty = 'mittel';
const difficulties = { leicht: 0.8, mittel: 1.2, schwer: 2 };

// Sound-Objekte
const soundSword = new Audio('sword.mp3');
const soundEnemy = new Audio('enemy.mp3');
const soundStart = new Audio('SpielStart.mp3');
const soundJumpscare = new Audio('jumpscare.mp3'); // Jumpscare MP3
const soundAlarm = new Audio('alarm.mp3'); // Alarm-Sound für Ja-Antwort

function playSound(sound) {
    sound.currentTime = 0;
    sound.play();
}

function spawnEnemies(wave) {
    enemies = [];
    for (let i = 0; i < wave + 1; i++) {
        // Spawn Gegner am Rand
        let side = Math.floor(Math.random() * 4);
        let x, y;
        if (side === 0) { x = 0; y = Math.random() * canvas.height; }
        else if (side === 1) { x = canvas.width - 40; y = Math.random() * canvas.height; }
        else if (side === 2) { x = Math.random() * canvas.width; y = 0; }
        else { x = Math.random() * canvas.width; y = canvas.height - 40; }
        enemies.push({ x, y, width: 40, height: 40, alive: true });
    }
}

spawnEnemies(wave);

// Power-Up Typen
const powerUpTypes = [
    { type: 'heart', color: '#ff3a3a' }, // +1 Leben
    { type: 'sword', color: '#ffe066' }, // Schwert-Boost
    { type: 'speed', color: '#00eaff' }  // Spieler-Speed
];
let powerUps = [];
let powerUpActive = { sword: false, speed: false };
let powerUpTimer = { sword: 0, speed: 0 };

const keys = {};

document.addEventListener('keydown', (e) => {
    if (showMenu) return;
    keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === 'f' || e.code === 'Space') {
        if (!swordSwing.swinging) {
            swordSwing.swinging = true;
            swordSwing.angle = 0;
            swordSwing.direction = 1;
            mouseAngle = getNearestEnemyAngle();
            playSound(soundSword);
        }
    }
    if (e.key.toLowerCase() === 'r' && playerLives <= 0) {
        restartGame();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

function movePlayer() {
    if (keys['w']) { player.y -= player.speed; player.direction = 'up'; }
    if (keys['s']) { player.y += player.speed; player.direction = 'down'; }
    if (keys['a']) { player.x -= player.speed; player.direction = 'left'; }
    if (keys['d']) { player.x += player.speed; player.direction = 'right'; }
    // Begrenzung am Rand
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
}

function moveEnemies() {
    enemies.forEach(enemy => {
        if (!enemy.alive) return;
        let dx = player.x + player.width/2 - (enemy.x + enemy.width/2);
        let dy = player.y + player.height/2 - (enemy.y + enemy.height/2);
        let dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 0) {
            enemy.x += (dx / dist) * enemySpeed;
            enemy.y += (dy / dist) * enemySpeed;
        }
    });
}

function drawPlayer() {
    ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);
}

let mouseAngle = 0;

function getNearestEnemyAngle() {
    let cx = player.x + player.width/2;
    let cy = player.y + player.height/2;
    let minDist = Infinity;
    let target = null;
    enemies.forEach(enemy => {
        if (enemy.alive) {
            let ex = enemy.x + enemy.width/2;
            let ey = enemy.y + enemy.height/2;
            let dist = Math.hypot(ex - cx, ey - cy);
            if (dist < minDist) {
                minDist = dist;
                target = {x: ex, y: ey};
            }
        }
    });
    if (target) {
        return Math.atan2(target.y - cy, target.x - cx);
    } else {
        return 0;
    }
}

function drawSword() {
    if (!swordSwing.swinging) return;
    ctx.save();
    let cx = player.x + player.width/2;
    let cy = player.y + player.height/2;
    // Startwinkel: Richtung nächster Gegner
    let baseAngle = getNearestEnemyAngle();
    let angle = baseAngle + (swordSwing.swinging ? swordSwing.angle * swordSwing.direction : 0);
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    // Schwertgröße: orientiert an Originalbild, aber größer und mit Schatten/Glow
    let swordDrawLength = 120;
    let swordDrawWidth = 40;
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 24;
    ctx.drawImage(swordImg, player.width/2, -swordDrawWidth/2, swordDrawLength, swordDrawWidth);
    ctx.shadowBlur = 0;
    ctx.restore();
}

function updateSwordSwing() {
    if (swordSwing.swinging) {
        swordSwing.angle += swordSwing.swingSpeed;
        if (swordSwing.angle >= swordSwing.maxAngle) {
            swordSwing.swinging = false;
            swordSwing.angle = 0;
        }
    }
}

function drawEnemies() {
    enemies.forEach(enemy => {
        if (enemy.alive) {
            ctx.drawImage(enemyImg, enemy.x, enemy.y, enemy.width, enemy.height);
        }
    });
}

function checkSwordHit() {
    if (!swordSwing.swinging) return;
    let cx = player.x + player.width/2;
    let cy = player.y + player.height/2;
    let baseAngle = getNearestEnemyAngle();
    let angle = baseAngle + (swordSwing.swinging ? swordSwing.angle * swordSwing.direction : 0);
    // Schwert-Hitbox als schmaler langer Streifen (wie Klinge)
    let swordDrawLength = 120;
    let swordDrawWidth = 24; // schmaler für realistischere Klinge
    // Mittelpunkt der Klinge
    let sx = cx + Math.cos(angle) * (player.width/2 + swordDrawLength/2);
    let sy = cy + Math.sin(angle) * (player.height/2 + swordDrawLength/2);
    // Hitbox als Rechteck entlang der Schwertachse
    let hit = false;
    enemies.forEach(enemy => {
        if (!enemy.alive) return;
        // Transformiere Gegnerzentrum in Schwert-Koordinaten
        let ex = enemy.x + enemy.width/2 - cx;
        let ey = enemy.y + enemy.height/2 - cy;
        let exr =  Math.cos(-angle)*ex - Math.sin(-angle)*ey;
        let eyr =  Math.sin(-angle)*ex + Math.cos(-angle)*ey;
        // Rechteck: x > player.width/2, x < player.width/2+swordDrawLength, y im Bereich der Klingenbreite
        if (
            exr > player.width/2 && exr < player.width/2 + swordDrawLength &&
            Math.abs(eyr) < swordDrawWidth/2
        ) {
            enemy.alive = false;
            kills++;
            hit = true;
        }
    });
    if (hit) playSound(soundEnemy);
}

function rectsCollide(r1, r2) {
    return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
}

function checkPlayerHit() {
    if (invincible) {
        invincibleTimer--;
        if (invincibleTimer <= 0) invincible = false;
        return;
    }
    enemies.forEach(enemy => {
        if (enemy.alive && rectsCollide({x: player.x, y: player.y, w: player.width, h: player.height}, {x: enemy.x, y: enemy.y, w: enemy.width, h: enemy.height})) {
            playerLives--;
            enemy.alive = false;
            invincible = true;
            invincibleTimer = INVINCIBLE_TIME;
        }
    });
}

function drawHearts() {
    let size = 32;
    let y = 60;
    for (let i = 0; i < playerLives; i++) {
        let x = 20 + i * (size + 6);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x + size/2, y + size/4);
        ctx.bezierCurveTo(x + size, y, x + size, y + size/1.5, x + size/2, y + size);
        ctx.bezierCurveTo(x, y + size/1.5, x, y, x + size/2, y + size/4);
        ctx.closePath();
        if (playerLives === 1 && i === 0) {
            // Leucht-Effekt für letztes Herz
            ctx.fillStyle = '#ff3a3a';
            ctx.shadowColor = '#fff800';
            ctx.shadowBlur = 32 + 16 * Math.abs(Math.sin(Date.now()/200)); // animiertes Pulsieren
        } else {
            ctx.fillStyle = '#ff3a3a';
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 8;
        }
        ctx.fill();
        ctx.restore();
    }
}

function drawStory() {
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';
    ctx.fillText('Name: ' + menuName + ' | Welle: ' + wave + ' | Kills: ' + kills + ' | Besiege alle Gegner! (WASD + Leertaste)', 20, 30);
    ctx.restore();
    drawHearts();
}

function drawMenu() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    // Rainbow-Frame
    let rainbow = ctx.createLinearGradient(canvas.width/2 - 260, 0, canvas.width/2 + 260, 0);
    rainbow.addColorStop(0, '#ff004c');
    rainbow.addColorStop(0.16, '#ff9900');
    rainbow.addColorStop(0.33, '#ffee00');
    rainbow.addColorStop(0.5, '#33ff00');
    rainbow.addColorStop(0.66, '#00eaff');
    rainbow.addColorStop(0.83, '#7a00ff');
    rainbow.addColorStop(1, '#ff004c');
    ctx.lineWidth = 8;
    ctx.strokeStyle = rainbow;
    ctx.globalAlpha = 0.96;
    ctx.fillStyle = '#23243ad9';
    ctx.fillRect(canvas.width/2 - 260, canvas.height/2 - 180, 520, 340);
    ctx.globalAlpha = 1;
    ctx.strokeRect(canvas.width/2 - 260, canvas.height/2 - 180, 520, 340);
    // Rainbow-Text
    let rainbowText = ctx.createLinearGradient(canvas.width/2 - 150, 0, canvas.width/2 + 150, 0);
    rainbowText.addColorStop(0, '#ff004c');
    rainbowText.addColorStop(0.2, '#ff9900');
    rainbowText.addColorStop(0.4, '#ffee00');
    rainbowText.addColorStop(0.6, '#33ff00');
    rainbowText.addColorStop(0.8, '#00eaff');
    rainbowText.addColorStop(1, '#7a00ff');
    ctx.font = 'bold 44px Segoe UI, Arial';
    ctx.fillStyle = rainbowText;
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 16;
    ctx.fillText('Alen vs Anonym', canvas.width/2 - 170, canvas.height/2 - 100);
    ctx.shadowBlur = 0;
    ctx.font = '24px Segoe UI, Arial';
    ctx.fillStyle = '#fff';
    ctx.fillText('Name: ' + menuName + '_', canvas.width/2 - 120, canvas.height/2 - 40);
    ctx.fillText('Leben: ' + menuLives + '  (Pfeil hoch/runter)', canvas.width/2 - 120, canvas.height/2 + 10);
    ctx.fillText('Schwierigkeit: ' + menuDifficulty.charAt(0).toUpperCase() + menuDifficulty.slice(1) + '  (Links/Rechts)', canvas.width/2 - 120, canvas.height/2 + 60);
    ctx.font = 'bold 26px Segoe UI, Arial';
    ctx.fillStyle = rainbowText;
    ctx.fillText('Enter = Start', canvas.width/2 - 60, canvas.height/2 + 120);
    ctx.restore();
}

// Easter Egg: Jumpscare für Namen "Alen"
let jumpscareActive = false;
let jumpscareStartGame = false;
let jumpscareSoundPlaying = false;
let alarmActive = false;

function showJumpscare(startGameAfter = false) {
    jumpscareActive = true;
    jumpscareStartGame = startGameAfter;
    alarmActive = false;
    soundJumpscare.currentTime = 0;
    soundJumpscare.loop = false;
    soundJumpscare.play();
    jumpscareSoundPlaying = true;
    drawJumpscare();
    setTimeout(() => {
        stopJumpscareSound();
    }, 3000); // Sound stoppt nach 3 Sekunden
    setTimeout(() => {
        jumpscareActive = false;
        window.removeEventListener('keydown', jumpscareKeyHandler);
        playSound(soundStart);
        startGameFromMenu();
    }, 3000); // Nach 3 Sekunden geht es automatisch weiter
}

// Entferne jumpscareKeyHandler, drawAlarm und alle "J = Ja   N = Nein" Hinweise aus drawJumpscare
function drawJumpscare() {
    if (!jumpscareActive) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.globalAlpha = 0.92;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    ctx.font = 'bold 60px Segoe UI, Arial';
    ctx.fillStyle = '#ff0000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 24;
    ctx.fillText('Bist du Anonym?', canvas.width/2, canvas.height/2);
    ctx.shadowBlur = 0;
    ctx.restore();
}

function menuKeyHandler(e) {
    if (showMenu && !jumpscareActive) {
        if (e.key.length === 1 && menuName.length < 12 && /^[a-zA-Z0-9]$/.test(e.key)) {
            menuName += e.key;
        } else if (e.key === 'Backspace') {
            menuName = menuName.slice(0, -1);
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            if (e.key === 'ArrowUp') menuLives = Math.min(10, menuLives + 1);
            if (e.key === 'ArrowDown') menuLives = Math.max(1, menuLives - 1);
            if (e.key === 'ArrowLeft') {
                if (menuDifficulty === 'mittel') menuDifficulty = 'leicht';
                else if (menuDifficulty === 'schwer') menuDifficulty = 'mittel';
            }
            if (e.key === 'ArrowRight') {
                if (menuDifficulty === 'leicht') menuDifficulty = 'mittel';
                else if (menuDifficulty === 'mittel') menuDifficulty = 'schwer';
            }
        } else if (e.key === 'Enter' && menuName.length > 0) {
            if (menuName.toLowerCase() === 'alen') {
                showJumpscare(true); // Nach Jumpscare Spiel starten
                return;
            }
            playSound(soundStart);
            startGameFromMenu();
        }
        drawMenu();
    }
}

// Jumpscare-Loop
function jumpscareLoop() {
    if (jumpscareActive) {
        drawJumpscare();
        jumpscareTimer--;
        if (jumpscareTimer <= 0) {
            jumpscareActive = false;
            menuName = '';
            drawMenu();
        } else {
            requestAnimationFrame(jumpscareLoop);
        }
    }
}

// Jumpscare anzeigen, wenn aktiviert
function showJumpscare() {
    jumpscareActive = true;
    jumpscareTimer = 120;
    let scream = new Audio('jumpscare.mp3');
    scream.play();
    jumpscareLoop();
}

function startGameFromMenu() {
    player.x = 400;
    player.y = 300;
    wave = 1;
    enemySpeed = difficulties[menuDifficulty];
    playerLives = menuLives;
    invincible = false;
    invincibleTimer = 0;
    swordSwing.swinging = false;
    kills = 0; // Kills zurücksetzen
    powerUps = [];
    powerUpActive = { sword: false, speed: false };
    powerUpTimer = { sword: 0, speed: 0 };
    powerUpSpawnTimer = 300;
    spawnEnemies(wave);
    showMenu = false;
    window.removeEventListener('keydown', menuKeyHandler);
    gameLoop();
}

function restartGame() {
    showMenu = true;
    menuName = '';
    menuLives = 3;
    menuDifficulty = 'mittel';
    window.addEventListener('keydown', menuKeyHandler);
    drawMenu();
}

function checkWave() {
    if (enemies.every(e => !e.alive)) {
        wave++;
        enemySpeed += 0.2;
        spawnEnemies(wave);
    }
}

// Spielfeld-Hintergrund zeichnen
function drawField() {
    // Schöner Verlaufshintergrund
    let grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#23243a');
    grad.addColorStop(1, '#3a2a23');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Optional: Spielfeld-Rand
    ctx.save();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#FFD700';
    ctx.strokeRect(8, 8, canvas.width-16, canvas.height-16);
    ctx.restore();
}

function spawnPowerUp() {
    // Zufällig auf dem Feld, alle 15-25 Sekunden
    let t = powerUpTypes[Math.floor(Math.random()*powerUpTypes.length)];
    let x = 60 + Math.random() * (canvas.width-120);
    let y = 100 + Math.random() * (canvas.height-200);
    powerUps.push({ x, y, r: 22, type: t.type, color: t.color, active: true });
}

function drawPowerUps() {
    powerUps.forEach(p => {
        if (!p.active) return;
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 16;
        ctx.fill();
        ctx.font = 'bold 20px Arial';
        ctx.fillStyle = '#23243a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (p.type==='heart') ctx.fillText('❤', p.x, p.y+1);
        if (p.type==='sword') ctx.fillText('⚡', p.x, p.y+1);
        if (p.type==='speed') ctx.fillText('⇧', p.x, p.y+1);
        ctx.restore();
    });
}

function drawBoostTimers() {
    ctx.save();
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    let y = 30;
    if (powerUpActive.sword) {
        ctx.fillStyle = '#ffe066';
        ctx.fillText('⚡ Schwert: ' + (powerUpTimer.sword/60).toFixed(1) + 's', canvas.width-30, y);
        y += 28;
    }
    if (powerUpActive.speed) {
        ctx.fillStyle = '#00eaff';
        ctx.fillText('⇧ Speed: ' + (powerUpTimer.speed/60).toFixed(1) + 's', canvas.width-30, y);
        y += 28;
    }
    ctx.restore();
}

function checkPowerUpCollect() {
    powerUps.forEach(p => {
        if (!p.active) return;
        let dx = (player.x+player.width/2)-p.x;
        let dy = (player.y+player.height/2)-p.y;
        if (Math.hypot(dx,dy) < p.r+player.width/2) {
            p.active = false;
            if (p.type==='heart') playerLives = Math.min(playerLives+1,10);
            if (p.type==='sword') { powerUpActive.sword = true; powerUpTimer.sword = 900; } // 15s
            if (p.type==='speed') { powerUpActive.speed = true; powerUpTimer.speed = 900; } // 15s
        }
    });
}

function updatePowerUps() {
    // Timer runterzählen
    if (powerUpActive.sword) {
        swordSwing.swingSpeed = 0.5;
        powerUpTimer.sword--;
        if (powerUpTimer.sword<=0) { powerUpActive.sword=false; swordSwing.swingSpeed=0.25; }
    }
    if (powerUpActive.speed) {
        player.speed = 8;
        powerUpTimer.speed--;
        if (powerUpTimer.speed<=0) { powerUpActive.speed=false; player.speed=4; }
    }
}

function gameLoop() {
    if (showMenu) return;
    drawField();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    movePlayer();
    moveEnemies();
    updatePowerUps();
    drawPlayer();
    updateSwordSwing();
    drawSword();
    drawEnemies();
    drawPowerUps();
    drawBoostTimers();
    checkPowerUpCollect();
    checkSwordHit();
    checkPlayerHit();
    drawStory();
    checkWave();
    // PowerUp-Spawn
    powerUpSpawnTimer--;
    if (powerUpSpawnTimer<=0) {
        spawnPowerUp();
        powerUpSpawnTimer = 900 + Math.floor(Math.random()*600); // 15-25s
    }
    if (playerLives > 0) {
        requestAnimationFrame(gameLoop);
    } else {
        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.font = '40px Arial';
        ctx.fillText('Game Over', canvas.width/2 - 100, canvas.height/2);
        ctx.font = '20px Arial';
        ctx.fillText('Drücke R zum Neustarten', canvas.width/2 - 110, canvas.height/2 + 40);
        ctx.restore();
    }
}

playerImg.onload = () => {
    window.addEventListener('keydown', menuKeyHandler);
    drawMenu();
};

// Fullscreen-Button und Handling
function setFullscreenCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', setFullscreenCanvas);
setFullscreenCanvas();

// Passe auch das Menü und die Spiellogik an die neue Canvasgröße an (Positionen bleiben relativ)
