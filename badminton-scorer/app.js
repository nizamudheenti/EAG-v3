const STORAGE_KEY = 'smashscore_data';

let state = {
    players: [],
    matches: [],
    activeMatchId: null,
};

const POINTS_TO_WIN_SET = 21;
const MAX_POINTS = 30; // Cap at 30-29
const CLEAR_BY_TWO = 2;
const SETS_TO_WIN_MATCH = 2; // Best of 3

function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        state = JSON.parse(saved);
        if (state.activeMatchId && !state.matches.find(m => m.id === state.activeMatchId)) {
            state.activeMatchId = null;
        }
    }
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    render();
}

const navBtns = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view');
const addPlayerForm = document.getElementById('add-player-form');
const playerNameInput = document.getElementById('player-name-input');
const playersList = document.getElementById('players-list');
const generateMatchesBtn = document.getElementById('generate-matches-btn');
const clearDataBtn = document.getElementById('clear-data-btn');
const matchesContainer = document.getElementById('matches-container');

// Quick Match Elements
const quickMatchForm = document.getElementById('quick-match-form');
const qmP1 = document.getElementById('qm-p1');
const qmP2 = document.getElementById('qm-p2');
const qmCategory = document.getElementById('qm-category');

// JSON I/O
const exportJsonBtn = document.getElementById('export-json-btn');
const importJsonInput = document.getElementById('import-json-input');

