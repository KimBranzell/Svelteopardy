<script>
  import { goto } from '$app/navigation';
</script>

<main class="landing">
  <div class="hero">
    <h1 class="title">Jeopardy!</h1>
    <p class="tagline">Multiplayer trivia game</p>
  </div>

  <div class="cards">
    <button class="role-card host" on:click={() => goto('/host')}>
      <span class="role-icon">&#x1F3E0;</span>
      <span class="role-label">Host a Game</span>
      <span class="role-desc">Manage the board and scores</span>
    </button>

    <button class="role-card play" on:click={() => goto('/play')}>
      <span class="role-icon">&#x1F514;</span>
      <span class="role-label">Join as Player</span>
      <span class="role-desc">Buzz in and answer questions</span>
    </button>

    <button class="role-card audience" on:click={() => goto('/audience')}>
      <span class="role-icon">&#x1F3AC;</span>
      <span class="role-label">View as Audience</span>
      <span class="role-desc">Watch the game live</span>
    </button>
  </div>
</main>

<style>
  *, *::before, *::after { box-sizing: border-box; }

  .landing {
    min-height: 100vh;
    background: radial-gradient(ellipse at 50% 0%, #0f1450 0%, #070a2e 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3rem;
    padding: 2rem;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .hero {
    text-align: center;
  }

  .title {
    font-size: 5rem;
    color: #d4a843;
    letter-spacing: 0.08em;
    margin: 0;
    text-shadow: 0 2px 20px rgba(212, 168, 67, 0.15);
  }

  .tagline {
    color: #8892b0;
    font-size: 1.1rem;
    margin: 0.5rem 0 0;
    letter-spacing: 0.05em;
  }

  .cards {
    display: flex;
    gap: 1.25rem;
  }

  .role-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 2rem 1.5rem;
    min-width: 180px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    cursor: pointer;
    transition: transform 0.2s, background 0.2s, border-color 0.2s;
    font-family: inherit;
    color: #fff;
  }

  .role-card:hover {
    transform: translateY(-4px);
    background: rgba(255, 255, 255, 0.08);
  }

  .role-card.host:hover { border-color: #d4a843; }
  .role-card.play:hover { border-color: #28a745; }
  .role-card.audience:hover { border-color: #4a90d9; }

  .role-icon {
    font-size: 2rem;
    line-height: 1;
  }

  .role-label {
    font-size: 1.1rem;
    font-weight: 600;
    margin-top: 0.25rem;
  }

  .role-desc {
    font-size: 0.8rem;
    color: #8892b0;
  }
</style>
