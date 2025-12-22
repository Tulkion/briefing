import JSZip from 'jszip';
import { rehydrateAnswers } from './storageService';
import { HistoryItem } from '../types';

export const generateProjectBackupZip = async (item: HistoryItem): Promise<Blob> => {
  const zip = new JSZip();
  
  const dateStr = new Date(item.timestamp).toISOString().split('T')[0];
  const safeTitle = (item.title || "Projeto").replace(/[^a-z0-9]/gi, '_').substring(0, 40);
  // Create a root folder for the project
  const rootFolder = zip.folder(`${dateStr}_${safeTitle}`);

  if (!rootFolder) throw new Error("Failed to create zip folder");

  // 1. Add Text Report
  let reportContent = `PROJETO: ${item.title}\n`;
  reportContent += `DATA: ${new Date(item.timestamp).toLocaleString()}\n`;
  reportContent += `STATUS: ${item.status}\n\n`;
  
  if (item.report) {
      reportContent += `--- ANÁLISE IA ---\n`;
      reportContent += `Resumo: ${item.report.summary}\n`;
      reportContent += `Score: ${item.report.viabilityScore}\n`;
      reportContent += `\n--- PROMPT VIBE CODING ---\n${item.report.vibeCodingPrompt}\n`;
  }

  reportContent += `\n--- RESPOSTAS E TRANSCRIÇÕES ---\n`;
  
  // Rehydrate to get blobs or URLs
  const answers = await rehydrateAnswers(item.answers);

  // Use for...of loop to handle async await correctly inside loop
  for (let i = 0; i < answers.length; i++) {
      const ans = answers[i];
      const index = i;

      reportContent += `\nPERGUNTA ${index + 1}: ${ans.questionText}\n`;
      reportContent += `RESPOSTA: ${ans.textResponse || "(Áudio)"}\n`;
      if (ans.transcription) {
          reportContent += `TRANSCRIÇÃO: ${ans.transcription}\n`;
      }

      // 2. Add Audio Files
      if (ans.audioBlob) {
          const filename = `audio_q${index + 1}.webm`;
          rootFolder.file(filename, ans.audioBlob);
          reportContent += `[Arquivo de áudio anexo: ${filename}]\n`;
      } else if (ans.audioUrl) {
          // Fetch remote audio for backup
          try {
              const response = await fetch(ans.audioUrl);
              if (response.ok) {
                  const blob = await response.blob();
                  const filename = `audio_q${index + 1}.webm`;
                  rootFolder.file(filename, blob);
                  reportContent += `[Arquivo de áudio anexo: ${filename}]\n`;
              } else {
                  reportContent += `[Erro ao baixar áudio: ${ans.audioUrl} - Status: ${response.status}]\n`;
              }
          } catch (e) {
              console.error("Failed to download audio for backup", e);
              reportContent += `[Erro de conexão ao baixar áudio: ${ans.audioUrl}]\n`;
          }
      }
  }

  rootFolder.file("relatorio_projeto.txt", reportContent);

  // Generate ZIP blob
  return await zip.generateAsync({ type: "blob" });
};

export const downloadProjectBackup = async (item: HistoryItem) => {
    const blob = await generateProjectBackupZip(item);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = (item.title || "Projeto").replace(/[^a-z0-9]/gi, '_').substring(0, 30);
    a.download = `Backup_${safeTitle}_${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};