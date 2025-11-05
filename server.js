const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

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
            handleMessage(ws, data);
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });
    
    ws.on('close', () => {
        // Remove user from room when disconnected
        if (ws.roomId && ws.userId) {
            const room = rooms.get(ws.roomId);
            if (room) {
                room.users.delete(ws.userId);
                broadcastToRoom(ws.roomId, {
                    type: 'userLeft',
                    userId: ws.userId
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
    }
}

function handleCreateRoom(ws, data) {
    const roomId = generateRoomId();
    const userId = data.userName || 'Anonymous';
    
    rooms.set(roomId, {
        users: new Map(),
        votes: new Map(),
        revealed: false
    });
    
    const room = rooms.get(roomId);
    room.users.set(userId, ws);
    
    ws.roomId = roomId;
    ws.userId = userId;
    
    ws.send(JSON.stringify({
        type: 'roomCreated',
        roomId: roomId,
        userId: userId
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
    
    const userId = userName || 'Anonymous';
    room.users.set(userId, ws);
    
    ws.roomId = roomId;
    ws.userId = userId;
    
    // Send current room state to new user
    ws.send(JSON.stringify({
        type: 'joinedRoom',
        roomId: roomId,
        userId: userId,
        users: Array.from(room.users.keys()),
        votes: room.revealed ? Object.fromEntries(room.votes) : null,
        revealed: room.revealed
    }));
    
    // Notify other users
    broadcastToRoom(roomId, {
        type: 'userJoined',
        userId: userId,
        users: Array.from(room.users.keys())
    }, ws);
}

function handleVote(ws, data) {
    const { vote } = data;
    const room = rooms.get(ws.roomId);
    
    if (!room) return;
    
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
    
    room.revealed = true;
    
    broadcastToRoom(ws.roomId, {
        type: 'votesRevealed',
        votes: Object.fromEntries(room.votes)
    });
}

function handleResetVotes(ws, data) {
    const room = rooms.get(ws.roomId);
    
    if (!room) return;
    
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
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Planning Poker server running on port ${PORT}`);
});
