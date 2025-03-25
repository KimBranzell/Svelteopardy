import { handler } from './build/handler.js';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { generateGameId } from './src/lib/utils/gameId.js';
import { sampleGameBoard } from './src/lib/data/gameBoard.js';

console.log('Sample game board loaded:', sampleGameBoard ? 'yes' : 'no');
console.log('Categories:', sampleGameBoard?.categories?.length || 0);

const app = express();
const server = createServer(app);
const io = new Server(server);

const games = new Map();
const playerSessions = new Map();
const kickedPlayers = new Map(); // Maps gameId to array of kicked player names


function createGameState(hostId) {
    console.log('Creating new game state with sample board:', sampleGameBoard ? 'Yes' : 'No');

    return {
        players: [],
        started: false,
        hostId: hostId,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        buzzes: [],
        resetCount: 0,
        buzzState: {},
        scores: {},
        gameBoard: JSON.parse(JSON.stringify(sampleGameBoard)), // Deep copy
        currentQuestion: null
    };
}



function updateGameState(gameId) {
    const game = games.get(gameId);
    if (game) {
        const gameState = {
            players: game.players,
            kickedPlayers: kickedPlayers.get(gameId) || [],
            started: game.started,
            hostId: game.hostId,
            buzzes: game.buzzes,
            buzzState: game.buzzState,
            resetCount: game.resetCount,
            scores: game.scores || {},
            gameBoard: game.gameBoard,  // Make sure this is included
            currentQuestion: game.currentQuestion
        };
        io.to(gameId).emit('game-state-updated', gameState);
    }
}