exportJsonBtn.addEventListener('click', () => {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `smashscore_tournament_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

importJsonInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const importedState = JSON.parse(event.target.result);
            if (importedState && Array.isArray(importedState.players) && Array.isArray(importedState.matches)) {
                state = importedState;
                saveState();
                alert('Tournament data imported successfully!');
                switchView('matches-view');
            } else {
                alert('Invalid JSON file. Please ensure it comes from SmashScore export.');
            }
        } catch (err) {
            alert('Error parsing JSON file. It might be corrupt.');
        }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
});


navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.id === 'nav-scoreboard' && !state.activeMatchId) {
            alert('Please select a match from the Matches schedule first.');
            return;
        }
        switchView(btn.dataset.target);
    });
});

function switchView(viewId) {
    navBtns.forEach(b => b.classList.remove('active'));
    views.forEach(v => v.classList.remove('active'));
    
    const targetBtn = document.querySelector(`[data-target="${viewId}"]`);
    if(targetBtn) targetBtn.classList.add('active');
    
    const targetView = document.getElementById(viewId);
    if(targetView) targetView.classList.add('active');
}

addPlayerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = playerNameInput.value.trim();
    if (name && !state.players.includes(name)) {
        state.players.push(name);
        playerNameInput.value = '';
        saveState();
    } else if (state.players.includes(name)) {
        alert('Player already exists!');
    }
});

function deletePlayer(name) {
    state.players = state.players.filter(p => p !== name);
    state.matches = [];
    state.activeMatchId = null;
    saveState();
}

window.deletePlayer = deletePlayer;
window.startMatch = startMatch;
window.switchView = switchView;

clearDataBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all tournament data?')) {
        state = { players: [], matches: [], activeMatchId: null };
        saveState();
        switchView('players-view');
    }
});

generateMatchesBtn.addEventListener('click', () => {
    if (state.players.length < 2) return;
    if (state.matches.length > 0) {
        if(!confirm('This will erase the current schedule and scores. Continue?')) {
            return;
        }
    }
    state.matches = [];
    state.activeMatchId = null;
    let matchId = 1;

    for (let i = 0; i < state.players.length; i++) {
        for (let j = i + 1; j < state.players.length; j++) {
            state.matches.push({
                id: `M${matchId++}`,
                category: `Tournament Match`,
                p1: state.players[i],
                p2: state.players[j],
                status: 'pending',
                p1Score: 0,
                p2Score: 0,
                p1Sets: 0,
                p2Sets: 0,
                setScores: [],
                currentSet: 1
            });
        }
    }
    saveState();
    switchView('matches-view');
});

quickMatchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const p1 = qmP1.value.trim();
    const p2 = qmP2.value.trim();
    const category = qmCategory.value;

    if (!p1 || !p2) return;

    const matchIdStr = `QM${Date.now().toString().slice(-6)}`;
    
    const newMatch = {
        id: matchIdStr,
        category: category,
        p1: p1,
        p2: p2,
        status: 'active',
        p1Score: 0,
        p2Score: 0,
        p1Sets: 0,
        p2Sets: 0,
        setScores: [],
        currentSet: 1
    };
    
    // Pause any other active matches
    state.matches.forEach(m => {
        if (m.status === 'active') m.status = 'pending';
    });
    
    state.matches.unshift(newMatch); // add Quick Match to top of schedule
    state.activeMatchId = matchIdStr;
    
    qmP1.value = '';
    qmP2.value = '';
    
    saveState();
    switchView('scoreboard-view');
});


function startMatch(matchId) {
    const match = state.matches.find(m => m.id === matchId);
    if (match.status === 'completed') {
        alert('This match is already completed.');
        return;
    }
    state.matches.forEach(m => {
        if (m.status === 'active' && m.id !== matchId) {
            m.status = 'pending';
        }
    });

    match.status = 'active';
    state.activeMatchId = matchId;
    saveState();
    switchView('scoreboard-view');
}

document.querySelectorAll('.btn-plus').forEach(btn => {
    btn.addEventListener('click', (e) => updateScore(parseInt(e.currentTarget.dataset.player), 1));
});

document.querySelectorAll('.btn-minus').forEach(btn => {
    btn.addEventListener('click', (e) => updateScore(parseInt(e.currentTarget.dataset.player), -1));
});

function animateScoreBox(playerNum) {
    const box = document.getElementById(`sb-p${playerNum}-score`);
    box.classList.add('highlight');
    setTimeout(() => box.classList.remove('highlight'), 200);
}

function checkSetWinner(m) {
    let winner = 0;
    if (m.p1Score >= POINTS_TO_WIN_SET && (m.p1Score - m.p2Score >= CLEAR_BY_TWO || m.p1Score === MAX_POINTS)) {
        winner = 1;
    } else if (m.p2Score >= POINTS_TO_WIN_SET && (m.p2Score - m.p1Score >= CLEAR_BY_TWO || m.p2Score === MAX_POINTS)) {
        winner = 2;
    }

    if (winner !== 0) {
        m.setScores.push({ p1: m.p1Score, p2: m.p2Score });
        if (winner === 1) m.p1Sets++;
        if (winner === 2) m.p2Sets++;
        
        if (m.p1Sets === SETS_TO_WIN_MATCH || m.p2Sets === SETS_TO_WIN_MATCH) {
            m.status = 'completed';
            showWinnerModal(m);
        } else {
            m.currentSet++;
            m.p1Score = 0;
            m.p2Score = 0;
            alert(`Set ${m.currentSet - 1} goes to ${winner === 1 ? m.p1 : m.p2}!`);
        }
    }
}

function updateScore(playerNum, change) {
    if (!state.activeMatchId) return;
    const m = state.matches.find(match => match.id === state.activeMatchId);
    if (!m || m.status === 'completed') return;

    if (playerNum === 1) {
        m.p1Score = Math.max(0, m.p1Score + change);
        if (change > 0) animateScoreBox(1);
    } else {
        m.p2Score = Math.max(0, m.p2Score + change);
        if (change > 0) animateScoreBox(2);
    }

    checkSetWinner(m);
    saveState();
}

document.getElementById('end-match-btn').addEventListener('click', () => {
    if (!state.activeMatchId) return;
    if (confirm('End this match? The current set scores will be discarded if the match is not complete.')) {
        const m = state.matches.find(match => match.id === state.activeMatchId);
        m.status = 'completed';
        showWinnerModal(m);
        saveState();
    }
});

function showWinnerModal(match) {
    const modal = document.getElementById('winner-modal');
    const winnerName = document.getElementById('winner-name');
    const summary = document.getElementById('winner-score-summary');

    let w = match.p1Sets > match.p2Sets ? match.p1 : match.p2;
    if (match.p1Sets === match.p2Sets) w = "Draw / Incomplete";

    winnerName.textContent = w;
    let scoreText = match.setScores.map(s => `${s.p1}-${s.p2}`).join(' | ');
    if (match.p1Score > 0 || match.p2Score > 0) {
        scoreText += (scoreText ? ' | ' : '') + `${match.p1Score}-${match.p2Score} (DNF)`;
    }
    summary.textContent = scoreText || "No sets completed";
    modal.classList.add('active');
}

document.getElementById('close-modal-btn').addEventListener('click', () => {
    document.getElementById('winner-modal').classList.remove('active');
    state.activeMatchId = null;
    saveState();
    switchView('matches-view');
});

// Analytics / Rankings Calculations
function computeRankings() {
    const stats = {};
    state.players.forEach(p => {
        stats[p] = { name: p, played: 0, won: 0, lost: 0, setsWon: 0, setsLost: 0, ptsFor: 0, ptsAgainst: 0 };
    });

    state.matches.forEach(m => {
        // Quick matches might contain custom players not in the official tournament roster. Only rank enrolled players.
        if (m.status === 'completed') {
            if (stats[m.p1]) {
                stats[m.p1].played++;
                if (m.p1Sets > m.p2Sets) stats[m.p1].won++;
                else if (m.p2Sets > m.p1Sets) stats[m.p1].lost++;
                stats[m.p1].setsWon += m.p1Sets;
                stats[m.p1].setsLost += m.p2Sets;
                m.setScores.forEach(s => { stats[m.p1].ptsFor += s.p1; stats[m.p1].ptsAgainst += s.p2; });
            }
            if (stats[m.p2]) {
                stats[m.p2].played++;
                if (m.p2Sets > m.p1Sets) stats[m.p2].won++;
                else if (m.p1Sets > m.p2Sets) stats[m.p2].lost++;
                stats[m.p2].setsWon += m.p2Sets;
                stats[m.p2].setsLost += m.p1Sets;
                m.setScores.forEach(s => { stats[m.p2].ptsFor += s.p2; stats[m.p2].ptsAgainst += s.p1; });
            }
        }
    });

    const rankingArr = Object.values(stats);
    // Sort logic: Wins -> Set Diff -> Pts Diff
    rankingArr.sort((a, b) => {
        if (b.won !== a.won) return b.won - a.won;
        
        const aSetDiff = a.setsWon - a.setsLost;
        const bSetDiff = b.setsWon - b.setsLost;
        if (bSetDiff !== aSetDiff) return bSetDiff - aSetDiff;

        const aPtsDiff = a.ptsFor - a.ptsAgainst;
        const bPtsDiff = b.ptsFor - b.ptsAgainst;
        return bPtsDiff - aPtsDiff;
    });

    return rankingArr;
}

function renderRankings() {
    const tbody = document.getElementById('rankings-body');
    const rankings = computeRankings();
    
    tbody.innerHTML = '';
    if (rankings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color:var(--text-muted)">Add players to see rankings.</td></tr>`;
        return;
    }

    rankings.forEach((r, idx) => {
        const tr = document.createElement('tr');
        const rankClass = idx < 3 ? `rank-${idx+1}` : '';
        const ptsDiff = r.ptsFor - r.ptsAgainst;
        const setDiff = r.setsWon - r.setsLost;
        
        tr.innerHTML = `
            <td class="${rankClass}">#${idx + 1}</td>
            <td style="font-weight:600">${r.name}</td>
            <td class="text-center">${r.played}</td>
            <td class="text-center" style="color: var(--success-color)">${r.won} - ${r.lost}</td>
            <td class="text-center">${r.setsWon} / ${r.setsLost} <span style="color:var(--text-muted);font-size:0.8rem">(${setDiff > 0 ? '+'+setDiff : setDiff})</span></td>
            <td class="text-center">${ptsDiff > 0 ? '+'+ptsDiff : ptsDiff}</td>
        `;
        tbody.appendChild(tr);
    });
}

