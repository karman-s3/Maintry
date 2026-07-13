let currentAssetId = null;
let selectedAssetColor = '#d04513';
let isExecuting = false;

let costChart = null;
let efficiencyChart = null;

let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

const token = localStorage.getItem('token');

const navButtons = document.querySelectorAll('.nav-btn');
const pages = document.querySelectorAll('.page');

if (!token) {
    window.location.href = 'login.html';
}

// authorization for user
fetch('https://maintry-backend.onrender.com/protected', {
    headers: { Authorization: `Bearer ${token}` }
})
.then(res => {
    if (!res.ok) {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    }
    return res.json();
})
.then(data => {
    document.getElementById('welcome-message').innerText = `Welcome ${data.firstname}!`;
    loadAssets();
});

//navigation buttons at top bar for main pages
navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        navButtons.forEach(b => b.classList.remove('active'));
        pages.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        document.getElementById(btn.dataset.page).classList.add('active');

        if (btn.dataset.page === 'upcoming') loadUpcoming();
        if (btn.dataset.page === 'history') loadHistory();
    });
});

document.addEventListener('DOMContentLoaded', () => {
    
    renderFavorites();
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = 'landing.html';
        });
    }


});

async function handleToggle(btn) {
        // instance of this toggle is already running somewhere, end the req
        if (isExecuting) return;
        
        const taskId = btn.dataset.id;
        if (btn.disabled) return;

        // state variable set to true
        isExecuting = true; 
        btn.disabled = true; 

        try {
            console.log(`[Toggle Engine] Executing a single request for task: ${taskId}`);
            
            const response = await fetch(`https://maintry-backend.onrender.com/maintenance/${taskId}/toggle`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}` 
                }
            });

            const updatedTask = await response.json();
            console.log("[Toggle Engine] Server responded successfully:", updatedTask);

            // refresh layout views 
            const activePage = document.querySelector('.page.active');
            if (activePage) {
                if (activePage.id === 'upcoming') await loadUpcoming();
                if (activePage.id === 'history') await loadHistory();
            }
            if (currentAssetId) {
                await loadMaintenance(currentAssetId);
            }
            await loadAssets();
            await initCharts();
        } catch (err) {
            console.error("[Toggle Engine] Critical failure:", err);
            } finally {
                btn.disabled = false;
                setTimeout(() => {
                    isExecuting = false;
                }, 100);
        }
    }



document.addEventListener('click', (e) => {
    if (!e.target.classList.contains('status-btn')) return;

    handleToggle(e.target);
});

// opening add asset pop up
document.getElementById('add-asset-btn').addEventListener('click', () => {
    document.getElementById('asset-form-modal').classList.add('active');
});

// close the pop up
document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById('asset-form-modal').classList.remove('active');
        document.getElementById('asset-modal').classList.remove('active');
    });
});

async function refreshDashboard() {
    await loadAssets();
    await initCharts();
}

async function loadAssetCostWidget() {
    const res = await fetch('https://maintry-backend.onrender.com/maintenance/history/all', {
        headers: { Authorization: `Bearer ${token}` }
    });

    const tasks = await res.json();

    const grouped = {};

    tasks.forEach(task => {
        const asset = task.assetId;
        if (!asset || !asset._id) return;

        if (!grouped[asset._id]) {
            grouped[asset._id] = {
                asset,
                totalCost: 0
            };
        }

        grouped[asset._id].totalCost += Number(task.cost) || 0;
    });

    const assets = Object.values(grouped);
    const container = document.getElementById("assetCostList");

    let index = 0;

    function render() {
        const item = assets[index];

        container.innerHTML = `
            <div class="cost-card">

                <div class="cost-row">
                    <div class="cost-left">
                        <div class="asset-name">${item.asset.name}</div>
                        <div class="asset-type">${item.asset.type}</div>
                    </div>

                    <div class="cost-right">
                        $${item.totalCost.toFixed(2)}
                    </div>
                </div>

                <div class="cost-nav">
                    <button class="nav-btn-left">‹</button>

                    <span class="cost-indicator">
                        ${index + 1} / ${assets.length}
                    </span>

                    <button class="nav-btn-right">›</button>
                </div>
            </div>
        `;

            container.querySelector(".nav-btn-left").onclick = () => {
                index = (index - 1 + assets.length) % assets.length;
                render();
            };

            container.querySelector(".nav-btn-right").onclick = () => {
                index = (index + 1) % assets.length;
                render();
            };
    }

    if (assets.length === 0) {
        container.innerHTML = `<p>No asset cost data</p>`;
        return;
    }

    render();
}

const selectedColorBtn = document.getElementById('selected-color');
const colorOptions = document.getElementById('color-options');

selectedColorBtn.addEventListener('click', () => {
    colorOptions.classList.toggle('active');
});

// color selecting
document.querySelectorAll('.color-choice').forEach(choice => {
    const color = choice.dataset.color;
    choice.style.background = color;

    choice.addEventListener('click', () => {
        selectedAssetColor = color;
        selectedColorBtn.style.background = color;
        colorOptions.classList.remove('active');
    });
});

// closing pop up using the backgground (really cool-use later)
document.getElementById('asset-form-modal').addEventListener('click', (e) => {
    if (e.target.id === 'asset-form-modal') {
        e.target.classList.remove('active');
    }
});

// saving assets 
document.getElementById('save-asset-btn').addEventListener('click', async () => {
    const name = document.getElementById('asset-name').value;
    const type = document.getElementById('asset-type').value;
    const color = selectedAssetColor;

    await fetch('https://maintry-backend.onrender.com/assets', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, type, color })
    });

    document.getElementById('asset-form-modal').classList.remove('active');
    loadAssets();
});

document.getElementById('add-maintenance-btn').addEventListener('click', async () => {
    const title = document.getElementById('maintenance-title').value;
    const reminderDate = document.getElementById('maintenance-date').value;
    let notes = document.getElementById('maintenance-notes').value;

    if (notes.length >30){
        notes = notes.slice(0,30); 
    }
    await fetch('https://maintry-backend.onrender.com/maintenance', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            assetId: currentAssetId,
            title,
            reminderDate,
            notes
        })
    });

    await loadMaintenance(currentAssetId);
    await refreshDashboard();

    document.getElementById('maintenance-title').value = '';
    document.getElementById('maintenance-date').value = '';
    document.getElementById('maintenance-notes').value = '';
});

// loading user assets

async function loadAssets() {
    const res = await fetch(`https://maintry-backend.onrender.com/assets?t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const assets = await res.json();
    const container = document.getElementById('asset-container');
    container.innerHTML = '';

    for (const asset of assets) {
        const maintenanceRes = await fetch(`https://maintry-backend.onrender.com/maintenance/${asset._id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const tasks = await maintenanceRes.json();
        
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(task => task.completed).length;
        const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        const card = document.createElement('div');
        card.className = 'asset-card';
        card.innerHTML = `
            <div class="card-main-content">
                <div class="asset-info">
                    <h2>${asset.name}</h2>
                    <p>${asset.type}</p>
                </div>
                
                <div class="asset-progress-wrapper">
                    <div class="progress-text-row">
                        <span>Progress</span>
                        <span>${completedTasks}/${totalTasks} Done</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: ${progressPercent}%; background: ${asset.color};"></div>
                    </div>
                </div>
            </div>

            <button class="open-asset-btn" style="background:${asset.color}">➜</button>
        `;
        container.appendChild(card);

        card.querySelector('.open-asset-btn').addEventListener('click', () => {
            currentAssetId = asset._id;
            document.getElementById('selected-asset-name').innerText = `${asset.name} (${asset.type})`;
            document.getElementById('asset-modal').classList.add('active');
            loadMaintenance(asset._id);
        });
    }
}

// the dispkat of maintences 
async function loadMaintenance(assetId) {
    const res = await fetch(`https://maintry-backend.onrender.com/maintenance/${assetId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    const container = document.getElementById('maintenance-container');
    container.innerHTML = '';

    // Separate the arrays into uncompleted vs completed groups
    const uncompletedTasks = data.filter(item => !item.completed);
    const completedTasks = data.filter(item => item.completed);

    // Combine arrays together so uncompleted items are at the beginning
    const sortedTasks = [...uncompletedTasks, ...completedTasks];

    sortedTasks.forEach(item => {
        const div = document.createElement('div');
        div.className = 'maintenance-card';

        div.innerHTML = `
            <h3>${item.title}</h3>
            <p>${new Date(item.reminderDate).toLocaleDateString()}</p>
            <button
                class="status-btn ${item.completed ? 'completed' : 'uncompleted'}"
                data-id="${item._id}"
            >
                ${item.completed ? 'Completed' : 'Uncompleted'}
            </button>
        `;
        container.appendChild(div);
    });
}

document.getElementById('delete-assets-btn').addEventListener('click', async () => {
    const res = await fetch('https://maintry-backend.onrender.com/assets', {
        headers: { Authorization: `Bearer ${token}` }
    });
    const assets = await res.json();
    const list = document.getElementById('delete-assets-list');
    list.innerHTML = '';

    assets.forEach(asset => {
        list.innerHTML += `
            <div class="delete-asset-card" data-id="${asset._id}">
                <span class="selection-icon">□</span>
                <span>${asset.name}</span>
            </div>
        `;
    });

    document.querySelectorAll('.delete-asset-card').forEach(card => {
        card.addEventListener('click', () => {
            card.classList.toggle('selected');
            const icon = card.querySelector('.selection-icon');
            icon.textContent = card.classList.contains('selected') ? '✓' : '□';
        });
    });

    document.getElementById('delete-assets-modal').classList.add('active');
});

document.querySelector('.close-delete-modal').addEventListener('click', () => {
    document.getElementById('delete-assets-modal').classList.remove('active');
});

document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
    const selected = document.querySelectorAll('.delete-asset-card.selected');
    const ids = [...selected].map(card => card.dataset.id);

    if (ids.length === 0) return;

    await fetch('https://maintry-backend.onrender.com/assets/bulk-delete', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ assetIds: ids })
    });

    document.getElementById('delete-assets-modal').classList.remove('active');
    await loadAssets();
});

