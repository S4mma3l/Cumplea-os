const canvas = document.getElementById('canvas'); // Canvas visible
const ctx = canvas.getContext('2d');       // Contexto del canvas visible

const RENDER_SCALE = 4; // Más alto = píxeles más grandes/bloques. Prueba 6, 8, 10.
let renderCanvas;
let renderCtx;

let w, h;           // Dimensiones del canvas visible
let lowW, lowH;     // Dimensiones del canvas de baja resolución

let initialLetterCount = 0;

const easeOutQuad = t => t * (2 - t);
const easeInOutSine = t => -(Math.cos(Math.PI * t) - 1) / 2;
const easeOutCubic = t => (--t) * t * t + 1;

const options = {
    strings: ["FELIZ", "CUMPLEAÑOS!", " LORENA "],
    charSize: 8, 
    charSpacing: 1, 
    lineHeight: 10, 
    
    fireworkPrevPoints: 5,
    fireworkBaseLineWidth: 1,
    fireworkAddedLineWidth: 0, // Sin variación para pixel art
    fireworkSpawnTime: 120,
    fireworkBaseReachTime: 25,
    fireworkAddedReachTime: 25,
    fireworkCircleBaseSize: 5,
    fireworkCircleAddedSize: 3,
    fireworkCircleBaseTime: 15,
    fireworkCircleAddedTime: 15,
    fireworkCircleFadeBaseTime: 6,
    fireworkCircleFadeAddedTime: 2,
    fireworkBaseShards: 8,
    fireworkAddedShards: 8,
    fireworkShardPrevPoints: 2,
    fireworkShardBaseVel: 1.5,
    fireworkShardAddedVel: 0.8,
    fireworkShardBaseSize: 1,
    fireworkShardAddedSize: 0,

    gravity: 0.08, // Ajustado
    upFlow: -0.04, // Ajustado
    letterContemplatingWaitTime: 250,

    balloonSpawnTime: 20,
    balloonBaseInflateTime: 15,
    balloonAddedInflateTime: 15,
    balloonBaseSize: 10, 
    balloonAddedSize: 6,
    balloonBaseVel: 0.15, // Más lento
    balloonAddedVel: 0.15,
    balloonBaseRadian: -(Math.PI / 2 - 0.3),
    balloonAddedRadian: -0.6,

    colors: {
        background: '#1A1A1D', // Un poco más de naranja
        text: ["#FFB200", "#EB5B00", "#D91656"], 
        fireworkTrail: ["#D91656", "#FF7300"], 
        fireworkExplosion: ["#FF004D", "#FAEF5D", "#7E2553"], 
        ghost: '#E6DEDD', 
        pumpkinBody: '#E65100', 
        pumpkinFace: '#FFC107', 
        bat: '#393E46', // Más oscuro
        yarnBall: '#37306B', 
        pixelCat: '#454545', // Morado más oscuro para gato
        plantStem: '#33691E', 
        plantLeaf: '#558B2F', 
        spookyAccent: '#EA1179', 
    },
    fonts: {
        main: "'Press Start 2P', monospace"
    },
    pumpkinPlantCount: 12,
    batCount: 25, 
};

let calc = { totalWidth: 0, cx: 0, cy: 0 }; // cx, cy para baja res
const Tau = Math.PI * 2;

let letters = [];
let pumpkinPlants = [];
let bats = [];
let shardPool = [];
let yarnBall;
let pixelCat;
let halloweenCountdown;

function drawPixel(x, y, color, size = 1, context = renderCtx) {
    context.fillStyle = color;
    context.fillRect(Math.floor(x), Math.floor(y), size, size);
}

function fillRect(x, y, w, h, color, context = renderCtx) {
    context.fillStyle = color;
    context.fillRect(Math.floor(x), Math.floor(y), Math.max(1, Math.floor(w)), Math.max(1, Math.floor(h)));
}

