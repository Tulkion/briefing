
import React, { useState } from 'react';
import { DeepResearchResult, Answer } from '../types';
import { Download, Copy, TrendingUp, AlertTriangle, Lightbulb, Activity, Check, Search, Loader2, FileText, ArrowDownToLine } from 'lucide-react';
import jsPDF from 'jspdf';
import { generateTargetedReport } from '../services/geminiService';
import {
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';

interface Props {
  result: DeepResearchResult;
  transcripts: Answer[];
}

const AnalysisReport: React.FC<Props> = ({ result, transcripts }) => {
  const [loadingSection, setLoadingSection] = useState<string | null>(null);
  const [searchProgress, setSearchProgress] = useState(0);
  const [readyReports, setReadyReports] = useState<Record<string, string>>({});

  const downloadPDF = (content?: string, titleOverride?: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxLineWidth = pageWidth - (margin * 2);
    let yPos = 20;

    // Cores do Tema (Baseadas no seu Print)
    const colorBg = [15, 23, 42]; // #0f172a (Azul Marinho Escuro)
    const colorLime = [163, 230, 53]; // #a3e635 (Lima Brilhante)
    const colorWhite = [255, 255, 255]; // Branco

    const applyThemeBackground = () => {
      doc.setFillColor(colorBg[0], colorBg[1], colorBg[2]);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
    };

    const checkPageBreak = (heightNeeded: number) => {
      if (yPos + heightNeeded > pageHeight - margin) {
        doc.addPage();
        applyThemeBackground();
        yPos = margin;
        return true;
      }
      return false;
    };

    // --- CAPA E TODAS AS PÁGINAS ---
    applyThemeBackground();
    
    if (!titleOverride) {
      // Título da Capa
      doc.setTextColor(colorLime[0], colorLime[1], colorLime[2]);
      doc.setFontSize(32);
      doc.setFont("helvetica", "bold");
      doc.text("ESTUDO DE VIABILIDADE", margin, 60);
      
      doc.setFontSize(22);
      doc.setTextColor(colorWhite[0], colorWhite[1], colorWhite[2]);
      doc.text(result.suggestedName?.toUpperCase() || "CHEQFLOW", margin, 75);
      
      doc.setFontSize(10);
      doc.setTextColor(colorLime[0], colorLime[1], colorLime[2]);
      doc.text(`GERADO EM: ${new Date().toLocaleDateString('pt-BR')}`, margin, 90);
      
      doc.addPage();
      applyThemeBackground();
      yPos = margin;
    } else {
      doc.setTextColor(colorLime[0], colorLime[1], colorLime[2]);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text(titleOverride.toUpperCase(), margin, yPos);
      yPos += 15;
    }

    const textToParse = content || result.detailedReport || "Conteúdo não disponível.";
    const lines = textToParse.split('\n');

    lines.forEach((line) => {
      const cleanLine = line.trim();
      if (!cleanLine) { yPos += 5; return; }

      if (cleanLine.startsWith('# ')) {
        yPos += 10;
        checkPageBreak(25);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(colorLime[0], colorLime[1], colorLime[2]); // Título em Lima
        doc.text(cleanLine.replace('# ', '').toUpperCase(), margin, yPos);
        yPos += 10;
      } else if (cleanLine.startsWith('## ')) {
        yPos += 5;
        checkPageBreak(20);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(colorLime[0], colorLime[1], colorLime[2]); // Subtítulo em Lima
        doc.text(cleanLine.replace('## ', ''), margin, yPos);
        yPos += 8;
      } else {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(colorWhite[0], colorWhite[1], colorWhite[2]); // Texto em Branco
        const wrappedLines = doc.splitTextToSize(cleanLine.replace(/\*\*/g, ''), maxLineWidth);
        checkPageBreak(wrappedLines.length * 6 + 5);
        doc.text(wrappedLines, margin, yPos);
        yPos += (wrappedLines.length * 6);
      }
    });

    const filename = titleOverride ? `DeepSearch_${titleOverride.replace(/\s+/g, '_')}.pdf` : `Relatorio_${result.suggestedName || 'CheqFlow'}.pdf`;
    doc.save(filename);
  };

  const handleDeepSearch = async (topic: string) => {
    setLoadingSection(topic);
    setSearchProgress(5);
    
    const interval = setInterval(() => {
      setSearchProgress(p => p < 92 ? p + Math.random() * 2 : p);
    }, 700);

    try {
      const reportText = await generateTargetedReport(topic, result.summary);
      clearInterval(interval);
      setSearchProgress(100);
      setReadyReports(prev => ({ ...prev, [topic]: reportText }));
      setLoadingSection(null);
    } catch (e) {
      clearInterval(interval);
      alert("Erro na Deep Search. Verifique sua conexão.");
      setLoadingSection(null);
    }
  };

  const renderDeepSearchAction = (topic: string, label: string, colorClass: string, bgClass: string) => {
    const isReady = !!readyReports[topic];
    const isLoading = loadingSection === topic;

    if (isLoading) {
      return (
        <div className="w-full space-y-2 animate-in fade-in">
          <div className="flex justify-between text-[10px] text-lime-400 font-mono font-bold uppercase tracking-wider">
            <span className="flex items-center gap-2"><Loader2 size={10} className="animate-spin"/> PESQUISANDO...</span>
            <span>{Math.floor(searchProgress)}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div className="h-full bg-lime-400 transition-all duration-500 shadow-[0_0_10px_rgba(163,230,53,0.3)]" style={{ width: `${searchProgress}%` }}></div>
          </div>
        </div>
      );
    }

    if (isReady) {
      return (
        <button 
          onClick={() => downloadPDF(readyReports[topic], `Deep Search: ${topic}`)}
          className="w-full py-3 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all border border-green-500/40 animate-in zoom-in-95"
        >
          <ArrowDownToLine size={18} />
          RELATÓRIO PRONTO (BAIXAR)
        </button>
      );
    }

    return (
      <button 
        onClick={() => handleDeepSearch(topic)}
        className={`w-full py-3 ${bgClass} ${colorClass} text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all border border-transparent hover:scale-[1.02] active:scale-95`}
      >
        <Search size={16} />
        {label}
      </button>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">{result.suggestedName || "Análise Completa"}</h1>
          <p className="text-slate-400">Deep Search AI & Validação Estratégica</p>
        </div>
        <button 
          onClick={() => downloadPDF()}
          className="flex items-center gap-2 bg-lime-400 hover:bg-lime-500 text-slate-900 px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-lime-400/20"
        >
          <Download size={18} />
          Baixar Estudo Completo (PDF)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center relative">
          <h3 className="text-slate-500 uppercase text-[10px] font-bold tracking-widest absolute top-6 left-6">Viabilidade</h3>
          <div className="w-40 h-40 relative">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie data={[{value: result.viabilityScore}, {value: 100 - result.viabilityScore}]} cx="50%" cy="50%" innerRadius={55} outerRadius={75} startAngle={90} endAngle={-270} dataKey="value" stroke="none">
                   <Cell fill="#a3e635" /><Cell fill="#1e293b" />
                 </Pie>
               </PieChart>
             </ResponsiveContainer>
             <div className="absolute inset-0 flex items-center justify-center flex-col">
               <span className="text-4xl font-bold text-white">{result.viabilityScore}</span>
               <span className="text-[10px] text-lime-400 font-bold">%</span>
             </div>
          </div>
        </div>

        <div className="glass-panel p-8 rounded-2xl col-span-1 md:col-span-2 flex flex-col justify-center border-l-4 border-lime-400">
          <h3 className="text-lime-400 uppercase text-[10px] font-bold tracking-widest mb-3">Resumo Executivo</h3>
          <p className="text-base text-slate-300 leading-relaxed italic">
            "{result.summary}"
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-8 rounded-2xl flex flex-col h-full bg-gradient-to-br from-slate-800/40 to-blue-900/10 border-l-2 border-blue-500/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><TrendingUp size={24} /></div>
            <h3 className="text-xl font-bold text-white">Mercado & Finanças</h3>
          </div>
          <div className="space-y-4 flex-grow mb-8">
             <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-line">{result.marketResearch}</p>
             <div className="h-px bg-slate-700 w-full opacity-30" />
             <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-line">{result.financialAnalysis}</p>
          </div>
          {renderDeepSearchAction("Mercado e Finanças", "Deep Search: Mercado", "text-blue-300", "bg-blue-600/20 hover:bg-blue-600/30")}
        </div>

        <div className="glass-panel p-8 rounded-2xl flex flex-col h-full bg-gradient-to-br from-slate-800/40 to-purple-900/10 border-l-2 border-purple-500/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400"><Activity size={24} /></div>
            <h3 className="text-xl font-bold text-white">Competição & Escala</h3>
          </div>
           <div className="space-y-4 flex-grow mb-8">
             <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-line">{result.competitorAnalysis}</p>
             <div className="h-px bg-slate-700 w-full opacity-30" />
             <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-line">{result.scaleAnalysis}</p>
          </div>
          {renderDeepSearchAction("Competição e Escala", "Deep Search: Competição", "text-purple-300", "bg-purple-600/20 hover:bg-purple-600/30")}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl border-t-2 border-green-500/30">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider"><Check size={16} className="text-green-500"/> Pontos Fortes</h3>
          <ul className="space-y-3">
            {(result.strengths || []).map((s, i) => (
              <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                <div className="mt-1 w-1 h-1 rounded-full bg-green-500 flex-shrink-0" /> {s}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="glass-panel p-6 rounded-2xl border-t-2 border-red-500/30">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider"><AlertTriangle size={16} className="text-red-500"/> Riscos</h3>
          <ul className="space-y-3">
            {(result.weaknesses || []).map((w, i) => (
              <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                <div className="mt-1 w-1 h-1 rounded-full bg-red-500 flex-shrink-0" /> {w}
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-panel p-6 rounded-2xl border-t-2 border-yellow-500/30">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider"><Lightbulb size={16} className="text-yellow-500"/> Insights IA</h3>
          <ul className="space-y-3">
            {(result.insights || []).map((insight, i) => (
              <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                <div className="mt-1 w-1 h-1 rounded-full bg-yellow-500 flex-shrink-0" /> {insight}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="glass-panel p-8 rounded-2xl border border-lime-500/20 relative overflow-hidden group">
        <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
           <FileText size={200} />
        </div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-white">Prompt Master: Vibe Coding</h3>
            <p className="text-slate-500 text-xs">Otimizado para Cursor (Composer) e Windsurf.</p>
          </div>
          <button 
            onClick={() => { navigator.clipboard.writeText(result.vibeCodingPrompt); alert("Copiado!"); }} 
            className="bg-lime-400 hover:bg-lime-500 text-slate-900 px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 shadow-lg shadow-lime-400/20 active:scale-95"
          >
            <Copy size={14} /> COPIAR PROMPT MASTER
          </button>
        </div>
        <div className="bg-slate-950/80 rounded-xl p-6 border border-slate-800">
          <pre className="text-slate-400 text-[11px] font-mono whitespace-pre-wrap max-h-80 overflow-y-auto custom-scrollbar leading-relaxed">
            {result.vibeCodingPrompt}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default AnalysisReport;
