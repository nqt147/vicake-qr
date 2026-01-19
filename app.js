// ===== Configuration =====
const CONFIG = {
    TOTAL_PRIZES: 10,
    DAY_START_HOUR: 8,  // 8 AM
    DAY_END_HOUR: 18,   // 6 PM
    STORAGE_KEY: 'qr_reward_system',
    // CountAPI namespace - unique for your app
    COUNTER_NAMESPACE: 'vicake-qr',
    COUNTER_KEY: null // Will be set based on today's date
};

// ===== Prize List =====
const PRIZES = [
    { id: 1, name: "Voucher 500K", emoji: "💰", rarity: "legendary" },
    { id: 2, name: "Voucher 200K", emoji: "💵", rarity: "epic" },
    { id: 3, name: "Voucher 100K", emoji: "💸", rarity: "rare" },
    { id: 4, name: "Thẻ cào 50K", emoji: "📞", rarity: "common" },
    { id: 5, name: "Voucher 50K", emoji: "🎫", rarity: "common" },
    { id: 6, name: "Ly giữ nhiệt cao cấp", emoji: "☕", rarity: "rare" },
    { id: 7, name: "Voucher 30K", emoji: "🎁", rarity: "common" },
    { id: 8, name: "Thẻ cào 20K", emoji: "📱", rarity: "common" },
    { id: 9, name: "Voucher 20K", emoji: "🎀", rarity: "common" },
    { id: 10, name: "Phiếu giảm giá 10%", emoji: "🏷️", rarity: "common" }
];

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    // Set counter key based on today's date (resets daily)
    const today = new Date();
    CONFIG.COUNTER_KEY = `prizes-${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

    createParticles();
    initializePrizeTimes();
    updateUI();
});

// ===== Particle Background =====
function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;

    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (10 + Math.random() * 10) + 's';
        particle.style.width = (5 + Math.random() * 10) + 'px';
        particle.style.height = particle.style.width;
        container.appendChild(particle);
    }
}

// ===== Seeded Random Number Generator =====
// Same seed = same random numbers = same prize times for everyone
function seededRandom(seed) {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

// ===== Generate Prize Times (Deterministic) =====
function generatePrizeTimes() {
    const today = new Date();
    // Seed based on date - everyone gets same times
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

    const times = [];
    for (let i = 0; i < CONFIG.TOTAL_PRIZES; i++) {
        const randomValue = seededRandom(seed + i);
        const randomHour = CONFIG.DAY_START_HOUR + randomValue * (CONFIG.DAY_END_HOUR - CONFIG.DAY_START_HOUR);
        const hours = Math.floor(randomHour);
        const minutes = Math.floor((randomHour - hours) * 60);

        const time = new Date(today);
        time.setHours(hours, minutes, 0, 0);
        times.push(time.getTime());
    }

    // Sort times chronologically
    times.sort((a, b) => a - b);
    return times;
}

function initializePrizeTimes() {
    const times = generatePrizeTimes();
    window.prizeTimes = times.map((time, index) => ({
        ...PRIZES[index],
        availableAt: time
    }));
}

// ===== CountAPI Functions =====
async function getClaimedCount() {
    try {
        const response = await fetch(`https://api.countapi.xyz/get/${CONFIG.COUNTER_NAMESPACE}/${CONFIG.COUNTER_KEY}`);
        const data = await response.json();
        return data.value || 0;
    } catch (error) {
        console.error('Error getting count:', error);
        // Fallback to localStorage
        return parseInt(localStorage.getItem('claimed_count_' + CONFIG.COUNTER_KEY) || '0');
    }
}

async function incrementClaimedCount() {
    try {
        const response = await fetch(`https://api.countapi.xyz/hit/${CONFIG.COUNTER_NAMESPACE}/${CONFIG.COUNTER_KEY}`);
        const data = await response.json();
        // Also save to localStorage as backup
        localStorage.setItem('claimed_count_' + CONFIG.COUNTER_KEY, data.value);
        return data.value;
    } catch (error) {
        console.error('Error incrementing count:', error);
        // Fallback to localStorage
        let count = parseInt(localStorage.getItem('claimed_count_' + CONFIG.COUNTER_KEY) || '0');
        count++;
        localStorage.setItem('claimed_count_' + CONFIG.COUNTER_KEY, count);
        return count;
    }
}

// Check if current device already WON (ever, not just today)
function hasDeviceWon() {
    return localStorage.getItem('device_has_won') === 'true';
}

function markDeviceWon() {
    localStorage.setItem('device_has_won', 'true');
}

// Random 50% chance
function rollLucky() {
    return Math.random() < 0.5; // 50% chance to win
}

// ===== UI Updates =====
async function updateUI() {
    const claimedCount = await getClaimedCount();
    const prizeCountEl = document.getElementById('prizeCount');
    const spinBtn = document.getElementById('spinBtn');

    if (prizeCountEl) {
        const remaining = Math.max(0, CONFIG.TOTAL_PRIZES - claimedCount);
        prizeCountEl.textContent = remaining;

        if (remaining === 0) {
            prizeCountEl.classList.add('empty');
        } else {
            prizeCountEl.classList.remove('empty');
        }
    }

    if (spinBtn) {
        const remaining = CONFIG.TOTAL_PRIZES - claimedCount;
        const deviceWon = hasDeviceWon();

        if (remaining <= 0) {
            spinBtn.disabled = true;
            spinBtn.querySelector('.button-text').textContent = 'ĐÃ HẾT THƯỞNG';
        } else if (deviceWon) {
            spinBtn.disabled = true;
            spinBtn.querySelector('.button-text').textContent = 'BẠN ĐÃ TRÚNG THƯỞNG';
        }
    }
}

