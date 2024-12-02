import { writable, type Writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { io, Socket } from 'socket.io-client';

export const socket: Socket | null = browser ? io() : null;
export const gameId: Writable<string | null> = writable(browser ? localStorage.getItem('hostGameId') : null);
export const connected: Writable<boolean> = writable(false);
export const isHost: Writable<boolean> = writable(browser ? localStorage.getItem('isHost') === 'true' : false);

if (browser) {
    console.log('Initial gameId from localStorage:', localStorage.getItem('hostGameId'));

    socket?.on('connect', () => {
        console.log('Socket connected - current gameId:', localStorage.getItem('hostGameId'));
        connected.set(true);
        const currentGameId = localStorage.getItem('hostGameId');
        if (currentGameId) {
            console.log('Emitting reconnect-attempt with gameId:', currentGameId);
            socket.emit('reconnect-attempt', {
                gameId: currentGameId,
                isHost: true
            });
        }
    });

    socket?.on('game-created', (id) => {
        console.log('Game created event received:', id);
        localStorage.setItem('hostGameId', id);
        gameId.set(id);
    });

    socket?.on('game-state-updated', (state) => {
        console.log('Game state updated:', state);
        const currentGameId = get(gameId);
        if (state.hostId === socket.id && currentGameId) {
            localStorage.setItem('hostGameId', currentGameId);
        }
    });

    socket?.on('disconnect', () => {
        connected.set(false);
    });

    gameId.subscribe(value => {
        if (value) {
            localStorage.setItem('hostGameId', value);
        } else {
            localStorage.removeItem('hostGameId');
            localStorage.removeItem('isHost');
        }
    });
}
