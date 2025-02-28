const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Preload audio files for letters A to Z
const letterSounds = {};
for (let i = 65; i <= 90; i++) {
    const letter = String.fromCharCode(i);
    letterSounds[letter] = new Audio(`${letter}.mp3`);
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
    speed: 5
};
let letters = [];
let currentLetter = 'A';
let score = 0;
let gameState = 'paused'; // 'paused', 'running', 'ended'
let spawnInterval;
let caughtLetter = null;

// Touch controls
let touchControls = {
    left: false,
    right: false
};

// Button controls
const startButton = document.getElementById('startButton');
const exitButton = document.getElementById('exitButton');
const leftButton = document.getElementById('leftButton');
const rightButton = document.getElementById('rightButton');

startButton.addEventListener('click', () => {
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
    gameState = 'ended';
    clearInterval(spawnInterval);
    letters = [];
    caughtLetter = null;
    startButton.textContent = 'Restart';
});

// Touch event listeners for control buttons
leftButton.addEventListener('touchstart', () => touchControls.left = true);
leftButton.addEventListener('touchend', () => touchControls.left = false);
rightButton.addEventListener('touchstart', () => touchControls.right = true);
rightButton.addEventListener('touchend', () => touchControls.right = false);

// Prevent default touch behavior on canvas (e.g., scrolling)
canvas.addEventListener('touchstart', (e) => e.preventDefault());
canvas.addEventListener('touchmove', (e) => e.preventDefault());

// Move basket based on touch controls
function moveBasket() {
    if (gameState !== 'running') return;
    if (touchControls.left && basket.x > 0) {
        basket.x -= basket.speed;
    }
    if (touchControls.right && basket.x + basket.width < canvas.width) {
        basket.x += basket.speed;
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

// Start spawning letters
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

        // Draw and update falling letters
        letters.forEach((letter, index) => {
            letter.y += letter.speed;
            ctx.font = '100px Arial Black';
            ctx.fillStyle = 'orange';
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.fillText(letter.text, letter.x, letter.y);
            ctx.strokeText(letter.text, letter.x, letter.y);

            // Collision detection
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

        // Handle caught letter
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

// Play the sound for the caught letter
function playLetterSound(letter) {
    const sound = letterSounds[letter];
    sound.currentTime = 0;
    sound.play();
}

// Update to the next letter (A to Z), end game after Z
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

// Start the game loop
update();