function line(x0, y0, x1, y1, color, thickness = 1, context = renderCtx) {
    x0 = Math.floor(x0); y0 = Math.floor(y0);
    x1 = Math.floor(x1); y1 = Math.floor(y1);
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, e2;
    for (;;) {
        drawPixel(x0, y0, color, thickness, context);
        if (x0 === x1 && y0 === y1) break;
        e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
    }
}

function circle(xc, yc, r, color, context = renderCtx) {
    xc = Math.floor(xc); yc = Math.floor(yc); r = Math.floor(r);
    if (r <= 0) return; // No dibujar círculos de radio 0 o negativo
    let x = r, y = 0, err = 0;
    while (x >= y) {
        drawPixel(xc + x, yc + y, color, 1, context); drawPixel(xc + y, yc + x, color, 1, context);
        drawPixel(xc - y, yc + x, color, 1, context); drawPixel(xc - x, yc + y, color, 1, context);
        drawPixel(xc - x, yc - y, color, 1, context); drawPixel(xc - y, yc - x, color, 1, context);
        drawPixel(xc + y, yc - x, color, 1, context); drawPixel(xc + x, yc - y, color, 1, context);
        if (err <= 0) { y += 1; err += 2 * y + 1; }
        if (err > 0) { x -= 1; err -= 2 * x + 1; }
    }
}
function drawGhost(x, y, size, color, context = renderCtx) {
    x = Math.floor(x); y = Math.floor(y); size = Math.floor(size);
    if (size < 3) return; // Mínimo tamaño para dibujar algo coherente
    const s = 1; 
    const headRadius = Math.max(1,Math.floor(size / 2.5)); // Cabeza un poco más grande en proporción
    const bodyWidth = Math.max(1,headRadius * 2 - 2*s);
    const bodyHeight = Math.max(1,size - headRadius);

    circle(x + headRadius -s, y + headRadius -s , headRadius, color, context); // Cabeza
    fillRect(x, y + headRadius -s , bodyWidth, bodyHeight, color, context); // Cuerpo

    const wavePoints = Math.floor(bodyWidth / (2*s) ); 
    for(let i=0; i < wavePoints; i++){
        const waveX = x + i*s*2;
        const waveYBase = y + headRadius -s + bodyHeight;
        if(i % 2 === 0){
            fillRect(waveX, waveYBase -s, 2*s, 2*s, color, context);
        } else {
             fillRect(waveX, waveYBase, 2*s, s, color, context);
        }
    }
    if(size > 6){
        const eyeColor = '#000000';
        const eyeSize = Math.max(1, Math.floor(s * (size > 8 ? 2:1) ) );
        fillRect(x + headRadius * 0.5 - s, y + headRadius * 0.6 - s, eyeSize, eyeSize, eyeColor, context);
        fillRect(x + headRadius * 1.2 - s, y + headRadius * 0.6 - s, eyeSize, eyeSize, eyeColor, context);
    }
}


function initRenderCanvas() {
    lowW = Math.max(1, Math.floor(w / RENDER_SCALE)); // Asegurar al menos 1px
    lowH = Math.max(1, Math.floor(h / RENDER_SCALE));

    if (!renderCanvas) {
        renderCanvas = document.createElement('canvas');
    }
    renderCanvas.width = lowW;
    renderCanvas.height = lowH;
    renderCtx = renderCanvas.getContext('2d');
    
    renderCtx.imageSmoothingEnabled = false;
    renderCtx.mozImageSmoothingEnabled = false;
    renderCtx.webkitImageSmoothingEnabled = false;
    renderCtx.msImageSmoothingEnabled = false;
}

function getShard(x, y, vx, vy, color) {
    if (shardPool.length > 0) {
        const shard = shardPool.pop();
        shard.reset(x, y, vx, vy, color);
        return shard;
    }
    return new Shard(x, y, vx, vy, color);
}
function returnShard(shard) { shardPool.push(shard); }

