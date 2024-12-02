<script>
  import { goto } from '$app/navigation';
</script>

<main class="container">
  <h1>Jeopardy Game</h1>

  <div class="button-group">
    <button on:click={() => goto('/host')}>
      Host a Game
    </button>

    <button on:click={() => goto('/play')}>
      Join as Player
    </button>

    <button on:click={() => goto('/audience')}>
      View as Audience
    </button>
  </div>
</main>

<style>
  .container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    gap: 2rem;
  }

  .button-group {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  button {
    padding: 1rem 2rem;
    font-size: 1.2rem;
    cursor: pointer;
    border: none;
    border-radius: 8px;
    background: #007bff;
    color: white;
    transition: background 0.2s;
  }

  button:hover {
    background: #0056b3;
  }
</style>
