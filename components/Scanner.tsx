
import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, Image as ImageIcon, RotateCcw, Zap, ZapOff } from 'lucide-react';
import { Button } from './Button';
import { Translation } from '../translations';

interface ScannerProps {
  onCapture: (imageData: string) => void;
  onCancel: () => void;
  t: Translation;
}

export const Scanner: React.FC<ScannerProps> = ({ onCapture, onCancel, t }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode }
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setError('');
    } catch (err: any) {
      console.error("Camera Error:", err);
      let errorMessage = t.cameraError;
      
      // Handle specific permission errors
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.message?.includes('Permission dismissed')) {
        errorMessage = t.cameraPermissionDenied;
      }
      
      setError(errorMessage);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        onCapture(dataUrl);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onCapture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Main Camera View */}
      <div className="relative flex-1 w-full overflow-hidden bg-black flex items-center justify-center group">
        
        {/* Top Floating Bar */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-30 bg-gradient-to-b from-black/60 to-transparent h-32">
             <button 
                onClick={onCancel}
                className="bg-black/30 backdrop-blur-md text-white p-3 rounded-full hover:bg-black/50 transition-all active:scale-95 border border-white/10"
              >
                <X size={24} />
              </button>
              
              <div className="bg-black/30 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/10">
                <span className="text-white/80 text-xs font-medium tracking-wider uppercase">{t.scanProduct}</span>
              </div>

              <div className="w-12"></div> {/* Spacer for alignment */}
        </div>

        {error ? (
          <div className="text-white text-center p-8 max-w-sm bg-gray-900/80 backdrop-blur rounded-3xl border border-gray-700 mx-4">
            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
               <ZapOff size={32} />
            </div>
            <p className="mb-6 text-lg font-medium">{error}</p>
            <Button variant="secondary" onClick={startCamera} fullWidth>{t.retry}</Button>
          </div>
        ) : (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="absolute w-full h-full object-cover"
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Modern Viewfinder Overlay */}
        {!error && (
          <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
             {/* Dimmed Background */}
             <div className="absolute inset-0 bg-black/30">
                {/* Clear Center Area using mask - simplified with borders for now for cross-browser ease */}
             </div>
             
             {/* Reticle */}
             <div className="relative w-72 h-72 md:w-96 md:h-96 rounded-[2rem] border-[1.5px] border-white/40 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-2xl -mt-0.5 -ml-0.5 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-2xl -mt-0.5 -mr-0.5 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-2xl -mb-0.5 -ml-0.5 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-2xl -mb-0.5 -mr-0.5 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                
                {/* Scanning Laser Line Animation */}
                <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-60 animate-[scan_2s_ease-in-out_infinite]"></div>
             </div>
             
             <p className="absolute mt-96 pt-8 text-white/80 text-sm font-medium bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10">
               {t.tapToCapture}
             </p>
          </div>
        )}
      </div>

      {/* Floating Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-8 pb-10 flex items-center justify-around z-30 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
        
        <div className="flex flex-col items-center gap-2">
            <label className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white cursor-pointer hover:bg-white/20 transition-all border border-white/10 active:scale-95">
                <ImageIcon size={22} />
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </label>
            <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">{t.gallery}</span>
        </div>

        {/* Capture Button */}
        <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-full blur opacity-40 group-hover:opacity-75 transition duration-200"></div>
            <button 
              onClick={takePhoto} 
              disabled={!!error}
              className={`relative w-20 h-20 rounded-full bg-transparent border-[6px] border-white shadow-2xl active:scale-90 transition-all duration-200 flex items-center justify-center ${error ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
            >
              <div className="w-16 h-16 bg-white rounded-full transition-transform active:scale-95"></div>
            </button>
        </div>

        <div className="flex flex-col items-center gap-2">
            <button 
              onClick={toggleCamera} 
              className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/10 active:scale-95"
            >
                <RotateCcw size={22} />
            </button>
            <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">{t.flip}</span>
        </div>
      </div>
      
      <style>{`
        @keyframes scan {
          0% { top: 10%; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};