class Bat {
    constructor() {
        this.size = 2 + Math.floor(Math.random() * 2); // Ancho en píxeles
        this.x = Math.random() * lowW;
        this.y = Math.random() * lowH * 0.5 + this.size * 2; // No tan arriba
        this.wingFrame = 0;
        this.tick = Math.floor(Math.random() * 20);
        this.vx = (0.15 + Math.random() * 0.25) * (Math.random() < 0.5 ? 1 : -1);
        this.vy = (Math.random() - 0.5) * 0.05;
    }
    step() {
        this.tick++;
        if (this.tick % 10 === 0) this.wingFrame = (this.wingFrame + 1) % 2; // Aleteo más lento
        this.x += this.vx; this.y += this.vy;
        if (this.x < -this.size*2 || this.x > lowW + this.size*2 || this.y < -this.size*2 || this.y > lowH * 0.6) {
            this.x = this.vx > 0 ? -this.size : lowW + this.size;
            this.y = Math.random() * lowH * 0.5;
        }
    }
    draw(ctx = renderCtx) {
        const s = 1; 
        const bodyX = Math.floor(this.x);
        const bodyY = Math.floor(this.y);
        drawPixel(bodyX + s, bodyY + s, options.colors.bat, s, ctx);
        if(this.size > 2) drawPixel(bodyX + 2 * s, bodyY + s, options.colors.bat, s, ctx);
        
        if (this.wingFrame === 0) {
            drawPixel(bodyX, bodyY, options.colors.bat, s, ctx);
            drawPixel(bodyX + (this.size > 2 ? 3:2) * s, bodyY, options.colors.bat, s, ctx);
        } else {
            drawPixel(bodyX, bodyY + s, options.colors.bat, s, ctx);
            drawPixel(bodyX + (this.size > 2 ? 3:2) * s, bodyY + s, options.colors.bat, s, ctx);
        }
    }
}

class Letter {
    constructor(char, x, y) { // x, y son el centro deseado del carácter
        this.char = char;
        this.x = x; this.y = y; 

        renderCtx.font = options.charSize + 'px ' + options.fonts.main;
        renderCtx.textAlign = 'center'; 
        renderCtx.textBaseline = 'middle'; 
        // const textMetrics = renderCtx.measureText(this.char); // No es necesario con center/middle
        this.dx = 0; this.dy = 0; 
        
        this.fireworkDy = this.y - calc.cy; // Usar calc.cy (centro de baja res)
        this.fireworkStartX = 0; this.fireworkStartY = calc.cy;
        
        const stringIndex = options.strings.findIndex(s => s.toUpperCase().includes(this.char.toUpperCase()));
        this.textColor = options.colors.text[stringIndex % options.colors.text.length];
        this.reset();
    }
    reset() {
        this.phase = 'firework'; this.tick = 0; this.spawned = false;
        this.spawningTime = options.fireworkSpawnTime * Math.random() | 0;
        this.reachTime = options.fireworkBaseReachTime + options.fireworkAddedReachTime * Math.random() | 0;
        this.lineWidth = options.fireworkBaseLineWidth;
        this.prevPoints = [[this.fireworkStartX, this.fireworkStartY, 0]];
        this.shards = [];
        this.fireworkColor = options.colors.fireworkTrail[Math.floor(Math.random() * options.colors.fireworkTrail.length)];
        this.explosionColor = options.colors.fireworkExplosion[Math.floor(Math.random() * options.colors.fireworkExplosion.length)];
    }
    cleanupShards() { this.shards.forEach(returnShard); this.shards = []; }

