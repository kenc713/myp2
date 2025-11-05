// WebSocket 接続
let ws = null;
let currentRoomId = null;
let currentUserId = null;
let currentVote = null;
let participants = new Map();

// DOM 要素
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

// WebSocket 接続を初期化
function connectWebSocket() {

    // WebSocket 接続 URL を組み立てる
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    ws = new WebSocket(wsUrl);

    // WebSocket イベントハンドラの設定
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

// 受信メッセージの処理
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

// ルーム作成ボタン押下時の処理
createRoomBtn.addEventListener('click', () => {

    // ユーザー名取得（未入力時は匿名）
    const userName = userNameInput.value.trim() || '匿名';
    
    // WebSocket接続
    // 内部で非同期的に WebSocket を開く
    connectWebSocket();
    
    // WebSocket 開通時の処理を設定
    // connectWebSocket 内で WebSocket が開通したときに呼ばれる想定
    ws.onopen = () => {

        // ルーム作成メッセージ送信
        ws.send(JSON.stringify({
            type: 'createRoom',
            userName: userName
        }));
    };
});

// ルーム参加ボタン押下時の処理
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

// ルームIDコピー
copyRoomIdBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(currentRoomId).then(() => {
        showStatus('ルームIDをコピーしました！', 'success');
    }).catch(() => {
        showStatus('コピーに失敗しました', 'error');
    });
});

// 投票カード選択時の処理
cardsContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('card-item')) {
        // 既存の選択解除
        document.querySelectorAll('.card-item').forEach(card => {
            card.classList.remove('selected');
        });

        // 選択状態にする
        e.target.classList.add('selected');
        currentVote = e.target.dataset.value;

        // 投票メッセージ送信
        ws.send(JSON.stringify({
            type: 'vote',
            vote: currentVote
        }));

        showStatus('投票しました！', 'success');
    }
});

// 投票公開ボタン押下時の処理
revealBtn.addEventListener('click', () => {
    ws.send(JSON.stringify({
        type: 'revealVotes'
    }));
});

// 投票リセットボタン押下時の処理
resetBtn.addEventListener('click', () => {
    ws.send(JSON.stringify({
        type: 'resetVotes'
    }));
});

// メッセージハンドラ
// サーバーからの応答メッセージに応じて UI を更新する

function handleRoomCreated(data) {
    currentRoomId = data.roomId;
    currentUserId = data.userId;
    
    // 自分自身で参加者を初期化
    participants.set(data.userId, { 
        hasVoted: false, 
        vote: null,
        userName: data.userName || data.userId
    });
    
    showRoomScreen(data.userName || data.userId);
    updateParticipantsList();
    showStatus('ルームを作成しました！', 'success');
}

function handleJoinedRoom(data) {
    currentRoomId = data.roomId;
    currentUserId = data.userId;
    
    // ユーザー名で参加者を初期化
    participants.clear();
    Object.entries(data.users).forEach(([userId, userName]) => {
        participants.set(userId, { 
            hasVoted: false, 
            vote: null,
            userName: userName
        });
    });
    
    showRoomScreen(data.userName || data.userId);
    updateParticipantsList();
    
    if (data.revealed && data.votes) {
        displayResults(data.votes);
    }
    
    showStatus('ルームに参加しました！', 'success');
}

function handleUserJoined(data) {
    /**
     * 新しいユーザーがルームに参加したときの処理。
     * 
     * @param {Object} data - サーバーからのメッセージデータ。
     */


    // 参加者リストをクリア
    participants.clear();

    // 参加者リストを再構築
    Object.entries(data.users).forEach(([userId, userName]) => {
        participants.set(userId, { 
            hasVoted: false, 
            vote: null,
            userName: userName
        });
    });
    
    // UI更新
    updateParticipantsList();
    showStatus(`${data.userName} が参加しました`, 'info');
}

function handleUserLeft(data) {
    participants.delete(data.userId);
    updateParticipantsList();
    showStatus(`${data.userName || data.userId} が退出しました`, 'info');
}

function handleVoteUpdated(data) {
    const participant = participants.get(data.userId);
    if (participant) {
        participant.hasVoted = data.hasVoted;
    }
    updateParticipantsList();
}

function handleVotesRevealed(data) {
    /**
     * 投票公開の処理。
     * 
     * @param {Object} data - サーバーからのメッセージデータ。
     */

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
    /**
     * 投票リセットの処理。
     */

    participants.forEach(participant => {
        participant.hasVoted = false;
        participant.vote = null;
    });
    
    currentVote = null;
    
    // UI をクリア
    document.querySelectorAll('.card-item').forEach(card => {
        card.classList.remove('selected');
    });
    
    resultsSection.classList.add('hidden');
    updateParticipantsList();
    showStatus('投票がリセットされました', 'info');
}

function showRoomScreen(displayName) {
    /**
     * ルーム画面を表示する。
     * 
     * @param {string} displayName - 表示するユーザー名。
     */


    startScreen.classList.add('hidden');
    roomScreen.classList.remove('hidden');
    
    roomIdDisplay.textContent = currentRoomId;
    userNameDisplay.textContent = displayName || currentUserId;
}

function updateParticipantsList() {
    /**
     * 参加者UIを更新する。
     */

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
        name.textContent = data.userName || userId;
        
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
    /**
     * 投票結果を表示する。
     *
     * @param {Object} votes - ユーザーIDをキー、投票値を値とするオブジェクト。
     */


    resultsSection.classList.remove('hidden');
    resultsDisplay.innerHTML = '';
    
    Object.entries(votes).forEach(([userId, vote]) => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        
        const participant = participants.get(userId);
        const displayName = participant ? participant.userName : userId;
        
        const name = document.createElement('div');
        name.className = 'result-name';
        name.textContent = displayName;
        
        const voteDisplay = document.createElement('div');
        voteDisplay.className = 'result-vote';
        voteDisplay.textContent = vote;
        
        resultItem.appendChild(name);
        resultItem.appendChild(voteDisplay);
        resultsDisplay.appendChild(resultItem);
    });
}

function showStatus(message, type = 'info') {
    /**
     * 一時的なステータスメッセージを表示する。
     *
     * @param {string} message - 表示するメッセージ。
     * @param {string} type - メッセージの種類: 'info', 'success', 'error'。
     */

    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.classList.remove('hidden');
    
    setTimeout(() => {
        statusMessage.classList.add('hidden');
    }, 3000);
}

// ページアンロード時の処理
window.addEventListener('beforeunload', () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
    }
});
