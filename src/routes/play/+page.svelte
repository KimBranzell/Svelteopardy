<script lang="ts">
    import { socket, gameId, connected } from '$lib/stores/gameStore';
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';

    let inputGameId = '';
    let playerName = '';
    let joinStatus = '';
    let gameStarted = false;

    onMount(() => {
        if (browser) {
            const savedGameId = localStorage.getItem('playerGameId');
            const savedName = localStorage.getItem('playerName');
            if (savedGameId && savedName) {
                playerName = savedName;
                socket?.emit('reconnect-attempt', {
                    gameId: savedGameId,
                    playerName: savedName,
                    isHost: false
                });
            }
        }
    });

    function joinGame() {
        if (playerName.trim() && inputGameId.trim()) {
            if (browser) {
                localStorage.setItem('playerGameId', inputGameId);
                localStorage.setItem('playerName', playerName);
            }
            socket?.emit('join-game', inputGameId, playerName);
        }
    }

    function leaveGame() {
        socket?.emit('leave-game');
        gameId.set(null);
        joinStatus = '';
        gameStarted = false;
        if (browser) {
            localStorage.removeItem('playerGameId');
            localStorage.removeItem('playerName');
        }
    }

    socket?.on('joined-game', (id: string) => {
        gameId.set(id);
        joinStatus = 'Successfully joined game!';
    });

    socket?.on('game-not-found', () => {
        joinStatus = 'Game not found. Please check the ID and try again.';
    });

    socket?.on('game-full', () => {
        joinStatus = 'Game is full (3 players maximum).';
    });

    socket?.on('game-started', () => {
        gameStarted = true;
    });

    socket?.on('game-ended', () => {
        gameId.set(null);
        joinStatus = 'Game ended by host';
        if (browser) {
            localStorage.removeItem('playerGameId');
            localStorage.removeItem('playerName');
        }
    });

    socket?.on('kicked-from-game', () => {
        gameId.set(null);
        joinStatus = 'You have been kicked from the game';
        if (browser) {
            localStorage.removeItem('playerGameId');
            localStorage.removeItem('playerName');
        }
    });
</script>

<main class="container">
    <h1>Join Game</h1>

    {#if $connected}
        {#if $gameId}
            {#if gameStarted}
                <div class="game-view">
                    <h2>Game Started!</h2>
                    <div class="buzzer-placeholder">
                        <button class="buzzer">BUZZ!</button>
                    </div>
                </div>
            {:else}
                <div class="waiting-room">
                    <h2>{joinStatus}</h2>
                    <p>Waiting for other players to join...</p>
                    <button class="leave-button" on:click={leaveGame}>
                        Leave Game
                    </button>
                </div>
            {/if}
        {:else}
            <div class="join-form">
                <input
                    type="text"
                    bind:value={playerName}
                    placeholder="Enter your name"
                />
                <input
                    type="text"
                    bind:value={inputGameId}
                    placeholder="Enter Game ID"
                />
                <button on:click={joinGame}>Join Game</button>
                {#if joinStatus}
                    <p class="status">{joinStatus}</p>
                {/if}
            </div>
        {/if}
    {:else}
        <p>Connecting to server...</p>
    {/if}
</main>

<style>
    .container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2rem;
        padding: 2rem;
    }

    .join-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: 100%;
        max-width: 300px;
    }

    input {
        padding: 0.5rem;
        font-size: 1.2rem;
        border: 2px solid #ccc;
        border-radius: 4px;
    }

    button {
        padding: 1rem 2rem;
        font-size: 1.2rem;
        cursor: pointer;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 8px;
    }

    .buzzer {
        background: #dc3545;
        font-size: 2rem;
        padding: 2rem 4rem;
    }

    .leave-button {
        background: #dc3545;
        margin-top: 1rem;
    }

    .status {
        text-align: center;
        color: #666;
    }

    .waiting-room {
        text-align: center;
    }
</style>