    step(ctx = renderCtx) {
        ctx.font = options.charSize + 'px ' + options.fonts.main;
        ctx.textAlign = 'center';   
        ctx.textBaseline = 'middle'; 
        if (this.phase === 'firework') {
            if (!this.spawned) { ++this.tick; if (this.tick >= this.spawningTime) { this.tick = 0; this.spawned = true; }}
            else {
                ++this.tick;
                const easedProportion = easeOutQuad(this.tick / this.reachTime);
                const currentX = this.fireworkStartX + (this.x - this.fireworkStartX) * easedProportion;
                const armonicProportion = Math.sin((this.tick / this.reachTime) * (Math.PI / 2));
                const currentY = this.fireworkStartY + (this.y - this.fireworkStartY) * armonicProportion;
                if(this.prevPoints.length > 0) {
                    const prev = this.prevPoints[this.prevPoints.length-1];
                    line(prev[0], prev[1], currentX, currentY, this.fireworkColor, this.lineWidth, ctx);
                }
                this.prevPoints.push([currentX, currentY]);
                if(this.prevPoints.length > options.fireworkPrevPoints) this.prevPoints.shift();
                if (this.tick >= this.reachTime) {
                    this.phase = 'contemplate'; this.tick = 0; this.tick2 = 0;
                    this.circleFinalSize = options.fireworkCircleBaseSize + options.fireworkCircleAddedSize * Math.random();
                    this.circleCompleteTime = options.fireworkCircleBaseTime + options.fireworkCircleAddedTime * Math.random() | 0;
                    this.circleCreating = true; this.circleFading = false;
                    this.circleFadeTime = options.fireworkCircleFadeBaseTime + options.fireworkCircleFadeAddedTime * Math.random() | 0;
                    this.cleanupShards();
                    const shardCount = options.fireworkBaseShards + options.fireworkAddedShards * Math.random() | 0;
                    const angle = Tau / shardCount, cos = Math.cos(angle), sin = Math.sin(angle);
                    let sx = 1, sy = 0;
                    for (let i = 0; i < shardCount; ++i) {
                        const x1 = sx; sx = sx * cos - sy * sin; sy = sy * cos + x1 * sin;
                        this.shards.push(getShard(this.x, this.y, sx, sy, this.explosionColor));
                    }
                }
            }
        } else if (this.phase === 'contemplate') {
            ++this.tick;
            if (this.circleCreating) {
                ++this.tick2;
                const p = easeOutQuad(this.tick2 / this.circleCompleteTime);
                circle(this.x, this.y, p * this.circleFinalSize, this.explosionColor, ctx);
                if (this.tick2 > this.circleCompleteTime) { this.tick2 = 0; this.circleCreating = false; this.circleFading = true; }
            } else if (this.circleFading) {
                ctx.fillStyle = this.textColor;
                ctx.fillText(this.char, Math.floor(this.x + this.dx), Math.floor(this.y + this.dy));
                ++this.tick2;
                const p = 1 - easeOutQuad(this.tick2 / this.circleFadeTime);
                if (p > 0.1) circle(this.x, this.y, this.circleFinalSize, this.explosionColor.replace(')', `,${p.toFixed(1)})`), ctx); // Simular fade
                if (this.tick2 >= this.circleFadeTime) this.circleFading = false;
            } else {
                ctx.fillStyle = this.textColor;
                ctx.fillText(this.char, Math.floor(this.x + this.dx), Math.floor(this.y + this.dy));
            }
            for (let i = 0; i < this.shards.length; ++i) {
                this.shards[i].step(ctx);
                if (!this.shards[i].alive) { returnShard(this.shards.splice(i, 1)[0]); --i; }
            }
            if (this.tick > options.letterContemplatingWaitTime) {
                this.phase = 'ghost'; this.tick = 0; this.spawning = true;
                this.spawnTime = options.balloonSpawnTime * Math.random() | 0;
                this.inflating = false;
                this.inflateTime = options.balloonBaseInflateTime + options.balloonAddedInflateTime * Math.random() | 0;
                this.size = options.balloonBaseSize + options.balloonAddedSize * Math.random() | 0;
                const rad = options.balloonBaseRadian + options.balloonAddedRadian * Math.random();
                const vel = options.balloonBaseVel + options.balloonAddedVel * Math.random();
                this.vx = Math.cos(rad) * vel; this.vy = Math.sin(rad) * vel;
                this.cleanupShards();
            }
        } else if (this.phase === 'ghost') {
            if (this.spawning) {
                ++this.tick; ctx.fillStyle = this.textColor;
                ctx.fillText(this.char, Math.floor(this.x + this.dx), Math.floor(this.y + this.dy));
                if (this.tick >= this.spawnTime) { this.tick = 0; this.spawning = false; this.inflating = true; }
            } else if (this.inflating) {
                ++this.tick;
                const p = easeInOutSine(this.tick / this.inflateTime);
                this.currentGhostSize = this.size * p;
                this.cx = this.x; 
                this.cy = this.y - this.currentGhostSize / 2; 
                drawGhost(this.cx, this.cy, this.currentGhostSize, options.colors.ghost, ctx);
                ctx.fillStyle = this.textColor;
                ctx.fillText(this.char, Math.floor(this.x + this.dx), Math.floor(this.y + this.dy));
                if (this.tick >= this.inflateTime) { 
                    this.tick = 0; this.inflating = false; 
                    this.textAttachedXOffset = (this.x + this.dx) - this.cx;
                    this.textAttachedYOffset = (this.y + this.dy) - (this.cy + this.currentGhostSize*0.5); // Offset from ghost center
                }
            } else { 
                this.cx += this.vx; this.cy += this.vy; this.vy += options.upFlow;
                drawGhost(this.cx, this.cy, this.size, options.colors.ghost, ctx);
                ctx.fillStyle = this.textColor;
                const textDrawX = this.cx + this.textAttachedXOffset;
                const textDrawY = this.cy + this.size * 0.5 + this.textAttachedYOffset;
                ctx.fillText(this.char, Math.floor(textDrawX), Math.floor(textDrawY));
                if (this.cy + this.size < -options.charSize || this.cx < -this.size || this.cx > lowW + this.size || this.cy - this.size > lowH + options.charSize) {
                    this.phase = 'done';
                }
            }
        }
    }
}

