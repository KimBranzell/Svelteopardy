<script lang="ts">
  import { socket, connected } from '$lib/stores/gameStore';

  let categories = ['Category 1', 'Category 2', 'Category 3', 'Category 4', 'Category 5', 'Category 6'];
  let values = [200, 400, 600, 800, 1000];
</script>

<main class="container">
  <h1>Jeopardy Game Board</h1>

  {#if $connected}
      <div class="game-board">
          <div class="categories">
              {#each categories as category}
                  <div class="category">{category}</div>
              {/each}
          </div>
          {#each values as value}
              <div class="row">
                  {#each categories as category}
                      <div class="cell">${value}</div>
                  {/each}
              </div>
          {/each}
      </div>
  {:else}
      <p>Connecting to server...</p>
  {/if}
</main>

<style>
  .container {
      padding: 2rem;
  }

  .game-board {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-top: 2rem;
  }

  .categories {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 0.5rem;
  }

  .category {
      background: #060ce9;
      color: white;
      padding: 1rem;
      text-align: center;
      font-weight: bold;
  }

  .row {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 0.5rem;
  }

  .cell {
      background: #060ce9;
      color: white;
      padding: 2rem;
      text-align: center;
      font-weight: bold;
      cursor: pointer;
  }

  .cell:hover {
      background: #0509b8;
  }
</style>
