// ===== Configuration =====
const CONFIG = {
    TOTAL_PRIZES: 10,
    DAY_START_HOUR: 8,  // 8 AM
    DAY_END_HOUR: 18,   // 6 PM
    STORAGE_KEY: 'qr_reward_system'
};

// ===== Prize List =====
const PRIZES = [
    { id: 1, name: "iPhone 15 Pro Max", emoji: "📱", rarity: "legendary" },
    { id: 2, name: "AirPods Pro 2", emoji: "🎧", rarity: "epic" },
    { id: 3, name: "Voucher 500K", emoji: "💰", rarity: "rare" },
    { id: 4, name: "Voucher 200K", emoji: "💵", rarity: "common" },
    { id: 5, name: "Voucher 100K", emoji: "💸", rarity: "common" },
    { id: 6, name: "Thẻ cào 50K", emoji: "📞", rarity: "common" },
    { id: 7, name: "Ly giữ nhiệt cao cấp", emoji: "☕", rarity: "rare" },
    { id: 8, name: "Balo thời trang", emoji: "🎒", rarity: "rare" },
    { id: 9, name: "Đồng hồ thông minh", emoji: "⌚", rarity: "epic" },
    { id: 10, name: "Loa Bluetooth JBL", emoji: "🔊", rarity: "epic" }
];

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    createParticles();
    initializeData();
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

// ===== Data Management =====
function getData() {
    const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (stored) {
        const data = JSON.parse(stored);
        // Check if it's a new day
        const today = new Date().toDateString();
        if (data.date !== today) {
            return resetData();
        }
        return data;
    }
    return resetData();
}

function saveData(data) {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
}

function resetData() {
    const today = new Date();
    const todayString = today.toDateString();

    // Generate random times for prizes
    const prizeTimes = generateRandomTimes(CONFIG.TOTAL_PRIZES, CONFIG.DAY_START_HOUR, CONFIG.DAY_END_HOUR);

    const data = {
        date: todayString,
        totalPrizes: CONFIG.TOTAL_PRIZES,
        claimedCount: 0,
        prizes: PRIZES.slice(0, CONFIG.TOTAL_PRIZES).map((prize, index) => ({
            ...prize,
            availableAt: prizeTimes[index],
            claimed: false,
            claimedAt: null
        }))
    };

    saveData(data);
    return data;
}

function generateRandomTimes(count, startHour, endHour) {
    const times = [];
    const today = new Date();

    for (let i = 0; i < count; i++) {
        const randomHour = startHour + Math.random() * (endHour - startHour);
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

function initializeData() {
    getData(); // This will create or validate data
}

// ===== UI Updates =====
function updateUI() {
    const data = getData();
    const prizeCountEl = document.getElementById('prizeCount');
    const spinBtn = document.getElementById('spinBtn');

    if (prizeCountEl) {
        const remaining = data.totalPrizes - data.claimedCount;
        prizeCountEl.textContent = remaining;

        if (remaining === 0) {
            prizeCountEl.classList.add('empty');
        } else {
            prizeCountEl.classList.remove('empty');
        }
    }

    if (spinBtn) {
        const remaining = data.totalPrizes - data.claimedCount;
        if (remaining === 0) {
            spinBtn.disabled = true;
            spinBtn.querySelector('.button-text').textContent = 'ĐÃ HẾT THƯỞNG';
        }
    }
}

// ===== Prize Logic =====
function tryGetPrize() {
    const data = getData();
    const now = Date.now();

    // Check if all prizes are claimed
    if (data.claimedCount >= data.totalPrizes) {
        showResult(false, null, "Rất tiếc, đã hết giải thưởng hôm nay!", "Vui lòng quay lại vào ngày mai.");
        return;
    }

    // Find available prize (unclaimed and time has passed)
    const availablePrize = data.prizes.find(prize =>
        !prize.claimed && prize.availableAt <= now
    );

    if (availablePrize) {
        // Claim the prize
        availablePrize.claimed = true;
        availablePrize.claimedAt = now;
        data.claimedCount++;
        saveData(data);

        showResult(true, availablePrize, "🎊 Chúc mừng! 🎊", "Bạn đã nhận được:");
        createConfetti();
        updateUI();
    } else {
        // Check next available prize time
        const nextPrize = data.prizes.find(prize => !prize.claimed);
        if (nextPrize) {
            const nextTime = new Date(nextPrize.availableAt);
            const timeStr = nextTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            showResult(false, null, "Chúc may mắn lần sau! 🍀", `Chưa đến lượt nhận thưởng. Giải tiếp theo sẽ mở lúc ${timeStr}. Hãy thử lại sau nhé!`);
        } else {
            showResult(false, null, "Đã hết giải thưởng!", "Chúc may mắn lần sau! Vui lòng quay lại vào ngày mai. 🍀");
        }
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

// ===== Confetti Effect =====
function createConfetti() {
    const colors = ['#f093fb', '#f5576c', '#667eea', '#764ba2', '#38ef7d', '#f2c94c'];

    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.width = (5 + Math.random() * 10) + 'px';
            confetti.style.height = confetti.style.width;
            confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
            confetti.style.animationDuration = (2 + Math.random() * 2) + 's';
            document.body.appendChild(confetti);

            setTimeout(() => confetti.remove(), 4000);
        }, i * 50);
    }
}

// ===== Admin Functions (exposed globally) =====
window.resetAllPrizes = function () {
    if (confirm('Bạn có chắc muốn reset tất cả giải thưởng?')) {
        resetData();
        updateUI();
        alert('Đã reset thành công!');
        location.reload();
    }
};

window.getRewardData = function () {
    return getData();
};

window.CONFIG = CONFIG;
