import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, RefreshCcw } from 'lucide-react';

interface RecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  existingBlob: Blob | null;
  existingUrl?: string | null; // Support remote URL
}

const Recorder: React.FC<RecorderProps> = ({ onRecordingComplete, existingBlob, existingUrl }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (existingBlob && existingBlob.size > 0) {
      const url = URL.createObjectURL(existingBlob);
      setAudioUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else if (existingUrl) {
      setAudioUrl(existingUrl);
    } else {
      setAudioUrl(null);
    }
  }, [existingBlob, existingUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        onRecordingComplete(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);
      
      timerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("O acesso ao microfone é necessário para gravar o áudio.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resetRecording = () => {
    setAudioUrl(null);
    setDuration(0);
    onRecordingComplete(new Blob([])); 
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center space-y-4 w-full">
      
      {!audioUrl && !isRecording && (
        <button
          onClick={startRecording}
          className="flex items-center justify-center w-16 h-16 rounded-full bg-lime-400 hover:bg-lime-500 text-slate-900 transition-all shadow-[0_0_20px_rgba(163,230,53,0.4)]"
          title="Gravar Áudio"
        >
          <Mic size={32} />
        </button>
      )}

      {isRecording && (
        <div className="flex flex-col items-center animate-pulse-slow">
           <div className="text-3xl font-mono text-lime-400 mb-4">{formatTime(duration)}</div>
           <button
            onClick={stopRecording}
            className="flex items-center justify-center w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all"
            title="Parar Gravação"
          >
            <Square size={32} fill="currentColor" />
          </button>
           <p className="text-slate-400 text-sm mt-2">Gravando...</p>
        </div>
      )}

      {audioUrl && !isRecording && (
        <div className="w-full flex flex-col items-center">
          <audio controls src={audioUrl} className="w-full max-w-md mb-4" />
          <button
            onClick={resetRecording}
            className="flex items-center space-x-2 text-lime-400 hover:text-lime-300 text-sm font-semibold uppercase tracking-wider"
          >
            <RefreshCcw size={16} />
            <span>Gravar Novamente</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default Recorder;