export interface Question {
  id: number;
  text: string;
  helperText: string;
  type: 'audio-text' | 'boolean' | 'multi-select';
  options?: string[]; // Para perguntas de seleção
}

export interface Answer {
  questionId: number;
  questionText: string;
  audioBlob: Blob | null;
  audioUrl?: string | null; // URL from cloud storage
  textResponse: string;
  transcription?: string; // Populated after AI processing
}

// For DB persistence
export interface StoredAnswer {
  questionId: number;
  questionText: string;
  audioUrl: string | null;
  audioMimeType: string | null;
  textResponse: string;
  transcription?: string;
}

export interface DeepResearchResult {
  suggestedName: string; // New field for the project name
  viabilityScore: number;
  summary: string;
  marketResearch: string;
  financialAnalysis: string;
  competitorAnalysis: string;
  scaleAnalysis: string;
  strengths: string[];
  weaknesses: string[];
  insights: string[];
  vibeCodingPrompt: string;
  detailedReport: string;
  presentationPrompt: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  answers: StoredAnswer[];
  report?: DeepResearchResult;
  status: 'PENDING' | 'ANALYZED';
  title: string; // Derived from the first answer or AI suggestion
}

export enum AppState {
  LANDING = 'LANDING',
  FORM = 'FORM',
  SUBMITTED = 'SUBMITTED',
  HISTORY = 'HISTORY', // New state for history list
  ANALYZING = 'ANALYZING',
  REPORT = 'REPORT',
}

export const QUESTIONS: Question[] = [
  {
    id: 1,
    text: "Qual é a sua ideia de projeto?",
    helperText: "Descreva a funcionalidade principal em algumas frases. O que o projeto faz?",
    type: 'audio-text'
  },
  {
    id: 2,
    text: "Como você chegou nessa ideia?",
    helperText: "Foi uma necessidade pessoal? Uma oportunidade de mercado que você percebeu?",
    type: 'audio-text'
  },
  {
    id: 3,
    text: "Onde você pretende chegar com essa ideia?",
    helperText: "Qual é o seu objetivo principal ou visão de futuro para este projeto?",
    type: 'audio-text'
  },
  {
    id: 4,
    text: "Você já tem algum estudo ou validação sobre isso?",
    helperText: "Selecione a opção que melhor se aplica ao estágio atual.",
    type: 'boolean',
    options: ["Sim, já tenho validação/estudo", "Não, ainda é apenas uma ideia"]
  },
  {
    id: 5,
    text: "Será um Web App, Site ou Aplicativo Mobile?",
    helperText: "Selecione todas as plataformas que você imagina (pode marcar mais de uma).",
    type: 'multi-select',
    options: ["Web App (SaaS)", "Site Institucional", "Aplicativo Mobile"]
  },
  {
    id: 6,
    text: "Qual seria o tema ou estilo visual?",
    helperText: "Corporativo, divertido, minimalista, modo escuro? Como você visualiza o design?",
    type: 'audio-text'
  },
  {
    id: 7,
    text: "Existem aplicativos parecidos ou concorrentes?",
    helperText: "Existe algo no mercado que se assemelhe ao que você quer construir?",
    type: 'audio-text'
  }
];