<script lang="ts">
    import { socket, gameId, connected } from '$lib/stores/gameStore';

    let currentGameId: string | null = null;
    let connectedPlayers: string[] = [];

    gameId.subscribe(value => {
        currentGameId = value;
    });

    function createGame() {
        socket?.emit('create-game');
    }

    function startGame() {
        if (currentGameId) {
            socket?.emit('start-game', currentGameId);
        }
    }

    socket?.on('game-created', (id: string) => {
        gameId.set(id);
    });

    socket?.on('players-updated', (players: string[]) => {
        connectedPlayers = players;
    });
</script>

<main class="container">
    <h1>Host Dashboard</h1>

    {#if $connected}
        {#if currentGameId}
            <div class="game-info">
                <h2>Game Created!</h2>
                <p>Share this code with players:</p>
                <div class="game-code">{currentGameId}</div>

                <div class="players-list">
                    <h3>Connected Players ({connectedPlayers.length}/3):</h3>
                    <ul>
                        {#each connectedPlayers as player}
                            <li>{player}</li>
                        {/each}
                    </ul>
                </div>

                {#if connectedPlayers.length === 3}
                    <button class="start-button" on:click={startGame}>
                        Start Game
                    </button>
                {/if}
            </div>
        {:else}
            <button on:click={createGame}>Create New Game</button>
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

    .game-info {
        text-align: center;
    }

    .game-code {
        font-size: 2rem;
        font-weight: bold;
        padding: 1rem;
        background: #f0f0f0;
        border-radius: 8px;
        margin-top: 1rem;
    }

    .players-list {
        margin-top: 2rem;
    }

    .players-list ul {
        list-style: none;
        padding: 0;
    }

    .players-list li {
        padding: 0.5rem;
        background: #f0f0f0;
        margin: 0.5rem 0;
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

    .start-button {
        background: #28a745;
        margin-top: 1rem;
    }

    button:hover {
        filter: brightness(90%);
    }
</style>
