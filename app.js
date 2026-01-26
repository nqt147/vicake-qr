// ===== Configuration =====
const CONFIG = {
    TOTAL_PRIZES: 0,      // Calculated dynamically
    REMAINING_PRIZES: 0,  // Calculated dynamically
    WIN_RATE: 0.5,        // 50% chance to win (0.0 - 1.0)
    STORAGE_KEY: 'qr_reward_system'
};

// ===== Prize List =====
let PRIZES = []; // List of prize types { key, name, quantity, emoji }

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    createParticles();

    // Load prizes from Firebase, then initialize
    setTimeout(async () => {
        await loadPrizesFromFirebase();
        updateUI();
    }, 800);
});

// Load prizes from Firebase (Realtime Listener)
function loadPrizesFromFirebase() {
    return new Promise((resolve) => {
        if (database) {
            try {
                const prizesRef = database.ref('prizes');
                prizesRef.on('value', (snapshot) => {
                    const data = snapshot.val();
                    PRIZES = [];
                    let totalQty = 0;

                    if (data) {
                        Object.entries(data).forEach(([key, prize]) => {
                            PRIZES.push({
                                ...prize,
                                key: key
                            });
                            totalQty += (prize.quantity || 0);
                        });
                    }

                    CONFIG.REMAINING_PRIZES = totalQty;
                    // Note: We don't track "Original Total" easily unless we store "initialQuantity"
                    // For now, we just show what's available.

                    console.log('✅ Updated Prize Pool:', PRIZES.length, 'types,', totalQty, 'items total');
                    updateUI();
                    resolve();
                });
            } catch (error) {
                console.error('Load prizes error:', error);
                resolve();
            }
        } else {
            resolve();
        }
    });
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

function initFirebase() {
    try {
        if (typeof firebase !== 'undefined') {
            firebaseApp = firebase.initializeApp(firebaseConfig);
            database = firebase.database();
            console.log('✅ Firebase connected');
        } else {
            console.warn('⚠️ Firebase not loaded');
        }
    } catch (error) {
        console.error('Firebase init error:', error);
    }
}

// Initialize Firebase on load
document.addEventListener('DOMContentLoaded', initFirebase);

// Check if current device already WON
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
                if (settings.winRate !== undefined) CONFIG.WIN_RATE = settings.winRate / 100;
                updateSettingsUI();
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
    const winRateSlider = document.getElementById('winRateSlider');
    if (!winRateSlider) return;

    const winRate = parseInt(winRateSlider.value);

    try {
        if (settingsRef) {
            await settingsRef.update({
                winRate: winRate
            });
        }
        // Also save locally logic
        CONFIG.WIN_RATE = winRate / 100;
        alert(`✅ Đã lưu tỷ lệ trúng: ${winRate}%`);
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
function updateUI() {
    const prizeCountEl = document.getElementById('prizeCount');
    const prizeTotalEl = document.getElementById('prizeTotal'); // Usually hidden or repurposed
    const spinBtn = document.getElementById('spinBtn');

    // Calculate total remaining
    const remaining = CONFIG.REMAINING_PRIZES;

    if (prizeCountEl) {
        prizeCountEl.textContent = remaining;

        if (remaining === 0) {
            prizeCountEl.classList.add('empty');
        } else {
            prizeCountEl.classList.remove('empty');
        }
    }

    if (spinBtn) {
        const deviceWon = hasDeviceWon();
        if (remaining <= 0) {
            spinBtn.disabled = true;
            spinBtn.querySelector('.button-text').textContent = 'ĐÃ HẾT THƯỞNG';
        } else if (deviceWon) {
            spinBtn.disabled = true;
            spinBtn.querySelector('.button-text').textContent = 'BẠN ĐÃ TRÚNG THƯỞNG';
        } else {
            spinBtn.disabled = false;
            spinBtn.querySelector('.button-text').textContent = 'QUAY NGAY';
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

// ===== Prize Logic (CORE) =====
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
        // 1. Refresh prize data cleanly before spin to reduce conflict
        await new Promise(r => setTimeout(r, 500)); // Fake spin feel

        // 2. Check Global Stock
        if (CONFIG.REMAINING_PRIZES <= 0) {
            showResult(false, null, "Đã hết giải thưởng!", "Tất cả giải thưởng đã được phát hết. Chúc bạn năm mới vui vẻ! 🥳");
            await savePlayHistory(phone, false);
            return;
        }

        // 3. Roll for luck
        const isLucky = rollLucky();

        if (isLucky) {
            // 4. Try to claim a prize (Transaction)
            const wonPrize = await attemptToClaimRandomPrize();

            if (wonPrize) {
                // Success!
                await savePlayHistory(phone, true, wonPrize);
                markDeviceWon();

                showResult(true, wonPrize, "🎊 CHÚC MỪNG! 🎊", "Bạn đã trúng thưởng:");
                createConfetti();

                if (phoneInput) phoneInput.disabled = true;
                return;
            }
        }

        // If unlucky OR if attemptToClaimRandomPrize failed (race condition/out of stock during spin)
        await savePlayHistory(phone, false);
        showResult(false, null, "chúc bạn năm mới vui vẻ! 🥳", "Cảm ơn bạn đã tham gia!");
        if (phoneInput) phoneInput.disabled = true;

    } catch (e) {
        console.error(e);
        // Fallback error
        showResult(false, null, "Lỗi kết nối", "Vui lòng thử lại sau.");
        if (spinBtn) spinBtn.disabled = false;
    } finally {
        updateUI();
    }
}

// Atomic transaction to try and claim a prize
async function attemptToClaimRandomPrize() {
    if (!database) return null;

    // Filter available prizes locally first to pick a target
    const availablePrizes = PRIZES.filter(p => p.quantity > 0);
    if (availablePrizes.length === 0) return null;

    // Pick random prize type
    const targetPrize = availablePrizes[Math.floor(Math.random() * availablePrizes.length)];

    try {
        const prizeRef = database.ref('prizes/' + targetPrize.key);

        // Transaction: only decrement if quantity > 0
        const result = await prizeRef.child('quantity').transaction((currentQty) => {
            if (currentQty === null) return currentQty; // Ignore if node missing
            if (currentQty > 0) {
                return currentQty - 1;
            }
            return; // Abort if 0
        });

        if (result.committed) {
            return targetPrize; // Return local copy of prize (name, emoji)
        } else {
            // Failed to commit (likely out of stock just now). 
            // We could try again recursively, but for simplicity, we treat it as "bad luck" 
            // or let the user spin again (but we already marked them as 'played' in the main flow? 
            // No, main flow marks played AFTER this function returns).

            // Actually, if this fails, we effectively ran out of THAT specific prize.
            // Let's try ONE more time with a fresh filtered list?
            // For now, return null -> treated as "Lose".
            console.log('Prize contention: missed prize', targetPrize.name);
            return null;
        }
    } catch (error) {
        console.error('Transaction error:', error);
        return null;
    }
}

function showResult(isWin, prize, title, message) {
    const resultBox = document.getElementById('resultBox');
    const resultIcon = document.getElementById('resultIcon');
    const resultTitle = document.getElementById('resultTitle');
    const resultMessage = document.getElementById('resultMessage');
    const prizeName = document.getElementById('prizeName');

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
        resultIcon.textContent = "🍀";
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

// ===== Admin Data Exporter =====
window.getRewardData = function () {
    // Only used by Admin page now
    return {
        totalPrizes: CONFIG.REMAINING_PRIZES, // Current total
        prizes: PRIZES
    };
};

window.clearAllFirebaseData = async function () {
    if (confirm('⚠️ XÓA TOÀN BỘ DỮ LIỆU FIREBASE?')) {
        try {
            if (database) {
                await database.ref('/').remove();
                localStorage.clear();
                alert('✅ Đã xóa toàn bộ dữ liệu!');
                location.reload();
            }
        } catch (error) {
            alert('❌ Lỗi: ' + error.message);
        }
    }
};

window.CONFIG = CONFIG;