function log(message) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${message}`);
}

function cleanupInactiveGames() {
    const now = Date.now();
    const TWO_HOURS = 2 * 60 * 60 * 1000;

    for (const [gameId, game] of games.entries()) {
        if (now - game.lastActivity > TWO_HOURS) {
            removeGame(gameId);
            log(`Inactive game ${gameId} was automatically removed`);
        }
    }
}

function removeGame(gameId) {
    const game = games.get(gameId);
    if (game) {
        // Remove all players from the game
        game.players.forEach(player => {
            playerSessions.delete(player.id);
        });

        // Clean up kicked players list
        kickedPlayers.delete(gameId);

        // Remove the game itself
        games.delete(gameId);

        // Notify all players in the game
        io.to(gameId).emit('game-ended');
    }
}

// Run cleanup every hour
setInterval(cleanupInactiveGames, 60 * 60 * 1000);

app.use(handler);

io.on('connection', socket => {
    if (!socket.handshake.headers.referer?.includes('vite')) {
        log('New client connection established');
    }

    /**
     * Game creation management
     */

    socket.on('create-game', () => {
        const gameId = generateGameId();
        games.set(gameId, createGameState(socket.id));
        socket.join(gameId);
        socket.emit('game-created', gameId);
        log(`New game created with ID: ${gameId}`);
    });

    socket.on('end-game', (gameId) => {
        const game = games.get(gameId);
        if (game && game.hostId === socket.id) {
            // Notify all players in the game
            io.to(gameId).emit('game-ended');

            // Clean up player sessions
            game.players.forEach(player => {
                playerSessions.delete(player.id);
            });

            // Remove game data
            games.delete(gameId);
            kickedPlayers.delete(gameId);

            log(`Game ${gameId} ended by host`);
        }
    });

    socket.on('join-game', (gameId, playerName) => {
        const game = games.get(gameId);
        const kickedList = kickedPlayers.get(gameId) || [];

        if (game && !game.started && game.players.length < 3) {
            if (kickedList.includes(playerName)) {
                socket.emit('join-rejected', 'You were kicked from this game');
                return;
            }

            const existingPlayer = game.players.find(p => p.name === playerName);
            if (existingPlayer) {
                existingPlayer.id = socket.id;
            } else {
                game.players.push({ id: socket.id, name: playerName });
            }

            playerSessions.set(socket.id, { gameId, playerName });
            socket.join(gameId);
            socket.emit('joined-game', gameId);
            io.to(gameId).emit('players-updated', game.players);
            updateGameState(gameId);
        }
    });

    socket.on('start-game', (gameId) => {
        const game = games.get(gameId);
        if (game && game.hostId === socket.id) {
            game.started = true;
            io.to(gameId).emit('game-started');

            // Ensure game board is available
            if (!game.gameBoard) {
                game.gameBoard = JSON.parse(JSON.stringify(sampleGameBoard));
            }

            // Log game board for debugging
            console.log('Game board initialized:', game.gameBoard ? 'Yes' : 'No');
            console.log('Game board categories:', game.gameBoard?.categories?.length || 0);

            // Send game state update with board
            updateGameState(gameId);

            log(`Game ${gameId} started with players: ${game.players.map(p => p.name).join(', ')}`);
        }
    });

    socket.on('kick-player', (playerId) => {
        console.log('Kick player initiated:', playerId);
        const hostSession = Array.from(games.values()).find(game => game.hostId === socket.id);
        console.log('Current games state:', [...games.entries()]);
        if (hostSession) {
            const playerSession = playerSessions.get(playerId);
            if (playerSession) {
                const game = games.get(playerSession.gameId);
                const playerName = playerSession.playerName;

                // Keep the game instance intact, just update the players list
                game.players = game.players.filter(p => p.id !== playerId);

                if (!kickedPlayers.has(playerSession.gameId)) {
                    kickedPlayers.set(playerSession.gameId, []);
                }
                kickedPlayers.get(playerSession.gameId).push(playerName);

                io.to(playerId).emit('kicked-from-game');
                io.to(playerSession.gameId).emit('players-updated', game.players);

                // Ensure we're not clearing the game state
                const gameState = {
                    players: game.players,
                    kickedPlayers: kickedPlayers.get(playerSession.gameId),
                    hostId: game.hostId,
                    started: game.started
                };

                io.to(playerSession.gameId).emit('game-state-updated', gameState);
                playerSessions.delete(playerId);
            }
        }
    });

    socket.on('reinvite-player', (gameId, playerName) => {
        const game = games.get(gameId);
        if (game && game.hostId === socket.id) {
            const kickedList = kickedPlayers.get(gameId) || [];
            const playerIndex = kickedList.indexOf(playerName);
            if (playerIndex !== -1) {
                kickedList.splice(playerIndex, 1);
                kickedPlayers.set(gameId, kickedList);
                io.emit('player-reinvited', { gameId, playerName });
                updateGameState(gameId);
                io.to(gameId).emit('players-updated', game.players);
                log(`Player ${playerName} was reinvited to game ${gameId}`);
            }
        }
    });

    socket.on('leave-game', () => {
        const playerSession = playerSessions.get(socket.id);
        if (playerSession) {
            const game = games.get(playerSession.gameId);
            if (game) {
                game.players = game.players.filter(p => p.id !== socket.id);
                io.to(playerSession.gameId).emit('players-updated', game.players);
                socket.leave(playerSession.gameId);
                log(`Player ${playerSession.playerName} left game ${playerSession.gameId}`);
                playerSessions.delete(socket.id);
            }
        }
    });

    socket.on('disconnect', () => {
        const playerSession = playerSessions.get(socket.id);
        if (playerSession) {
            const game = games.get(playerSession.gameId);
            if (game) {
                io.to(playerSession.gameId).emit('player-disconnected', socket.id);
                log(`Player ${playerSession.playerName} disconnected from game ${playerSession.gameId}`);
            }
        }
    });

    socket.on('reconnect-attempt', ({ gameId, isHost, playerName }) => {
        const game = games.get(gameId);
        if (game) {
            if (isHost) {
                game.hostId = socket.id;
                socket.join(gameId);
                socket.emit('game-created', gameId);
                socket.emit('players-updated', game.players);
                socket.emit('game-state-updated', {
                    players: game.players,
                    kickedPlayers: kickedPlayers.get(gameId) || [],
                    hostId: game.hostId,
                    started: game.started,
                    buzzes: game.buzzes
                });
            } else if (playerName) {
                socket.join(gameId);
                socket.emit('player-state-sync', {
                    gameStarted: game.started,
                    hasBuzzed: game.buzzes.some(buzz => buzz.playerName === playerName)
                });
            }
        }
    });

    /**
     * Main Game event handlers
     */

    socket.on('player-buzz', ({ gameId, playerName }) => {
        const game = games.get(gameId);
        if (game && game.started) {
            game.buzzState[playerName] = true;
            game.buzzes.push({
                playerName,
                timestamp: Date.now()
            });
            io.to(gameId).emit('game-state-updated', {
                players: game.players,
                kickedPlayers: kickedPlayers.get(gameId) || [],
                hostId: game.hostId,
                started: game.started,
                buzzes: game.buzzes,
                buzzState: game.buzzState
            });
        }
    });


    socket.on('reset-buzzer', (gameId) => {
        const game = games.get(gameId);
        if (game && game.hostId === socket.id) {
            // Clear buzzes
            game.buzzes = [];
            // Reset buzz state for all players
            game.buzzState = {};
            // Increment reset counter to trigger client-side resets
            game.resetCount = (game.resetCount || 0) + 1;

            // First update the host's view
            socket.emit('players-updated', game.players);

            // Add debug logs
            console.log('Buzzer reset for game:', gameId);
            console.log('New resetCount:', game.resetCount);
            console.log('Sending buzz-reset to room');

            // Send specific buzz-reset event to all clients in the room
            io.to(gameId).emit('buzz-reset');

            // Then send the complete state update with correct empty arrays
            const fullState = {
                players: game.players,
                kickedPlayers: kickedPlayers.get(gameId) || [],
                hostId: game.hostId,
                started: game.started,
                buzzes: game.buzzes,
                buzzState: game.buzzState,
                resetCount: game.resetCount,
                scores: game.scores || {},
                gameBoard: game.gameBoard,
                currentQuestion: game.currentQuestion
            };

            // Delay the game-state-updated to ensure buzz-reset is processed first
            setTimeout(() => {
                console.log('Sending delayed game-state-updated with resetCount:', game.resetCount);
                io.to(gameId).emit('game-state-updated', fullState);
            }, 100);
        }
    });

    socket.on('update-score', ({ gameId, playerName, points, absolute = false }) => {
        const game = games.get(gameId);
        if (game && game.hostId === socket.id) {
            // Initialize score for player if it doesn't exist
            if (game.scores[playerName] === undefined) {
                game.scores[playerName] = 0;
            }

            // Update score - either add/subtract points or set to absolute value
            if (absolute) {
                game.scores[playerName] = points;
            } else {
                game.scores[playerName] += points;
            }

            // Track last activity
            game.lastActivity = Date.now();

            // Broadcast updated scores to all clients
            io.to(gameId).emit('scores-updated', game.scores);

            // Also include scores in the game state update
            updateGameState(gameId);
        }
    });

    // Update the select-question handler
    socket.on('select-question', ({ gameId, categoryIndex, questionIndex }) => {
        const game = games.get(gameId);
        if (game && game.hostId === socket.id) {
            const category = game.gameBoard.categories[categoryIndex];
            const question = category?.questions[questionIndex];

            if (question && !question.revealed) {
                // Mark the question as revealed
                question.revealed = true;

                // Set as current question
                game.currentQuestion = {
                    categoryIndex,
                    questionIndex,
                    text: question.text,
                    answer: question.answer,
                    pointValue: question.pointValue
                };

                // Update game state
                updateGameState(gameId);
            }
        }
    });
});

server.listen(3000, () => {
    log('Server started on http://localhost:3000');
});