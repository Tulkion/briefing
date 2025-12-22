
import { GoogleGenAI, Type } from "@google/genai";
import { Answer, DeepResearchResult } from "../types";

// Helper to convert Blob to Base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error("Failed to convert blob to base64"));
      }
    };
    reader.readAsDataURL(blob);
  });
};

const urlToBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const blob = await response.blob();
  return blobToBase64(blob);
};

export const transcribeAudio = async (audioBlob: Blob | null, audioUrl?: string | null): Promise<string> => {
  if (!process.env.API_KEY) throw new Error("API Key missing");
  
  let base64Audio = "";
  let mimeType = "audio/webm";

  if (audioBlob && audioBlob.size > 0) {
    base64Audio = await blobToBase64(audioBlob);
    mimeType = audioBlob.type || 'audio/webm';
  } else if (audioUrl) {
    try {
      base64Audio = await urlToBase64(audioUrl);
      mimeType = 'audio/webm'; 
    } catch (e) {
      console.error("Erro ao converter URL de áudio para base64", e);
      return "";
    }
  } else {
    return "";
  }
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64Audio } },
        { text: "Transcreva este áudio exatamente como foi falado, em Português do Brasil. Não adicione comentários." }
      ]
    }
  });

  return response.text || "";
};

export const performDeepResearch = async (answers: Answer[]): Promise<DeepResearchResult> => {
  if (!process.env.API_KEY) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  let contextString = "Contexto do Fundador:\n\n";
  answers.forEach((a, index) => {
    contextString += `P${index + 1}: ${a.questionText}\n`;
    contextString += `R: ${a.transcription || a.textResponse}\n\n`;
  });

  const prompt = `
    Você é um Analista de Venture Capital e CTO Expert. Analise este SaaS e realize uma DEEP RESEARCH (via Google Search).
    
    INSTRUÇÕES CRÍTICAS DE IDIOMA:
    - RESPONDA ABSOLUTAMENTE TUDO EM PORTUGUÊS DO BRASIL.
    - O detailedReport DEVE SER EM PORTUGUÊS.
    
    INSTRUÇÕES CRÍTICAS PARA O JSON:
    1. suggestedName: Nome moderno e curto.
    2. insights: Gere exatamente 7 insights estratégicos em Português.
    3. vibeCodingPrompt: Este prompt deve ser um "Master System Instruction" completo em Português.
       - STACK: React (Vite), TS, Tailwind, Shadcn/UI, Lucide, Supabase (Auth/DB), React Query.
       - ARQUITETURA: Explique a estrutura de pastas /src.
    4. detailedReport: Um whitepaper Markdown longo (2500+ palavras) EM PORTUGUÊS DO BRASIL com dados reais e links de fontes.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { text: contextString },
        { text: prompt }
      ]
    },
    config: {
      tools: [{ googleSearch: {} }],
      thinkingConfig: { thinkingBudget: 32768 },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          suggestedName: { type: Type.STRING },
          viabilityScore: { type: Type.INTEGER },
          summary: { type: Type.STRING },
          marketResearch: { type: Type.STRING },
          financialAnalysis: { type: Type.STRING },
          competitorAnalysis: { type: Type.STRING },
          scaleAnalysis: { type: Type.STRING },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
          insights: { type: Type.ARRAY, items: { type: Type.STRING } },
          vibeCodingPrompt: { type: Type.STRING },
          detailedReport: { type: Type.STRING },
          presentationPrompt: { type: Type.STRING },
        },
        required: ["suggestedName", "viabilityScore", "summary", "marketResearch", "financialAnalysis", "competitorAnalysis", "scaleAnalysis", "strengths", "weaknesses", "insights", "vibeCodingPrompt", "detailedReport", "presentationPrompt"]
      }
    }
  });

  const parsed = JSON.parse(response.text || "{}") as DeepResearchResult;
  
  if (!parsed.insights || parsed.insights.length === 0) {
    parsed.insights = [
      "Growth Hack: Sistema de convites via WhatsApp com créditos para early adopters.",
      "Monetização: Freemium com limite de 3 projetos simultâneos.",
      "Tech: Caching agressivo de áudio para reduzir custos de processamento.",
      "Retenção: Notificações inteligentes sobre novos insights de mercado.",
      "Diferencial: Exportação direta de relatório para PDF formatado para investidores.",
      "Escala: Automação de infraestrutura via Terraform para escala global.",
      "Marketing: Focar em comunidades de founders no Twitter e LinkedIn."
    ];
  }

  return parsed;
};

export const generateTargetedReport = async (topic: string, contextSummary: string): Promise<string> => {
  if (!process.env.API_KEY) throw new Error("API Key missing");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Contexto do Projeto: ${contextSummary}
    
    TAREFA: Use o Google Search para uma DEEP SEARCH (Pesquisa Profunda) sobre o tema: "${topic}".
    
    ESTA PESQUISA DEVE SER ESCRITA TOTALMENTE EM PORTUGUÊS DO BRASIL.
    Busque dados técnicos, estatísticas de 2024/2025, barreiras de entrada e cases de sucesso.
    Retorne um documento Markdown longo (min 1500 palavras) com links de fontes confiáveis.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts: [{ text: prompt }] },
    config: {
      tools: [{ googleSearch: {} }],
      thinkingConfig: { thinkingBudget: 16000 },
    }
  });

  return response.text || "Erro ao gerar pesquisa profunda.";
};
