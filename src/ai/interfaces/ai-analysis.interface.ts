export interface IMatchAnalysis {
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestion: string;
}

export interface IGeminiMatchResponse extends IMatchAnalysis {}