// ===== Prize Logic =====
async function tryGetPrize() {
    const spinBtn = document.getElementById('spinBtn');
    if (spinBtn) {
        spinBtn.disabled = true;
        spinBtn.querySelector('.button-text').textContent = 'ĐANG QUAY SỐ...';
    }

    try {
        // Check if device already won before
        if (hasDeviceWon()) {
            showResult(false, null, "Bạn đã trúng thưởng rồi!", "Mỗi thiết bị chỉ được trúng 1 lần duy nhất. Cảm ơn bạn đã tham gia! 🎉");
            return;
        }

        const claimedCount = await getClaimedCount();

        // Check if all prizes are claimed
        if (claimedCount >= CONFIG.TOTAL_PRIZES) {
            showResult(false, null, "Đã hết giải thưởng!", "Tất cả giải thưởng đã được phát hết. Chúc may mắn lần sau! 🍀");
            return;
        }

        // 🎲 RANDOM 50% CHANCE!
        const isLucky = rollLucky();

        if (isLucky) {
            // Lucky! Get a random prize from remaining
            const remainingPrizes = window.prizeTimes.filter((_, index) => index >= claimedCount);
            const randomPrize = remainingPrizes[Math.floor(Math.random() * remainingPrizes.length)];

            await incrementClaimedCount();
            markDeviceWon();

            showResult(true, randomPrize, "🎊 CHÚC MỪNG! 🎊", "Bạn đã trúng thưởng:");
            createConfetti();
        } else {
            // Not lucky this time
            const remaining = CONFIG.TOTAL_PRIZES - claimedCount;
            showResult(false, null, "Chưa trúng! 😅", `Hên xui mà! Còn ${remaining} giải thưởng. Bạn có thể thử lại! 🍀`);

            // Re-enable button for another try
            if (spinBtn) {
                spinBtn.disabled = false;
                spinBtn.querySelector('.button-text').textContent = 'THỬ LẠI 🎰';
            }
            return; // Don't update UI to keep button enabled
        }
    } finally {
        await updateUI();
    }
}

function showResult(isWin, prize, title, message) {
    const resultBox = document.getElementById('resultBox');
    const resultIcon = document.getElementById('resultIcon');
    const resultTitle = document.getElementById('resultTitle');
    const resultMessage = document.getElementById('resultMessage');
    const prizeName = document.getElementById('prizeName');

    // Create overlay
    let overlay = document.querySelector('.overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'overlay';
        document.body.appendChild(overlay);
    }

    if (isWin && prize) {
        resultIcon.textContent = prize.emoji;
        resultTitle.textContent = title;
        resultTitle.className = 'result-title success';
        resultMessage.textContent = message;
        prizeName.textContent = prize.name;
        prizeName.style.display = 'block';
    } else {
        resultIcon.textContent = "😔";
        resultTitle.textContent = title;
        resultTitle.className = 'result-title fail';
        resultMessage.textContent = message;
        prizeName.style.display = 'none';
    }

    resultBox.classList.remove('hidden');
    setTimeout(() => {
        resultBox.classList.add('show');
        overlay.classList.add('show');
    }, 10);
}

function closeResult() {
    const resultBox = document.getElementById('resultBox');
    const overlay = document.querySelector('.overlay');

    resultBox.classList.remove('show');
    if (overlay) {
        overlay.classList.remove('show');
    }

    setTimeout(() => {
        resultBox.classList.add('hidden');
    }, 400);
}

// ===== Confetti Effect - Bakery Style =====
function createConfetti() {
    const bakeryEmojis = ['🧁', '🍩', '🍰', '🍪', '🍫', '🍬', '🎂', '🍭', '💖', '✨'];

    for (let i = 0; i < 40; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.textContent = bakeryEmojis[Math.floor(Math.random() * bakeryEmojis.length)];
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.fontSize = (15 + Math.random() * 20) + 'px';
            confetti.style.animationDuration = (2 + Math.random() * 2) + 's';
            document.body.appendChild(confetti);

            setTimeout(() => confetti.remove(), 4000);
        }, i * 60);
    }
}

// ===== Admin Functions (exposed globally) =====
window.resetAllPrizes = async function () {
    if (confirm('Bạn có chắc muốn reset tất cả giải thưởng?')) {
        // Note: CountAPI doesn't support reset, so we change the key
        const newKey = CONFIG.COUNTER_KEY + '-reset-' + Date.now();
        CONFIG.COUNTER_KEY = newKey;
        localStorage.removeItem('user_claimed_date');
        alert('Đã reset thành công! Trang sẽ được tải lại.');
        location.reload();
    }
};

window.getRewardData = async function () {
    const claimedCount = await getClaimedCount();
    return {
        date: new Date().toDateString(),
        totalPrizes: CONFIG.TOTAL_PRIZES,
        claimedCount: claimedCount,
        prizes: window.prizeTimes.map((prize, index) => ({
            ...prize,
            claimed: index < claimedCount
        }))
    };
};

window.getClaimedCount = getClaimedCount;
window.CONFIG = CONFIG;
