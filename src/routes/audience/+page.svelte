<script lang="ts">
    import { socket, gameId, connected } from '$lib/stores/gameStore';
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import GameBoard from '$lib/components/GameBoard.svelte';
    import type { GameBoard as GameBoardType, CurrentQuestion } from '$lib/data/gameBoard';

    let inputGameId = '';
    let joinStatus = '';
    let scores: Record<string, number> = {};
    let gameBoard: GameBoardType | null = null;
    let currentQuestion: CurrentQuestion | null = null;
    let gameResult: { winner: string | null; rankings: Array<{name: string, score: number}> } | null = null;
    let scoringFeedback: { playerName: string; points: number; outcome: string } | null = null;

    onMount(() => {
        gameId.set(null);
        if (browser) {
            const params = new URLSearchParams(window.location.search);
            const gameIdParam = params.get('gameId');
            if (gameIdParam) {
                inputGameId = gameIdParam;
                joinAsAudience();
            }
        }
    });

    function joinAsAudience() {
        if (inputGameId.trim()) {
            socket?.emit('join-audience', inputGameId);
        }
    }

    function leave() {
        gameId.set(null);
        joinStatus = '';
        gameBoard = null;
        currentQuestion = null;
        gameResult = null;
    }

    socket?.on('audience-joined', (id: string) => {
        gameId.set(id);
        joinStatus = 'Watching!';
    });

    socket?.on('game-not-found', () => {
        joinStatus = 'Game not found. Check the ID and try again.';
    });

    socket?.on('game-state-updated', (state) => {
        gameBoard = state.gameBoard;
        currentQuestion = state.currentQuestion;
        scores = state.scores || {};
    });

    socket?.on('scores-updated', (updatedScores) => {
        scores = updatedScores;
    });

    socket?.on('answer-result', (result) => {
        scoringFeedback = result;
        setTimeout(() => { scoringFeedback = null; }, 2500);
    });

    socket?.on('game-ended', (result) => {
        if (result) {
            gameResult = result;
        } else {
            leave();
        }
    });

    function selectQuestion() {}
    function markQuestionAnswered() {}
</script>

<main class="audience-layout">
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
                <button class="btn-leave" on:click={leave}>Leave</button>
            </div>

        {:else if $gameId}
            {#if gameBoard}
                <GameBoard
                    gameBoard={gameBoard}
                    currentQuestion={currentQuestion}
                    onSelectQuestion={selectQuestion}
                    onMarkAnswered={markQuestionAnswered}
                    isHost={false}
                    {scoringFeedback}
                />
            {:else}
                <div class="waiting">Waiting for game board...</div>
            {/if}

            {#if Object.keys(scores).length > 0}
                <div class="scores-bar">
                    {#each Object.entries(scores) as [name, score]}
                        <div class="score-chip">
                            <span class="chip-name">{name}</span>
                            <span class="chip-score">${score}</span>
                        </div>
                    {/each}
                </div>
            {/if}

            <button class="btn-leave leave-bottom" on:click={leave}>Leave</button>
        {:else}
            <div class="join-area">
                <h1>Jeopardy!</h1>
                <p class="join-sub">Watch as audience</p>
                <div class="join-form">
                    <input type="text" bind:value={inputGameId} placeholder="Game code" />
                    <button class="btn-join" on:click={joinAsAudience}>Watch</button>
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

    .audience-layout {
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

    .join-form input:focus { border-color: #d4a843; }
    .join-form input::placeholder { color: #4a4e6e; }

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

    .status-msg { color: #8892b0; margin-top: 1rem; }

    .waiting {
        text-align: center;
        padding: 3rem;
        color: #8892b0;
    }

    .scores-bar {
        display: flex;
        gap: 0.75rem;
        justify-content: center;
        padding: 1rem 2rem;
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

    .btn-leave {
        background: rgba(220, 53, 69, 0.15);
        border: 1px solid rgba(220, 53, 69, 0.3);
        color: #dc3545;
        padding: 0.6rem 1.5rem;
        border-radius: 6px;
        cursor: pointer;
        font-family: inherit;
        margin: 0 auto 2rem;
        display: block;
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

    .rank-num { width: 2.5rem; color: #8892b0; }
    .ranking-row.winner .rank-num { color: #d4a843; font-weight: 700; }
    .rank-name { flex: 1; }
    .rank-score { font-weight: 700; }
    .ranking-row.winner .rank-score { color: #d4a843; }
</style>
