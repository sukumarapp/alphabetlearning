const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size dynamically
function resizeCanvas() {
    canvas.width = Math.min(600, window.innerWidth * 0.95);
    canvas.height = Math.min(800, window.innerHeight * 0.8);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Audio system for iOS compatibility
let audioContext;
let audioBuffers = {};
let soundsLoaded = false;
let audioInitialized = false;

// Create a loading overlay to ensure user interaction
const loadingOverlay = document.createElement('div');
loadingOverlay.style.position = 'fixed';
loadingOverlay.style.top = '0';
loadingOverlay.style.left = '0';
loadingOverlay.style.width = '100%';
loadingOverlay.style.height = '100%';
loadingOverlay.style.backgroundColor = 'rgba(0,0,0,0.8)';
loadingOverlay.style.display = 'flex';
loadingOverlay.style.justifyContent = 'center';
loadingOverlay.style.alignItems = 'center';
loadingOverlay.style.flexDirection = 'column';
loadingOverlay.style.zIndex = '1000';
loadingOverlay.innerHTML = `
    <div style="color:white; font-size:24px; margin-bottom:20px;">Tap to Start Game with Sound</div>
    <button id="unlockAudio" style="padding:15px 30px; font-size:18px; background-color:#4CAF50; color:white; border:none; border-radius:5px;">START</button>
`;
document.body.appendChild(loadingOverlay);

document.getElementById('unlockAudio').addEventListener('click', function() {
    initAudioSystem();
    loadingOverlay.style.display = 'none';
});

// Initialize audio system for iOS
function initAudioSystem() {
    if (audioInitialized) return;
    
    try {
        // Create audio context
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();
        
        // Load all letter sounds
        loadLetterSounds().then(() => {
            console.log("All sounds loaded successfully");
            soundsLoaded = true;
        }).catch(error => {
            console.error("Error loading sounds:", error);
        });
        
        audioInitialized = true;
        console.log("Audio system initialized, context state:", audioContext.state);
        
        // For iOS, we need to resume on various user interactions
        ['touchstart', 'touchend', 'mousedown', 'keydown'].forEach(event => {
            document.body.addEventListener(event, function() {
                if (audioContext.state === 'suspended') {
                    audioContext.resume().then(() => {
                        console.log("AudioContext resumed on user interaction");
                    });
                }
            }, { once: true });
        });
    } catch (e) {
        console.error("Could not initialize audio system:", e);
    }
}

// Load all letter sounds into audio buffers
async function loadLetterSounds() {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const loadPromises = [];
    
    for (let i = 0; i < alphabet.length; i++) {
        const letter = alphabet[i];
        loadPromises.push(
            fetch(`${letter}.mp3`)
                .then(response => response.arrayBuffer())
                .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
                .then(audioBuffer => {
                    audioBuffers[letter] = audioBuffer;
                    console.log(`Loaded sound for letter ${letter}`);
                })
                .catch(error => console.error(`Error loading sound for ${letter}:`, error))
        );
    }
    
    return Promise.all(loadPromises);
}

// Play a sound using the audio buffer system
function playSound(letter) {
    if (!audioInitialized || !soundsLoaded) {
        console.log("Audio not initialized or sounds not loaded yet");
        return;
    }
    
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    try {
        const buffer = audioBuffers[letter];
        if (!buffer) {
            console.warn(`No buffer found for letter ${letter}`);
            return;
        }
        
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start(0);
        console.log(`Playing sound for letter ${letter}`);
    } catch (e) {
        console.error(`Error playing sound for ${letter}:`, e);
    }
}

// Preload images
const basketImage = new Image();
basketImage.src = 'basket.png';
const backgroundImage = new Image();
backgroundImage.src = 'background.jpg';

// Game variables
let basket = {
    x: canvas.width / 2 - 75,
    y: canvas.height - 100,
    width: 150,
    height: 75,
    speed: 10
};
let letters = [];
let currentLetter = 'A';
let score = 0;
let gameState = 'paused';
let spawnInterval;
let caughtLetter = null;

// Controls
let keys = { left: false, right: false };
let touchX = null;

// Button controls
const startButton = document.getElementById('startButton');
const exitButton = document.getElementById('exitButton');

startButton.addEventListener('click', () => {
    // Ensure audio is initialized
    if (!audioInitialized) {
        initAudioSystem();
    }
    
    if (gameState === 'paused') {
        gameState = 'running';
        startButton.textContent = 'Pause';
        spawnLetters();
    } else if (gameState === 'running') {
        gameState = 'paused';
        startButton.textContent = 'Start';
        clearInterval(spawnInterval);
    } else if (gameState === 'ended') {
        gameState = 'running';
        startButton.textContent = 'Pause';
        score = 0;
        currentLetter = 'A';
        letters = [];
        caughtLetter = null;
        spawnLetters();
    }
});

exitButton.addEventListener('click', () => {
    if (!audioInitialized) {
        initAudioSystem();
    }
    
    gameState = 'ended';
    clearInterval(spawnInterval);
    letters = [];
    caughtLetter = null;
    startButton.textContent = 'Restart';
});

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') keys.left = true;
    if (e.key === 'ArrowRight') keys.right = true;
});
document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') keys.left = false;
    if (e.key === 'ArrowRight') keys.right = false;
});

