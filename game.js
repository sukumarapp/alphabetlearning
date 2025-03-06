const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size dynamically
function resizeCanvas() {
    canvas.width = Math.min(600, window.innerWidth * 0.95);
    canvas.height = Math.min(800, window.innerHeight * 0.8);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Audio context for iOS compatibility
let audioContext;
let audioInitialized = false;

// Preload audio files for letters A to Z
const letterSounds = {};
for (let i = 65; i <= 90; i++) {
    const letter = String.fromCharCode(i);
    letterSounds[letter] = new Audio(`${letter}.mp3`);
    // Set preload attribute
    letterSounds[letter].preload = 'auto';
}

// Initialize audio context on user interaction
function initAudio() {
    if (audioInitialized) return;
    
    // Create audio context
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Resume audio context if it's suspended (for iOS)
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    // Try to play a silent sound to unlock audio
    const silentSound = new Audio();
    silentSound.play().catch(err => {
        console.log("Silent sound failed to play, but that's okay");
    });
    
    // Mark as initialized
    audioInitialized = true;
    
    console.log("Audio initialized");
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
    speed: 10 // Increased for smoother touch movement
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
    // Initialize audio on first user interaction
    initAudio();
    
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
    // Also initialize audio here for good measure
    initAudio();
    
    gameState = 'ended';
    clearInterval(spawnInterval);
    letters = [];
    caughtLetter = null;
    startButton.textContent = 'Restart';
});

// Keyboard controls
document.addEventListener('keydown', (e) => {
    initAudio(); // Initialize on keyboard interaction too
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
    initAudio(); // Initialize on touch too
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
                    playLetterSound(letter.text);
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

// Improved sound playing function for iOS compatibility
function playLetterSound(letter) {
    if (!audioInitialized) {
        initAudio();
    }
    
    const sound = letterSounds[letter];
    
    // Reset and play with promise handling
    sound.currentTime = 0;
    
    // Use a promise to handle playback more robustly
    const playPromise = sound.play();
    
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.error("Error playing sound:", error);
            
            // If autoplay was prevented, try to resume the audio context
            if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    console.log("AudioContext resumed");
                    // Try playing again after resuming
                    sound.play().catch(e => console.error("Still couldn't play sound:", e));
                });
            }
        });
    }
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