class Shard {
    constructor(x,y,vx,vy,color) {this.reset(x,y,vx,vy,color);}
    reset(x,y,vx,vy,color){
        const vel = options.fireworkShardBaseVel + options.fireworkShardAddedVel * Math.random();
        this.vx = vx * vel; this.vy = vy * vel; this.x = x; this.y = y;
        this.color = color; 
        this.alive = true; this.size = options.fireworkShardBaseSize;
        this.life = 0; this.maxLife = 15 + Math.random() * 10; // Shorter life for pixel shards
    }
    step(ctx = renderCtx){
        if (!this.alive) return; this.life++;
        this.x += this.vx; this.y += this.vy; this.vy += options.gravity;
        const alpha = Math.max(0, 1 - (this.life / this.maxLife));
        if (alpha > 0.1) {
             drawPixel(this.x, this.y, this.color, this.size, ctx);
        }
        if (this.y > lowH + this.size || this.y < -this.size || this.x < -this.size || this.x > lowW + this.size || this.life >= this.maxLife) this.alive = false;
    }
}

class PumpkinPlant {
    constructor(x, y) {
        this.x = Math.floor(x); 
        this.y = Math.floor(y);
        this.initialSize = 0; 
        this.finalSize = 6 + Math.floor(Math.random() * 5); 
        this.currentSize = this.initialSize;
        this.growthTime = 180 + Math.random() * 120; // Slower growth
        this.tick = 0;
        this.stemHeight = 0;
        this.maxStemHeight = 3 + Math.random() * 2;
        this.alpha = 0; // Para el fade in general
    }
    step(ctx = renderCtx) {
        this.tick++;
        if (this.currentSize < this.finalSize) {
            const growthProgress = easeOutCubic(this.tick / this.growthTime);
            this.currentSize = growthProgress * this.finalSize;
            this.currentSize = Math.min(this.currentSize, this.finalSize);
            this.stemHeight = growthProgress * this.maxStemHeight;
            this.alpha = Math.min(1, growthProgress * 1.5); // Fade in as it grows
        } else {
            this.alpha = 1;
        }
        ctx.globalAlpha = this.alpha; // Apply general alpha
        if (this.stemHeight > 0) {
            for (let i = 0; i < Math.floor(this.stemHeight); i++) {
                fillRect(this.x + Math.floor(this.currentSize/2) -1 , this.y - i, 2, 1, options.colors.plantStem, ctx);
            }
        }
        if (this.currentSize >= 2) {
            const s = Math.floor(this.currentSize);
            const pumpkinY = this.y - Math.floor(this.stemHeight) - s;
            // Cuerpo calabaza
            circle(this.x + s/2, pumpkinY + s/2, s/2, options.colors.pumpkinBody, ctx);
            // Tallo arriba
            fillRect(this.x + s/2 -1, pumpkinY -1, 2,1, options.colors.plantStem, ctx);

            if (s > 4) { // Cara
                const eyeSize = 1;
                fillRect(this.x + s * 0.25, pumpkinY + s * 0.3, eyeSize, eyeSize, options.colors.pumpkinFace, ctx); 
                fillRect(this.x + s * 0.65, pumpkinY + s * 0.3, eyeSize, eyeSize, options.colors.pumpkinFace, ctx); 
                fillRect(this.x + s * 0.3, pumpkinY + s * 0.65, s*0.4, eyeSize, options.colors.pumpkinFace, ctx);
            }
        }
        ctx.globalAlpha = 1; // Reset alpha
    }
}

