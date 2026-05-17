import { sampleGameBoard as rawSample } from './gameBoard.js';

export interface Question {
    text?: string;
    question?: string;
    answer: string;
    pointValue?: number;
    value?: number;
    revealed?: boolean;
    answered: boolean;
}

export interface Category {
  name: string;
  questions: Question[];
}

export interface GameBoard {
  categories: Category[];
}

export interface CurrentQuestion {
    categoryIndex: number;
    questionIndex: number;
    text?: string;
    question?: string;
    answer: string;
    pointValue?: number;
    value?: number;
    categoryName?: string;
}

export const sampleGameBoard: GameBoard = rawSample as GameBoard;
