<script lang="ts">
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
    let lastResetCount = 0;
    let scores: Record<string, number> = {};
    let connectedPlayers: Array<{id: string, name: string}> = [];
    let gameBoard: GameBoardType | null = null;
    let currentQuestion: CurrentQuestion | null = null;
    let gameResult: { winner: string | null; rankings: Array<{name: string, score: number}> } | null = null;
    let scoringFeedback: { playerName: string; points: number; outcome: string } | null = null;
    let buzzerAttempts: string[] = [];

    function buzz() {
        if (!hasBuzzed && !buzzerAttempts.includes(playerName) && $gameId && gameStarted) {
            socket?.emit('player-buzz', { gameId: $gameId, playerName });
            hasBuzzed = true;
        }
    }

    onMount(() => {
        gameId.set(null);
        if (browser) {
            localStorage.removeItem('playerGameId');
            localStorage.removeItem('playerName');
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
        joinStatus = 'Joined! Waiting for host to start the game...';
    });

    socket?.on('game-not-found', () => {
        joinStatus = 'Game not found. Check the ID and try again.';
    });

    socket?.on('game-full', () => {
        joinStatus = 'Game is full (3 players max).';
    });

    socket?.on('game-started', () => {
        gameStarted = true;
        hasBuzzed = false;
    });

    socket?.on('game-ended', (result) => {
        if (result) {
            gameResult = result;
        } else {
            gameId.set(null);
            joinStatus = 'Game ended by host';
            if (browser) {
                localStorage.removeItem('playerGameId');
                localStorage.removeItem('playerName');
            }
        }
    });

    socket?.on('game-state-updated', (state) => {
        gameStarted = state.started;
        gameBoard = state.gameBoard;
        currentQuestion = state.currentQuestion;
        scores = state.scores || {};
        connectedPlayers = state.players || [];
        buzzerAttempts = state.buzzerAttempts || [];

        if (state.resetCount && state.resetCount > lastResetCount) {
            hasBuzzed = false;
            lastResetCount = state.resetCount;
        } else if (Array.isArray(state.buzzes) && state.buzzes.length === 0 &&
                (!state.buzzState || Object.keys(state.buzzState).length === 0)) {
            hasBuzzed = false;
        } else {
            const isInBuzzList = state.buzzes?.some((buzz: any) => buzz.playerName === playerName);
            const isInBuzzState = state.buzzState && state.buzzState[playerName];
            hasBuzzed = isInBuzzList || isInBuzzState || false;
        }
    });

    socket?.on('scores-updated', (updatedScores) => {
        scores = updatedScores;
    });

    socket?.on('answer-result', (result) => {
        scoringFeedback = result;
        setTimeout(() => { scoringFeedback = null; }, 2500);
    });

    socket?.on('buzz-reset', () => {
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

    function selectQuestion() {}
    function markQuestionAnswered() {}
</script>

<main class="player-layout">
    {#if $connected}
        {#if gameResult}
            <div class="game-result">
                <h1>Game Over!</h1>
                <h2 class="winner-name">Winner: {gameResult.winner || 'No winner'}</h2>
                <div class="rankings">
                    {#each gameResult.rankings as player, i}
                        <div class="ranking-row" class:winner={i === 0} class:me={player.name === playerName}>
                            <span class="rank-num">#{i + 1}</span>
                            <span class="rank-name">{player.name}</span>
                            <span class="rank-score">${player.score}</span>
                        </div>
                    {/each}
                </div>
                <button class="btn-leave" on:click={leaveGame}>Leave</button>
            </div>

        {:else if $gameId}
            {#if gameStarted}
                <div class="game-view">
                    {#if gameBoard}
                        <GameBoardComponent
                            gameBoard={gameBoard}
                            currentQuestion={currentQuestion}
                            onSelectQuestion={selectQuestion}
                            onMarkAnswered={markQuestionAnswered}
                            isHost={false}
                            showBuzzer={true}
                            hasBuzzed={hasBuzzed}
                            onBuzz={buzz}
                            {playerName}
                            {scoringFeedback}
                            {buzzerAttempts}
                        />
                    {:else}
                        <div class="loading-msg">Loading board...</div>
                    {/if}

                    <div class="player-bottom">
                        <div class="scores-strip">
                            {#each Object.entries(scores) as [name, score]}
                                <div class="p-score" class:mine={name === playerName}>
                                    <span class="ps-name">{name}</span>
                                    <span class="ps-value">${score}</span>
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>
            {:else}
                <div class="waiting">
                    <h2>{joinStatus || 'Joined!'}</h2>
                    <div class="waiting-players">
                        {#each connectedPlayers as player }
                            <div class="player-dot" class:me={player.name === playerName}>{player.name}</div>
                        {/each}
                    </div>
                    <p class="waiting-hint">Waiting for host to start the game...</p>
                    <button class="btn-leave" on:click={leaveGame}>Leave Game</button>
                </div>
            {/if}
        {:else}
            <div class="join-area">
                <h1>Jeopardy!</h1>
                <p class="join-sub">Join a game</p>
                <div class="join-form">
                    <input type="text" bind:value={playerName} placeholder="Your name" />
                    <input type="text" bind:value={inputGameId} placeholder="Game code" />
                    <button class="btn-join" on:click={joinGame}>Join Game</button>
                </div>
                {#if joinStatus}
                    <p class="status-msg">{joinStatus}</p>
                {/if}
            </div>
        {/if}
    {:else}
        <div class="connecting">
            <div class="spinner"></div>
            <p>Connecting to server...</p>
        </div>
    {/if}
</main>

<style>
    *, *::before, *::after { box-sizing: border-box; }

    .player-layout {
        min-height: 100vh;
        background: radial-gradient(ellipse at 50% 0%, #0f1450 0%, #070a2e 100%);
        color: #fff;
        font-family: system-ui, -apple-system, sans-serif;
    }

    .connecting {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        gap: 1rem;
        color: #8892b0;
    }

    .spinner {
        width: 40px; height: 40px;
        border: 3px solid #1a1a4e;
        border-top-color: #d4a843;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* ---- Join ---- */
    .join-area {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        padding: 2rem;
    }

    .join-area h1 {
        font-size: 3.5rem;
        color: #d4a843;
        letter-spacing: 0.08em;
        margin: 0;
    }

    .join-sub {
        color: #8892b0;
        margin: 0 0 2rem;
    }

    .join-form {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        width: 100%;
        max-width: 320px;
    }

    .join-form input {
        padding: 0.85rem 1rem;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: #fff;
        font-size: 1rem;
        font-family: inherit;
        outline: none;
        transition: border-color 0.15s;
    }

    .join-form input:focus {
        border-color: #d4a843;
    }

    .join-form input::placeholder {
        color: #4a4e6e;
    }

    .btn-join {
        background: #d4a843;
        color: #070a2e;
        border: none;
        padding: 0.85rem 1rem;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.15s;
        font-family: inherit;
    }

    .btn-join:hover { transform: translateY(-2px); }

    .status-msg {
        color: #8892b0;
        margin-top: 1rem;
        text-align: center;
    }

    /* ---- Waiting ---- */
    .waiting {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        gap: 1.5rem;
    }

    .waiting h2 {
        font-weight: 400;
        color: #8892b0;
    }

    .waiting-players {
        display: flex;
        gap: 0.75rem;
    }

    .player-dot {
        padding: 0.5rem 1rem;
        background: rgba(255, 255, 255, 0.06);
        border-radius: 6px;
    }

    .player-dot.me {
        border: 1px solid #d4a843;
        color: #d4a843;
    }

    .waiting-hint {
        color: #4a4e6e;
        font-size: 0.9rem;
    }

    .btn-leave {
        background: rgba(220, 53, 69, 0.15);
        border: 1px solid rgba(220, 53, 69, 0.3);
        color: #dc3545;
        padding: 0.6rem 1.5rem;
        border-radius: 6px;
        cursor: pointer;
        font-family: inherit;
    }

    /* ---- Game View ---- */
    .game-view {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
    }

    .loading-msg {
        text-align: center;
        padding: 3rem;
        color: #8892b0;
    }

    .player-bottom {
        padding: 1rem 2rem;
        background: rgba(0, 0, 0, 0.3);
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        display: flex;
        justify-content: center;
    }

    .scores-strip {
        display: flex;
        gap: 0.75rem;
    }

    .p-score {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0.4rem 1rem;
        background: rgba(255, 255, 255, 0.06);
        border-radius: 8px;
        min-width: 80px;
        border: 1px solid transparent;
        transition: border-color 0.3s, background 0.3s;
    }

    .p-score.mine {
        border-color: #d4a843;
        background: rgba(212, 168, 67, 0.08);
    }

    .p-score.changed {
        animation: score-flash 0.6s ease-out;
    }

    @keyframes score-flash {
        0% { border-color: #d4a843; background: rgba(212, 168, 67, 0.2); }
        100% { border-color: transparent; background: transparent; }
    }

    .ps-name {
        font-size: 0.75rem;
        color: #8892b0;
    }

    .ps-value {
        font-size: 1.1rem;
        font-weight: 700;
        color: #d4a843;
    }

    .p-score.mine .ps-value {
        color: #fff;
    }

    /* ---- Game Result ---- */
    .game-result {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        gap: 1rem;
    }

    .game-result h1 {
        font-size: 3rem;
        margin: 0;
    }

    .winner-name {
        font-size: 1.5rem;
        color: #d4a843;
        font-weight: 600;
        margin: 0;
    }

    .rankings {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        min-width: 300px;
        margin: 1rem 0;
    }

    .ranking-row {
        display: flex;
        gap: 1rem;
        align-items: center;
        padding: 0.75rem 1rem;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
    }

    .ranking-row.winner {
        background: rgba(212, 168, 67, 0.15);
        border: 1px solid rgba(212, 168, 67, 0.3);
    }

    .ranking-row.me {
        outline: 2px solid rgba(255, 255, 255, 0.2);
    }

    .rank-num {
        width: 2.5rem;
        color: #8892b0;
    }

    .ranking-row.winner .rank-num {
        color: #d4a843;
        font-weight: 700;
    }

    .rank-name { flex: 1; }
    .rank-score { font-weight: 700; }

    .ranking-row.winner .rank-score {
        color: #d4a843;
    }
</style>
