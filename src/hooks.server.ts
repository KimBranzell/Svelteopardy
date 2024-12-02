import { createSocketServer } from '$lib/server/socket';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
    return resolve(event);
};

export const handleServerInit = ({ server }) => {
    createSocketServer(server);
};