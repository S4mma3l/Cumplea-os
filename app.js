const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let w, h, hw, hh;
let initialLetterCount = 0; // Para controlar el reinicio

// --- Options Object ---
const options = {
    strings: ["¡FELIZ", "CUMPLEAÑOS,", "LORENA!"],
    charSize: 40,
    charSpacing: 40,
    lineHeight: 50,
    cx: 0,
    cy: 0,
    fireworkPrevPoints: 10,
    fireworkBaseLineWidth: 4,
    fireworkAddedLineWidth: 6,
    fireworkSpawnTime: 180,
    fireworkBaseReachTime: 25,
    fireworkAddedReachTime: 25,
    fireworkCircleBaseSize: 18,
    fireworkCircleAddedSize: 8,
    fireworkCircleBaseTime: 25,
    fireworkCircleAddedTime: 25,
    fireworkCircleFadeBaseTime: 8,
    fireworkCircleFadeAddedTime: 4,
    fireworkBaseShards: 5,
    fireworkAddedShards: 5,
    fireworkShardPrevPoints: 3,
    fireworkShardBaseVel: 3,
    fireworkShardAddedVel: 1.5,
    fireworkShardBaseSize: 2.5,
    fireworkShardAddedSize: 2.5,
    gravity: 0.08,
    upFlow: -0.08,
    letterContemplatingWaitTime: 300,
    balloonSpawnTime: 18,
    balloonBaseInflateTime: 8,
    balloonAddedInflateTime: 8,
    balloonBaseSize: 18,
    balloonAddedSize: 18,
    balloonBaseVel: 0.3,
    balloonAddedVel: 0.3,
    balloonBaseRadian: -(Math.PI / 2 - 0.5),
    balloonAddedRadian: -1,
    colors: {
        firework: ["hsl(hue, 80%, 65%)", "hsla(hue, 80%, 65%, alp)"],
        textColor: "hsl(hue, 85%, 75%)",
        explosionColorBase: "hsla(hue, 80%, 70%, alp)",
        spookyAccent: "#e0e0e0"
    },
    fonts: {
        main: "Dancing Script, cursive"
    },
    images: {
        sunflower: "sunflower.png",
        kittenSprite: "kitten_sprite.png"
    },
    sunflowerCount: 6,
    kittenCount: 3,
    starCount: 100, // Número de estrellas en el fondo
};

let calc = {
    totalWidth: 0
};

const Tau = Math.PI * 2;
const TauQuarter = Math.PI / 2;

let letters = [];
let sunflowers = [];
let kittens = [];
let stars = []; // Array para las estrellas

// --- Star Class ---
class Star {
    constructor() {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.size = 0.5 + Math.random() * 1.5;
        this.alpha = 0.3 + Math.random() * 0.7;
        this.maxAlpha = this.alpha;
        this.twinkleSpeed = 0.005 + Math.random() * 0.01;
        this.alphaDirection = Math.random() < 0.5 ? 1 : -1;
    }

    step() {
        this.alpha += this.twinkleSpeed * this.alphaDirection;
        if (this.alpha <= 0.1 || this.alpha >= this.maxAlpha) {
            this.alphaDirection *= -1;
            this.alpha = Math.max(0.1, Math.min(this.maxAlpha, this.alpha)); // Clamp
        }

        // Opcional: movimiento lento de estrellas
        // this.x += (Math.random() - 0.5) * 0.1;
        // this.y += (Math.random() - 0.5) * 0.1;
        // if (this.x < 0 || this.x > w || this.y < 0 || this.y > h) {
        //     Object.assign(this, new Star()); // Reinitialize if off-screen
        // }
    }

