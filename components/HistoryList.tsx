
import React, { useState, useEffect } from 'react';
import { HistoryItem } from '../types';
import { Calendar, CheckCircle, ChevronRight, FileText, Mic, Play, Loader2, CloudDownload, Database, AlertCircle, RefreshCw } from 'lucide-react';
import { downloadProjectBackup } from '../services/backupService';

interface Props {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onAnalyze: (item: HistoryItem) => void;
  onBack: () => void;
  processingId: string | null;
  processingProgress: number;
}

const HistoryList: React.FC<Props> = ({ history, onSelect, onAnalyze, onBack, processingId, processingProgress }) => {
  const [backingUpId, setBackingUpId] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    if (history.length > 0) {
      setDbStatus('online');
    } else {
      // Pequeno delay para simular checagem se o array vier vazio
      const timer = setTimeout(() => {
        setDbStatus(history.length === 0 ? 'online' : 'online'); // Supomos online se carregou componente
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [history]);

  // Group by Date
  const groupedHistory = history.reduce((acc, item) => {
    const date = new Date(item.timestamp).toLocaleDateString('pt-BR');
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {} as Record<string, HistoryItem[]>);

  const dates = Object.keys(groupedHistory).sort((a, b) => {
      const [da, ma, ya] = a.split('/').map(Number);
      const [db, mb, yb] = b.split('/').map(Number);
      return new Date(yb, mb-1, db).getTime() - new Date(ya, ma-1, da).getTime();
  });

  const handleBackup = async (item: HistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setBackingUpId(item.id);
    try {
        await downloadProjectBackup(item);
    } catch (e) {
        console.error(e);
        alert("Erro ao gerar backup do projeto.");
    } finally {
        setBackingUpId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto min-h-[60vh] pb-20">
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
        <div className="flex flex-col">
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <FileText className="text-lime-400" />
            Histórico de Briefings
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${history.length > 0 ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
              Conexão Supabase: {history.length > 0 ? 'Sincronizado' : 'Aguardando Dados'}
            </span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => window.location.reload()}
            className="p-2 text-slate-500 hover:text-lime-400 transition-colors border border-slate-700 rounded-lg"
            title="Recarregar"
          >
            <RefreshCw size={18} />
          </button>
          <button 
            onClick={onBack}
            className="text-slate-400 hover:text-white transition-colors px-4 py-2 border border-slate-700 rounded-lg text-sm"
          >
            Voltar ao Painel
          </button>
        </div>
      </div>

      {dates.length === 0 ? (
        <div className="text-center py-20 bg-slate-800/20 rounded-2xl border-2 border-dashed border-slate-800 flex flex-col items-center">
          <div className="p-4 bg-slate-800/50 rounded-full text-slate-600 mb-4">
            <Database size={48} />
          </div>
          <h3 className="text-white font-bold text-xl mb-2">Nenhum briefing encontrado</h3>
          <p className="text-slate-500 text-sm max-w-sm">
            Se você já enviou briefings e eles não aparecem, verifique se o projeto no Supabase está ativo ou se há bloqueios de rede (Adblock).
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 flex items-center gap-2 text-lime-400 font-bold hover:underline"
          >
            <RefreshCw size={16} /> Tentar Reconectar
          </button>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          {dates.map(date => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={16} className="text-lime-400" />
                <h3 className="text-slate-400 font-semibold text-sm uppercase tracking-wider">{date}</h3>
              </div>
              
              <div className="space-y-3">
                {groupedHistory[date].map(item => {
                  const audioCount = item.answers.filter(a => a.audioUrl !== null).length;
                  const isProcessing = processingId === item.id;
                  const isBackingUp = backingUpId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`
                        w-full glass-panel p-5 rounded-xl flex flex-col md:flex-row items-center justify-between transition-all border-l-4 relative overflow-hidden gap-4
                        ${isProcessing ? 'border-lime-400 bg-slate-800' : ''}
                        ${item.status === 'ANALYZED' 
                          ? 'hover:bg-slate-800/80 border-lime-400/30 shadow-lg shadow-lime-400/5' 
                          : 'bg-slate-800/40 border-slate-700'
                        }
                      `}
                    >
                      <div className="flex-1 min-w-0 z-10 w-full">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-white font-bold text-lg truncate">
                            {item.title || "Sem Título"}
                          </h4>
                          {item.status === 'ANALYZED' && (
                            <span className="bg-lime-400/10 text-lime-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-lime-400/20">
                              IA ANALISADO
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 text-slate-500 text-xs font-mono mb-2">
                          <span>{new Date(item.timestamp).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                          <span>•</span>
                          <span>{item.answers.length} Respostas</span>
                          {audioCount > 0 && (
                             <>
                               <span>•</span>
                               <span className="flex items-center gap-1 text-slate-400">
                                 <Mic size={10} /> {audioCount} Áudios
                               </span>
                             </>
                          )}
                        </div>

                        {isProcessing && (
                          <div className="w-full max-w-md mt-3">
                            <div className="flex justify-between text-xs font-bold text-lime-400 mb-1">
                                <span className="flex items-center gap-2">
                                  <Loader2 size={12} className="animate-spin"/>
                                  {processingProgress < 40 ? "Transcrevendo Áudios..." : processingProgress < 90 ? "Gerando Deep Research..." : "Finalizando..."}
                                </span>
                                <span>{processingProgress}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-lime-400 transition-all duration-500 ease-out shadow-[0_0_8px_rgba(163,230,53,0.5)]" 
                                style={{ width: `${processingProgress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 z-10 w-full md:w-auto justify-end">
                        <button
                          onClick={(e) => handleBackup(item, e)}
                          disabled={isBackingUp || isProcessing}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold transition-all disabled:opacity-50"
                          title="Download Backup ZIP"
                        >
                          {isBackingUp ? <Loader2 size={14} className="animate-spin" /> : <CloudDownload size={14} />}
                          <span className="hidden md:inline">ZIP</span>
                        </button>

                        {item.status === 'ANALYZED' ? (
                           <button 
                             onClick={() => onSelect(item)}
                             className="flex items-center gap-2 px-4 py-2 rounded-lg bg-lime-400/10 hover:bg-lime-400/20 text-lime-400 text-sm font-bold border border-lime-400/20 transition-all group"
                           >
                            <CheckCircle size={16} />
                            Relatório
                            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform"/>
                          </button>
                        ) : (
                          !isProcessing && (
                            <button
                               onClick={() => onAnalyze(item)}
                               className="flex items-center gap-2 px-4 py-2 rounded-lg bg-lime-400 hover:bg-lime-500 text-slate-900 text-sm font-bold shadow-[0_0_15px_rgba(163,230,53,0.3)] hover:shadow-[0_0_25px_rgba(163,230,53,0.5)] transition-all transform hover:-translate-y-0.5"
                            >
                              <Play size={16} fill="currentColor" />
                              Analisar
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryList;
