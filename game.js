// game.js
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size dynamically
function resizeCanvas() {
    canvas.width = Math.min(600, window.innerWidth * 0.95);
    canvas.height = Math.min(800, window.innerHeight * 0.8);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Audio system variables
let audioContext;
let audioBuffers = {};
let soundsLoaded = false;
let audioInitialized = false;

// Create loading overlay
const loadingOverlay = document.createElement('div');
loadingOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    z-index: 1000;
`;
loadingOverlay.innerHTML = `
    <div style="color:white; font-size:24px; margin-bottom:20px;">Tap to Start Game with Sound</div>
    <button id="unlockAudio" style="padding:15px 30px; font-size:18px; background:#4CAF50; color:white; border:none; border-radius:5px;">START</button>
`;
document.body.appendChild(loadingOverlay);

// Initialize audio system
document.getElementById('unlockAudio').addEventListener('click', initAudioSystem);

async function initAudioSystem() {
    if (audioInitialized) return;
    
    try {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();
        
        await loadLetterSounds();
        soundsLoaded = true;
        audioInitialized = true;
        loadingOverlay.style.display = 'none';
        console.log("Audio system initialized");

        // Add audio resume listeners
        ['touchstart', 'touchend', 'mousedown', 'keydown'].forEach(event => {
            document.addEventListener(event, resumeAudioContext);
        });
    } catch (error) {
        console.error("Audio initialization failed:", error);
        loadingOverlay.innerHTML = `<div style="color:red">Error loading audio: ${error.message}</div>`;
    }
}

async function loadLetterSounds() {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const promises = [];
    
    for (const letter of alphabet) {
        const promise = fetch(`${letter}.mp3`)
            .then(response => {
                if (!response.ok) throw new Error(`Failed to load ${letter}.mp3`);
                return response.arrayBuffer();
            })
            .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
            .then(audioBuffer => {
                audioBuffers[letter] = audioBuffer;
            })
            .catch(error => {
                console.error(`Error loading ${letter}:`, error);
                throw error;
            });
        promises.push(promise);
    }
    
    await Promise.all(promises);
}

function resumeAudioContext() {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().catch(error => {
            console.error("Error resuming audio:", error);
        });
    }
}

function playSound(letter) {
    if (!soundsLoaded || !audioBuffers[letter]) return;
    
    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            playSoundBuffer(letter);
        });
    } else {
        playSoundBuffer(letter);
    }
}

function playSoundBuffer(letter) {
    try {
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffers[letter];
        source.connect(audioContext.destination);
        source.start(0);
    } catch (error) {
        console.error("Error playing sound:", error);
    }
}

// Game variables and state
const basket = { x: 0, y: 0, width: 150, height: 75, speed: 10 };
let letters = [];
let currentLetter = 'A';
let score = 0;
let gameState = 'paused';
let spawnInterval;
let caughtLetter = null;
let keys = { left: false, right: false };
let touchX = null;

// Preload images
const images = {
    basket: new Image(),
    background: new Image()
};
images.basket.src = 'basket.png';
images.background.src = 'background.jpg';

// Game controls setup
const startButton = document.getElementById('startButton');
const exitButton = document.getElementById('exitButton');

startButton.addEventListener('click', handleGameControl);
exitButton.addEventListener('click', () => {
    gameState = 'ended';
    clearInterval(spawnInterval);
    letters = [];
    caughtLetter = null;
    startButton.textContent = 'Restart';
});

document.addEventListener('keydown', handleKey(true));
document.addEventListener('keyup', handleKey(false));

canvas.addEventListener('touchstart', handleTouch(true));
canvas.addEventListener('touchmove', handleTouch(true));
canvas.addEventListener('touchend', handleTouch(false));

function handleGameControl() {
    if (!audioInitialized) {
        initAudioSystem().then(() => {
            if (gameState === 'paused') startGame();
        });
        return;
    }
    
    if (gameState === 'paused') {
        startGame();
    } else if (gameState === 'running') {
        pauseGame();
    } else if (gameState === 'ended') {
        resetGame();
    }
}

function startGame() {
    gameState = 'running';
    startButton.textContent = 'Pause';
    spawnInterval = setInterval(spawnLetter, 2000);
    basket.x = canvas.width/2 - basket.width/2;
    basket.y = canvas.height - 100;
}

function pauseGame() {
    gameState = 'paused';
    startButton.textContent = 'Start';
    clearInterval(spawnInterval);
}

function resetGame() {
    score = 0;
    currentLetter = 'A';
    letters = [];
    caughtLetter = null;
    startGame();
}

function handleKey(isDown) {
    return (e) => {
        if (e.key === 'ArrowLeft') keys.left = isDown;
        if (e.key === 'ArrowRight') keys.right = isDown;
    };
}

function handleTouch(isActive) {
    return (e) => {
        e.preventDefault();
        if (isActive && e.touches) {
            touchX = e.touches[0].clientX - canvas.offsetLeft;
        } else {
            touchX = null;
        }
    };
}

// Game logic
function spawnLetter() {
    if (caughtLetter?.text === currentLetter) return;
    
    const letter = {
        x: Math.random() * (canvas.width - 50),
        y: -50,
        text: currentLetter,
        speed: 2 + score * 0.1
    };
    letters.push(letter);
}

function updateBasketPosition() {
    if (touchX !== null) {
        basket.x = Math.max(0, Math.min(
            touchX - basket.width/2,
            canvas.width - basket.width
        ));
    } else {
        if (keys.left) basket.x = Math.max(0, basket.x - basket.speed);
        if (keys.right) basket.x = Math.min(
            canvas.width - basket.width,
            basket.x + basket.speed
        );
    }
}

function checkCollisions() {
    letters.forEach((letter, index) => {
        letter.y += letter.speed;
        
        const collision = (
            letter.y + 60 > basket.y &&
            letter.x + 30 > basket.x &&
            letter.x + 30 < basket.x + basket.width
        );
        
        if (collision) {
            if (letter.text === currentLetter) {
                handleCorrectLetter(letter);
            }
            letters.splice(index, 1);
        } else if (letter.y > canvas.height) {
            letters.splice(index, 1);
        }
    });
}

function handleCorrectLetter(letter) {
    score++;
    playSound(letter.text);
    caughtLetter = {
        text: letter.text,
        x: basket.x + basket.width/2 - 30,
        y: basket.y + basket.height/2,
        timeCaught: Date.now()
    };
    setTimeout(advanceLetter, 3000);
}

function advanceLetter() {
    const nextChar = String.fromCharCode(currentLetter.charCodeAt(0) + 1);
    currentLetter = nextChar <= 'Z' ? nextChar : 'A';
    caughtLetter = null;
    
    if (currentLetter === 'A') {
        gameState = 'ended';
        startButton.textContent = 'Restart';
    }
}

// Rendering
function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    if (images.background.complete) {
        ctx.drawImage(images.background, 0, 0, canvas.width, canvas.height);
    }
    
    // Draw basket
    if (images.basket.complete) {
        ctx.drawImage(images.basket, basket.x, basket.y, basket.width, basket.height);
    } else {
        ctx.fillStyle = 'blue';
        ctx.fillRect(basket.x, basket.y, basket.width, basket.height);
    }
    
    // Draw letters
    letters.forEach(letter => {
        ctx.font = '100px Arial Black';
        ctx.fillStyle = 'orange';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.fillText(letter.text, letter.x, letter.y);
        ctx.strokeText(letter.text, letter.x, letter.y);
    });
    
    // Draw caught letter
    if (caughtLetter) {
        ctx.fillStyle = 'green';
        ctx.fillText(caughtLetter.text, caughtLetter.x, caughtLetter.y);
        ctx.strokeText(caughtLetter.text, caughtLetter.x, caughtLetter.y);
    }
    
    // Draw UI
    ctx.fillStyle = 'white';
    ctx.font = '30px Arial';
    ctx.fillText(`Score: ${score}`, 10, 40);
    ctx.fillText(`Current Letter: ${currentLetter}`, 10, 80);
    
    if (gameState === 'ended') {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '50px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over!', canvas.width/2, canvas.height/2);
        ctx.fillText(`Final Score: ${score}`, canvas.width/2, canvas.height/2 + 60);
        ctx.textAlign = 'left';
    }
}

// Game loop
function gameLoop() {
    if (gameState === 'running') {
        updateBasketPosition();
        checkCollisions();
    }
    draw();
    requestAnimationFrame(gameLoop);
}

// Start the game loop
gameLoop();