    draw(ctx) {
        ctx.fillStyle = `hsla(0, 0%, 100%, ${this.alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Tau);
        ctx.fill();
    }
}


class Letter {
    constructor(char, x, y) {
        this.char = char;
        this.x = x;
        this.y = y;

        this.dx = -ctx.measureText(char).width / 2;
        this.dy = +options.charSize / 2;

        this.fireworkDy = this.y - hh;

        const relativeX = this.x - (options.cx - calc.totalWidth / 2);
        this.hue = (calc.totalWidth === 0) ? (Math.random() * 360 | 0) : (relativeX / calc.totalWidth * 360);
        
        this.color = options.colors.firework[0].replace('hue', this.hue);
        this.alphaColorTemplate = options.colors.firework[1].replace('hue', this.hue);
        this.actualTextColor = options.colors.textColor.replace('hue', this.hue);
        this.explosionColorTemplate = options.colors.explosionColorBase.replace('hue', this.hue);

        this.reset();
    }

    reset() {
        this.phase = 'firework';
        this.tick = 0;
        this.spawned = false;
        this.spawningTime = options.fireworkSpawnTime * Math.random() | 0;
        this.reachTime = options.fireworkBaseReachTime + options.fireworkAddedReachTime * Math.random() | 0;
        this.lineWidth = options.fireworkBaseLineWidth + options.fireworkAddedLineWidth * Math.random();
        this.prevPoints = [
            [0, hh, 0]
        ];
    }

    step() {
        if (this.phase === 'firework') {
            if (!this.spawned) {
                ++this.tick;
                if (this.tick >= this.spawningTime) {
                    this.tick = 0;
                    this.spawned = true;
                }
            } else {
                ++this.tick;
                const linearProportion = this.tick / this.reachTime;
                const armonicProportion = Math.sin(linearProportion * TauQuarter);
                
                const x = linearProportion * this.x;
                const y = hh + armonicProportion * this.fireworkDy;

                this.prevPoints.push([x, y, linearProportion * this.lineWidth]);
                if (this.prevPoints.length > options.fireworkPrevPoints) {
                    this.prevPoints.shift();
                }

                const lineWidthProportion = 1 / (this.prevPoints.length - 1);
                for (let i = 1; i < this.prevPoints.length; ++i) {
                    const point = this.prevPoints[i];
                    const point2 = this.prevPoints[i - 1];
                    ctx.strokeStyle = this.alphaColorTemplate.replace('alp', (i / this.prevPoints.length * 0.9).toFixed(3));
                    ctx.lineWidth = point[2] * lineWidthProportion * i;
                    ctx.beginPath();
                    ctx.moveTo(point[0], point[1]);
                    ctx.lineTo(point2[0], point2[1]);
                    ctx.stroke();
                }

                if (this.tick >= this.reachTime) {
                    this.phase = 'contemplate';
                    this.circleFinalSize = options.fireworkCircleBaseSize + options.fireworkCircleAddedSize * Math.random();
                    this.circleCompleteTime = options.fireworkCircleBaseTime + options.fireworkCircleAddedTime * Math.random() | 0;
                    this.circleCreating = true;
                    this.circleFading = false;
                    this.circleFadeTime = options.fireworkCircleFadeBaseTime + options.fireworkCircleFadeAddedTime * Math.random() | 0;
                    this.tick = 0;
                    this.tick2 = 0;
                    this.shards = [];

                    const shardCount = options.fireworkBaseShards + options.fireworkAddedShards * Math.random() | 0;
                    const angle = Tau / shardCount;
                    const cos = Math.cos(angle);
                    const sin = Math.sin(angle);
                    let sx = 1;
                    let sy = 0;

                    for (let i = 0; i < shardCount; ++i) {
                        const x1 = sx;
                        sx = sx * cos - sy * sin;
                        sy = sy * cos + x1 * sin;
                        this.shards.push(new Shard(this.x, this.y, sx, sy, this.alphaColorTemplate));
                    }
                }
            }
        } else if (this.phase === 'contemplate') {
            ++this.tick;
            if (this.circleCreating) {
                ++this.tick2;
                const proportion = this.tick2 / this.circleCompleteTime;
                const armonic = -Math.cos(proportion * Math.PI) / 2 + 0.5;
                ctx.beginPath();
                ctx.fillStyle = this.explosionColorTemplate.replace('alp', (proportion * 0.85).toFixed(3) );
                ctx.arc(this.x, this.y, armonic * this.circleFinalSize, 0, Tau);
                ctx.fill();

                if (this.tick2 > this.circleCompleteTime) {
                    this.tick2 = 0;
                    this.circleCreating = false;
                    this.circleFading = true;
                }
            } else if (this.circleFading) {
                ctx.fillStyle = this.actualTextColor;
                ctx.fillText(this.char, this.x + this.dx, this.y + this.dy);
                ++this.tick2;
                const proportion = this.tick2 / this.circleFadeTime;
                const armonic = -Math.cos(proportion * Math.PI) / 2 + 0.5;
                ctx.beginPath();
                ctx.fillStyle = this.explosionColorTemplate.replace('alp', ((1 - armonic) * 0.85).toFixed(3) );
                ctx.arc(this.x, this.y, this.circleFinalSize, 0, Tau);
                ctx.fill();

                if (this.tick2 >= this.circleFadeTime) {
                    this.circleFading = false;
                }
            } else {
                ctx.fillStyle = this.actualTextColor;
                ctx.fillText(this.char, this.x + this.dx, this.y + this.dy);
            }

            for (let i = 0; i < this.shards.length; ++i) {
                this.shards[i].step();
                if (!this.shards[i].alive) {
                    this.shards.splice(i, 1);
                    --i;
                }
            }

            if (this.tick > options.letterContemplatingWaitTime) {
                this.phase = 'balloon';
                this.tick = 0;
                this.spawning = true;
                this.spawnTime = options.balloonSpawnTime * Math.random() | 0;
                this.inflating = false;
                this.inflateTime = options.balloonBaseInflateTime + options.balloonAddedInflateTime * Math.random() | 0;
                this.size = options.balloonBaseSize + options.balloonAddedSize * Math.random() | 0;
                const rad = options.balloonBaseRadian + options.balloonAddedRadian * Math.random();
                const vel = options.balloonBaseVel + options.balloonAddedVel * Math.random();
                this.vx = Math.cos(rad) * vel;
                this.vy = Math.sin(rad) * vel;
            }
        } else if (this.phase === 'balloon') {
            ctx.strokeStyle = options.colors.spookyAccent; 
            ctx.lineWidth = 1.5;
            if (this.spawning) {
                ++this.tick;
                ctx.fillStyle = this.actualTextColor;
                ctx.fillText(this.char, this.x + this.dx, this.y + this.dy);
                if (this.tick >= this.spawnTime) {
                    this.tick = 0;
                    this.spawning = false;
                    this.inflating = true;
                }
            } else if (this.inflating) {
                ++this.tick;
                const proportion = this.tick / this.inflateTime;
                this.currentBalloonSize = this.size * proportion;
                this.cx = this.x;
                this.cy = this.y - this.currentBalloonSize / 2;

                ctx.fillStyle = this.alphaColorTemplate.replace('alp', proportion.toFixed(3));
                generateBalloonPath(ctx, this.cx, this.cy, this.currentBalloonSize);
                ctx.fill();
                
                ctx.beginPath();
                ctx.moveTo(this.cx, this.cy + this.currentBalloonSize / 2);
                ctx.lineTo(this.x, this.y);
                ctx.stroke();
                
                ctx.fillStyle = this.actualTextColor;
                ctx.fillText(this.char, this.x + this.dx, this.y + this.dy);

                if (this.tick >= this.inflateTime) {
                    this.tick = 0;
                    this.inflating = false;
                }
            } else { 
                this.cx += this.vx;
                this.cy += this.vy;
                this.vy += options.upFlow;

                ctx.fillStyle = this.color;
                generateBalloonPath(ctx, this.cx, this.cy, this.size);
                ctx.fill();

                ctx.beginPath();
                ctx.moveTo(this.cx, this.cy + this.size / 2);
                const textDrawY = this.cy + this.size / 2 + this.dy;
                ctx.lineTo(this.cx + this.dx + ctx.measureText(this.char).width/2 , textDrawY - this.dy);
                ctx.stroke();

                ctx.fillStyle = this.actualTextColor;
                ctx.fillText(this.char, this.cx + this.dx, textDrawY);
                
                if (this.cy + this.size < -options.charSize || this.cx < -this.size || this.cx > w + this.size) {
                    this.phase = 'done';
                }
            }
        }
    }
}

class Shard {
    constructor(x, y, vx, vy, colorTemplate) {
        const vel = options.fireworkShardBaseVel + options.fireworkShardAddedVel * Math.random();
        this.vx = vx * vel;
        this.vy = vy * vel;
        this.x = x;
        this.y = y;
        this.prevPoints = [
            [x, y]
        ];
        this.colorTemplate = colorTemplate;
        this.alive = true;
        this.size = options.fireworkShardBaseSize + options.fireworkShardAddedSize * Math.random();
    }

    step() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += options.gravity;

        this.prevPoints.push([this.x, this.y]);
        if (this.prevPoints.length > options.fireworkShardPrevPoints) {
            this.prevPoints.shift();
        }
        
        for (let k = 0; k < this.prevPoints.length - 1; ++k) {
            const point = this.prevPoints[k];
            const point2 = this.prevPoints[k + 1];
            
            const segmentAlpha = (k + 1) / this.prevPoints.length;
            const overallFadeAlpha = (this.y < hh + h / 4 ? 1 : Math.max(0, (hh + h / 2 - this.y) / (h / 4)));
            const finalAlpha = segmentAlpha * overallFadeAlpha * 0.95;

            ctx.strokeStyle = this.colorTemplate.replace('alp', finalAlpha.toFixed(3));
            ctx.lineWidth = (k + 1) * (this.size / options.fireworkShardPrevPoints);
            ctx.beginPath();
            ctx.moveTo(point[0], point[1]);
            ctx.lineTo(point2[0], point2[1]);
            ctx.stroke();
        }

        if (this.y > h + this.size) {
            this.alive = false;
        }
    }
}

class Sunflower {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 30 + 10 * Math.random();
        this.rotation = Math.random() * Tau;
        this.alpha = 0;
        this.fadeInTime = 60 + Math.random() * 60;
        this.tick = 0; // General purpose tick for animations

        // Sway animation properties
        this.baseRotation = this.rotation;
        this.swayMaxAngle = (Math.random() * 0.1 + 0.05) * (Math.random() < 0.5 ? 1 : -1); // Max sway to one side
        this.swaySpeed = 0.005 + Math.random() * 0.01;


        this.usePlaceholder = !options.images.sunflower.endsWith('.png') && !options.images.sunflower.endsWith('.jpg') && !options.images.sunflower.endsWith('.gif'); 
        
        if (!this.usePlaceholder) {
            this.image = new Image();
            this.image.src = options.images.sunflower;
            this.loaded = false;
            this.image.onload = () => { this.loaded = true; };
            this.image.onerror = () => { 
                console.warn("Failed to load sunflower image, using placeholder: " + options.images.sunflower);
                this.usePlaceholder = true; 
            }
        }
    }

    drawPlaceholder(context) {
        context.save();
        context.translate(this.x, this.y);
        context.rotate(this.rotation); // Use the current rotation (includes sway)
        context.globalAlpha = this.alpha;

        context.fillStyle = "#8B4513"; 
        context.beginPath();
        context.arc(0, 0, this.size * 0.25, 0, Tau);
        context.fill();

        context.fillStyle = "#FFD700"; 
        const petalCount = 8;
        for (let i = 0; i < petalCount; i++) {
            context.save();
            context.rotate(Tau * i / petalCount);
            context.beginPath();
            context.ellipse(0, -this.size * 0.35, this.size * 0.15, this.size * 0.3, 0, 0, Tau);
            context.fill();
            context.restore();
        }
        context.restore();
    }

    step() {
        this.tick++;
        if (this.alpha < 1) {
            this.alpha = Math.min(1, this.tick / this.fadeInTime);
        }

        // Apply sway
        this.rotation = this.baseRotation + Math.sin(this.tick * this.swaySpeed) * this.swayMaxAngle;

        if (this.usePlaceholder) {
            this.drawPlaceholder(ctx);
        } else if (this.loaded) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation); // Use the current rotation (includes sway)
            ctx.globalAlpha = this.alpha;
            try {
                ctx.drawImage(this.image, -this.size / 2, -this.size / 2, this.size, this.size);
            } catch (e) { 
                this.usePlaceholder = true; 
            }
            ctx.restore();
        }
    }
}

class Kitten {
    constructor(x, y) {
        this.x = x;
        this.baseY = y; // Store original y for bobbing
        this.y = y;     // Current y
        this.size = 40 + 15 * Math.random();
        this.alpha = 0;
        this.fadeInTime = 60 + Math.random() * 60;
        
        this.currentFrame = Math.floor(Math.random() * 4);
        this.animationSpeed = 8 + Math.random() * 4;
        this.tick = Math.random() * 100; // General purpose tick

        // Bobbing animation properties
        this.bobAmplitude = 2 + Math.random() * 3; // How much it bobs
        this.bobSpeed = 0.01 + Math.random() * 0.02;

        this.usePlaceholder = !options.images.kittenSprite.endsWith('.png') && !options.images.kittenSprite.endsWith('.jpg') && !options.images.kittenSprite.endsWith('.gif');
        
        if (!this.usePlaceholder) {
            this.image = new Image();
            this.image.src = options.images.kittenSprite;
            this.frameWidth = 64;
            this.frameHeight = 64;
            this.numFrames = 4;
            this.loaded = false;
            this.image.onload = () => { this.loaded = true; };
            this.image.onerror = () => {
                console.warn("Failed to load kitten sprite, using placeholder: " + options.images.kittenSprite);
                this.usePlaceholder = true;
            }
        }
    }
    
    drawPlaceholder(context) {
        context.save();
        // Use this.y which includes the bobbing offset
        context.translate(this.x, this.y); 
        context.globalAlpha = this.alpha;

        const bodyHeight = this.size * 0.6;
        const bodyWidth = this.size * 0.9;
        const headRadius = this.size * 0.25;
        const earSize = this.size * 0.15;

        context.fillStyle = "#B0B0B0"; 
        context.fillRect(-bodyWidth / 2, -bodyHeight / 2 + headRadius * 0.8, bodyWidth, bodyHeight);

        context.fillStyle = "#C8C8C8"; 
        context.beginPath();
        context.arc(0, -bodyHeight / 2 + headRadius * 0.3, headRadius, 0, Tau);
        context.fill();

        context.fillStyle = "#B0B0B0";
        context.beginPath();
        context.moveTo(-headRadius * 0.7, -bodyHeight/2 - headRadius * 0.3);
        context.lineTo(-headRadius * 0.7 - earSize, -bodyHeight/2 - headRadius * 0.3 - earSize);
        context.lineTo(-headRadius * 0.7 + earSize * 0.2, -bodyHeight/2 - headRadius * 0.3 - earSize * 0.5);
        context.closePath();
        context.fill();

        context.beginPath();
        context.moveTo(headRadius * 0.7, -bodyHeight/2 - headRadius * 0.3);
        context.lineTo(headRadius * 0.7 + earSize, -bodyHeight/2 - headRadius * 0.3 - earSize);
        context.lineTo(headRadius * 0.7 - earSize * 0.2, -bodyHeight/2 - headRadius * 0.3 - earSize * 0.5);
        context.closePath();
        context.fill();

        context.fillStyle = "#000000";
        const eyeY = -bodyHeight / 2 + headRadius * 0.2;
        if (this.currentFrame % 3 === 0) { 
            context.fillRect(-headRadius * 0.4 - (this.size * 0.03), eyeY - (this.size*0.01), this.size * 0.06, this.size * 0.02);
            context.fillRect( headRadius * 0.4 - (this.size * 0.03), eyeY - (this.size*0.01), this.size * 0.06, this.size * 0.02);
        } else {
            context.beginPath();
            context.arc(-headRadius * 0.4, eyeY, this.size * 0.04, 0, Tau);
            context.fill();
            context.beginPath();
            context.arc(headRadius * 0.4, eyeY, this.size * 0.04, 0, Tau);
            context.fill();
        }
        context.restore();
    }


    step() {
        this.tick++;
        if (this.alpha < 1) {
            // Use general tick for fadeIn to avoid conflict if fadeInTick was separate
            this.alpha = Math.min(1, this.tick / this.fadeInTime);
        }

        // Apply bobbing
        this.y = this.baseY + Math.sin(this.tick * this.bobSpeed) * this.bobAmplitude;
        
        this.currentFrame = Math.floor(this.tick / this.animationSpeed) % (this.usePlaceholder ? 3 : this.numFrames);

        if (this.usePlaceholder) {
            this.drawPlaceholder(ctx);
        } else if (this.loaded) {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            // Use this.y which includes the bobbing offset
            // We draw the sprite centered at (this.x, this.y - this.size / 2) if this.y is the bottom
            // Or centered at (this.x, this.y) if this.y is the center. Assuming this.y is the visual center.
            const drawX = this.x - (this.usePlaceholder ? 0 : this.size / 2); // Placeholder draw logic already centers
            const drawY = this.y - (this.usePlaceholder ? 0 : this.size / 2); // Placeholder draw logic already centers

            try {
                if(this.usePlaceholder) { // Should not happen if loaded is true, but as a safeguard
                    this.drawPlaceholder(ctx);
                } else {
                    ctx.drawImage(this.image, this.currentFrame * this.frameWidth, 0, this.frameWidth, this.frameHeight,
                        this.x - this.size / 2, this.y - this.size / 2, this.size, this.size); // Draw image centered
                }
            } catch (e) {
                this.usePlaceholder = true;
            }
            ctx.restore();
        }
	}
}

function generateBalloonPath(context, x, y, size) {
    const r = size / 2;
    const K = 0.552284749831;
    const ox = r * K;
    const oy = r * K * 1.2; 
    
    context.beginPath();
    context.moveTo(x, y - r * 1.1);
    context.bezierCurveTo(x + ox, y - r * 1.1, x + r, y - oy * 0.8, x + r, y);
    context.bezierCurveTo(x + r, y + oy, x + ox, y + r, x, y + r);
    context.bezierCurveTo(x - ox, y + r, x - r, y + oy, x - r, y);
    context.bezierCurveTo(x - r, y - oy * 0.8, x - ox, y - r * 1.1, x, y - r * 1.1);
    context.closePath();
}

function setup() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    hw = w / 2;
    hh = h / 2;

    options.cx = hw;
    options.cy = hh;

    let maxStrLength = 0;
    if (options.strings.length > 0) {
        maxStrLength = Math.max(...options.strings.map(str => str.length));
    }
    maxStrLength = Math.max(1, maxStrLength);
    calc.totalWidth = (maxStrLength -1) * options.charSpacing;
    if (maxStrLength === 1) calc.totalWidth = options.charSpacing;

    ctx.font = options.charSize + 'px ' + options.fonts.main;

    letters = [];
    sunflowers = [];
    kittens = [];
    stars = []; // Clear and repopulate stars on setup

    initialLetterCount = 0; // Reset for current setup

    const totalTextHeight = (options.strings.length -1) * options.lineHeight;
    const startYOverall = options.cy - totalTextHeight / 2;

    options.strings.forEach((s, sIndex) => {
        const strChars = s.split('');
        if (strChars.length === 0) return;
        initialLetterCount += strChars.length; // Count letters as they are about to be created

        const currentLineWidth = (strChars.length - 1) * options.charSpacing;
        const startXLine = options.cx - currentLineWidth / 2;

        strChars.forEach((char, charIndex) => {
            const charX = startXLine + charIndex * options.charSpacing;
            const charY = startYOverall + sIndex * options.lineHeight;
            letters.push(new Letter(char, charX, charY));
        });
    });

    for (let i = 0; i < options.sunflowerCount; i++) {
        const randX = Math.random() * w;
        const randY = h * (0.8 + Math.random() * 0.15);
        sunflowers.push(new Sunflower(randX, randY));
    }

    for (let i = 0; i < options.kittenCount; i++) {
        const randX = Math.random() * w;
        const randY = h * (0.75 + Math.random() * 0.20);
        kittens.push(new Kitten(randX, randY));
    }

    for (let i = 0; i < options.starCount; i++) {
        stars.push(new Star());
    }
}

function loop() {
    requestAnimationFrame(loop);
    ctx.fillStyle = '#111111';
    ctx.fillRect(0,0,w,h);

    stars.forEach(star => {
        star.step();
        star.draw(ctx);
    });

    letters.forEach(letter => letter.step());
    sunflowers.forEach(sunflower => sunflower.step());
    kittens.forEach(kitten => kitten.step());

    letters = letters.filter(letter => letter.phase !== 'done');

    // Check if all letters are done and there were letters to begin with
    if (letters.length === 0 && initialLetterCount > 0) {
        // Optional: add a small delay before restarting to see the "empty" state
        // setTimeout(setup, 1000); 
        setup(); // Restart the animation
    }
}

window.addEventListener('resize', setup);

setup(); // Initial setup
loop(); // Start the animation loop