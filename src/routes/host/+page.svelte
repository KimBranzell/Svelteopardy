<script lang="ts">
    interface Buzz {
        playerName: string;
        timestamp: number;
    }
    import { socket, gameId, connected } from '$lib/stores/gameStore';
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';

    let currentGameId: string | null = null;
    let connectedPlayers: Array<{id: string, name: string}> = [];
    let kickedPlayers: string[] = [];
    let buzzes: Array<{playerName: string, position: number}> = [];
    let gameStarted = false;
    let scores: Record<string, number> = {};
    let selectedPlayer: string | null = null;
    let pointAmount = 100; // Default point amount


    gameId.subscribe(value => {
        currentGameId = value;
        if (browser) {
            if (value) {
                localStorage.setItem('hostGameId', value);
            } else {
                localStorage.removeItem('hostGameId');
            }
        }
    });


    onMount(() => {
        if (browser) {
            const savedGameId = localStorage.getItem('hostGameId');
            if (savedGameId && socket) {
                socket.emit('reconnect-attempt', {
                    gameId: savedGameId,
                    isHost: true
                });
            }
        }
    });

    /**
     * Game Management
     */

    function createGame() {
        socket?.emit('create-game');
    }

    function startGame() {
        if (currentGameId) {
            socket?.emit('start-game', currentGameId);
            gameStarted = true;
        }
    }

    function endGame() {
        if (currentGameId) {
            socket?.emit('end-game', currentGameId);
            gameId.set(null);
            connectedPlayers = [];
            kickedPlayers = [];
        }
    }

    function resetBuzzers() {
        if ($gameId) {
            socket?.emit('reset-buzzer', $gameId);
            buzzes = [];
        }
    }

    /**
     * Player Management
     *
     */
    function kickPlayer(playerId: string) {
        socket?.emit('kick-player', playerId);
    }

    function reinvitePlayer(playerName: string) {
        if (currentGameId) {
            socket?.emit('reinvite-player', $gameId, playerName);
            kickedPlayers = kickedPlayers.filter(p => p !== playerName);
        }
    }

    /**
    * Socket Event Handlers
    */

    socket?.on('game-created', (id: string) => {
        gameId.set(id);
    });

    socket?.on('game-ended', () => {
        gameId.set(null);
        connectedPlayers = [];
        kickedPlayers = [];
    });

    socket?.on('players-updated', (players: Array<{id: string, name: string}>) => {
        connectedPlayers = players;
    });

    socket?.on('player-kicked', (playerName) => {
        kickedPlayers = [...kickedPlayers, playerName];
    });

    socket?.on('game-state-updated', (state) => {
        gameStarted = state.started;
        kickedPlayers = state.kickedPlayers || [];
        buzzes = (state.buzzes || []).map((buzz: Buzz, index: number) => ({
            playerName: buzz.playerName,
            position: index + 1
        }));
        scores = state.scores || {};
    });

    socket?.on('scores-updated', (updatedScores) => {
        scores = updatedScores;
    });

    socket?.on('game-not-found', () => {
        if (browser) {
            localStorage.removeItem('hostGameId');
            gameId.set(null);
        }
    });

    socket?.on('game-started', () => {
        gameStarted = true;
    });

    socket?.on('buzz-received', (buzz) => {
        buzzes = [...buzzes, buzz];
    });

    function awardPoints() {
        if (selectedPlayer && $gameId) {
            socket?.emit('update-score', {
                gameId: $gameId,
                playerName: selectedPlayer,
                points: pointAmount
            });
        }
    }

    function deductPoints() {
        if (selectedPlayer && $gameId) {
            socket?.emit('update-score', {
                gameId: $gameId,
                playerName: selectedPlayer,
                points: -pointAmount
            });
        }
    }

    function resetScores() {
        if ($gameId) {
            connectedPlayers.forEach(player => {
                socket?.emit('update-score', {
                    gameId: $gameId,
                    playerName: player.name,
                    points: 0,
                    absolute: true
                });
            });
        }
    }
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
                            <li>
                                {player.name}
                                <button class="kick-button" on:click={() => kickPlayer(player.id)}>
                                    Kick
                                </button>
                            </li>
                        {/each}
                    </ul>

                    {#if gameStarted}
                        <div class="buzz-panel">
                            <h3>Buzzer Queue</h3>
                            {#if buzzes.length > 0}
                                <ul class="buzz-list">
                                    {#each buzzes as buzz}
                                        <li>
                                            {buzz.position}. {buzz.playerName}
                                        </li>
                                    {/each}
                                </ul>
                                <button class="reset-button" on:click={resetBuzzers}>
                                    Reset Buzzers
                                </button>
                            {:else}
                                <p>Waiting for players to buzz...</p>
                            {/if}
                        </div>

                        <div class="score-management">
                            <h2>Score Management</h2>

                            <div class="score-display">
                                {#each connectedPlayers as player}
                                    <div class="player-score"
                                         class:selected={selectedPlayer === player.name}
                                         on:click={() => selectedPlayer = player.name}>
                                        <span class="player-name">{player.name}</span>
                                        <span class="score">${scores[player.name] || 0}</span>
                                    </div>
                                {/each}
                            </div>

                            <div class="score-controls">
                                <div class="point-selector">
                                    <label>Points:</label>
                                    <select bind:value={pointAmount}>
                                        <option value={100}>100</option>
                                        <option value={200}>200</option>
                                        <option value={300}>300</option>
                                        <option value={400}>400</option>
                                        <option value={500}>500</option>
                                        <option value={1000}>1000</option>
                                    </select>
                                </div>

                                <button
                                    class="award-button"
                                    disabled={!selectedPlayer}
                                    on:click={awardPoints}>
                                    Award Points
                                </button>

                                <button
                                    class="deduct-button"
                                    disabled={!selectedPlayer}
                                    on:click={deductPoints}>
                                    Deduct Points
                                </button>

                                <button class="reset-button" on:click={resetScores}>
                                    Reset All Scores
                                </button>
                            </div>
                        </div>
                    {/if}
                </div>

                {#if kickedPlayers.length > 0}
                    <div class="kicked-players">
                        <h3>Kicked Players:</h3>
                        <ul>
                            {#each kickedPlayers as playerName}
                                <li>
                                    {playerName}
                                    <button class="reinvite-button" on:click={() => reinvitePlayer(playerName)}>
                                        Reinvite
                                    </button>
                                </li>
                            {/each}
                        </ul>
                    </div>
                {/if}

                {#if connectedPlayers.length === 3}
                    <button class="start-button" on:click={startGame}>
                        Start Game
                    </button>
                {/if}

                <button class="end-button" on:click={endGame}>
                    End Game
                </button>
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

    .players-list, .kicked-players {
        margin-top: 2rem;
    }

    .players-list ul, .kicked-players ul {
        list-style: none;
        padding: 0;
    }

    .players-list li, .kicked-players li {
        padding: 0.5rem;
        background: #f0f0f0;
        margin: 0.5rem 0;
        border-radius: 4px;
        display: flex;
        justify-content: space-between;
        align-items: center;
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

    .end-button {
        background: #dc3545;
        margin-top: 2rem;
    }

    .kick-button {
        background: #dc3545;
        padding: 0.5rem 1rem;
        font-size: 0.9rem;
    }

    .reinvite-button {
        background: #28a745;
        padding: 0.5rem 1rem;
        font-size: 0.9rem;
    }

    button:hover {
        filter: brightness(90%);
    }

    .score-management {
        margin-top: 20px;
        padding: 15px;
        background-color: #f0f0f0;
        border-radius: 5px;
    }

    .score-display {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 20px;
    }

    .player-score {
        padding: 10px;
        background-color: #fff;
        border: 2px solid #ddd;
        border-radius: 5px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: 120px;
    }

    .player-score.selected {
        border-color: #0077cc;
        background-color: #e6f2ff;
    }

    .player-name {
        font-weight: bold;
    }

    .score {
        font-size: 1.5rem;
        color: #0077cc;
    }

    .score-controls {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
    }

    .award-button {
        background-color: #4CAF50;
        color: white;
    }

    .deduct-button {
        background-color: #f44336;
        color: white;
    }

    .reset-button {
        background-color: #555;
        color: white;
    }
</style>
