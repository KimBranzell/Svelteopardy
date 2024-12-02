import { Server, Socket } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { generateGameId } from '$lib/utils/gameId';

interface GameState {
    players: string[];
    started: boolean;
}

const games = new Map<string, GameState>();

let io: Server;

export function createSocketServer(server: HTTPServer): void {
    io = new Server(server);

    io.on('connection', (socket: Socket) => {
        console.log('Client connected');

        socket.on('create-game', () => {
            const gameId = generateGameId();
            games.set(gameId, { players: [], started: false });
            socket.join(gameId);
            socket.emit('game-created', gameId);
        });

        socket.on('join-game', (gameId: string, playerName: string) => {
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

        socket.on('start-game', (gameId: string) => {
            const game = games.get(gameId);
            if (game && game.players.length === 3) {
                game.started = true;
                io.to(gameId).emit('game-started');
            }
        });
    });
}

export function getIO(): Server {
    return io;
}