// Touch controls
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    touchX = touch.clientX - canvas.offsetLeft;
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    touchX = touch.clientX - canvas.offsetLeft;
}, { passive: false });

canvas.addEventListener('touchend', () => {
    touchX = null;
});

// Move basket
function moveBasket() {
    if (gameState !== 'running') return;

    // Keyboard movement
    if (keys.left && basket.x > 0) {
        basket.x -= basket.speed;
    }
    if (keys.right && basket.x + basket.width < canvas.width) {
        basket.x += basket.speed;
    }

    // Touch movement
    if (touchX !== null) {
        const targetX = touchX - basket.width / 2;
        if (targetX > 0 && targetX + basket.width < canvas.width) {
            basket.x = targetX;
        } else if (targetX <= 0) {
            basket.x = 0;
        } else {
            basket.x = canvas.width - basket.width;
        }
    }
}

// Spawn a new letter
function spawnLetter() {
    if (gameState !== 'running') return;
    if (!caughtLetter || caughtLetter.text !== currentLetter) {
        const letter = {
            x: Math.random() * (canvas.width - 50),
            y: -50,
            text: currentLetter,
            speed: 2
        };
        letters.push(letter);
    }
}

function spawnLetters() {
    spawnInterval = setInterval(spawnLetter, 2000);
}

// Game loop
function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (backgroundImage.complete) {
        ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    }

    if (basketImage.complete) {
        ctx.drawImage(basketImage, basket.x, basket.y, basket.width, basket.height);
    } else {
        ctx.fillStyle = 'blue';
        ctx.fillRect(basket.x, basket.y, basket.width, basket.height);
    }

    ctx.fillStyle = 'white';
    ctx.font = '30px Arial';
    ctx.fillText(`Score: ${score}`, 10, 40);

    if (gameState === 'running') {
        moveBasket();

        letters.forEach((letter, index) => {
            letter.y += letter.speed;
            ctx.font = '100px Arial Black';
            ctx.fillStyle = 'orange';
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.fillText(letter.text, letter.x, letter.y);
            ctx.strokeText(letter.text, letter.x, letter.y);

            if (
                letter.y + 60 > basket.y + basket.height * 0.5 &&
                letter.y < basket.y + basket.height &&
                letter.x + 30 > basket.x &&
                letter.x + 60 < basket.x + basket.width
            ) {
                if (letter.text === currentLetter && !caughtLetter) {
                    score++;
                    playSound(letter.text);
                    caughtLetter = {
                        text: letter.text,
                        x: basket.x + basket.width / 2 - 30,
                        y: basket.y + basket.height / 2,
                        timeCaught: Date.now()
                    };
                    letters = letters.filter(l => l.text !== currentLetter);
                }
            }

            if (letter.y > canvas.height) {
                letters.splice(index, 1);
            }
        });

        if (caughtLetter) {
            ctx.font = '100px Arial Black';
            ctx.fillStyle = 'green';
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.fillText(caughtLetter.text, caughtLetter.x, caughtLetter.y);
            ctx.strokeText(caughtLetter.text, caughtLetter.x, caughtLetter.y);

            caughtLetter.x = basket.x + basket.width / 2 - 40;

            if (Date.now() - caughtLetter.timeCaught >= 3000) {
                updateCurrentLetter();
                caughtLetter = null;
            }
        }
    }

    if (gameState === 'ended') {
        ctx.fillStyle = 'black';
        ctx.font = '50px Arial';
        ctx.fillText('Game Over', canvas.width / 2 - 130, canvas.height / 2);
        ctx.fillText(`Score: ${score}`, canvas.width / 2 - 80, canvas.height / 2 + 60);
    }

    requestAnimationFrame(update);
}

function updateCurrentLetter() {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const currentIndex = alphabet.indexOf(currentLetter);
    if (currentIndex < alphabet.length - 1) {
        currentLetter = alphabet[currentIndex + 1];
    } else {
        gameState = 'ended';
        clearInterval(spawnInterval);
        letters = [];
        caughtLetter = null;
        startButton.textContent = 'Restart';
    }
}

update();