async function loadUpcoming() {
    const res = await fetch('https://maintry-backend.onrender.com/maintenance/upcoming/all', {
        headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    const grouped = {};

    data.forEach(item => {
        const asset = item.assetId;
        if (!asset || !asset._id) return;

        if (!grouped[asset._id]) {
            grouped[asset._id] = { asset, tasks: [] };
        }
        grouped[asset._id].tasks.push(item);
    });

    const container = document.getElementById('upcoming');
    container.innerHTML = '<h2>Upcoming Maintenance</h2>';
    const groups = Object.values(grouped);

    if (groups.length === 0) {
        container.innerHTML += `<p>No upcoming maintenance tasks.</p>`;
        return;
    }

    groups.forEach(group => {
        const asset = group.asset;
        const widget = document.createElement('div');
        widget.className = 'asset-widget';

        const rows = group.tasks
            .sort((a, b) => new Date(a.reminderDate) - new Date(b.reminderDate))
            .map(task => {
                const daysLeft = Math.ceil((new Date(task.reminderDate) - new Date()) / (1000 * 60 * 60 * 24));
                return `
                    <div class="task-row">
                        <div>${task.title}</div>
                        <div>${new Date(task.reminderDate).toLocaleDateString()}</div>
                        <div>${daysLeft} days</div>
                        <div>${(task.notes || '').slice(0, 20)}</div>
                        <button class="status-btn ${task.completed ? 'completed' : 'uncompleted'}" data-id="${task._id}">
                            ${task.completed ? 'Completed' : 'Uncompleted'}
                        </button>
                    </div>
                `;
            })
            .join('');

        widget.innerHTML = `
            <div class="asset-widget-header" style="background:${asset.color}">
                <h3>${asset.name} (${asset.type})</h3>
            </div>
            <div class="task-header">
                <div>Type</div>
                <div>Due Date</div>
                <div>Days Left</div>
                <div>Notes</div>
                <div>Status</div>
            </div>
            <div class="task-scroll">
                ${rows || `<p>No upcoming tasks for this asset.</p>`}
            </div>
        `;
        container.appendChild(widget);
    });

}

// loading history page -- later feature added is cost tracking
async function loadHistory() {
    const res = await fetch('https://maintry-backend.onrender.com/maintenance/history/all', {
        headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    const grouped = {};

    data.forEach(item => {
        const asset = item.assetId;
        if (!asset || !asset._id) return;

        if (!grouped[asset._id]) {
            grouped[asset._id] = { asset, tasks: [] };
        }
        grouped[asset._id].tasks.push(item);
    });

    const container = document.getElementById('history');
    container.innerHTML = '<h2>History</h2>';
    const groups = Object.values(grouped);

    if (groups.length === 0) {
        container.innerHTML += `<p>No completed maintenance tasks.</p>`;
        return;
    }

    groups.forEach(group => {
        const asset = group.asset;
        const widget = document.createElement('div');
        widget.className = 'asset-widget';

        const rows = group.tasks
            .sort((a, b) => new Date(b.completedDate) - new Date(a.completedDate))
            .map(task => {
        
                return `
                    <div class="task-row history-row">
                        <div>${task.title}</div>

                        <div>${new Date(task.reminderDate).toLocaleDateString()}</div>
                        
                        <div>${task.completedDate ? new Date(task.completedDate).toLocaleDateString() : '-'}</div>
                        
                        <div>${(task.notes || '').slice(0, 20)}</div>

                        <div class="cost-wrapper">
                            <span class="currency">$</span>
                            <input
                                type="number"
                                class="cost-input"
                                data-id="${task._id}"
                                value="${task.cost ? Number(task.cost).toFixed(2) : ''}"
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                            >
                        </div>
                        <button class="status-btn ${task.completed ? 'completed' : 'uncompleted'}" data-id="${task._id}">
                            ${task.completed ? 'Completed' : 'Uncompleted'}
                        </button>
                    </div>
                `;
            })
            .join('');

        widget.innerHTML = `
            <div class="asset-widget-header" style="background:${asset.color}">
                <h3>${asset.name} (${asset.type})</h3>
            </div>
            <div class="task-header history-header">
                <div>Type</div>
                <div>Due Date</div>
                <div>Completed</div>
                <div>Notes</div>
                <div>Cost</div>
                 <div>Status</div>
            </div>
            <div class="task-scroll">
                ${rows || `<p>No history tasks for this asset.</p>`}
            </div>
        `;
        container.appendChild(widget);
    });

}

document.getElementById('history').addEventListener('change', async (e) => {

    if (!e.target.classList.contains('cost-input'))
        return;

    const taskId = e.target.dataset.id;

    const cost =
        parseFloat(e.target.value) || 0;

    try {

        await fetch(
            `https://maintry-backend.onrender.com/maintenance/${taskId}/cost`,
            {
                method: 'PUT',

                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },

                body: JSON.stringify({ cost })
            }
        );

        await updateTotalCost();
        await initCharts();

    } catch(err) {

        console.error(err);

    }
});

document
.getElementById('professional-search-form')
.addEventListener('submit', async (e) => {
    e.preventDefault(); //stoping any page jump / reload
    await searchProfessionals();
});

async function searchProfessionals() {

    const task =
        document.getElementById('task-search').value;

    const location =
        document.getElementById('location-search').value;

    const res = await fetch(
        `https://maintry-backend.onrender.com/professionals/search?task=${encodeURIComponent(task)}&location=${encodeURIComponent(location)}`,
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    const results = await res.json();

    renderProfessionals(results);
    updatePinButtons();
}







function renderProfessionals(results) {

    const container =
        document.getElementById('professional-results');

    container.innerHTML = '';

    results.forEach(place => {

        const card = document.createElement('div');
        card.className = 'professional-card';

        card.innerHTML = `
            <div class="card-image">
                ${
                    place.photo
                        ? `<img src="${place.photo}" />`
                        : ''
                }
            </div>

            <div class="card-content">
                <h3>${place.name}</h3>

                <p class="rating">
                    ⭐ ${place.rating || 'N/A'}
                    (${place.reviews || 0} reviews)
                </p>

                <p class="address">
                    📍 ${place.address || ''}
                </p>

                <p class="phone">
                    📞 ${place.phone || 'No phone listed'}
                </p>

                <div class="actions">

                    <button class="pin-btn" data-name="${place.name}">
                        📌 Pin
                    </button>

                    ${
                        place.phone
                            ? `<a href="tel:${place.phone}">
                                Call
                               </a>`
                            : ''
                    }

                    ${
                        place.website
                            ? `<a href="${place.website}" target="_blank">
                                Website
                               </a>`
                            : ''
                    }

                    <a
                        target="_blank"
                        href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}"
                    >
                        Directions
                    </a>
                </div>
            </div>
        `;

        container.appendChild(card);
    });
    updatePinButtons();
}




document.addEventListener('click', (e) => {
    if (!e.target.classList.contains('pin-btn')) return;

    const card = e.target.closest('.professional-card');

    const name = card.querySelector('h3').innerText;
    const address = card.querySelector('.address').innerText.replace('📍', '').trim();
    const phone = card.querySelector('.phone').innerText.replace('📞', '').trim();

    const key = `${name}-${address}`;
    
    const existingIndex = favorites.findIndex(f => f.key === key);

    if (existingIndex !== -1) {
        favorites.splice(existingIndex, 1); // unpinning favourties
    } else {
        favorites.push({ key, name, address, phone });
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));

    renderFavorites();
    updatePinButtons();
});

function updatePinButtons() {
    document.querySelectorAll('.professional-card').forEach(card => {
        const name = card.querySelector('h3')?.innerText;
        const address = card.querySelector('.address')?.innerText.replace('📍', '').trim();
        const btn = card.querySelector('.pin-btn');

        if (!btn) return; 

        const key = `${name}-${address}`;

        const isPinned = favorites.some(f => f.key === key);

        btn.innerText = isPinned ? '📍 Unpin' : '📌 Pin';
    });
}

function renderFavorites() {

    const container = document.getElementById('favorite-professionals');

    if (favorites.length === 0) {
        container.innerHTML = `<p class="empty-fav">No saved places yet</p>`;
        return;
    }

    container.innerHTML = '';

    favorites.forEach(fav => {

        const div = document.createElement('div');
        div.className = 'favorite-card';

        div.innerHTML = `
            <strong>${fav.name}</strong>
            <p>📍${fav.address}</p>
            <p>📞${fav.phone}</p>

            <button
                class="remove-favorite-btn"
                data-key="${fav.key}"
            >
                📍 Unpin
            </button>
        `;
        container.appendChild(div);
    });
}

document.addEventListener('click', (e) => {

    if (!e.target.classList.contains('remove-favorite-btn'))
        return;

    const key = e.target.dataset.key;

    favorites = favorites.filter(
        fav => fav.key !== key
    );

    localStorage.setItem(
        'favorites',
        JSON.stringify(favorites)
    );

    renderFavorites();
    updatePinButtons();
});

function getMonth(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return null;
    return d.getMonth();
}

function calculateEfficiencyLast12(tasks) {
    const last12 = getLast12Months();

    const scores = Array(12).fill(0);
    const counts = Array(12).fill(0);

    const now = new Date();

    for (const task of tasks) {
        const date = new Date(task.reminderDate);
        if (isNaN(date)) continue;

        const taskMonth = date.getMonth();
        const taskYear = date.getFullYear();

        const index = last12.findIndex(
            m => m.month === taskMonth && m.year === taskYear
        );

        if (index === -1) continue;

        // age penalty (older tasks add less to the efficiency)
        const daysAgo = (now - date) / (1000 * 60 * 60 * 24);
        const decay = Math.exp(-daysAgo / 120); 
        // 120 days = smooth decay curve (found this on the internet - cool way to keep the users interacted)

        let score = 0;

        if (task.completed) {
            // completed = good, but not 100%
            score = 70 + (30 * decay);
        } else {
            // uncompleted reduces efficiency slightly
            score = 40 * decay;
        }

        // optional boost if completed on time :)
        if (task.completed && task.completedDate && task.reminderDate) {
            if (new Date(task.completedDate) <= new Date(task.reminderDate)) {
                score += 10;
            }
        }

        scores[index] += score;
        counts[index]++;
    }

    return scores.map((total, i) => {
    if (counts[i] === 0) return 0;   // if no tasks for the month then 0% efficiency

    return Math.min(100, Math.round(total / counts[i]));
});
}

async function updateTotalCost() {
    const res = await fetch('https://maintry-backend.onrender.com/maintenance/history/all', {
        headers: { Authorization: `Bearer ${token}` }
    });

    const allTasks = await res.json();

    let totalCost = 0;

    allTasks.forEach(task => {
        totalCost += Number(task.cost) || 0;
    });

    document.getElementById("totalMaintenanceCostValue").innerText =
        `$${totalCost.toFixed(2)}`;
}

function getLast12Months() {
    const months = [];

    const now = new Date();

    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);

        months.push({
            label: d.toLocaleString('default', { month: 'short', year: 'numeric' }),
            year: d.getFullYear(),
            month: d.getMonth()
        });
    }

    return months;
}

async function initCharts() {
    try {
        const res = await fetch('https://maintry-backend.onrender.com/maintenance/history/all', {
            headers: { Authorization: `Bearer ${token}` }
        });

        const allTasks = await res.json();

        await updateTotalCost();
        await loadAssetCostWidget();

        const last12 = getLast12Months();
        const labels = last12.map(m => m.label);

        const monthlyCosts = Array(12).fill(0);

        allTasks.forEach(task => {
            const d = new Date(task.completedDate);
            if (isNaN(d)) return;

            const taskYear = d.getFullYear();
            const taskMonth = d.getMonth();

            last12.forEach((m, index) => {
                if (m.year === taskYear && m.month === taskMonth) {
                    monthlyCosts[index] += Number(task.cost) || 0;
                }
            });
        });

        const efficiencyData = calculateEfficiencyLast12(allTasks);

        if (costChart) {
            costChart.destroy();
            costChart = null;
        }

        if (efficiencyChart) {
            efficiencyChart.destroy();
            efficiencyChart = null;
        }

        costChart = new Chart(document.getElementById("costChart"), {
            type: "line",
            data: {
                labels: labels,
                datasets: [{
                    label: "Monthly Cost",
                    data: monthlyCosts,
                    borderColor: "#d04513",
                    backgroundColor: "rgba(208,69,19,0.1)",
                    fill: true,
                    tension: 0.4
                }]
            }
        });

        efficiencyChart = new Chart(document.getElementById("efficiencyChart"), {
            type: "line",
            data: {
                labels: labels,
                datasets: [{
                    label: "Maintenance Efficiency %",
                    data: efficiencyData,
                    borderColor: "#16a34a",
                    backgroundColor: "rgba(22,163,74,0.1)",
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                scales: {
                    y: { min: 0, max: 100 }
                }
            }
        });

    } catch (err) {
        console.error("Chart init failed:", err);
    }
}

initCharts();
