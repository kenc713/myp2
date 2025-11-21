const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Store rooms in memory
const rooms = new Map();

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('New client connected');
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (!data || typeof data.type !== 'string') {
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Invalid message format'
                }));
                return;
            }
            handleMessage(ws, data);
        } catch (error) {
            console.error('Error parsing message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid message format'
            }));
        }
    });
    
    ws.on('close', () => {
        // Remove user from room when disconnected
        if (ws.roomId && ws.userId) {
            const room = rooms.get(ws.roomId);
            if (room) {
                const userName = ws.userName;
                room.users.delete(ws.userId);
                broadcastToRoom(ws.roomId, {
                    type: 'userLeft',
                    userId: ws.userId,
                    userName: userName
                });
                
                // Clean up empty rooms
                if (room.users.size === 0) {
                    rooms.delete(ws.roomId);
                }
            }
        }
        console.log('Client disconnected');
    });
});

function handleMessage(ws, data) {
    switch (data.type) {
        case 'createRoom':
            handleCreateRoom(ws, data);
            break;
        case 'joinRoom':
            handleJoinRoom(ws, data);
            break;
        case 'vote':
            handleVote(ws, data);
            break;
        case 'revealVotes':
            handleRevealVotes(ws, data);
            break;
        case 'resetVotes':
            handleResetVotes(ws, data);
            break;
        default:
            console.log('Unknown message type:', data.type);
            break;
    }
}

function handleCreateRoom(ws, data) {
    const roomId = generateRoomId();
    const userName = data.userName || 'Anonymous';
    const userId = generateUserId();
    
    // room オブジェクトに ownerId と sequence を追加してルーム作成者と選択された数列を記録する
    const sequence = data.sequence || 'fibonacci';
    rooms.set(roomId, {
        users: new Map(),
        votes: new Map(),
        revealed: false,
        ownerId: userId,
        sequence: sequence
    });
    
    const room = rooms.get(roomId);
    room.users.set(userId, ws);
    
    ws.roomId = roomId;
    ws.userId = userId;
    ws.userName = userName;
    
    ws.send(JSON.stringify({
        type: 'roomCreated',
        roomId: roomId,
        userId: userId,
        ownerId: room.ownerId,
        sequence: room.sequence,
        userName: userName
    }));
}

function handleJoinRoom(ws, data) {
    const { roomId, userName } = data;
    const room = rooms.get(roomId);
    
    if (!room) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Room not found'
        }));
        return;
    }
    
    const name = userName || 'Anonymous';
    const userId = generateUserId();
    room.users.set(userId, ws);
    
    ws.roomId = roomId;
    ws.userId = userId;
    ws.userName = name;
    
    // Build user display map (userId -> userName)
    const userList = {};
    room.users.forEach((socket, id) => {
        userList[id] = socket.userName || id;
    });
    
    // Send current room state to new user
    ws.send(JSON.stringify({
        type: 'joinedRoom',
        roomId: roomId,
        userId: userId,
        userName: name,
        ownerId: room.ownerId,
        sequence: room.sequence,
        users: userList,
        votes: room.revealed ? Object.fromEntries(room.votes) : null,
        revealed: room.revealed
    }));
    
    // Notify other users
    broadcastToRoom(roomId, {
        type: 'userJoined',
        userId: userId,
        userName: name,
        ownerId: room.ownerId,
        sequence: room.sequence,
        users: userList
    }, ws);
}

function handleVote(ws, data) {
    const { vote } = data;
    const room = rooms.get(ws.roomId);
    
    if (!room) return;
    // Validation: if sequence is 4choice, only accept A/B/C/D
    const sequence = room.sequence || 'fibonacci';
    if (sequence === '4choice') {
        const allowed = new Set(['A', 'B', 'C', 'D']);
        if (!allowed.has(vote)) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid vote value for 4choice' }));
            return;
        }
    }

    room.votes.set(ws.userId, vote);

    // Notify all users that someone voted (but not the vote value until revealed)
    broadcastToRoom(ws.roomId, {
        type: 'voteUpdated',
        userId: ws.userId,
        hasVoted: true,
        votesCount: room.votes.size,
        usersCount: room.users.size
    });
}

function handleRevealVotes(ws, data) {
    const room = rooms.get(ws.roomId);
    
    if (!room) return;
    // オーナーのみが実行可能
    if (ws.userId !== room.ownerId) {
        ws.send(JSON.stringify({ type: 'error', message: '権限がありません' }));
        return;
    }

    room.revealed = true;

    broadcastToRoom(ws.roomId, {
        type: 'votesRevealed',
        votes: Object.fromEntries(room.votes)
    });
}

function handleResetVotes(ws, data) {
    const room = rooms.get(ws.roomId);
    
    if (!room) return;
    // オーナーのみが実行可能
    if (ws.userId !== room.ownerId) {
        ws.send(JSON.stringify({ type: 'error', message: '権限がありません' }));
        return;
    }

    room.votes.clear();
    room.revealed = false;

    broadcastToRoom(ws.roomId, {
        type: 'votesReset'
    });
}

function broadcastToRoom(roomId, message, excludeWs = null) {
    const room = rooms.get(roomId);
    if (!room) return;
    
    const messageStr = JSON.stringify(message);
    
    room.users.forEach((clientWs) => {
        if (clientWs !== excludeWs && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(messageStr);
        }
    });
}

function generateRoomId() {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
}

function generateUserId() {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `${timestamp}-${random}`;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Planning Poker server running on port ${PORT}`);
});

// Graceful shutdown: close WebSocket server and HTTP server on SIGTERM/SIGINT
function shutdown() {
    console.log('Shutting down server...');
    try {
        // Stop accepting new connections
        wss.close(() => {
            console.log('WebSocket server closed');
        });
    } catch (e) {
        console.error('Error closing WebSocket server:', e);
    }

    try {
        server.close(() => {
            console.log('HTTP server closed');
            process.exit(0);
        });
    } catch (e) {
        console.error('Error closing HTTP server:', e);
        process.exit(1);
    }

    // Fallback: force exit after 10s
    setTimeout(() => {
        console.warn('Forcing shutdown');
        process.exit(1);
    }, 10000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