class YarnBall {
    constructor() {
        this.radius = 3; 
        this.x = lowW / 2;
        // Ajuste para que this.y esté sobre el gato, si el gato existe
        const catHeightEstimate = (new PixelCat().height); // Estimar altura del gato
        this.y = lowH - this.radius - catHeightEstimate - 2; 
        this.vx = (0.6 + Math.random() * 0.4) * (Math.random() < 0.5 ? 1 : -1);
        this.color = options.colors.yarnBall;
        this.rotation = 0;
        this.rotationSpeed = this.vx * 0.15;
        this.tailPoints = Array(4).fill(null).map(() => ({x: this.x, y: this.y}));
    }
    step() {
        this.x += this.vx;
        this.rotation += this.rotationSpeed;
        if (this.x + this.radius > lowW || this.x - this.radius < 0) {
            this.vx *= -1; this.rotationSpeed = this.vx * 0.15;
            this.x = Math.max(this.radius, Math.min(lowW - this.radius, this.x));
        }
        this.tailPoints.pop(); this.tailPoints.unshift({x: this.x, y: this.y});
    }
    draw(ctx = renderCtx) {
        for(let i = 1; i < this.tailPoints.length; i++) {
            line(this.tailPoints[i-1].x, this.tailPoints[i-1].y, this.tailPoints[i].x, this.tailPoints[i].y, this.color, 1, ctx);
        }
        circle(this.x, this.y, this.radius, this.color, ctx);
        for(let i=0; i<2; i++){ // Menos "pelos"
            const ang = Math.random() * Tau;
            line(this.x, this.y, this.x + Math.cos(ang)*this.radius*1.3, this.y + Math.sin(ang)*this.radius*1.3, this.color,1,ctx);
        }
    }
}

