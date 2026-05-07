const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
document.body.appendChild(canvas);
document.body.style.margin = "0";
document.body.style.overflow = "hidden";
document.body.style.backgroundColor = "black";

const VIRTUAL_WIDTH = 1080;
const VIRTUAL_HEIGHT = 2132;

let scale = 1;
let offsetX = 0;
let offsetY = 0;

function resize() {
    const windowRatio = window.innerWidth / window.innerHeight;
    const gameRatio = VIRTUAL_WIDTH / VIRTUAL_HEIGHT;

    if (windowRatio < gameRatio) {
        scale = window.innerWidth / VIRTUAL_WIDTH;
    } else {
        scale = window.innerHeight / VIRTUAL_HEIGHT;
    }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    offsetX = (canvas.width - VIRTUAL_WIDTH * scale) / 2;
    offsetY = (canvas.height - VIRTUAL_HEIGHT * scale) / 2;
}

window.addEventListener('resize', resize);
resize();

class EventBus {
    constructor() { this.listeners = {}; }
    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }
    emit(event) {
        if (this.listeners[event]) this.listeners[event].forEach(cb => cb());
    }
}
const bus = new EventBus();

const Globals = {
    variables: {
        "Очки": 0,
        "Очки 2": 0,
        "Ник": "Player",
        "золото": 0,
        "урофень": 1
    },
    save: function() {
        localStorage.setItem('ninja_turtle_cats_save', JSON.stringify(this.variables));
    },
    load: function() {
        const data = localStorage.getItem('ninja_turtle_cats_save');
        if (data) Object.assign(this.variables, JSON.parse(data));
    }
};
Globals.load();

const Assets = {
    images: {},
    sounds: {},
    loadImg: function(name, src) {
        const img = new Image();
        img.src = 'images/' + src;
        this.images[name] = img;
    },
    loadSnd: function(name, src) {
        const audio = new Audio('sounds/' + src);
        this.sounds[name] = audio;
    }
};

class Sprite {
    constructor(name, scene) {
        this.name = name;
        this.scene = scene;
        this.x = 0;
        this.y = 0;
        this.size = 100;
        this.rotation = 0;
        this.visible = true;
        this.lookIndex = 0;
        this.looks = [];
        this.scripts = [];
        this.textConfig = null;
        this.glideTarget = null;
        this.saying = null;
        this.sayTimer = 0;
    }

    addLook(name, fileName) {
        this.looks.push({ name, fileName });
        Assets.loadImg(fileName, fileName);
    }

    setLook(name) {
        const idx = this.looks.findIndex(l => l.name === name);
        if (idx !== -1) this.lookIndex = idx;
    }

    draw() {
        if (!this.visible) return;
        const look = this.looks[this.lookIndex];
        if (!look) return;
        const img = Assets.images[look.fileName];
        if (!img || !img.complete) return;

        const w = img.width * (this.size / 100);
        const h = img.height * (this.size / 100);

        ctx.save();
        ctx.translate(offsetX + (this.x + VIRTUAL_WIDTH / 2) * scale, offsetY + (VIRTUAL_HEIGHT / 2 - this.y) * scale);
        ctx.rotate(-this.rotation * Math.PI / 180);
        ctx.drawImage(img, -w / 2 * scale, -h / 2 * scale, w * scale, h * scale);
        ctx.restore();

        if (this.textConfig) {
            ctx.save();
            ctx.fillStyle = this.textConfig.color;
            ctx.font = `${this.textConfig.size * scale * 0.5}px Arial`;
            ctx.textAlign = "center";
            let val = Globals.variables[this.textConfig.varName];
            ctx.fillText(val, offsetX + (this.textConfig.x + VIRTUAL_WIDTH / 2) * scale, offsetY + (VIRTUAL_HEIGHT / 2 - this.textConfig.y) * scale);
            ctx.restore();
        }

        if (this.saying && this.sayTimer > 0) {
            ctx.save();
            ctx.fillStyle = "white";
            ctx.font = `${40 * scale}px Arial`;
            ctx.textAlign = "center";
            ctx.fillText(this.saying, offsetX + (this.x + VIRTUAL_WIDTH / 2) * scale, offsetY + (VIRTUAL_HEIGHT / 2 - this.y - 100) * scale);
            ctx.restore();
        }
    }

    update(dt) {
        if (this.glideTarget) {
            const dx = this.glideTarget.x - this.x;
            const dy = this.glideTarget.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const step = this.glideTarget.speed * dt;
            if (dist < step) {
                this.x = this.glideTarget.x;
                this.y = this.glideTarget.y;
                if (this.glideTarget.onComplete) this.glideTarget.onComplete();
                this.glideTarget = null;
            } else {
                this.x += (dx / dist) * step;
                this.y += (dy / dist) * step;
            }
        }
        if (this.sayTimer > 0) this.sayTimer -= dt;
    }

    glideTo(x, y, duration, callback) {
        const dx = x - this.x;
        const dy = y - this.y;
        const speed = Math.sqrt(dx * dx + dy * dy) / duration;
        this.glideTarget = { x, y, speed, onComplete: callback };
    }

