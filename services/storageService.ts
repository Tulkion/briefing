import { createClient } from '@supabase/supabase-js';
import { Answer, HistoryItem, StoredAnswer, DeepResearchResult } from "../types";

// Supabase Credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'your-anon-key'; 

const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = 'briefing-audio';

export const saveBriefing = async (answers: Answer[]): Promise<HistoryItem> => {
  const briefingId = Date.now().toString(); 
  
  // Derive title
  let title = "Ideia Sem Título";
  if (answers.length > 0) {
    if (answers[0].textResponse) {
      title = answers[0].textResponse.substring(0, 50) + (answers[0].textResponse.length > 50 ? "..." : "");
    } else {
      title = "Ideia gravada em áudio";
    }
  }

  // 1. Upload Audios to Bucket
  const storedAnswers: StoredAnswer[] = await Promise.all(
    answers.map(async (a) => {
      let publicUrl: string | null = null;

      if (a.audioBlob) {
        const fileName = `${briefingId}/${a.questionId}_${Date.now()}.webm`;
        try {
          const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, a.audioBlob, {
              contentType: a.audioBlob.type || 'audio/webm',
              upsert: true 
            });

          if (error) {
            console.error("Storage Error:", error);
          } else {
            const { data: publicData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
            publicUrl = publicData.publicUrl;
          }
        } catch (e) {
          console.error("Fetch Exception in Storage:", e);
        }
      }

      return {
        questionId: a.questionId,
        questionText: a.questionText,
        textResponse: a.textResponse || "",
        transcription: a.transcription,
        audioUrl: publicUrl || a.audioUrl || null,
        audioMimeType: a.audioBlob ? a.audioBlob.type : null,
      };
    })
  );

  // 2. Insert Briefing Parent
  const { error: briefingError } = await supabase
    .from('briefings')
    .insert({
      id: briefingId,
      title: title,
      status: 'PENDING',
      created_at: new Date().toISOString(),
      report: null
    });

  if (briefingError) {
    console.error("Briefing Insert Error:", briefingError);
    throw new Error(`Supabase Error: ${briefingError.message}`);
  }

  // 3. Insert Answers Children
  const answersRows = storedAnswers.map(sa => ({
    briefing_id: briefingId,
    question_id: sa.questionId,
    question_text: sa.questionText,
    text_response: sa.textResponse || "",
    transcription: sa.transcription || null,
    audio_url: sa.audioUrl || null,
    audio_mime_type: sa.audioMimeType || null
  }));

  const { error: answersError } = await supabase
    .from('answers')
    .insert(answersRows);

  if (answersError) {
    console.error("Answers Insert Error:", answersError);
    throw new Error(`Failed to insert answers: ${answersError.message}`);
  }

  return {
    id: briefingId,
    timestamp: Date.now(),
    answers: storedAnswers,
    status: 'PENDING',
    title
  };
};

export const getHistory = async (): Promise<HistoryItem[]> => {
  try {
    const { data: briefings, error: bError } = await supabase
      .from('briefings')
      .select('*')
      .order('created_at', { ascending: false });

    if (bError) {
      console.error("Database Fetch Error:", bError);
      return [];
    }

    if (!briefings || briefings.length === 0) return [];

    const { data: answers, error: aError } = await supabase
      .from('answers')
      .select('*');

    if (aError) {
       console.error("Answers Fetch Error:", aError);
       return [];
    }

    return briefings.map(b => {
      const briefingAnswers = (answers || [])
        .filter(a => a.briefing_id === b.id)
        .sort((a, b) => a.question_id - b.question_id)
        .map(a => ({
          questionId: a.question_id,
          questionText: a.question_text,
          textResponse: a.text_response,
          transcription: a.transcription,
          audioUrl: a.audio_url,
          audioMimeType: a.audio_mime_type
        }));

      return {
        id: b.id,
        timestamp: new Date(b.created_at).getTime(),
        title: b.title,
        status: b.status as 'PENDING' | 'ANALYZED',
        report: b.report,
        answers: briefingAnswers
      };
    });
  } catch (e: any) {
    // Captura o erro "Failed to fetch" comum em problemas de rede ou adblockers
    console.error("Supabase Connection Failed:", e);
    if (e?.message?.includes('fetch')) {
      console.warn("Dica: Verifique se algum adblocker está bloqueando o domínio do Supabase ou sua conexão de rede.");
    }
    return [];
  }
};

export const updateBriefingReport = async (
  id: string, 
  result: DeepResearchResult, 
  updatedAnswers: Answer[]
): Promise<void> => {
  const { error: bError } = await supabase
    .from('briefings')
    .update({
      report: result,
      status: 'ANALYZED',
      title: result.suggestedName || undefined
    })
    .eq('id', id);

  if (bError) throw bError;

  for (const ans of updatedAnswers) {
    if (ans.transcription) {
      await supabase
        .from('answers')
        .update({ transcription: ans.transcription })
        .eq('briefing_id', id)
        .eq('question_id', ans.questionId);
    }
  }
};

export const rehydrateAnswers = async (stored: StoredAnswer[]): Promise<Answer[]> => {
  return stored.map(s => ({
    questionId: s.questionId,
    questionText: s.questionText,
    textResponse: s.textResponse,
    transcription: s.transcription,
    audioBlob: null,
    audioUrl: s.audioUrl
  }));
};