import { writable, type Writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { io, Socket } from 'socket.io-client';

export const socket: Socket | null = browser ? io() : null;
export const gameId: Writable<string | null> = writable(null);
export const connected: Writable<boolean> = writable(false);
export const isHost: Writable<boolean> = writable(false);

if (browser) {
    socket?.on('connect', () => {
        connected.set(true);
    });

    socket?.on('disconnect', () => {
        connected.set(false);
    });
}
