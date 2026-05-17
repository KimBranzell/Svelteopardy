<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import type { GameBoard, CurrentQuestion } from '$lib/data/gameBoard';

  export let gameBoard: GameBoard | null = null;
  export let onSelectQuestion: (categoryIndex: number, questionIndex: number) => void;
  export let currentQuestion: CurrentQuestion | null = null;
  export let onMarkAnswered: (categoryIndex: number, questionIndex: number) => void;
  export let isHost: boolean = false;
  export let buzzerWinner: string | null = null;
  export let onScoreCorrect: (() => void) | null = null;
  export let onScoreIncorrect: (() => void) | null = null;

  /* Player buzzer props */
  export let showBuzzer: boolean = false;
  export let hasBuzzed: boolean = false;
  export let onBuzz: (() => void) | null = null;
  export let playerName: string = '';

  export let scoringFeedback: { playerName: string; points: number; outcome: string } | null = null;
  export let buzzerAttempts: string[] = [];

  const BUZZER_SECONDS = 15;
  let showAnswer = false;
  let scored = false;
  let timer = BUZZER_SECONDS;

  $: {
    if (currentQuestion) {
      if (isHost) showAnswer = true;
    } else {
      showAnswer = false;
      scored = false;
      timer = BUZZER_SECONDS;
    }
  }

  let timerInterval: ReturnType<typeof setInterval> | null = null;
  $: {
    if (currentQuestion && !buzzerWinner && !hasBuzzed && timer > 0) {
      if (!timerInterval) {
        timerInterval = setInterval(() => {
          timer = Math.max(0, timer - 1);
        }, 1000);
      }
    } else {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    }
  }

  $: timeUp = currentQuestion && timer === 0 && !buzzerWinner;

  $: {
    if (currentQuestion) {
      if (isHost) showAnswer = true;
    } else {
      showAnswer = false;
      scored = false;
    }
  }

  function handleCorrect() {
    if (onScoreCorrect) onScoreCorrect();
    scored = true;
  }

  function handleIncorrect() {
    if (onScoreIncorrect) onScoreIncorrect();
    scored = true;
  }

  function handleReturn() {
    showAnswer = false;
    scored = false;
    if (currentQuestion) {
      onMarkAnswered(currentQuestion.categoryIndex, currentQuestion.questionIndex);
    }
  }
</script>

