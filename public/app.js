// WebSocket connection
let ws = null;
let currentRoomId = null;
let currentUserId = null;
let currentVote = null;
let participants = new Map();

// DOM elements
const startScreen = document.getElementById('startScreen');
const roomScreen = document.getElementById('roomScreen');
const userNameInput = document.getElementById('userName');
const roomIdInput = document.getElementById('roomIdInput');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const roomIdDisplay = document.getElementById('roomIdDisplay');
const userNameDisplay = document.getElementById('userNameDisplay');
const copyRoomIdBtn = document.getElementById('copyRoomIdBtn');
const participantsList = document.getElementById('participantsList');
const participantCount = document.getElementById('participantCount');
const cardsContainer = document.getElementById('cardsContainer');
const revealBtn = document.getElementById('revealBtn');
const resetBtn = document.getElementById('resetBtn');
const resultsSection = document.getElementById('resultsSection');
const resultsDisplay = document.getElementById('resultsDisplay');
const statusMessage = document.getElementById('statusMessage');

// Initialize WebSocket connection
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        console.log('Connected to server');
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleMessage(data);
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        showStatus('接続エラーが発生しました', 'error');
    };
    
    ws.onclose = () => {
        console.log('Disconnected from server');
        showStatus('サーバーから切断されました', 'error');
    };
}

// Handle incoming messages
function handleMessage(data) {
    switch (data.type) {
        case 'roomCreated':
            handleRoomCreated(data);
            break;
        case 'joinedRoom':
            handleJoinedRoom(data);
            break;
        case 'userJoined':
            handleUserJoined(data);
            break;
        case 'userLeft':
            handleUserLeft(data);
            break;
        case 'voteUpdated':
            handleVoteUpdated(data);
            break;
        case 'votesRevealed':
            handleVotesRevealed(data);
            break;
        case 'votesReset':
            handleVotesReset();
            break;
        case 'error':
            showStatus(data.message, 'error');
            break;
    }
}

// Event handlers
createRoomBtn.addEventListener('click', () => {
    const userName = userNameInput.value.trim() || '匿名';
    connectWebSocket();
    
    ws.onopen = () => {
        ws.send(JSON.stringify({
            type: 'createRoom',
            userName: userName
        }));
    };
});

joinRoomBtn.addEventListener('click', () => {
    const roomId = roomIdInput.value.trim().toUpperCase();
    const userName = userNameInput.value.trim() || '匿名';
    
    if (!roomId) {
        showStatus('ルームIDを入力してください', 'error');
        return;
    }
    
    connectWebSocket();
    
    ws.onopen = () => {
        ws.send(JSON.stringify({
            type: 'joinRoom',
            roomId: roomId,
            userName: userName
        }));
    };
});

copyRoomIdBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(currentRoomId).then(() => {
        showStatus('ルームIDをコピーしました！', 'success');
    });
});

// Card selection
cardsContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('card-item')) {
        // Remove previous selection
        document.querySelectorAll('.card-item').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Select new card
        e.target.classList.add('selected');
        currentVote = e.target.dataset.value;
        
        // Send vote to server
        ws.send(JSON.stringify({
            type: 'vote',
            vote: currentVote
        }));
        
        showStatus('投票しました！', 'success');
    }
});

revealBtn.addEventListener('click', () => {
    ws.send(JSON.stringify({
        type: 'revealVotes'
    }));
});

resetBtn.addEventListener('click', () => {
    ws.send(JSON.stringify({
        type: 'resetVotes'
    }));
});

// Message handlers
function handleRoomCreated(data) {
    currentRoomId = data.roomId;
    currentUserId = data.userId;
    
    showRoomScreen();
    showStatus('ルームを作成しました！', 'success');
}

function handleJoinedRoom(data) {
    currentRoomId = data.roomId;
    currentUserId = data.userId;
    
    // Initialize participants
    participants.clear();
    data.users.forEach(user => {
        participants.set(user, { hasVoted: false, vote: null });
    });
    
    showRoomScreen();
    updateParticipantsList();
    
    if (data.revealed && data.votes) {
        displayResults(data.votes);
    }
    
    showStatus('ルームに参加しました！', 'success');
}

function handleUserJoined(data) {
    // Update participants list
    participants.clear();
    data.users.forEach(user => {
        if (!participants.has(user)) {
            participants.set(user, { hasVoted: false, vote: null });
        }
    });
    
    updateParticipantsList();
    showStatus(`${data.userId} が参加しました`, 'info');
}

function handleUserLeft(data) {
    participants.delete(data.userId);
    updateParticipantsList();
    showStatus(`${data.userId} が退出しました`, 'info');
}

function handleVoteUpdated(data) {
    const participant = participants.get(data.userId);
    if (participant) {
        participant.hasVoted = data.hasVoted;
    }
    updateParticipantsList();
}

function handleVotesRevealed(data) {
    // Update votes for all participants
    Object.entries(data.votes).forEach(([userId, vote]) => {
        const participant = participants.get(userId);
        if (participant) {
            participant.vote = vote;
        }
    });
    
    displayResults(data.votes);
    updateParticipantsList();
    showStatus('投票が公開されました！', 'success');
}

function handleVotesReset() {
    // Clear all votes
    participants.forEach(participant => {
        participant.hasVoted = false;
        participant.vote = null;
    });
    
    currentVote = null;
    
    // Clear UI
    document.querySelectorAll('.card-item').forEach(card => {
        card.classList.remove('selected');
    });
    
    resultsSection.classList.add('hidden');
    updateParticipantsList();
    showStatus('投票がリセットされました', 'info');
}

// UI functions
function showRoomScreen() {
    startScreen.classList.add('hidden');
    roomScreen.classList.remove('hidden');
    
    roomIdDisplay.textContent = currentRoomId;
    userNameDisplay.textContent = currentUserId;
}

function updateParticipantsList() {
    participantsList.innerHTML = '';
    participantCount.textContent = participants.size;
    
    participants.forEach((data, userId) => {
        const card = document.createElement('div');
        card.className = 'participant-card';
        
        if (data.vote !== null) {
            card.classList.add('revealed');
        } else if (data.hasVoted) {
            card.classList.add('voted');
        }
        
        const name = document.createElement('div');
        name.className = 'participant-name';
        name.textContent = userId;
        
        const vote = document.createElement('div');
        vote.className = 'participant-vote';
        
        if (data.vote !== null) {
            vote.textContent = data.vote;
        } else if (data.hasVoted) {
            vote.textContent = '✓';
        } else {
            vote.textContent = '—';
        }
        
        card.appendChild(name);
        card.appendChild(vote);
        participantsList.appendChild(card);
    });
}

function displayResults(votes) {
    resultsSection.classList.remove('hidden');
    resultsDisplay.innerHTML = '';
    
    Object.entries(votes).forEach(([userId, vote]) => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        
        const name = document.createElement('div');
        name.className = 'result-name';
        name.textContent = userId;
        
        const voteDisplay = document.createElement('div');
        voteDisplay.className = 'result-vote';
        voteDisplay.textContent = vote;
        
        resultItem.appendChild(name);
        resultItem.appendChild(voteDisplay);
        resultsDisplay.appendChild(resultItem);
    });
}

function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.classList.remove('hidden');
    
    setTimeout(() => {
        statusMessage.classList.add('hidden');
    }, 3000);
}

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
    }
});
