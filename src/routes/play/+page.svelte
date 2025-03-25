<script lang="ts">
    interface Buzz {
        playerName: string;
        timestamp: number;
    }

    interface GameBoard {
        categories: Array<{
            name: string;
            questions: Array<{
                value: number;
                question: string;
                answer: string;
                answered: boolean;
            }>;
        }>;
    }

    import { socket, gameId, connected } from '$lib/stores/gameStore';
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import GameBoardComponent from '$lib/components/GameBoard.svelte';
    import type { GameBoard as GameBoardType, CurrentQuestion } from '$lib/data/gameBoard';


    let inputGameId = '';
    let playerName = '';
    let joinStatus = '';
    let gameStarted = false;
    let hasBuzzed = false;
    let lastResetTimestamp = 0;
    let lastResetCount = 0;
    let scores: Record<string, number> = {};
    let gameBoard: GameBoardType | null = null;
    let currentQuestion: CurrentQuestion | null = null;

    function buzz() {
        if (!hasBuzzed && gameStarted) {
            socket?.emit('player-buzz', {
                gameId: $gameId,
                playerName
            });
            hasBuzzed = true;
        }
    }

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
        hasBuzzed = false;
    });

    socket?.on('game-ended', () => {
        gameId.set(null);
        joinStatus = 'Game ended by host';
        if (browser) {
            localStorage.removeItem('playerGameId');
            localStorage.removeItem('playerName');
        }
    });

    socket?.on('game-state-updated', (state) => {
        console.log('Received game state update:', state);
        console.log('Current lastResetCount:', lastResetCount, 'New resetCount:', state.resetCount);

        gameStarted = state.started;
        gameBoard = state.gameBoard;
        currentQuestion = state.currentQuestion;

        scores = state.scores || {};

        // More explicit check for buzz reset
        if (state.resetCount && state.resetCount > lastResetCount) {
            console.log('Reset detected via resetCount');
            hasBuzzed = false;
            lastResetCount = state.resetCount;
        } else if (Array.isArray(state.buzzes) && state.buzzes.length === 0 &&
                (!state.buzzState || Object.keys(state.buzzState).length === 0)) {
            console.log('Reset detected via empty buzzes and buzzState');
            hasBuzzed = false;
        } else {
            // Check if player is in the buzz list
            const isInBuzzList = state.buzzes?.some((buzz: Buzz) => buzz.playerName === playerName);
            const isInBuzzState = state.buzzState && state.buzzState[playerName];

            console.log('Buzz status check:', { isInBuzzList, isInBuzzState, playerName });
            hasBuzzed = isInBuzzList || isInBuzzState || false;
        }
    });

    socket?.on('scores-updated', (updatedScores) => {
        scores = updatedScores;
    });

    // Make this handler more explicit
    socket?.on('buzz-reset', () => {
        console.log('Direct buzz-reset received');
        hasBuzzed = false;
        // Force UI update
        hasBuzzed = false;
    });

    socket?.on('kicked-from-game', () => {
        gameId.set(null);
        joinStatus = 'You have been kicked from the game';
        if (browser) {
            localStorage.removeItem('playerGameId');
            localStorage.removeItem('playerName');
        }
    });

    socket?.on('player-state-sync', (state) => {
        gameStarted = state.gameStarted;
        hasBuzzed = state.hasBuzzed;
    });

    socket?.on('force-buzz-update', (state) => {
        hasBuzzed = false;
    });

    socket?.on('buzz-reset', () => {
        console.log('Player received buzz reset');
        hasBuzzed = false;
    });

    function selectQuestion() {}
    function markQuestionAnswered() {}

    // Fix the scores display bug
    function getPlayerClass(name: string) {
        return name === playerName ? 'my-score' : '';
    }
    function debugObject(obj: any) {
        console.log('Debug object:', obj);
        return obj;
    }
</script>

<main class="container">
    <h1>Join Game</h1>

    {#if $connected}
        {#if $gameId}
            {#if gameStarted}
                <div class="game-view">
                    <h2>Game Started!</h2>

                    <!-- Log the gameBoard object to debug -->
                    <pre style="display: none;">{debugObject(gameBoard)}</pre>

                    <!-- Only render GameBoard if gameBoard is not null -->
                    {#if gameBoard}
                        <GameBoardComponent
                            gameBoard={gameBoard}
                            currentQuestion={currentQuestion}
                            onSelectQuestion={selectQuestion}
                            onMarkAnswered={markQuestionAnswered}
                            isHost={false}
                        />
                    {:else}
                        <div class="loading">Waiting for game board...</div>
                    {/if}
                    <div class="scores-panel">
                        <h3>Scores</h3>
                        <div class="scores-container">
                            {#each Object.entries(scores) as [name, score]}
                                <div class="player-score" class:my-score={name === playerName}>
                                    <span class="player-name">{name}</span>
                                    <span class="score">${score}</span>
                                </div>
                            {/each}
                        </div>
                    </div>
                    {#if currentQuestion}
                    <div class="buzzer-container">
                        <button
                            class="buzzer"
                            class:buzzed={hasBuzzed}
                            disabled={hasBuzzed}
                            on:click={buzz}>
                            {hasBuzzed ? 'Buzzed' : 'Buzz'}
                        </button>
                    </div>
                    {/if}
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

    .buzzer-container {
        display: flex;
        justify-content: center;
        align-items: center;
        margin-top: 2rem;
    }

    .buzzer {
        width: 200px;
        height: 200px;
        border-radius: 50%;
        background: #dc3545;
        color: white;
        font-size: 2rem;
        font-weight: bold;
        border: none;
        cursor: pointer;
        transition: transform 0.1s, background-color 0.3s;
    }

    .buzzer:active {
        transform: scale(0.95);
    }

    .buzzer:hover:not(:disabled) {
        background: #c82333;
    }

    .buzzer.buzzed {
        background: #6c757d;
        cursor: not-allowed;
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

    .scores-panel {
        margin-bottom: 20px;
        padding: 10px;
        background-color: #f0f0f0;
        border-radius: 5px;
    }

    .scores-container {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        justify-content: center;
    }

    .player-score {
        padding: 8px;
        background-color: #fff;
        border: 1px solid #ddd;
        border-radius: 4px;
        min-width: 100px;
        text-align: center;
    }

    .my-score {
        border-color: #0077cc;
        background-color: #e6f2ff;
    }

    .player-name {
        font-weight: bold;
        display: block;
    }

    .score {
        font-size: 1.2rem;
        color: #0077cc;
    }
</style>