function render() {
    playersList.innerHTML = '';
    state.players.forEach(p => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${p}</span>
            <button class="delete-player-btn" onclick="deletePlayer('${p}')" title="Remove Player">
               ✕
            </button>
        `;
        playersList.appendChild(li);
    });
    
    generateMatchesBtn.disabled = state.players.length < 2;

    matchesContainer.innerHTML = '';
    if (state.matches.length === 0) {
        matchesContainer.innerHTML = `<div class="empty-state">No matches yet. Add players and generate tournament or start a quick match.</div>`;
    } else {
        state.matches.forEach(m => {
            const card = document.createElement('div');
            card.className = 'match-card';
            let statusText = 'Pending';
            let actionHtml = `<button class="btn btn-primary btn-sm" style="width:100%" onclick="startMatch('${m.id}')">Start Match</button>`;
            
            if (m.status === 'active') {
                statusText = 'In Progress';
                actionHtml = `<button class="btn btn-success btn-sm" style="width:100%" onclick="switchView('scoreboard-view')">Resume Scoring</button>`;
            } else if (m.status === 'completed') {
                statusText = 'Completed';
                actionHtml = `<div class="text-center" style="color:var(--text-muted);font-size:0.875rem;text-align:center;">Match Finished</div>`;
            }
            
            let setsSummaryHtml = '';
            if (m.setScores.length > 0) {
                setsSummaryHtml = `<div style="font-size:0.85rem; color:var(--text-muted); margin-top:0.5rem">Sets: ${m.setScores.map(s => `${s.p1}-${s.p2}`).join(' | ')}</div>`;
            }

            const headerDetails = m.category ? `<span class="badge" style="background:rgba(255,255,255,0.05);color:#fff;">${m.category}</span>` : `<span>${m.id}</span>`;

            card.innerHTML = `
                <div class="match-card-header">
                    ${headerDetails}
                    <span class="badge ${m.status}">${statusText}</span>
                </div>
                <div class="match-players">
                    <div class="match-player-row">
                        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-right:1rem;">${m.p1}</span>
                        <span class="match-score">${m.status === 'completed' ? m.p1Sets : m.p1Score}</span>
                    </div>
                    <div class="match-player-row">
                        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-right:1rem;">${m.p2}</span>
                        <span class="match-score">${m.status === 'completed' ? m.p2Sets : m.p2Score}</span>
                    </div>
                </div>
                ${setsSummaryHtml}
                <div style="margin-top:auto">
                    ${actionHtml}
                </div>
            `;
            matchesContainer.appendChild(card);
        });
    }

    if (state.activeMatchId) {
        const m = state.matches.find(match => match.id === state.activeMatchId);
        if (m) {
            document.getElementById('sb-match-category').textContent = m.category || "Tournament Match";
            document.getElementById('sb-match-title').textContent = `${m.p1} vs ${m.p2}`;
            document.getElementById('sb-match-status').textContent = `Set ${m.currentSet}`;
            document.getElementById('sb-current-set').textContent = `Set ${m.currentSet}`;
            document.getElementById('sb-p1-name').textContent = m.p1;
            document.getElementById('sb-p1-sets').textContent = `Sets: ${m.p1Sets}`;
            document.getElementById('sb-p1-score').textContent = m.p1Score;
            document.getElementById('sb-p2-name').textContent = m.p2;
            document.getElementById('sb-p2-sets').textContent = `Sets: ${m.p2Sets}`;
            document.getElementById('sb-p2-score').textContent = m.p2Score;
            document.getElementById('nav-scoreboard').style.display = 'block';
        }
    } else {
        document.getElementById('nav-scoreboard').style.display = 'none';
        if (document.getElementById('scoreboard-view').classList.contains('active')) {
            switchView('matches-view');
        }
    }
    
    renderRankings();
}

loadState();
render();
if (state.activeMatchId) {
    switchView('scoreboard-view');
}