{#if currentQuestion}
  <div class="question-overlay" transition:fade={{ duration: 300 }}>
    <div class="question-card" transition:fly={{ y: 40, duration: 400 }}>
      {#if !buzzerWinner && !showBuzzer}
        <div class="timer-ring" class:urgent={timer <= 5}>
          <svg viewBox="0 0 40 40" width="40" height="40">
            <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="3"/>
            <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" stroke-width="3"
              stroke-dasharray="106.8" stroke-dashoffset={106.8 * (1 - timer / BUZZER_SECONDS)}
              stroke-linecap="round" transform="rotate(-90 20 20)"/>
          </svg>
          <span class="timer-text">{timer}</span>
        </div>
      {/if}
      {#if showBuzzer && !hasBuzzed}
        <div class="timer-ring buzzer-timer" class:urgent={timer <= 5}>
          <svg viewBox="0 0 40 40" width="40" height="40">
            <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="3"/>
            <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" stroke-width="3"
              stroke-dasharray="106.8" stroke-dashoffset={106.8 * (1 - timer / BUZZER_SECONDS)}
              stroke-linecap="round" transform="rotate(-90 20 20)"/>
          </svg>
          <span class="timer-text">{timer}</span>
        </div>
      {/if}
      <div class="question-value">${currentQuestion.pointValue}</div>
      <div class="question-category">{currentQuestion.categoryName || ''}</div>
      <div class="question-text">{currentQuestion.text}</div>

      {#if showAnswer}
        <div class="answer-section" transition:fly={{ y: 20, duration: 300 }}>
          <div class="answer-divider"></div>
          <div class="answer-label">What is</div>
          <div class="answer-text">{currentQuestion.answer}</div>
          <div class="answer-label">?</div>
        </div>

        {#if isHost && timeUp}
          <div class="time-up-label">Time's up!</div>
          <div class="return-section">
            <button class="action-btn return-btn" on:click={handleReturn}>
              Return to Board
            </button>
          </div>
        {:else if isHost && buzzerWinner && !scored}
          <div class="buzzer-winner" transition:fly={{ y: 20, duration: 300 }}>
            <span class="buzzer-winner-label">Buzzed first:</span>
            <span class="buzzer-winner-name">{buzzerWinner}</span>
          </div>

          <div class="score-actions">
            <button class="action-btn correct-btn" on:click={handleCorrect}>
              Correct &mdash; +${currentQuestion.pointValue}
            </button>
            <button class="action-btn incorrect-btn" on:click={handleIncorrect}>
              Incorrect &mdash; -${currentQuestion.pointValue}
            </button>
          </div>
        {/if}

        {#if !isHost || scored || timeUp}
          <div class="return-section">
            <button class="action-btn return-btn" on:click={handleReturn}>
              Return to Board
            </button>
          </div>
        {/if}
      {/if}
    </div>

    {#if showBuzzer}
      <div class="buzzer-area" transition:fly={{ y: 20, duration: 300, delay: 200 }}>
        <button
          class="buzz-btn"
          class:locked={hasBuzzed || timeUp}
          disabled={hasBuzzed || timeUp}
          on:click={() => { if (onBuzz) onBuzz(); }}
        >
          {#if timeUp}
            <span class="buzz-label">Time's up</span>
          {:else if hasBuzzed}
            <span class="buzz-label">Buzzed!</span>
            <span class="buzz-sub">Wait for your turn</span>
          {:else}
            <span class="buzz-label">Buzz!</span>
            <span class="buzz-sub">Press to answer</span>
          {/if}
        </button>
      </div>
    {/if}

    {#if scoringFeedback && (!showBuzzer || scoringFeedback.playerName === playerName)}
      <div class="result-badge" class:correct={scoringFeedback.outcome === 'correct'} class:incorrect={scoringFeedback.outcome === 'incorrect'}>
        <span class="result-label">{scoringFeedback.outcome === 'correct' ? 'Correct!' : 'Incorrect!'}</span>
        <span class="result-points">{scoringFeedback.points > 0 ? '+' : ''}{scoringFeedback.points}</span>
      </div>
    {/if}
  </div>

{:else if gameBoard && gameBoard.categories && gameBoard.categories.length > 0}
  <div class="board-wrapper">
    <div class="jeopardy-board">
      <div class="categories" style="grid-template-columns: repeat({gameBoard.categories.length}, 1fr)">
        {#each gameBoard.categories as category}
          <div class="category-cell">{category.name}</div>
        {/each}
      </div>

      <div class="grid" style="grid-template-columns: repeat({gameBoard.categories.length}, 1fr)">
        {#each gameBoard.categories[0].questions as _, questionIndex}
          {#each gameBoard.categories as category, categoryIndex}
            {@const question = category.questions && category.questions[questionIndex]
              ? category.questions[questionIndex]
              : null}
            {#if question}
              <button
                class="tile"
                class:revealed={question.revealed}
                class:answered={question.answered}
                disabled={!isHost || question.revealed || question.answered}
                on:click={() => onSelectQuestion(categoryIndex, questionIndex)}
              >
                {#if !question.revealed && !question.answered}
                  <span class="tile-value">${question.pointValue || question.value || 0}</span>
                {:else if question.revealed && !question.answered}
                  <span class="tile-dot"></span>
                {/if}
              </button>
            {/if}
          {/each}
        {/each}
      </div>
    </div>
  </div>

{:else}
  <div class="loading-state">
    <div class="loading-spinner"></div>
    <p>Loading game board...</p>
  </div>
{/if}

<style>
  .loading-state {
    text-align: center;
    padding: 3rem;
    color: #8892b0;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #1a1a4e;
    border-top-color: #d4a843;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* ---- Question Overlay ---- */
  .question-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: radial-gradient(ellipse at center, #0f1450 0%, #070a2e 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  .question-card {
    max-width: 720px;
    width: 100%;
    text-align: center;
    color: #fff;
  }

  .question-value {
    font-size: 3rem;
    font-weight: 700;
    color: #d4a843;
    letter-spacing: 0.05em;
    margin-bottom: 0.25rem;
  }

  .question-category {
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: #8892b0;
    margin-bottom: 2rem;
  }

  .timer-ring {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    color: #8892b0;
    margin-bottom: 1rem;
    font-size: 0.85rem;
  }

  .timer-ring.urgent { color: #dc3545; }

  .timer-ring.buzzer-timer {
    position: fixed;
    bottom: 11rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 115;
  }

  .timer-text {
    font-size: 1.1rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .time-up-label {
    font-size: 1.4rem;
    font-weight: 700;
    color: #dc3545;
    margin-bottom: 1.5rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .question-text {
    font-size: 1.65rem;
    line-height: 1.4;
    margin-bottom: 2.5rem;
    padding: 0 1rem;
  }

  .answer-section { margin-bottom: 2rem; }

  .answer-divider {
    width: 60px;
    height: 2px;
    background: #d4a843;
    margin: 1.5rem auto;
    border-radius: 1px;
  }

  .answer-label {
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #8892b0;
    margin-bottom: 0.25rem;
  }

  .answer-text {
    font-size: 1.8rem;
    font-weight: 700;
    color: #d4a843;
    margin-bottom: 0.25rem;
  }

  .buzzer-winner {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    padding: 0.75rem 1.5rem;
    background: rgba(212, 168, 67, 0.1);
    border: 1px solid rgba(212, 168, 67, 0.3);
    border-radius: 8px;
  }

  .buzzer-winner-label { color: #8892b0; font-size: 0.9rem; }
  .buzzer-winner-name { color: #d4a843; font-weight: 700; font-size: 1.1rem; }

  .action-btn {
    display: inline-block;
    padding: 0.9rem 2rem;
    font-size: 1.05rem;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.15s;
    font-family: inherit;
  }

  .action-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  }

  .action-btn:active { transform: translateY(0); }

  .score-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-bottom: 1.5rem;
  }

  .correct-btn { background: #28a745; color: #fff; }
  .incorrect-btn { background: #dc3545; color: #fff; }

  .return-btn {
    background: rgba(255, 255, 255, 0.1);
    color: #8892b0;
    border: 1px solid rgba(255, 255, 255, 0.15);
  }

  .return-section { margin-top: 1rem; }

  /* ---- Buzzer (inside overlay for players) ---- */
  .buzzer-area {
    position: fixed;
    bottom: 3rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 110;
  }

  .buzz-btn {
    width: 140px;
    height: 140px;
    border-radius: 50%;
    background: radial-gradient(circle at 40% 35%, #ff5555, #cc0000);
    color: #fff;
    border: 4px solid rgba(255, 255, 255, 0.15);
    cursor: pointer;
    transition: transform 0.12s, box-shadow 0.15s, background 0.3s;
    font-family: inherit;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    animation: buzz-pulse 2s ease-in-out infinite;
  }

  @keyframes buzz-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.3); }
    50% { box-shadow: 0 0 0 12px rgba(255, 0, 0, 0); }
  }

  .buzz-btn:hover:not(:disabled) {
    transform: scale(1.08);
  }

  .buzz-btn:active:not(:disabled) {
    transform: scale(0.92);
  }

  .buzz-btn.locked {
    background: #3a3a5c;
    border-color: #4a4a6e;
    cursor: default;
    animation: none;
    box-shadow: none;
  }

  .buzz-btn.locked:hover { transform: none; }

  .buzz-label {
    font-size: 1.4rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .buzz-sub {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.6);
    margin-top: 0.2rem;
  }

  /* ---- Result Feedback ---- */
  .result-badge {
    position: fixed;
    top: 1rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 120;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.6rem 1.5rem;
    border-radius: 999px;
    animation: result-drop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    pointer-events: none;
  }

  @keyframes result-drop {
    0% { transform: translateX(-50%) translateY(-20px); opacity: 0; }
    100% { transform: translateX(-50%) translateY(0); opacity: 1; }
  }

  .result-badge.correct {
    background: rgba(40, 167, 69, 0.9);
    border: none;
  }

  .result-badge.incorrect {
    background: rgba(220, 53, 69, 0.9);
    border: none;
  }

  .result-label {
    font-size: 0.9rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #fff;
  }

  .result-points {
    font-size: 0.9rem;
    font-weight: 700;
    color: #fff;
  }

  /* ---- Jeopardy Board ---- */
  .board-wrapper { width: 100%; padding: 0.5rem 0; }

  .jeopardy-board { width: 100%; }

  .categories {
    display: grid;
    gap: 6px;
    margin-bottom: 6px;
  }

  .category-cell {
    background: linear-gradient(180deg, #1a1a6c 0%, #060ce9 100%);
    color: #fff;
    padding: 0.75rem 0.4rem;
    text-align: center;
    font-weight: 700;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-radius: 6px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .grid {
    display: grid;
    gap: 6px;
  }

  .tile {
    background: linear-gradient(180deg, #1a1a6c 0%, #060ce9 100%);
    color: #d4a843;
    font-size: 1.3rem;
    font-weight: 700;
    border: none;
    border-radius: 6px;
    min-height: 60px;
    cursor: pointer;
    transition: background 0.2s, transform 0.12s;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    font-family: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .tile:hover:not(:disabled) {
    background: linear-gradient(180deg, #2525a0 0%, #1a1aff 100%);
    transform: scale(1.04);
  }

  .tile:disabled { cursor: default; }

  .tile.revealed,
  .tile.answered {
    background: #0d0d1a;
    box-shadow: none;
    color: transparent;
  }

  .tile.revealed:hover,
  .tile.answered:hover {
    background: #0d0d1a;
    transform: none;
  }

  .tile-value { display: block; }

  .tile-dot {
    display: block;
    width: 6px;
    height: 6px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 50%;
  }

  @media (max-width: 640px) {
    .category-cell { font-size: 0.7rem; min-height: 36px; padding: 0.5rem 0.25rem; }
    .tile { font-size: 1rem; min-height: 44px; }
    .question-text { font-size: 1.2rem; }
    .buzz-btn { width: 110px; height: 110px; }
    .buzz-label { font-size: 1.1rem; }
  }
</style>
