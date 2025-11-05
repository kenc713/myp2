// WebSocket 接続
let ws = null;
let currentRoomId = null;
let currentUserId = null;
let currentVote = null;
let participants = new Map();
let currentIsOwner = false;
let currentSequence = 'fibonacci';

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

// 初期表示: オーナー用ボタンはデフォルトで非表示にする
updateOwnerControls();

// シーケンス（カード）を取得するユーティリティ
function getSequenceValues(key) {
    if (key === 'natural') {
        // 自然数列（サンプル）
        return ['1','2','3','4','5','6','7','8','9','?'];
    }
    // デフォルトはフィボナッチ
    return ['0','1','2','3','5','8','13','21','?'];
}

// カードを動的にレンダリングする
function renderCards(sequenceKey) {
    const values = getSequenceValues(sequenceKey);
    cardsContainer.innerHTML = '';
    values.forEach(v => {
        const d = document.createElement('div');
        d.className = 'card-item';
        d.dataset.value = v;
        d.textContent = v;
        cardsContainer.appendChild(d);
    });
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
    
    // 選択された数列を取得してローカルに保存 (ラジオボタンから取得)
    const selectedElem = document.querySelector('input[name="sequence"]:checked');
    const selectedSequence = (selectedElem && selectedElem.value) ? selectedElem.value : 'fibonacci';
    currentSequence = selectedSequence;

    // カードを先にレンダリングしておく
    renderCards(currentSequence);

    // WebSocket接続（内部で非同期的に WebSocket を開く）
    connectWebSocket();

    // WebSocket 開通時の処理を設定
    ws.onopen = () => {
        // ルーム作成メッセージ送信（選択されたシーケンスを含める）
        ws.send(JSON.stringify({
            type: 'createRoom',
            userName: userName,
            sequence: currentSequence
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
    // ルーム作成者情報を保存（server が ownerId を返す）
    currentIsOwner = (data.ownerId && data.ownerId === data.userId) || false;
    // サーバー返却のシーケンスを適用
    if (data.sequence) {
        currentSequence = data.sequence;
        renderCards(currentSequence);
    }
    
    // 自分自身で参加者を初期化
    participants.set(data.userId, { 
        hasVoted: false, 
        vote: null,
        userName: data.userName || data.userId
    });
    
    showRoomScreen(data.userName || data.userId);
    // オーナーのみ表示される操作ボタンの反映
    updateOwnerControls();
    updateParticipantsList();
    showStatus('ルームを作成しました！', 'success');
}

function handleJoinedRoom(data) {
    currentRoomId = data.roomId;
    currentUserId = data.userId;
    // サーバーが送ってくる ownerId を元に自分がオーナーか判定
    currentIsOwner = (data.ownerId && data.ownerId === data.userId) || false;
    // サーバーが教えるルームのシーケンスでカードをレンダリング
    if (data.sequence) {
        currentSequence = data.sequence;
        renderCards(currentSequence);
    }
    
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
    // オーナーだけが使えるボタンを表示/非表示
    updateOwnerControls();
    updateParticipantsList();
    
    if (data.revealed && data.votes) {
        // 参加者の votes を更新してカード上に表示する
        Object.entries(data.votes).forEach(([userId, vote]) => {
            const participant = participants.get(userId);
            if (participant) participant.vote = vote;
        });
        updateParticipantsList();
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
    // ブロードキャストに ownerId が含まれていればオーナー状態を更新
    if (data.ownerId) {
        currentIsOwner = (currentUserId === data.ownerId);
        updateOwnerControls();
    }
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
    
    // 結果パネルは廃止、参加者カードに投票値を表示する
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
    // 画面表示時にカードを確実にレンダリング（sequence が設定済みであればそれを使用）
    renderCards(currentSequence);
}

// オーナーのみ表示される操作ボタンを制御
function updateOwnerControls() {
    if (currentIsOwner) {
        revealBtn.style.display = '';
        resetBtn.style.display = '';
    } else {
        revealBtn.style.display = 'none';
        resetBtn.style.display = 'none';
    }
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

// displayResults 関数は削除され、参加者カードに投票が表示されるようになりました。

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
