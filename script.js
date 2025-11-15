import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, updateDoc, deleteDoc, doc, query, where, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyD-5KD1mpt-EQnWcXG9w83CW2L0HJrGIDY",
    authDomain: "lock-in-crm.firebaseapp.com",
    projectId: "lock-in-crm",
    storageBucket: "lock-in-crm.firebasestorage.app",
    messagingSenderId: "773783705239",
    appId: "1:773783705239:web:314ddfb72a3649d02afbd2",
    measurementId: "G-VPVQ5XBGT8"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let userData = null;
let leads = [];
let currentEditId = null;
let lastQuoteChange = Date.now();
let leadsChart = null;

const quotes = [
    { text: "The grind never stops. Your future self will thank you.", author: "Anonymous Hustler" },
    { text: "Success is not given, it's earned. Keep going.", author: "Unknown" },
    { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "Your limitation—it's only your imagination.", author: "Unknown" },
    { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
    { text: "Great things never come from comfort zones.", author: "Unknown" },
    { text: "Dream it. Wish it. Do it.", author: "Unknown" },
    { text: "Success doesn't just find you. You have to go out and get it.", author: "Unknown" },
    { text: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Unknown" },
    { text: "Dream bigger. Do bigger.", author: "Unknown" },
    { text: "Don't stop when you're tired. Stop when you're done.", author: "Unknown" },
    { text: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
    { text: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery" },
    { text: "Little things make big days.", author: "Unknown" },
    { text: "It's going to be hard, but hard does not mean impossible.", author: "Unknown" },
    { text: "Don't wait for opportunity. Create it.", author: "Unknown" },
    { text: "The key to success is to focus on goals, not obstacles.", author: "Unknown" },
    { text: "Dream it. Believe it. Build it.", author: "Unknown" }
];

function showToast(message, type = 'success') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<div class="toast-message">${message}</div>`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

window.showLogin = function() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('signupForm').classList.add('hidden');
}

window.showSignup = function() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('signupForm').classList.remove('hidden');
}

window.signupUser = async function() {
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;

    if (!name || !email || !password) {
        showToast('Please fill all fields', 'error');
        return;
    }

    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            uid: userCredential.user.uid,
            name: name,
            email: email,
            isSubscribed: false,
            onboarded: false,
            createdAt: new Date().toISOString()
        });

        showToast('Account created! 🎉', 'success');
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            showToast('Email already in use', 'error');
        } else if (error.code === 'auth/invalid-email') {
            showToast('Invalid email address', 'error');
        } else if (error.code === 'auth/weak-password') {
            showToast('Password is too weak', 'error');
        } else {
            showToast('Error: ' + error.message, 'error');
        }
    }
}

window.loginUser = async function() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showToast('Please fill all fields', 'error');
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('Welcome back! 🚀', 'success');
    } catch (error) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            showToast('Invalid email or password', 'error');
        } else if (error.code === 'auth/invalid-email') {
            showToast('Invalid email address', 'error');
        } else {
            showToast('Error: ' + error.message, 'error');
        }
    }
}

window.logout = function() {
    signOut(auth);
    location.reload();
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('loading').classList.remove('hidden');
        document.getElementById('authScreen').classList.add('hidden');
        
        try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);
            
            if (userDocSnap.exists()) {
                userData = { id: userDocSnap.id, ...userDocSnap.data() };
            } else {
                await setDoc(userDocRef, {
                    uid: user.uid,
                    email: user.email,
                    isSubscribed: false,
                    onboarded: false,
                    createdAt: new Date().toISOString()
                });
                
                userData = {
                    id: user.uid,
                    uid: user.uid,
                    email: user.email,
                    isSubscribed: false,
                    onboarded: false
                };
            }
            
            document.getElementById('loading').classList.add('hidden');
            
            if (!userData.onboarded) {
                showOnboarding();
            } else {
                showQuoteScreen();
            }
        } catch (error) {
            showToast('Error loading user data', 'error');
            document.getElementById('loading').classList.add('hidden');
        }
    } else {
        currentUser = null;
        userData = null;
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('mainApp').classList.add('hidden');
        document.getElementById('authScreen').classList.remove('hidden');
        document.getElementById('onboardingScreen').classList.add('hidden');
        document.getElementById('quoteScreen').classList.add('hidden');
    }
});

function showOnboarding() {
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('quoteScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('onboardingScreen').classList.remove('hidden');
}

document.getElementById('onboardingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const businessName = document.getElementById('businessName').value.trim();
    const userType = document.getElementById('userType').value;
    
    if (!businessName || !userType) {
        showToast('Please fill all fields', 'error');
        return;
    }
    
    try {
        const userDocRef = doc(db, 'users', userData.id);
        await updateDoc(userDocRef, {
            businessName: businessName,
            userType: userType,
            onboarded: true
        });
        
        userData.businessName = businessName;
        userData.userType = userType;
        userData.onboarded = true;
        
        showQuoteScreen();
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
});

function showQuoteScreen() {
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    document.getElementById('displayQuoteText').textContent = `"${quote.text}"`;
    document.getElementById('displayQuoteAuthor').textContent = `— ${quote.author}`;
    
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('onboardingScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('quoteScreen').classList.remove('hidden');
    
    setTimeout(() => {
        showMainApp();
    }, 3000);
}

function showMainApp() {
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('onboardingScreen').classList.add('hidden');
    document.getElementById('quoteScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    
    document.getElementById('businessNameDisplay').textContent = userData.businessName || currentUser.email;
    
    displayQuote();
    checkBanner();
    loadLeads();
    
    setInterval(() => {
        const hourPassed = Date.now() - lastQuoteChange > 3600000;
        if (hourPassed) {
            displayQuote();
            lastQuoteChange = Date.now();
        }
    }, 60000);
}

function displayQuote() {
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    document.getElementById('quoteText').textContent = `"${quote.text}"`;
    document.getElementById('quoteAuthor').textContent = `— ${quote.author}`;
}

window.dismissBanner = function() {
    document.getElementById('topBanner').style.display = 'none';
    localStorage.setItem('bannerDismissed', 'true');
}

function checkBanner() {
    const dismissed = localStorage.getItem('bannerDismissed');
    if (dismissed === 'true') {
        const banner = document.getElementById('topBanner');
        if (banner) banner.style.display = 'none';
    }
}

window.toggleMenu = function() {
    const menu = document.getElementById('dropdownMenu');
    menu.classList.toggle('hidden');
}

document.addEventListener('click', (e) => {
    const menu = document.getElementById('dropdownMenu');
    const menuBtn = document.querySelector('.menu-btn');
    
    if (menu && menuBtn && !menu.contains(e.target) && !menuBtn.contains(e.target)) {
        menu.classList.add('hidden');
    }
});

async function loadLeads() {
    try {
        const leadsRef = collection(db, 'leads');
        const allLeadsSnapshot = await getDocs(leadsRef);
        
        leads = [];
        allLeadsSnapshot.forEach((doc) => {
            const leadData = doc.data();
            if (leadData.userId === currentUser.uid) {
                leads.push({ id: doc.id, ...leadData });
            }
        });
        
        leads.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB - dateA;
        });
        
        updateDashboard();
        renderLeadsTable();
    } catch (error) {
        console.error('Load leads error:', error);
        showToast('Error loading leads: ' + error.message, 'error');
    }
}
function updateDashboard() {
    const total = leads.length;
    const current = leads.filter(l => l.status === 'New Lead' || l.status === 'Negotiating').length;
    const converted = leads.filter(l => l.status === 'Converted').length;
    const lost = leads.filter(l => l.status === 'Lost').length;
    const revenue = leads
        .filter(l => l.status === 'Converted')
        .reduce((sum, l) => sum + (parseFloat(l.deal) || 0), 0);
    
    document.getElementById('totalLeads').textContent = total;
    document.getElementById('currentLeads').textContent = current;
    document.getElementById('convertedLeads').textContent = converted;
    document.getElementById('lostLeads').textContent = lost;
    document.getElementById('totalRevenue').textContent = '$' + revenue.toLocaleString();
}

function renderLeadsTable() {
    const tbody = document.getElementById('leadsTableBody');
    
    if (leads.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 80px 20px;">
                    <div style="font-size: 64px; margin-bottom: 16px;">🚀</div>
                    <div style="font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 8px;">
                        Ready to lock in?
                    </div>
                    <div style="color: #aaaaaa; margin-bottom: 24px;">
                        Add your first lead by clicking Add Lead button
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = leads.map(lead => {
        const statusClass = lead.status.toLowerCase().replace(' ', '');
        return `
            <tr onclick="editLead('${lead.id}')">
                <td>${lead.name}</td>
                <td>${lead.email || '-'}</td>
                <td>${lead.phone || '-'}</td>
                <td><span class="status-badge status-${statusClass}">${lead.status}</span></td>
                <td>${lead.deal ? '$' + parseFloat(lead.deal).toLocaleString() : '-'}</td>
                <td>${lead.source || '-'}</td>
                <td>${lead.followedUp === 'true' ? '✅ Yes' : '❌ No'}</td>
            </tr>
        `;
    }).join('');
}

window.filterLeads = function() {
    const searchTerm = document.getElementById('searchLeads').value.toLowerCase();
    const statusFilter = document.getElementById('filterStatus').value;
    
    let filtered = leads;
    
    if (searchTerm) {
        filtered = filtered.filter(l => 
            l.name.toLowerCase().includes(searchTerm) ||
            (l.email && l.email.toLowerCase().includes(searchTerm)) ||
            (l.phone && l.phone.includes(searchTerm))
        );
    }
    
    if (statusFilter) {
        filtered = filtered.filter(l => l.status === statusFilter);
    }
    
    const tbody = document.getElementById('leadsTableBody');
    
    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 60px; color: #aaaaaa;">
                    No leads match your filters 🔍
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtered.map(lead => {
        const statusClass = lead.status.toLowerCase().replace(' ', '');
        return `
            <tr onclick="editLead('${lead.id}')">
                <td>${lead.name}</td>
                <td>${lead.email || '-'}</td>
                <td>${lead.phone || '-'}</td>
                <td><span class="status-badge status-${statusClass}">${lead.status}</span></td>
                <td>${lead.deal ? '$' + parseFloat(lead.deal).toLocaleString() : '-'}</td>
                <td>${lead.source || '-'}</td>
                <td>${lead.followedUp === 'true' ? '✅ Yes' : '❌ No'}</td>
            </tr>
        `;
    }).join('');
}

window.openAddLeadModal = function() {
    if (!userData.isSubscribed && leads.length >= 3) {
        showToast('Free plan limited to 3 leads. Subscribe for unlimited!', 'error');
        return;
    }
    
    currentEditId = null;
    document.getElementById('modalTitle').textContent = 'Add Lead';
    document.getElementById('contactForm').reset();
    document.getElementById('contactModal').classList.remove('hidden');
}

window.editLead = function(id) {
    currentEditId = id;
    const lead = leads.find(l => l.id === id);
    
    document.getElementById('modalTitle').textContent = 'Edit Lead';
    document.getElementById('nameInput').value = lead.name;
    document.getElementById('emailInput').value = lead.email || '';
    document.getElementById('phoneInput').value = lead.phone || '';
    document.getElementById('statusInput').value = lead.status;
    document.getElementById('dealInput').value = lead.deal || '';
    document.getElementById('sourceInput').value = lead.source || '';
    document.getElementById('followedUpInput').value = lead.followedUp || 'false';
    
    document.getElementById('contactModal').classList.remove('hidden');
}

window.closeContactModal = function() {
    document.getElementById('contactModal').classList.add('hidden');
    currentEditId = null;
}

document.getElementById('contactForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const leadData = {
        userId: currentUser.uid,
        name: document.getElementById('nameInput').value.trim(),
        email: document.getElementById('emailInput').value.trim(),
        phone: document.getElementById('phoneInput').value.trim(),
        status: document.getElementById('statusInput').value,
        deal: document.getElementById('dealInput').value || '0',
        source: document.getElementById('sourceInput').value,
        followedUp: document.getElementById('followedUpInput').value,
        updatedAt: new Date().toISOString()
    };
    
    try {
        if (currentEditId) {
            await updateDoc(doc(db, 'leads', currentEditId), leadData);
            showToast('✅ Lead updated', 'success');
        } else {
            leadData.createdAt = new Date().toISOString();
            await addDoc(collection(db, 'leads'), leadData);
            showToast('✅ Lead added', 'success');
        }
        
        closeContactModal();
        await loadLeads();
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
});

window.deleteContact = async function() {
    if (!currentEditId) return;
    
    if (!confirm('Delete this lead? This cannot be undone.')) {
        return;
    }
    
    try {
        await deleteDoc(doc(db, 'leads', currentEditId));
        showToast('✅ Lead deleted', 'success');
        closeContactModal();
        await loadLeads();
    } catch (error) {
        showToast('Error deleting lead', 'error');
    }
}

window.showDashboard = function() {
    document.getElementById('dashboardView').classList.remove('hidden');
    document.getElementById('analyticsView').classList.add('hidden');
}

window.showAnalytics = function() {
    document.getElementById('dashboardView').classList.add('hidden');
    document.getElementById('analyticsView').classList.remove('hidden');
    
    updateAnalytics();
}

function updateAnalytics() {
    const total = leads.length;
    const converted = leads.filter(l => l.status === 'Converted').length;
    const lost = leads.filter(l => l.status === 'Lost').length;
    const negotiating = leads.filter(l => l.status === 'Negotiating').length;
    const newLeads = leads.filter(l => l.status === 'New Lead').length;
    const followedUp = leads.filter(l => l.followedUp === 'true').length;
    const followUpRate = total > 0 ? Math.round((followedUp / total) * 100) : 0;
    
    document.getElementById('analyticsTotal').textContent = total;
    document.getElementById('analyticsConverted').textContent = converted;
    document.getElementById('analyticsLost').textContent = lost;
    document.getElementById('analyticsNegotiating').textContent = negotiating;
    document.getElementById('analyticsNew').textContent = newLeads;
    document.getElementById('analyticsFollowUp').textContent = followUpRate + '%';
    
    const ctx = document.getElementById('leadsChart');
    if (ctx) {
        if (leadsChart) {
            leadsChart.destroy();
        }
        
        leadsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['New Lead', 'Negotiating', 'Converted', 'Lost'],
                datasets: [{
                    label: 'Number of Leads',
                    data: [newLeads, negotiating, converted, lost],
                    backgroundColor: [
                        'rgba(59, 130, 246, 0.5)',
                        'rgba(245, 158, 11, 0.5)',
                        'rgba(34, 197, 94, 0.5)',
                        'rgba(239, 68, 68, 0.5)'
                    ],
                    borderColor: [
                        '#3b82f6',
                        '#f59e0b',
                        '#22c55e',
                        '#ef4444'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#aaaaaa',
                            stepSize: 1
                        },
                        grid: {
                            color: '#2a2a32'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#aaaaaa'
                        },
                        grid: {
                            color: '#2a2a32'
                        }
                    }
                }
            }
        });
    }
}

window.openSettings = function() {
    document.getElementById('settingsEmail').textContent = currentUser.email;
    document.getElementById('settingsBusinessName').textContent = userData.businessName || '-';
    document.getElementById('settingsUserType').textContent = userData.userType || '-';
    document.getElementById('settingsModal').classList.remove('hidden');
    document.getElementById('dropdownMenu').classList.add('hidden');
}

window.closeSettingsModal = function() {
    document.getElementById('settingsModal').classList.add('hidden');
}

window.googleToolsPlaceholder = function() {
    showToast('Google Tools integration coming soon! 🔗', 'success');
}

window.subscribePlaceholder = function() {
    showToast('Premium subscription coming soon! 💳', 'success');
}