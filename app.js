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

// ===== Firebase Configuration =====
// Free Firebase project - syncs prize count across ALL devices in real-time!
const firebaseConfig = {
    apiKey: "AIzaSyBZxb5idyyOtCuz7GyFNMl0wUpWLBujqMU",
    authDomain: "vicake-qr.firebaseapp.com",
    databaseURL: "https://vicake-qr-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "vicake-qr",
    storageBucket: "vicake-qr.firebasestorage.app",
    messagingSenderId: "734444653109",
    appId: "1:734444653109:web:1d7977dd7f06daf2c8ff7c",
    measurementId: "G-EBY8C93PKH"
};

// Initialize Firebase
let firebaseApp = null;
let database = null;
let prizeCounterRef = null;

function initFirebase() {
    try {
        if (typeof firebase !== 'undefined') {
            firebaseApp = firebase.initializeApp(firebaseConfig);
            database = firebase.database();
            prizeCounterRef = database.ref('counters/' + CONFIG.COUNTER_KEY);

            // Listen for real-time updates from other devices
            prizeCounterRef.on('value', (snapshot) => {
                const count = snapshot.val() || 0;
                localStorage.setItem('claimed_count_' + CONFIG.COUNTER_KEY, count);
                updateUI();
            });

            console.log('✅ Firebase connected - Đồng bộ realtime!');
        } else {
            console.warn('⚠️ Firebase not loaded, using localStorage fallback');
        }
    } catch (error) {
        console.error('Firebase init error:', error);
    }
}

// Initialize Firebase on load
document.addEventListener('DOMContentLoaded', initFirebase);

async function getClaimedCount() {
    // Try Firebase first, fallback to localStorage
    if (prizeCounterRef) {
        try {
            const snapshot = await prizeCounterRef.once('value');
            return snapshot.val() || 0;
        } catch (error) {
            console.error('Firebase read error:', error);
        }
    }
    return parseInt(localStorage.getItem('claimed_count_' + CONFIG.COUNTER_KEY) || '0');
}

async function incrementClaimedCount() {
    let newCount = 0;

    if (prizeCounterRef) {
        try {
            // Use Firebase transaction for atomic increment
            await prizeCounterRef.transaction((currentCount) => {
                newCount = (currentCount || 0) + 1;
                return newCount;
            });
        } catch (error) {
            console.error('Firebase write error:', error);
            // Fallback to localStorage
            newCount = parseInt(localStorage.getItem('claimed_count_' + CONFIG.COUNTER_KEY) || '0') + 1;
            localStorage.setItem('claimed_count_' + CONFIG.COUNTER_KEY, newCount);
        }
    } else {
        // localStorage fallback
        newCount = parseInt(localStorage.getItem('claimed_count_' + CONFIG.COUNTER_KEY) || '0') + 1;
        localStorage.setItem('claimed_count_' + CONFIG.COUNTER_KEY, newCount);
    }

    return newCount;
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
    if (confirm('⚠️ Reset tất cả giải thưởng về 0?\n\nĐiều này sẽ:\n- Đặt số quà đã phát = 0\n- Xóa trạng thái trúng của device này')) {
        try {
            // Reset Firebase counter to 0
            if (prizeCounterRef) {
                await prizeCounterRef.set(0);
            }
            // Reset localStorage
            localStorage.setItem('claimed_count_' + CONFIG.COUNTER_KEY, '0');
            localStorage.removeItem('device_has_won');

            alert('✅ Đã reset thành công!');
            location.reload();
        } catch (error) {
            console.error('Reset error:', error);
            alert('❌ Lỗi reset: ' + error.message);
        }
    }
};

window.setPrizeCount = async function () {
    const currentCount = await getClaimedCount();
    const newCount = prompt(`Nhập số quà ĐÃ PHÁT (hiện tại: ${currentCount}):\n\n(Nhập 0-${CONFIG.TOTAL_PRIZES})`, currentCount);

    if (newCount !== null) {
        const count = parseInt(newCount);
        if (isNaN(count) || count < 0 || count > CONFIG.TOTAL_PRIZES) {
            alert('❌ Số không hợp lệ! Nhập từ 0 đến ' + CONFIG.TOTAL_PRIZES);
            return;
        }

        try {
            // Set Firebase counter
            if (prizeCounterRef) {
                await prizeCounterRef.set(count);
            }
            // Set localStorage
            localStorage.setItem('claimed_count_' + CONFIG.COUNTER_KEY, count);

            alert(`✅ Đã đặt số quà đã phát = ${count}`);
            location.reload();
        } catch (error) {
            console.error('Set count error:', error);
            alert('❌ Lỗi: ' + error.message);
        }
    }
};

window.clearMyWinStatus = function () {
    localStorage.removeItem('device_has_won');
    alert('✅ Đã xóa trạng thái trúng của device này!');
    location.reload();
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

