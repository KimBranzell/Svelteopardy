<script lang="ts">
    import { socket, gameId, connected } from '$lib/stores/gameStore';
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import GameBoard from '$lib/components/GameBoard.svelte';
    import type { GameBoard as GameBoardType, CurrentQuestion } from '$lib/data/gameBoard';

    let currentGameId: string | null = null;
    let connectedPlayers: Array<{id: string, name: string}> = [];
    let kickedPlayers: string[] = [];
    let buzzes: Array<{playerName: string, timestamp: number}> = [];
    let gameStarted = false;
    let scores: Record<string, number> = {};
    let gameBoard: GameBoardType | null = null;
    let currentQuestion: CurrentQuestion | null = null;
    let showManualScore = false;
    let selectedPlayer: string | null = null;
    let pointAmount = 100;
    let gameResult: { winner: string | null; finalScores: Record<string, number>; rankings: Array<{name: string, score: number}> } | null = null;

    $: buzzerWinner = buzzes.length > 0 ? buzzes[0].playerName : null;

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
                socket.emit('reconnect-attempt', { gameId: savedGameId, isHost: true });
            }
        }
    });

    function createGame() {
        socket?.emit('create-game');
    }

    function startGame() {
        if (currentGameId) {
            socket?.emit('start-game', currentGameId);
        }
    }

    function endGame() {
        if (currentGameId) {
            socket?.emit('end-game', currentGameId);
        }
    }

    function resetBuzzers() {
        if (currentGameId) {
            socket?.emit('reset-buzzer', currentGameId);
            buzzes = [];
        }
    }

    function kickPlayer(playerId: string) {
        socket?.emit('kick-player', playerId);
    }

    function reinvitePlayer(playerName: string) {
        if (currentGameId) {
            socket?.emit('reinvite-player', currentGameId, playerName);
            kickedPlayers = kickedPlayers.filter(p => p !== playerName);
        }
    }

    /* Scoring handlers */
    function scoreCorrect() {
        if (currentGameId && buzzerWinner && currentQuestion) {
            socket?.emit('update-score', {
                gameId: currentGameId,
                playerName: buzzerWinner,
                points: currentQuestion.pointValue || 0
            });
        }
    }

    function scoreIncorrect() {
        if (currentGameId && buzzerWinner && currentQuestion) {
            const points = -(currentQuestion.pointValue || 0);
            socket?.emit('update-score', {
                gameId: currentGameId,
                playerName: buzzerWinner,
                points
            });
        }
    }

    function awardPoints() {
        if (selectedPlayer && currentGameId) {
            socket?.emit('update-score', {
                gameId: currentGameId,
                playerName: selectedPlayer,
                points: pointAmount
            });
        }
    }

    function deductPoints() {
        if (selectedPlayer && currentGameId) {
            socket?.emit('update-score', {
                gameId: currentGameId,
                playerName: selectedPlayer,
                points: -pointAmount
            });
        }
    }

    function resetScores() {
        if (currentGameId) {
            connectedPlayers.forEach(player => {
                socket?.emit('update-score', {
                    gameId: currentGameId,
                    playerName: player.name,
                    points: 0,
                    absolute: true
                });
            });
        }
    }

    function selectQuestion(categoryIndex: number, questionIndex: number) {
        if (currentGameId) {
            socket?.emit('select-question', {
                gameId: currentGameId,
                categoryIndex,
                questionIndex
            });
        }
    }

    function markQuestionAnswered(categoryIndex: number, questionIndex: number) {
        if (currentGameId) {
            socket?.emit('mark-question-answered', {
                gameId: currentGameId,
                categoryIndex,
                questionIndex
            });
        }
    }

    /* Socket handlers */
    socket?.on('game-created', (id: string) => {
        gameId.set(id);
    });

    socket?.on('game-ended', (result) => {
        if (result) {
            gameResult = result;
        } else {
            gameId.set(null);
            connectedPlayers = [];
            kickedPlayers = [];
            gameBoard = null;
            currentQuestion = null;
            buzzes = [];
        }
    });

    socket?.on('players-updated', (players: Array<{id: string, name: string}>) => {
        connectedPlayers = players;
    });

    socket?.on('game-state-updated', (state) => {
        gameStarted = state.started;
        kickedPlayers = state.kickedPlayers || [];
        buzzes = state.buzzes || [];
        scores = state.scores || {};
        gameBoard = state.gameBoard;
        currentQuestion = state.currentQuestion;
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
</script>

<main class="host-layout">
    {#if $connected}
        {#if gameResult}
            <div class="game-result">
                <h1>Game Over!</h1>
                <h2 class="winner-name">Winner: {gameResult.winner || 'No winner'}</h2>
                <div class="rankings">
                    {#each gameResult.rankings as player, i}
                        <div class="ranking-row" class:winner={i === 0}>
                            <span class="rank-num">#{i + 1}</span>
                            <span class="rank-name">{player.name}</span>
                            <span class="rank-score">${player.score}</span>
                        </div>
                    {/each}
                </div>
                <button class="btn-primary" on:click={() => {
                    gameId.set(null);
                    connectedPlayers = [];
                    kickedPlayers = [];
                    gameBoard = null;
                    currentQuestion = null;
                    buzzes = [];
                    gameResult = null;
                }}>Create New Game</button>
            </div>

        {:else if currentGameId}
            <header class="top-bar">
                <div class="game-code-section">
                    <span class="code-label">Game Code</span>
                    <span class="code-value">{currentGameId}</span>
                </div>
                <div class="scores-bar">
                    {#each connectedPlayers as player}
                        <div class="score-chip">
                            <span class="chip-name">{player.name}</span>
                            <span class="chip-score">${scores[player.name] || 0}</span>
                        </div>
                    {/each}
                    {#if !gameStarted}
                        <span class="players-count">{connectedPlayers.length}/3 players</span>
                    {/if}
                </div>
                <div class="top-actions">
                    {#if !gameStarted && connectedPlayers.length >= 2}
                        <button class="btn-start" on:click={startGame}>Start Game</button>
                    {/if}
                    <button class="btn-danger" on:click={endGame}>End Game</button>
                </div>
            </header>

            {#if !gameStarted}
                <div class="lobby">
                    <h2>Waiting for players...</h2>
                    <div class="player-list">
                        {#each connectedPlayers as player}
                            <div class="player-row">
                                <span>{player.name}</span>
                                <button class="btn-kick" on:click={() => kickPlayer(player.id)}>Kick</button>
                            </div>
                        {/each}
                    </div>
                    {#if kickedPlayers.length > 0}
                        <div class="kicked-section">
                            <h3>Kicked Players</h3>
                            {#each kickedPlayers as name}
                                <div class="player-row">
                                    <span>{name}</span>
                                    <button class="btn-small" on:click={() => reinvitePlayer(name)}>Reinvite</button>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            {:else}
                <div class="game-area">
                    <GameBoard
                        {gameBoard}
                        {currentQuestion}
                        onSelectQuestion={selectQuestion}
                        onMarkAnswered={markQuestionAnswered}
                        isHost={true}
                        buzzerWinner={currentQuestion && buzzerWinner ? buzzerWinner : null}
                        onScoreCorrect={scoreCorrect}
                        onScoreIncorrect={scoreIncorrect}
                    />

                    {#if !currentQuestion}
                        <div class="bottom-bar">
                            <div class="buzz-queue">
                                <span class="queue-label">Buzz Queue</span>
                                {#if buzzes.length > 0}
                                    <div class="queue-list">
                                        {#each buzzes as buzz, i}
                                            <span class="queue-item" class:first={i === 0}>{buzz.playerName}</span>
                                        {/each}
                                    </div>
                                    <button class="btn-small" on:click={resetBuzzers}>Reset</button>
                                {:else}
                                    <span class="queue-empty">Waiting for players to buzz...</span>
                                {/if}
                            </div>

                            <button class="btn-small" on:click={() => showManualScore = !showManualScore}>
                                {showManualScore ? 'Hide' : 'Manual'} Score
                            </button>
                        </div>

                        {#if showManualScore}
                            <div class="manual-score">
                                <div class="manual-players">
                                    {#each connectedPlayers as player}
                                        <button
                                            class="manual-player"
                                            class:selected={selectedPlayer === player.name}
                                            on:click={() => selectedPlayer = player.name}>
                                            {player.name}
                                        </button>
                                    {/each}
                                </div>
                                <div class="manual-controls">
                                    <input type="number" bind:value={pointAmount} min="0" step="100" />
                                    <button class="btn-correct" disabled={!selectedPlayer} on:click={awardPoints}>+Award</button>
                                    <button class="btn-incorrect" disabled={!selectedPlayer} on:click={deductPoints}>-Deduct</button>
                                    <button class="btn-small" on:click={resetScores}>Reset All</button>
                                </div>
                            </div>
                        {/if}
                    {/if}
                </div>
            {/if}

        {:else}
            <div class="create-section">
                <h1>Jeopardy!</h1>
                <p class="subtitle">Host a game</p>
                <button class="btn-primary btn-large" on:click={createGame}>Create New Game</button>
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

    .host-layout {
        min-height: 100vh;
        background: radial-gradient(ellipse at 50% 0%, #0f1450 0%, #070a2e 100%);
        color: #fff;
        font-family: system-ui, -apple-system, sans-serif;
    }

    /* ---- Connecting ---- */
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
        width: 40px;
        height: 40px;
        border: 3px solid #1a1a4e;
        border-top-color: #d4a843;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* ---- Create Section ---- */
    .create-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        gap: 1rem;
    }

    .create-section h1 {
        font-size: 4rem;
        color: #d4a843;
        letter-spacing: 0.08em;
        margin: 0;
    }

    .subtitle {
        color: #8892b0;
        font-size: 1.1rem;
        margin: 0 0 2rem;
    }

    /* ---- Top Bar ---- */
    .top-bar {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        padding: 1rem 2rem;
        background: rgba(0, 0, 0, 0.3);
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .game-code-section {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .code-label {
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: #8892b0;
    }

    .code-value {
        font-size: 1.8rem;
        font-weight: 700;
        color: #d4a843;
        letter-spacing: 0.05em;
    }

    .scores-bar {
        display: flex;
        gap: 0.75rem;
        flex: 1;
        justify-content: center;
    }

    .score-chip {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0.4rem 1rem;
        background: rgba(255, 255, 255, 0.06);
        border-radius: 8px;
        min-width: 80px;
    }

    .chip-name {
        font-size: 0.75rem;
        color: #8892b0;
    }

    .chip-score {
        font-size: 1.1rem;
        font-weight: 700;
        color: #d4a843;
    }

    .players-count {
        font-size: 0.85rem;
        color: #8892b0;
        display: flex;
        align-items: center;
    }

    .top-actions {
        display: flex;
        gap: 0.5rem;
    }

    /* ---- Lobby ---- */
    .lobby {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 4rem 2rem;
        gap: 1.5rem;
    }

    .lobby h2 {
        color: #8892b0;
        font-weight: 400;
        font-size: 1.3rem;
    }

    .player-list, .kicked-section {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        min-width: 300px;
    }

    .player-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1rem;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
    }

    /* ---- Game Area ---- */
    .game-area {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 1rem 2rem;
        max-width: 900px;
        margin: 0 auto;
    }

    .bottom-bar {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        width: 100%;
        padding: 1rem 0;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .buzz-queue {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex: 1;
    }

    .queue-label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #8892b0;
        white-space: nowrap;
    }

    .queue-list {
        display: flex;
        gap: 0.4rem;
    }

    .queue-item {
        padding: 0.3rem 0.75rem;
        background: rgba(255, 255, 255, 0.06);
        border-radius: 4px;
        font-size: 0.9rem;
    }

    .queue-item.first {
        background: rgba(212, 168, 67, 0.15);
        color: #d4a843;
        font-weight: 600;
    }

    .queue-empty {
        color: #4a4e6e;
        font-size: 0.85rem;
    }

    /* ---- Manual Score ---- */
    .manual-score {
        width: 100%;
        padding: 1rem;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 8px;
        margin-bottom: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .manual-players {
        display: flex;
        gap: 0.5rem;
    }

    .manual-player {
        padding: 0.5rem 1rem;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid transparent;
        border-radius: 6px;
        color: #8892b0;
        cursor: pointer;
        font-family: inherit;
        font-size: 0.9rem;
        transition: background 0.15s, border-color 0.15s;
    }

    .manual-player:hover {
        background: rgba(255, 255, 255, 0.1);
    }

    .manual-player.selected {
        border-color: #d4a843;
        color: #fff;
        background: rgba(212, 168, 67, 0.1);
    }

    .manual-controls {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }

    .manual-controls input {
        width: 80px;
        padding: 0.4rem 0.5rem;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        color: #fff;
        font-family: inherit;
        font-size: 1rem;
        text-align: center;
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

    /* ---- Buttons ---- */
    .btn-primary {
        background: #d4a843;
        color: #070a2e;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.15s, box-shadow 0.15s;
        font-family: inherit;
    }

    .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(212, 168, 67, 0.3);
    }

    .btn-large {
        padding: 1.25rem 3rem;
        font-size: 1.2rem;
    }

    .btn-start {
        background: #28a745;
        color: #fff;
        border: none;
        padding: 0.6rem 1.25rem;
        border-radius: 6px;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.15s;
        font-family: inherit;
    }

    .btn-start:hover { transform: translateY(-1px); }

    .btn-danger {
        background: rgba(220, 53, 69, 0.2);
        color: #dc3545;
        border: 1px solid rgba(220, 53, 69, 0.3);
        padding: 0.6rem 1.25rem;
        border-radius: 6px;
        font-size: 0.85rem;
        cursor: pointer;
        transition: background 0.15s;
        font-family: inherit;
    }

    .btn-danger:hover { background: rgba(220, 53, 69, 0.3); }

    .btn-kick {
        background: transparent;
        border: 1px solid rgba(220, 53, 69, 0.3);
        color: #dc3545;
        padding: 0.25rem 0.75rem;
        border-radius: 4px;
        font-size: 0.8rem;
        cursor: pointer;
        font-family: inherit;
    }

    .btn-small {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #8892b0;
        padding: 0.4rem 0.9rem;
        border-radius: 6px;
        font-size: 0.8rem;
        cursor: pointer;
        font-family: inherit;
        transition: background 0.15s;
        white-space: nowrap;
    }

    .btn-small:hover { background: rgba(255, 255, 255, 0.12); }

    .btn-correct {
        background: rgba(40, 167, 69, 0.15);
        border: 1px solid rgba(40, 167, 69, 0.3);
        color: #28a745;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        font-family: inherit;
    }

    .btn-correct:disabled { opacity: 0.4; cursor: default; }

    .btn-incorrect {
        background: rgba(220, 53, 69, 0.15);
        border: 1px solid rgba(220, 53, 69, 0.3);
        color: #dc3545;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        font-family: inherit;
    }

    .btn-incorrect:disabled { opacity: 0.4; cursor: default; }
</style>
