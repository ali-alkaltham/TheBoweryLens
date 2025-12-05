import React, { useRef, useState, useEffect } from 'react';
import { X, Zap, ZapOff, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { Translation } from '../types';

interface ScannerProps {
  onCapture: (imageData: string) => void;
  onCancel: () => void;
  t: Translation;
}

export const Scanner: React.FC<ScannerProps> = ({ onCapture, onCancel, t }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError(t.cameraPermissionDenied);
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        stopCamera();
        onCapture(imageData);
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        stopCamera();
        onCapture(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleFlash = () => {
    if (stream) {
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;
      if (capabilities.torch) {
        track.applyConstraints({
          advanced: [{ torch: !flash }] as any
        });
        setFlash(!flash);
      }
    }
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white p-6 text-center">
        <p className="text-xl mb-4">{error}</p>
        <div className="flex gap-4">
            <button onClick={() => fileInputRef.current?.click()} className="px-6 py-2 bg-blue-600 rounded-lg flex items-center gap-2">
                <ImageIcon size={20} />
                {t.browse}
            </button>
            <button onClick={onCancel} className="px-6 py-2 bg-gray-800 rounded-lg">{t.close}</button>
        </div>
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            className="hidden" 
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="relative flex-1 overflow-hidden bg-gray-900">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 border-[40px] border-black/50 pointer-events-none">
           <div className="w-full h-full border-2 border-white/50 relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500"></div>
           </div>
        </div>
        
        {/* Floating Controls */}
        <div className="absolute top-6 left-0 right-0 px-6 flex justify-between items-center z-20">
            <button onClick={onCancel} className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-colors">
                <X size={24} />
            </button>
            <button onClick={toggleFlash} className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-colors">
                {flash ? <Zap size={24} className="text-yellow-400 fill-current" /> : <ZapOff size={24} />}
            </button>
        </div>
      </div>

      {/* Bottom Bar - Improved Layout */}
      <div className="h-36 bg-black flex items-center justify-around px-8 pb-8 pt-4">
        
        <button 
            onClick={() => { stopCamera(); startCamera(); }} 
            className="flex flex-col items-center gap-1 text-white opacity-70 hover:opacity-100 transition-opacity"
        >
           <div className="p-3 rounded-full bg-gray-800">
             <RefreshCw size={24} />
           </div>
           <span className="text-[10px] font-medium">إعادة</span>
        </button>
        
        <button 
          onClick={capture}
          className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center relative group active:scale-95 transition-transform"
        >
          <div className="w-16 h-16 bg-white rounded-full"></div>
        </button>
        
        <button 
            onClick={() => fileInputRef.current?.click()} 
            className="flex flex-col items-center gap-1 text-white opacity-70 hover:opacity-100 transition-opacity"
        >
           <div className="p-3 rounded-full bg-gray-800">
             <ImageIcon size={24} />
           </div>
           <span className="text-[10px] font-medium">معرض</span>
        </button>
        
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            className="hidden" 
        />
      </div>
    </div>
  );
};