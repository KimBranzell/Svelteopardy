const ADJECTIVES = ['Red', 'Blue', 'Happy', 'Swift', 'Brave', 'Wise'];
const NOUNS = ['Lion', 'Tiger', 'Eagle', 'Dragon', 'Wolf', 'Bear'];

export function generateGameId() {
    const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const number = Math.floor(Math.random() * 100);

    return `${adjective}${noun}${number}`;
}