class PixelCat {
    constructor() {
        this.pixelArtSize = 1; 
        this.bodyWidthUnits = 8; // Más pequeño
        this.bodyHeightUnits = 5;
        this.width = this.bodyWidthUnits * this.pixelArtSize;
        this.height = this.bodyHeightUnits * this.pixelArtSize;
        this.x = lowW / 2;
        this.y = lowH - this.height - this.pixelArtSize; // En el suelo
        this.speed = 0.5; 
        this.color = options.colors.pixelCat;
        this.frame = 0; this.animationTick = 0; this.animationSpeed = 12; // Aleteo más lento
        this.direction = 1;
    }
    step(targetX) {
        this.animationTick++;
        if (this.animationTick % this.animationSpeed === 0) this.frame = (this.frame + 1) % 2;
        if (targetX > this.x + this.width / 2 + 1) { this.x += this.speed; this.direction = 1; }
        else if (targetX < this.x - this.width / 2 - 1) { this.x -= this.speed; this.direction = -1; }
        this.x = Math.max(0, Math.min(lowW - this.width, this.x));
    }
    draw(ctx = renderCtx) {
        const s = this.pixelArtSize;
        ctx.save(); ctx.translate(Math.floor(this.x), Math.floor(this.y));
        if (this.direction === -1) { ctx.scale(-1, 1); ctx.translate(-this.width, 0); }
        // Cuerpo más simple
        fillRect(1*s, 1*s, 6*s, 3*s, this.color, ctx); // Cuerpo principal
        // Cabeza
        fillRect(5*s, 0*s, 3*s, 3*s, this.color, ctx);
        // Orejas
        drawPixel(6*s, -1*s, this.color, s, ctx);
        drawPixel(7*s, -1*s, this.color, s, ctx);
        // Cola
        fillRect(0*s, 0*s, s, 2*s, this.color, ctx);
        // Patas
        if (this.frame === 0) {
            fillRect(2*s, 4*s, s, s, this.color, ctx); fillRect(5*s, 4*s, s, s, this.color, ctx);
        } else {
            fillRect(3*s, 4*s, s, s, this.color, ctx); fillRect(4*s, 4*s, s, s, this.color, ctx);
        }
        ctx.restore();
    }
}

class HalloweenCountdown {
    constructor() {
        this.targetDate = this.getNextHalloween();
        this.timeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };
        this.x = lowW / 2; 
        this.y = 3;        // Más arriba
        this.fontSize = options.charSize - 2 > 0 ? options.charSize - 2 : 3; // Aún más pequeño, mínimo 3
        this.color = options.colors.text[0]; 
        this.updateInterval = 1000; 
        this.lastUpdateTime = 0;
        this.isHalloween = false;
        this.updateCountdown(); 
    }
    getNextHalloween() {
        const now = new Date(); let hYear = now.getFullYear();
        let hDate = new Date(hYear, 9, 31, 23, 59, 59);
        if (now > hDate) { hYear++; hDate = new Date(hYear, 9, 31, 23, 59, 59); }
        return hDate;
    }
    updateCountdown() {
        const now = new Date().getTime(), distance = this.targetDate - now;
        if (distance < 0) { this.timeLeft = { d:0,h:0,m:0,s:0 }; this.isHalloween = true; return; }
        this.isHalloween = false;
        this.timeLeft.days = Math.floor(distance/(1000*60*60*24));
        this.timeLeft.hours = Math.floor((distance%(1000*60*60*24))/(1000*60*60));
        this.timeLeft.minutes = Math.floor((distance%(1000*60*60))/(1000*60));
        this.timeLeft.seconds = Math.floor((distance%(1000*60))/1000);
    }
    step(currentTime) {
        if (currentTime - this.lastUpdateTime > this.updateInterval) {
            this.updateCountdown(); this.lastUpdateTime = currentTime;
        }
    }
    draw(ctx = renderCtx) {
        ctx.font = this.fontSize + 'px ' + options.fonts.main;
        ctx.fillStyle = this.color; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        let txt;
        if (this.isHalloween) { txt = "HAPPY HALLOWEEN!"; }
        else {
            const d = String(this.timeLeft.days).padStart(1,'0'); // No necesita pad si es un solo digito
            const h = String(this.timeLeft.hours).padStart(2,'0');
            const m = String(this.timeLeft.minutes).padStart(2,'0');
            const s = String(this.timeLeft.seconds).padStart(2,'0');
            txt = `DIAS PARA HALLOWEEN\n ${d} Diás `; // Más corto
        }
        ctx.fillText(txt, Math.floor(this.x), Math.floor(this.y), Math.floor(lowW - 4)); // max width
    }
}