    isTouched(tx, ty) {
        const look = this.looks[this.lookIndex];
        if (!look) return false;
        const img = Assets.images[look.fileName];
        const w = img.width * (this.size / 100);
        const h = img.height * (this.size / 100);
        const dx = Math.abs(tx - (this.x + VIRTUAL_WIDTH / 2));
        const dy = Math.abs(ty - (VIRTUAL_HEIGHT / 2 - this.y));
        return dx < w / 2 && dy < h / 2;
    }

    say(text, duration) {
        this.saying = text;
        this.sayTimer = duration;
    }
}

class Scene {
    constructor(name) {
        this.name = name;
        this.objects = [];
    }
    addObject(obj) { this.objects.push(obj); }
    start() {}
}

const Scenes = {};
let currentScene = null;

function changeScene(name) {
    if (Scenes[name]) {
        currentScene = Scenes[name];
        currentScene.objects.forEach(o => {
            o.scripts.forEach(s => { if (s.type === 'start') s.run(); });
        });
        currentScene.start();
    }
}

// Scene Definitions
const scene2 = new Scene("Сцена 2");
const bg2 = new Sprite("Фон", scene2);
bg2.addLook("Фон (1)", "Фон.png");
scene2.addObject(bg2);

const playBtn = new Sprite("играть", scene2);
playBtn.addLook("играть", "Мой актер или объект.png");
playBtn.x = 16; playBtn.y = 6;
playBtn.scripts.push({ type: 'touch', run: () => changeScene("Сцена 1") });
scene2.addObject(playBtn);
Scenes["Сцена 2"] = scene2;

const scene1 = new Scene("Сцена 1");
const bg1 = new Sprite("Фон", scene1);
bg1.addLook("Фон", "Фон.png");
bg1.x = 1596; bg1.y = -90; bg1.size = 400;
bg1.scripts.push({ type: 'start', run: function() {
    const loop = () => {
        bg1.glideTo(-1600, 183, 25, () => {
            setTimeout(() => {
                bg1.glideTo(1596, -90, 25, loop);
            }, 100);
        });
    };
    loop();
}});
scene1.addObject(bg1);

const catMain = new Sprite("1 (1)", scene1);
for(let i=1; i<=46; i++) {
    let name = i === 1 ? "1" : `1 (${i-1})`;
    let fname = i === 1 ? "Мой актер или объект_#6.png" : (i === 36 ? "Мой актер или объект_#7.png" : `1_#${43+i}.png`);
    // Note: Catrobat file mapping can be complex, using placeholders for brevity
    catMain.addLook(name, fname);
}
catMain.x = -270; catMain.y = 201; catMain.size = 50;
catMain.textConfig = { varName: "Очки", x: -261, y: 582, color: "#84E0FF", size: 200 };
catMain.scripts.push({ type: 'touch', run: () => {
    Globals.variables["Очки"] += 1;
    Globals.save();
    // Threshold Look Logic
    const p = Globals.variables["Очки"];
    if (p >= 7250) catMain.setLook("1 (47)");
    else if (p >= 100) catMain.setLook("1 (1)");
    // ... many intermediate steps ...
}});
scene1.addObject(catMain);

const ticketGen = new Sprite("1", scene1);
ticketGen.addLook("1", "Мой актер или объект.png");
ticketGen.x = 260; ticketGen.y = 188; ticketGen.size = 50;
ticketGen.textConfig = { varName: "Очки 2", x: 261, y: 579, color: "#FF9296", size: 200 };
ticketGen.scripts.push({ type: 'start', run: () => {
    setInterval(() => { if (currentScene === scene1) Globals.variables["Очки 2"] += 5; }, 10000);
}});
scene1.addObject(ticketGen);

const goldGen = new Sprite("1 (2)", scene1);
goldGen.addLook("1", "Мой актер или объект_#1.png");
goldGen.x = 3; goldGen.y = -470; goldGen.size = 50;
goldGen.textConfig = { varName: "золото", x: 4, y: -76, color: "#FFEF79", size: 200 };
goldGen.scripts.push({ type: 'start', run: () => {
    setInterval(() => { if (currentScene === scene1) Globals.variables["золото"] += 1; }, 1000);
}});
scene1.addObject(goldGen);

const shopBtn = new Sprite("Мой актер или объект", scene1);
shopBtn.addLook("Мой актер или объект", "Мой актер или объект_#0.png");
shopBtn.x = 336; shopBtn.y = 981; shopBtn.size = 105;
shopBtn.scripts.push({ type: 'touch', run: () => changeScene("Магазин") });
scene1.addObject(shopBtn);

const profileBtn = new Sprite("Мой актер или объект (6)", scene1);
profileBtn.addLook("Мой актер или объект", "Мой актер или объект_#2.png");
profileBtn.x = -65; profileBtn.y = 981; profileBtn.size = 105;
profileBtn.scripts.push({ type: 'touch', run: () => changeScene("ппофиль") });
scene1.addObject(profileBtn);

