import React, { useState, useEffect } from 'react';
import { QUESTIONS, Answer } from '../types';
import Recorder from './Recorder';
import { ArrowRight, ArrowLeft, CheckCircle, PenTool, AlertTriangle, X, CheckSquare, Square } from 'lucide-react';

interface Props {
  onComplete: (answers: Answer[]) => void;
}

const QuestionForm: React.FC<Props> = ({ onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>(
    QUESTIONS.map(q => ({ questionId: q.id, questionText: q.text, audioBlob: null, textResponse: '' }))
  );
  
  // States to manage text input visibility
  const [showTextInput, setShowTextInput] = useState(false);
  const [showTextConfirm, setShowTextConfirm] = useState(false);

  const currentQuestion = QUESTIONS[currentIndex];

  // Reset text visibility when moving to a new question
  useEffect(() => {
    // If the user already has text for this question, show the input (only for audio-text types)
    if (currentQuestion.type === 'audio-text' && answers[currentIndex].textResponse.length > 0) {
      setShowTextInput(true);
      setShowTextConfirm(false);
    } else {
      setShowTextInput(false);
      setShowTextConfirm(false);
    }
  }, [currentIndex, currentQuestion.type]);

  const handleAudioComplete = (blob: Blob) => {
    const newAnswers = [...answers];
    newAnswers[currentIndex].audioBlob = blob;
    // Clear text if they recorded audio to encourage audio priority
    if (blob.size > 0) {
      newAnswers[currentIndex].textResponse = "";
      setShowTextInput(false);
    }
    setAnswers(newAnswers);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newAnswers = [...answers];
    newAnswers[currentIndex].textResponse = e.target.value;
    // Clear audio if they type
    if (e.target.value.length > 0) {
        newAnswers[currentIndex].audioBlob = null;
    }
    setAnswers(newAnswers);
  };

  const handleOptionSelect = (option: string) => {
    const newAnswers = [...answers];
    
    if (currentQuestion.type === 'boolean') {
      // Single select behavior
      newAnswers[currentIndex].textResponse = option;
    } else if (currentQuestion.type === 'multi-select') {
      // Multi select behavior
      let currentSelected = newAnswers[currentIndex].textResponse 
        ? newAnswers[currentIndex].textResponse.split(', ') 
        : [];
      
      if (currentSelected.includes(option)) {
        currentSelected = currentSelected.filter(item => item !== option);
      } else {
        currentSelected.push(option);
      }
      
      newAnswers[currentIndex].textResponse = currentSelected.join(', ');
    }
    
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentIndex < QUESTIONS.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onComplete(answers);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const isCurrentAnswered = answers[currentIndex].textResponse.length > 0 || (answers[currentIndex].audioBlob !== null && answers[currentIndex].audioBlob.size > 0);

  // Helper check for styling selected buttons
  const isSelected = (option: string) => {
    if (!answers[currentIndex].textResponse) return false;
    if (currentQuestion.type === 'boolean') {
      return answers[currentIndex].textResponse === option;
    }
    return answers[currentIndex].textResponse.split(', ').includes(option);
  };

  return (
    <div className="w-full max-w-2xl mx-auto min-h-[60vh] flex flex-col justify-between">
      
      {/* Progress Bar - Padel Net style */}
      <div className="w-full bg-slate-700 h-1 mb-8 rounded-full overflow-hidden">
        <div 
          className="bg-lime-400 h-full transition-all duration-500 ease-out"
          style={{ width: `${((currentIndex + 1) / QUESTIONS.length) * 100}%` }}
        />
      </div>

      <div className="glass-panel p-8 rounded-2xl border-l-4 border-lime-400 shadow-2xl">
        <div className="mb-2 text-lime-400 font-mono text-sm uppercase tracking-widest">
          Passo {currentIndex + 1} / {QUESTIONS.length}
        </div>
        
        <h2 className="text-3xl font-bold text-white mb-2">{currentQuestion.text}</h2>
        <p className="text-slate-400 mb-8">{currentQuestion.helperText}</p>

        <div className="space-y-6">
           
           {/* --- RENDER: AUDIO-TEXT TYPE --- */}
           {currentQuestion.type === 'audio-text' && (
             <>
                {/* Audio Section - Always Visible */}
                <div className={`bg-slate-800/50 rounded-xl p-6 border transition-colors duration-300 ${!showTextInput ? 'border-lime-500/50 bg-slate-800/80 shadow-[0_0_15px_rgba(163,230,53,0.1)]' : 'border-slate-700'}`}>
                  <div className="text-center text-slate-300 text-sm mb-4 font-semibold">
                    Resposta por Áudio (Recomendado)
                  </div>
                  <Recorder 
                    onRecordingComplete={handleAudioComplete} 
                    existingBlob={answers[currentIndex].audioBlob}
                    existingUrl={answers[currentIndex].audioUrl} 
                  />
                </div>

                {/* Text Section Logic */}
                {!showTextInput && !showTextConfirm && (
                  <div className="flex justify-center">
                    <button 
                      onClick={() => setShowTextConfirm(true)}
                      className="text-slate-500 text-xs hover:text-white flex items-center gap-1 transition-colors border-b border-transparent hover:border-white pb-0.5"
                    >
                      <PenTool size={12} />
                      Prefiro escrever (não recomendado)
                    </button>
                  </div>
                )}

                {/* Confirmation Step */}
                {showTextConfirm && !showTextInput && (
                  <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-xl p-4 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-start gap-3">
                      <div className="bg-yellow-500/20 p-2 rounded-lg text-yellow-500">
                          <AlertTriangle size={20} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-white font-bold text-sm mb-1">Tem certeza que quer escrever?</h4>
                        <p className="text-slate-400 text-xs mb-3">
                          O áudio nos permite capturar nuances, emoção e muito mais detalhes da sua ideia do que o texto. 
                        </p>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setShowTextConfirm(false)}
                            className="bg-lime-400 hover:bg-lime-500 text-slate-900 text-xs px-3 py-1.5 rounded-md font-bold transition-colors"
                          >
                            Voltar para Áudio
                          </button>
                          <button 
                            onClick={() => setShowTextInput(true)}
                            className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-3 py-1.5 rounded-md transition-colors"
                          >
                            Quero escrever
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Text Input - Hidden by default */}
                {showTextInput && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 relative">
                      <button 
                        onClick={() => { setShowTextInput(false); setShowTextConfirm(false); setAnswers(prev => {
                            const n = [...prev]; n[currentIndex].textResponse = ''; return n;
                        })}}
                        className="absolute -top-3 right-0 text-slate-500 hover:text-white p-1"
                        title="Cancelar texto e voltar para áudio"
                      >
                          <X size={16}/>
                      </button>
                      <textarea
                        value={answers[currentIndex].textResponse}
                        onChange={handleTextChange}
                        placeholder="Descreva sua ideia em detalhes..."
                        className="w-full bg-slate-800 text-white p-4 rounded-xl border border-slate-700 focus:border-lime-400 focus:ring-1 focus:ring-lime-400 outline-none transition-all h-32 resize-none"
                      />
                  </div>
                )}
             </>
           )}

           {/* --- RENDER: BOOLEAN & MULTI-SELECT TYPES --- */}
           {(currentQuestion.type === 'boolean' || currentQuestion.type === 'multi-select') && (
             <div className="grid grid-cols-1 gap-4">
                {currentQuestion.options?.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleOptionSelect(option)}
                    className={`
                      flex items-center p-4 rounded-xl border-2 transition-all duration-200 text-left
                      ${isSelected(option) 
                        ? 'border-lime-400 bg-lime-400/10 text-white shadow-[0_0_15px_rgba(163,230,53,0.2)]' 
                        : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-500 hover:bg-slate-800'
                      }
                    `}
                  >
                    <div className={`
                      w-6 h-6 rounded mr-4 flex items-center justify-center transition-colors
                      ${isSelected(option) ? 'bg-lime-400 text-slate-900' : 'bg-slate-700 text-transparent'}
                    `}>
                       <CheckCircle size={16} />
                    </div>
                    <span className="font-semibold text-lg">{option}</span>
                  </button>
                ))}
             </div>
           )}

        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button
          onClick={handleBack}
          disabled={currentIndex === 0}
          className={`flex items-center space-x-2 px-6 py-3 rounded-full font-semibold transition-all ${
            currentIndex === 0 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ArrowLeft size={20} />
          <span>Voltar</span>
        </button>

        <button
          onClick={handleNext}
          disabled={!isCurrentAnswered}
          className={`flex items-center space-x-2 px-8 py-3 rounded-full font-bold transition-all shadow-lg ${
            !isCurrentAnswered 
            ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
            : 'bg-lime-400 hover:bg-lime-500 text-slate-900 shadow-lime-400/20'
          }`}
        >
          <span>{currentIndex === QUESTIONS.length - 1 ? 'Finalizar Briefing' : 'Próxima'}</span>
          {currentIndex === QUESTIONS.length - 1 ? <CheckCircle size={20} /> : <ArrowRight size={20} />}
        </button>
      </div>
    </div>
  );
};

export default QuestionForm;