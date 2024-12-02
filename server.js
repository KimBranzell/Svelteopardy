import { handler } from './build/handler.js';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { generateGameId } from './src/lib/utils/gameId.js';

const app = express();
const server = createServer(app);
const io = new Server(server);

const games = new Map();

app.use(handler);

io.on('connection', socket => {
    console.log('Client connected');

    socket.on('create-game', () => {
        const gameId = generateGameId();
        games.set(gameId, { players: [], started: false });
        socket.join(gameId);
        socket.emit('game-created', gameId);
    });

    socket.on('join-game', (gameId, playerName) => {
        const game = games.get(gameId);
        if (game && !game.started && game.players.length < 3) {
            game.players.push(playerName);
            socket.join(gameId);
            socket.emit('joined-game', gameId);
            io.to(gameId).emit('players-updated', game.players);
        } else if (game && game.players.length >= 3) {
            socket.emit('game-full');
        } else {
            socket.emit('game-not-found');
        }
    });

    socket.on('start-game', (gameId) => {
        const game = games.get(gameId);
        if (game && game.players.length === 3) {
            game.started = true;
            io.to(gameId).emit('game-started');
        }
    });
});

server.listen(3000, () => {
    console.log('Running on http://localhost:3000');
});