function setup() {
    // w, h ya están seteados por el listener o al inicio
    initRenderCanvas();
    calc.cx = lowW / 2; calc.cy = lowH / 2; // Renombrar options.cx/cy a calc.cx/cy
    options.cx = calc.cx; options.cy = calc.cy; // Mantener por si alguna clase lo usa directamente

    renderCtx.font = options.charSize + 'px ' + options.fonts.main;
    renderCtx.textAlign = 'center';  
    renderCtx.textBaseline = 'middle'; 

    letters.forEach(letter => letter.cleanupShards());
    letters = []; pumpkinPlants = []; bats = []; shardPool = [];
    initialLetterCount = 0;
    const totalTextHeight = (options.strings.length - 1) * options.lineHeight;
    const startYOverall = calc.cy - totalTextHeight / 2;

    options.strings.forEach((s, sIndex) => {
        const strChars = s.toUpperCase().split('');
        if (strChars.length === 0) return;
        initialLetterCount += strChars.length;
        let currentLineWidth = 0; const charWidths = [];
        for (const char of strChars) {
            const width = renderCtx.measureText(char).width;
            charWidths.push(width); currentLineWidth += width;
            if (strChars.length > 1) currentLineWidth += options.charSpacing;
        }
        if (strChars.length > 1) currentLineWidth -= options.charSpacing;
        
        let currentCharacterXPosition = calc.cx - currentLineWidth / 2;
        const lineY = startYOverall + sIndex * options.lineHeight;

        strChars.forEach((char, charIdx) => {
            const charWidth = charWidths[charIdx];
            const charCenterX = currentCharacterXPosition + charWidth / 2;
            letters.push(new Letter(char, charCenterX, lineY));
            currentCharacterXPosition += charWidth + options.charSpacing;
        });
    });

    for (let i = 0; i < options.pumpkinPlantCount; i++) {
        const randX = Math.random() * lowW * 0.8 + lowW * 0.1;
        const randY = lowH -1;
        pumpkinPlants.push(new PumpkinPlant(randX, randY));
    }
    for (let i = 0; i < options.batCount; i++) bats.push(new Bat());

    pixelCat = new PixelCat(); // Crear gato primero para que yarnBall pueda usar su altura
    yarnBall = new YarnBall();
    halloweenCountdown = new HalloweenCountdown();
    if(halloweenCountdown) halloweenCountdown.lastUpdateTime = performance.now();
}

async function main() {
    if (document.fonts) {
        try { await document.fonts.ready; }
        catch (err) { console.warn('Fonts API error:', err); }
    } else { 
        console.warn('Fonts API not supported, using timeout.');
        await new Promise(resolve => setTimeout(resolve, 250)); // Un poco más de tiempo
    }
    // Set initial w,h before first initRenderCanvas
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    initRenderCanvas();
    setup();
    loop();
}

function loop() {
    requestAnimationFrame(loop);
    const currentTime = performance.now();

    renderCtx.fillStyle = options.colors.background;
    renderCtx.fillRect(0, 0, lowW, lowH);

    if (halloweenCountdown) {
        halloweenCountdown.step(currentTime);
        halloweenCountdown.draw(renderCtx);
    }
    bats.forEach(bat => { bat.step(); bat.draw(renderCtx); });
    renderCtx.globalAlpha = 1; 

    letters.forEach(letter => letter.step(renderCtx));
    pumpkinPlants.forEach(plant => plant.step(renderCtx));
    
    if(yarnBall && pixelCat){
        yarnBall.step(); yarnBall.draw(renderCtx);
        pixelCat.step(yarnBall.x); pixelCat.draw(renderCtx);
    }
    
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(renderCanvas, 0, 0, lowW, lowH, 0, 0, w, h);

    letters = letters.filter(letter => letter.phase !== 'done');
    if (letters.length === 0 && initialLetterCount > 0) {
        if (!loop.restarting) {
            loop.restarting = true;
            setTimeout(() => { setup(); loop.restarting = false; }, 2500); // Más pausa
        }
    }
}
loop.restarting = false;

window.addEventListener('resize', () => {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    main(); // Re-run main to handle font loading and re-setup
});

main();