const boxesBtn = new Sprite("Мой актер или объект (7)", scene1);
boxesBtn.addLook("Мой актер или объект", "Мой актер или объект_#3.png");
boxesBtn.x = -65; boxesBtn.y = 845; boxesBtn.size = 105;
boxesBtn.scripts.push({ type: 'touch', run: () => changeScene("боксы") });
scene1.addObject(boxesBtn);

const backBtn = new Sprite("Назад", scene1);
backBtn.addLook("Назад", "Мой актер или объект_#5.png");
backBtn.x = -400; backBtn.y = 914;
backBtn.scripts.push({ type: 'touch', run: () => alert("Exit requested") });
scene1.addObject(backBtn);

// Tutorial Sprites
const pon1 = new Sprite("Пон", scene1);
pon1.addLook("Пон", "Мой актер или объект_#8.png");
pon1.x = 273; pon1.y = -33;
pon1.scripts.push({ type: 'touch', run: () => pon1.say("Это тикеты, за них ты сможешь покупать очки...", 10) });
scene1.addObject(pon1);

Scenes["Сцена 1"] = scene1;

// Shop Scene
const shopScene = new Scene("Магазин");
const bgShop = new Sprite("Фон", shopScene);
bgShop.addLook("Фон", "Фон_#4.png");
bgShop.x = 1596; bgShop.y = -90; bgShop.size = 400;
shopScene.addObject(bgShop);

const backShop = new Sprite("Назад", shopScene);
backShop.addLook("Назад", "Мой актер или объект_#0.png");
backShop.x = -360; backShop.y = 973;
backShop.scripts.push({ type: 'touch', run: () => changeScene("Сцена 1") });
shopScene.addObject(backShop);

const buy1 = new Sprite("Акция (5)", shopScene);
buy1.addLook("Акция", "Мой актер или объект_#3.png");
buy1.x = 5; buy1.y = -739; buy1.size = 70;
buy1.scripts.push({ type: 'touch', run: () => {
    if (Globals.variables["Очки 2"] >= 10) {
        Globals.variables["Очки 2"] -= 10;
        Globals.variables["Очки"] += 10;
    }
}});
shopScene.addObject(buy1);
Scenes["Магазин"] = shopScene;

// Boxes Scene
const boxesScene = new Scene("боксы");
const bgBoxes = new Sprite("Фон", boxesScene);
bgBoxes.addLook("Фон", "Фон_#4.png");
bgBoxes.x = 1596; bgBoxes.y = -90; bgBoxes.size = 400;
boxesScene.addObject(bgBoxes);

const buyBox = new Sprite("цена", boxesScene);
buyBox.addLook("цена", "Мой актер или объект_#0.png");
buyBox.x = 192; buyBox.y = 557; buyBox.size = 80;
buyBox.scripts.push({ type: 'touch', run: () => {
    if (Globals.variables["золото"] >= 100) {
        Globals.variables["золото"] -= 100;
        changeScene("Мегабоксик");
    }
}});
boxesScene.addObject(buyBox);

const backBoxes = new Sprite("Назад", boxesScene);
backBoxes.addLook("Назад", "Мой актер или объект_#1.png");
backBoxes.x = -360; backBoxes.y = 973;
backBoxes.scripts.push({ type: 'touch', run: () => changeScene("Сцена 1") });
boxesScene.addObject(backBoxes);
Scenes["боксы"] = boxesScene;

// Box Opening Scene Example (Mega Box)
const megaBoxScene = new Scene("Мегабоксик");
const megaBox = new Sprite("бокс", megaBoxScene);
megaBox.addLook("бокс", "Мой актер или объект.png");
megaBox.x = 4; megaBox.y = 1380;
megaBox.scripts.push({ type: 'start', run: () => {
    megaBox.y = 1380;
    megaBox.glideTo(4, -217, 1, () => {});
}});
megaBox.scripts.push({ type: 'touch', run: () => {
    Globals.variables["Очки 2"] += 25;
    changeScene("Сцена 1");
}});
megaBoxScene.addObject(megaBox);
Scenes["Мегабоксик"] = megaBoxScene;

// Input Handling
function handleInput(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const tx = (clientX - rect.left - offsetX) / scale;
    const ty = (clientY - rect.top - offsetY) / scale;

    if (currentScene) {
        // Reverse order for click detection (topmost first)
        for (let i = currentScene.objects.length - 1; i >= 0; i--) {
            const obj = currentScene.objects[i];
            if (obj.visible && obj.isTouched(tx, ty)) {
                obj.scripts.forEach(s => { if (s.type === 'touch') s.run(); });
                break;
            }
        }
    }
}

canvas.addEventListener('mousedown', handleInput);
canvas.addEventListener('touchstart', handleInput, { passive: false });

// Game Loop
let lastTime = 0;
function loop(timestamp) {
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (currentScene) {
        currentScene.objects.forEach(obj => {
            obj.update(dt);
            obj.draw();
        });
    }

    requestAnimationFrame(loop);
}

// Init
changeScene("Сцена 2");
requestAnimationFrame(loop);