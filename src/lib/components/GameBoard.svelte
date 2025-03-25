<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import type { GameBoard, Question, CurrentQuestion } from '$lib/data/gameBoard';

  export let gameBoard: GameBoard | null = null;
  export let onSelectQuestion: (categoryIndex: number, questionIndex: number) => void;
  export let currentQuestion: CurrentQuestion | null = null;
  export let onMarkAnswered: (categoryIndex: number, questionIndex: number) => void;
  export let isHost: boolean = false;

  let showAnswer = false;

  // Add logging
  $: {
    console.log('GameBoard component received data:', {
      hasGameBoard: !!gameBoard,
      categoriesCount: gameBoard?.categories?.length || 0,
      currentQuestion: currentQuestion
    });
  }

  function toggleAnswer() {
      showAnswer = !showAnswer;
  }
</script>

{#if currentQuestion}
    <div class="question-display" transition:fade>
        <div class="question-value">${currentQuestion.pointValue}</div>
        <div class="question-text">{currentQuestion.text}</div>

        {#if isHost}
            <button class="toggle-answer" on:click={toggleAnswer}>
                {showAnswer ? 'Hide Answer' : 'Show Answer'}
            </button>

            {#if showAnswer}
                <div class="answer" transition:fly={{ y: 20 }}>
                    Answer: {currentQuestion.answer}
                </div>
            {/if}

            <button class="return-button" on:click={() => {
                showAnswer = false;
                onMarkAnswered(currentQuestion.categoryIndex, currentQuestion.questionIndex);
            }}>
                Return to Board
            </button>
        {/if}
    </div>
    {:else if gameBoard && gameBoard.categories && gameBoard.categories.length > 0}
    <div class="game-board">
        <div class="categories">
            {#each gameBoard.categories as category, categoryIndex}
                <div class="category-header">{category.name}</div>
            {/each}
        </div>

        <div class="questions-grid">
            {#each Array(5) as _, questionIndex}
                {#each gameBoard.categories as category, categoryIndex}
                    {@const question = category.questions && category.questions[questionIndex] ? category.questions[questionIndex] : null}
                    {#if question}
                        <button
                            class="question-tile"
                            class:revealed={question.revealed}
                            class:answered={question.answered}
                            disabled={!isHost || question.revealed || question.answered}
                            on:click={() => onSelectQuestion(categoryIndex, questionIndex)}>
                            {question.revealed || question.answered ? '' : `$${question.pointValue || question.value || 0}`}
                        </button>
                    {:else}
                        <div class="question-tile empty">?</div>
                    {/if}
                {/each}
            {/each}
        </div>
    </div>
{:else}
    <div class="loading">
        <p>Loading game board...</p>
        <p class="debug-info">Board data: {gameBoard ? 'Exists' : 'Missing'}</p>
    </div>
{/if}

<style>

  .loading {
    padding: 20px;
    text-align: center;
    background-color: #f0f0f0;
    border-radius: 5px;
    margin-bottom: 20px;
  }
  .game-board {
      display: flex;
      flex-direction: column;
      width: 100%;
      margin-bottom: 20px;
  }

  .categories {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 10px;
      margin-bottom: 10px;
  }

  .category-header {
      background-color: #0077cc;
      color: white;
      padding: 15px 10px;
      text-align: center;
      font-weight: bold;
      border-radius: 5px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
  }

  .questions-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      grid-template-rows: repeat(5, 1fr);
      gap: 10px;
  }

  .question-tile {
      background-color: #0077cc;
      color: white;
      font-size: 1.5rem;
      font-weight: bold;
      height: 80px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      transition: background-color 0.2s;
  }

  .question-tile:hover:not(:disabled) {
      background-color: #005fa3;
  }

  .question-tile.revealed, .question-tile.answered {
      background-color: #333;
      cursor: not-allowed;
  }

  .question-display {
      background-color: #0077cc;
      color: white;
      padding: 30px;
      border-radius: 5px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
  }

  .question-value {
      font-size: 2rem;
      font-weight: bold;
      margin-bottom: 20px;
  }

  .question-text {
      font-size: 1.5rem;
      margin-bottom: 30px;
  }

  .toggle-answer {
      background-color: #fff;
      color: #0077cc;
      border: none;
      padding: 10px 20px;
      border-radius: 5px;
      cursor: pointer;
      margin-bottom: 20px;
  }

  .answer {
      font-size: 1.5rem;
      font-weight: bold;
      margin: 20px 0;
      padding: 15px;
      background-color: rgba(255, 255, 255, 0.2);
      border-radius: 5px;
      width: 100%;
  }

  .return-button {
      background-color: #f44336;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 5px;
      cursor: pointer;
      margin-top: 20px;
  }
</style>