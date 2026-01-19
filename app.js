// ===== Configuration =====
const CONFIG = {
    TOTAL_PRIZES: 10,
    WIN_RATE: 0.5,        // 50% chance to win (0.0 - 1.0)
    DAY_START_HOUR: 8,    // 8 AM
    DAY_END_HOUR: 18,     // 6 PM
    STORAGE_KEY: 'qr_reward_system',
    COUNTER_NAMESPACE: 'vicake-qr',
    COUNTER_KEY: null     // Will be set based on today's date
};

// ===== Prize List (Default - will be overridden by Firebase) =====
let PRIZES = [
    { id: 1, name: "Voucher 500K", emoji: "💰" },
    { id: 2, name: "Voucher 200K", emoji: "💵" },
    { id: 3, name: "Voucher 100K", emoji: "💸" }
];

// Dynamic prizes loaded from Firebase
let dynamicPrizes = [];

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    // Set counter key based on today's date (resets daily)
    const today = new Date();
    CONFIG.COUNTER_KEY = `prizes-${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

    createParticles();

    // Load prizes from Firebase, then initialize
    setTimeout(async () => {
        await loadPrizesFromFirebase();
        initializePrizeTimes();
        updateUI();
    }, 800);
});

// Load prizes from Firebase
async function loadPrizesFromFirebase() {
    if (database) {
        try {
            const snapshot = await database.ref('prizes').once('value');
            const data = snapshot.val();
            if (data) {
                dynamicPrizes = [];
                Object.entries(data).forEach(([key, prize]) => {
                    // Add prize multiple times based on quantity
                    for (let i = 0; i < (prize.quantity || 1); i++) {
                        dynamicPrizes.push({
                            id: dynamicPrizes.length + 1,
                            name: prize.name,
                            emoji: prize.emoji || '🎁',
                            key: key
                        });
                    }
                });
                if (dynamicPrizes.length > 0) {
                    PRIZES = dynamicPrizes;
                    CONFIG.TOTAL_PRIZES = dynamicPrizes.length;
                    console.log('✅ Loaded', PRIZES.length, 'prizes from Firebase');
                }
            }
        } catch (error) {
            console.error('Load prizes error:', error);
        }
    }
}

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

// Random chance based on WIN_RATE setting
function rollLucky() {
    return Math.random() < CONFIG.WIN_RATE;
}

// ===== Settings Functions =====
let settingsRef = null;

async function loadSettings() {
    if (database) {
        settingsRef = database.ref('settings');

        // Listen for settings changes
        settingsRef.on('value', (snapshot) => {
            const settings = snapshot.val();
            if (settings) {
                // Only update winRate from settings, totalPrizes is dynamic from prizes list now
                if (settings.winRate !== undefined) CONFIG.WIN_RATE = settings.winRate / 100;
                updateSettingsUI();
                updateUI();
            }
        });
    }
}

function updateSettingsUI() {
    // Update sliders if on admin page
    const rateSlider = document.getElementById('winRateSlider');
    const rateValue = document.getElementById('winRateValue');
    const rateDisplay = document.getElementById('winRateDisplay');

    if (rateSlider) rateSlider.value = CONFIG.WIN_RATE * 100;
    if (rateValue) rateValue.textContent = Math.round(CONFIG.WIN_RATE * 100);
    if (rateDisplay) rateDisplay.textContent = Math.round(CONFIG.WIN_RATE * 100) + '%';
}

window.updateWinRate = function (value) {
    document.getElementById('winRateValue').textContent = value;
};

window.saveSettings = async function () {
    // Only save Win Rate, Total Prizes is managed by adding/removing prizes
    const winRateSlider = document.getElementById('winRateSlider');
    if (!winRateSlider) return;

    const winRate = parseInt(winRateSlider.value);

    try {
        if (settingsRef) {
            await settingsRef.update({
                winRate: winRate
            });
        }

        // Also save locally
        CONFIG.WIN_RATE = winRate / 100;

        alert(`✅ Đã lưu tỷ lệ trúng: ${winRate}%`);
        location.reload();
    } catch (error) {
        console.error('Save settings error:', error);
        alert('❌ Lỗi: ' + error.message);
    }
};

// Load settings on init
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(loadSettings, 600);
});

// ===== UI Updates =====
async function updateUI() {
    const claimedCount = await getClaimedCount();
    const prizeCountEl = document.getElementById('prizeCount');
    const prizeTotalEl = document.getElementById('prizeTotal');
    const spinBtn = document.getElementById('spinBtn');

    if (prizeCountEl) {
        const remaining = Math.max(0, CONFIG.TOTAL_PRIZES - claimedCount);
        prizeCountEl.textContent = remaining;

        // Update total count display
        if (prizeTotalEl) {
            prizeTotalEl.textContent = CONFIG.TOTAL_PRIZES;
        }

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

// ===== Phone Validation & History =====
let historyRef = null;
let playedPhonesRef = null;

function initPhoneTracking() {
    if (database) {
        historyRef = database.ref('history');
        playedPhonesRef = database.ref('playedPhones');
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initPhoneTracking, 700);
});

// Format phone number as user types
window.formatPhone = function (input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 10) value = value.substring(0, 10);
    input.value = value;
};

// Validate phone number
function isValidPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10 && cleaned.startsWith('0');
}

// Check if phone has already played
async function hasPhonePlayed(phone) {
    const cleaned = phone.replace(/\D/g, '');
    if (playedPhonesRef) {
        try {
            const snapshot = await playedPhonesRef.child(cleaned).once('value');
            return snapshot.exists();
        } catch (error) {
            console.error('Check phone error:', error);
        }
    }
    return false;
}

// Save play to history
async function savePlayHistory(phone, won, prize = null) {
    const cleaned = phone.replace(/\D/g, '');
    const record = {
        phone: cleaned,
        time: new Date().toISOString(),
        won: won,
        prize: prize ? prize.name : null
    };

    if (historyRef) {
        try {
            await historyRef.push(record);
            await playedPhonesRef.child(cleaned).set({
                playedAt: record.time,
                won: won
            });
        } catch (error) {
            console.error('Save history error:', error);
        }
    }
}

// Show phone error
function showPhoneError(message) {
    const errorEl = document.getElementById('phoneError');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }
}

function hidePhoneError() {
    const errorEl = document.getElementById('phoneError');
    if (errorEl) {
        errorEl.style.display = 'none';
    }
}

// ===== Prize Logic =====
async function tryGetPrize() {
    const spinBtn = document.getElementById('spinBtn');
    const phoneInput = document.getElementById('phoneInput');
    const phone = phoneInput ? phoneInput.value : '';

    hidePhoneError();

    // Validate phone
    if (!phone || !isValidPhone(phone)) {
        showPhoneError('⚠️ Vui lòng nhập số điện thoại hợp lệ (10 số, bắt đầu bằng 0)');
        return;
    }

    // Check if phone already played
    const alreadyPlayed = await hasPhonePlayed(phone);
    if (alreadyPlayed) {
        showPhoneError('📱 Số điện thoại này đã tham gia rồi!');
        return;
    }

    if (spinBtn) {
        spinBtn.disabled = true;
        spinBtn.querySelector('.button-text').textContent = 'ĐANG QUAY SỐ...';
    }

    try {
        const claimedCount = await getClaimedCount();

        // Check if all prizes are claimed
        if (claimedCount >= CONFIG.TOTAL_PRIZES) {
            showResult(false, null, "Đã hết giải thưởng!", "Tất cả giải thưởng đã được phát hết. Chúc may mắn lần sau! 🍀");
            await savePlayHistory(phone, false);
            return;
        }

        // 🎲 RANDOM CHANCE!
        const isLucky = rollLucky();

        if (isLucky) {
            // Lucky! Get a random prize from remaining
            const remainingPrizes = window.prizeTimes.filter((_, index) => index >= claimedCount);
            const randomPrize = remainingPrizes[Math.floor(Math.random() * remainingPrizes.length)];

            await incrementClaimedCount();
            await savePlayHistory(phone, true, randomPrize);

            showResult(true, randomPrize, "🎊 CHÚC MỪNG! 🎊", "Bạn đã trúng thưởng:");
            createConfetti();

            // Disable input after win
            if (phoneInput) phoneInput.disabled = true;
        } else {
            // Not lucky - still save to history so they can't play again
            await savePlayHistory(phone, false);

            const remaining = CONFIG.TOTAL_PRIZES - claimedCount;
            showResult(false, null, "Chúc bạn may mắn lần sau! 🍀", "Cảm ơn bạn đã tham gia!");

            // Disable input - can't try again with same phone
            if (phoneInput) phoneInput.disabled = true;
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
    const currentPrizes = window.prizeTimes || [];
    const total = currentPrizes.length > 0 ? currentPrizes.length : CONFIG.TOTAL_PRIZES;

    return {
        date: new Date().toDateString(),
        totalPrizes: total,
        claimedCount: claimedCount,
        prizes: currentPrizes.map((prize, index) => ({
            ...prize,
            claimed: index < claimedCount
        }))
    };
};

// Clear ALL Firebase data
window.clearAllFirebaseData = async function () {
    if (confirm('⚠️ XÓA TOÀN BỘ DỮ LIỆU FIREBASE?\n\nĐiều này sẽ xóa:\n- Tất cả giải thưởng\n- Lịch sử tham gia\n- Số lượng đã phát\n- Cài đặt\n\nBạn có chắc chắn?')) {
        try {
            if (database) {
                await database.ref('/').remove();
                localStorage.clear();
                alert('✅ Đã xóa toàn bộ dữ liệu!');
                location.reload();
            } else {
                alert('❌ Firebase chưa kết nối!');
            }
        } catch (error) {
            alert('❌ Lỗi: ' + error.message);
        }
    }
};

window.getClaimedCount = getClaimedCount;
window.CONFIG = CONFIG;


