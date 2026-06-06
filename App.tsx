
import React, { useState, useEffect } from 'react';
import { AppState, Answer, DeepResearchResult, HistoryItem } from './types';
import QuestionForm from './components/QuestionForm';
import AnalysisReport from './components/AnalysisReport';
import HistoryList from './components/HistoryList';
import { transcribeAudio, performDeepResearch } from './services/geminiService';
import { saveBriefing, getHistory, rehydrateAnswers, updateBriefingReport } from './services/storageService';
import { Sparkles, Activity, Mic, CheckCircle, Lock, Unlock, FileText, X, AlertCircle, Share2 } from 'lucide-react';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";

const App: React.FC = () => {
  const [view, setView] = useState<AppState>(AppState.LANDING);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [report, setReport] = useState<DeepResearchResult | null>(null);
  
  // History State
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState<number>(0);

  // Admin Auth State
  const [passwordInput, setPasswordInput] = useState("");
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  useEffect(() => {
    // Check for direct form access via URL param
    const params = new URLSearchParams(window.location.search);
    if (params.get('start') === 'true') {
      setView(AppState.FORM);
    }

    if (!process.env.API_KEY) {
      console.warn("API_KEY não encontrada. Certifique-se de configurar a variável de ambiente na Vercel.");
    }
  }, []);

  const startApp = () => {
    if (!process.env.API_KEY) {
      alert("A chave de API (process.env.API_KEY) não foi detectada. Se você estiver na Vercel, adicione-a nas configurações do projeto.");
      return;
    }
    setView(AppState.FORM);
  };

  const handleFormComplete = async (completedAnswers: Answer[]) => {
    try {
      const savedItem = await saveBriefing(completedAnswers);
      setCurrentHistoryId(savedItem.id); 
      setAnswers(completedAnswers);
      setView(AppState.SUBMITTED);
    } catch (e: any) {
      console.error("Failed to save history", e);
      alert(`Erro ao salvar os dados: ${e.message || "Erro de conexão"}.`);
      setAnswers(completedAnswers);
      setView(AppState.SUBMITTED);
    }
  };

  const handleOpenHistory = async () => {
    const list = await getHistory(); 
    setHistoryList(list);
    setView(AppState.HISTORY);
  };

  const handleAdminUnlock = () => {
    if (passwordInput !== ADMIN_PASSWORD) {
      setAuthError(true);
      return;
    }
    setPasswordInput("");
    setShowAdminLogin(false);
    setIsAdminUnlocked(true);
    handleOpenHistory();
  };

  const startAnalysis = async (item: HistoryItem) => {
    setProcessingId(item.id);
    setProcessingProgress(5);
    
    try {
      const answersToAnalyze = await rehydrateAnswers(item.answers);
      setProcessingProgress(10); 

      const transcribedAnswers = await Promise.all(
        answersToAnalyze.map(async (ans, idx, arr) => {
          const progressPerItem = 40 / arr.length;
          if ((ans.audioBlob || ans.audioUrl) && !ans.transcription) {
             try {
               const transcription = await transcribeAudio(ans.audioBlob, ans.audioUrl);
               setProcessingProgress(prev => Math.min(prev + progressPerItem, 50));
               return { ...ans, transcription };
             } catch (err) {
               console.error(`Erro ao transcrever pergunta ${ans.questionId}`, err);
               return { ...ans, transcription: "[Erro na transcrição]" };
             }
          }
          return ans;
        })
      );
      
      setAnswers(transcribedAnswers); 
      setProcessingProgress(50); 

      const deepResearchPromise = performDeepResearch(transcribedAnswers);
      const timer = setInterval(() => {
        setProcessingProgress(prev => (prev >= 90 ? prev : prev + 1));
      }, 800);

      const deepResult = await deepResearchPromise;
      clearInterval(timer);
      setProcessingProgress(95);
      
      await updateBriefingReport(item.id, deepResult, transcribedAnswers);
      setProcessingProgress(100);
      
      const updatedList = await getHistory();
      setHistoryList(updatedList);
      
      setTimeout(() => {
          setReport(deepResult);
          setView(AppState.REPORT);
          setProcessingId(null);
          setProcessingProgress(0);
      }, 800);

    } catch (error) {
      console.error(error);
      alert("Erro no processamento da IA.");
      setProcessingId(null);
      setProcessingProgress(0);
      handleOpenHistory(); 
    }
  };

  const handleHistorySelect = async (item: HistoryItem) => {
    if (item.status === 'PENDING') return; 
    const hydratedAnswers = await rehydrateAnswers(item.answers);
    setAnswers(hydratedAnswers);
    setCurrentHistoryId(item.id);
    if (item.status === 'ANALYZED' && item.report) {
      setReport(item.report);
      setView(AppState.REPORT);
    }
  };

  const copyShareLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('start', 'true');
    navigator.clipboard.writeText(url.toString());
    alert("Link do formulário copiado! Agora você pode enviar para quem deve preenchê-lo.");
  };

  return (
    <div className="min-h-screen bg-slate-900 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] selection:bg-lime-400 selection:text-slate-900">
      
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-lime-500/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 p-4 md:p-8">
        
        <nav className="flex items-center justify-between max-w-7xl mx-auto mb-12 relative z-20">
          <div className="flex items-center gap-3">
             <button 
                onClick={() => setView(AppState.LANDING)}
                className="flex items-center space-x-2 text-white font-bold text-2xl tracking-tighter hover:opacity-80 transition-opacity"
              >
                <div className="bg-lime-400 p-1.5 rounded-lg text-slate-900">
                  <Activity size={24} />
                </div>
                <span>BRIEFING DE IDEIAS</span>
              </button>
              
              <button 
                onClick={() => setShowAdminLogin(true)}
                className="text-slate-600 hover:text-lime-400 transition-colors p-2"
                title="Acesso Administrativo"
              >
                <Lock size={16} />
              </button>
          </div>
          
          <div className="flex gap-4">
             {view === AppState.LANDING && (
                <button 
                  onClick={copyShareLink}
                  className="text-slate-300 hover:text-lime-400 text-sm font-semibold flex items-center gap-2 transition-colors bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700"
                >
                  <Share2 size={18} />
                  <span className="hidden md:inline">Compartilhar Link</span>
                </button>
             )}

             {isAdminUnlocked && view !== AppState.HISTORY && view !== AppState.FORM && (
                 <button 
                   onClick={handleOpenHistory}
                   className="text-slate-300 hover:text-lime-400 text-sm font-semibold flex items-center gap-2 transition-colors bg-slate-800 px-4 py-2 rounded-lg border border-slate-700"
                 >
                   <FileText size={18} />
                   Voltar ao Histórico
                 </button>
             )}

             {view === AppState.REPORT && (
                <button onClick={() => { setView(AppState.LANDING); setAnswers([]); setReport(null); }} className="text-slate-400 hover:text-white text-sm">
                  Novo Briefing
                </button>
             )}
          </div>
        </nav>

        {showAdminLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl w-full max-w-md shadow-2xl relative">
              <button onClick={() => { setShowAdminLogin(false); setAuthError(false); setPasswordInput(""); }} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                <X size={20} />
              </button>
              <div className="flex flex-col items-center mb-6">
                <div className="bg-slate-800 p-3 rounded-full text-lime-400 mb-4"><Lock size={24} /></div>
                <h3 className="text-xl font-bold text-white">Acesso Administrativo</h3>
                <p className="text-slate-400 text-sm">Entre com a senha mestra.</p>
              </div>
              <div className="space-y-4">
                <input type="password" value={passwordInput} onChange={(e) => { setPasswordInput(e.target.value); setAuthError(false); }} className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-xl focus:border-lime-400 focus:ring-1 focus:ring-lime-400 outline-none transition-all" placeholder="Senha" onKeyDown={(e) => e.key === 'Enter' && handleAdminUnlock()} autoFocus />
                {authError && <p className="text-red-500 text-sm text-center font-medium animate-pulse">Senha incorreta.</p>}
                <button onClick={handleAdminUnlock} className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"><Unlock size={18} /> Acessar Painel</button>
              </div>
            </div>
          </div>
        )}

        <main className="max-w-7xl mx-auto">
          {view === AppState.LANDING && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="inline-flex items-center space-x-2 bg-slate-800/80 border border-slate-700 px-4 py-2 rounded-full text-lime-400 text-sm font-medium animate-pulse-slow">
                <Sparkles size={16} />
                <span>Pronto para Deploy na Vercel</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-tight">
                Conte sua ideia de <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-emerald-500">forma natural.</span>
              </h1>
              
              <div className="max-w-2xl space-y-4">
                <p className="text-xl text-slate-300">
                  Para capturarmos a essência da sua ideia, pedimos que <strong>responda por áudio</strong>. Fale livremente sobre o seu projeto.
                </p>
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 inline-block">
                   <p className="text-xs text-slate-400 flex items-center justify-center gap-2">
                     <AlertCircle size={14} className="text-lime-400"/>
                     No ambiente Vercel, certifique-se de configurar a API_KEY nas configurações do projeto.
                   </p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <button onClick={startApp} className="group relative px-8 py-4 bg-lime-400 hover:bg-lime-500 text-slate-900 font-bold text-lg rounded-full shadow-[0_0_40px_rgba(163,230,53,0.2)] hover:shadow-[0_0_60px_rgba(163,230,53,0.4)] transition-all transform hover:-translate-y-1 flex items-center gap-3">
                  <Mic size={24} />
                  Iniciar Briefing
                  <span className="absolute inset-0 rounded-full ring-2 ring-white/30 group-hover:ring-white/50 animate-ping opacity-20"></span>
                </button>

                <button 
                  onClick={copyShareLink}
                  className="px-8 py-4 bg-slate-800/50 hover:bg-slate-800 text-white font-bold text-lg rounded-full border border-slate-700 transition-all flex items-center gap-3"
                >
                  <Share2 size={24} />
                  Enviar para Alguém
                </button>
              </div>
            </div>
          )}

          {view === AppState.FORM && <QuestionForm onComplete={handleFormComplete} />}

          {view === AppState.SUBMITTED && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-in fade-in zoom-in duration-500">
              <div className="w-24 h-24 bg-lime-400/20 rounded-full flex items-center justify-center mb-4"><CheckCircle size={64} className="text-lime-400" /></div>
              <h2 className="text-4xl font-bold text-white">Briefing Registrado!</h2>
              <p className="text-xl text-slate-400 max-w-xl">Obrigado por compartilhar. Suas informações foram salvas com segurança.</p>
              <button onClick={() => { setView(AppState.LANDING); setAnswers([]); }} className="mt-8 text-slate-500 hover:text-white text-sm underline underline-offset-4">Voltar ao Início</button>
            </div>
          )}

          {view === AppState.HISTORY && <HistoryList history={historyList} onSelect={handleHistorySelect} onAnalyze={startAnalysis} onBack={() => setView(AppState.LANDING)} processingId={processingId} processingProgress={processingProgress} />}

          {view === AppState.REPORT && report && <AnalysisReport result={report} transcripts={answers} />}

        </main>
      </div>
    </div>
  );
};

export default App;
