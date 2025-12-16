
import React, { useRef, useState, useEffect } from 'react';

interface CameraPageProps {
  onClose: () => void;
  onCapture: (image: string) => void;
}

const CameraPage: React.FC<CameraPageProps> = ({ onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [permissionError, setPermissionError] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        if (videoRef.current) {
            // Stop existing stream if any
            if (videoRef.current.srcObject) {
                const oldStream = videoRef.current.srcObject as MediaStream;
                oldStream.getTracks().forEach(track => track.stop());
            }
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 } 
          },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setPermissionError(false);
      } catch (err) {
        console.error("Camera Error:", err);
        setPermissionError(true);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Mirror if user facing
        if (facingMode === 'user') {
          context.translate(canvas.width, 0);
          context.scale(-1, 1);
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Flash Effect
        const flash = document.createElement('div');
        flash.className = 'absolute inset-0 bg-white z-[60] animate-fade-in pointer-events-none';
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 100);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        onCapture(dataUrl);
      }
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-black flex flex-col font-sans animate-fade-in">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 p-6 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
        <button onClick={onClose} className="p-2 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
        
        <div className="bg-black/30 backdrop-blur-xl px-4 py-1.5 rounded-full border border-white/10">
            <span className="text-white text-xs font-medium tracking-widest uppercase">Photo</span>
        </div>

        <button 
            onClick={() => setIsFlashOn(!isFlashOn)}
            className={`p-2 rounded-full backdrop-blur-md transition-colors ${isFlashOn ? 'bg-yellow-400/20 text-yellow-400' : 'bg-black/20 text-white hover:bg-white/20'}`}
        >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill={isFlashOn ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
             </svg>
        </button>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 relative overflow-hidden rounded-b-3xl bg-gray-900">
         {permissionError ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center">
                 <svg className="w-12 h-12 mb-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                 <p>Camera access denied or unavailable.</p>
                 <button onClick={onClose} className="mt-4 px-6 py-2 bg-white text-black rounded-full text-sm font-bold">Close</button>
             </div>
         ) : (
            <video 
                ref={videoRef}
                className={`w-full h-full object-cover transition-transform duration-500 ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                playsInline 
                muted 
                autoPlay
            />
         )}
         <canvas ref={canvasRef} className="hidden" />
         
         {/* Focus Frame Visual */}
         <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-64 h-64 border border-white/20 rounded-lg"></div>
         </div>
      </div>

      {/* Controls */}
      <div className="h-44 bg-black flex flex-col justify-center px-8 pb-6">
         <div className="flex items-center justify-between">
            {/* Gallery Stub */}
            <div className="w-12 h-12 bg-gray-800 rounded-lg border border-white/10 overflow-hidden flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>

            {/* Shutter */}
            <button 
                onClick={takePhoto}
                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-transform active:scale-95 group"
            >
                <div className="w-16 h-16 bg-white rounded-full group-hover:bg-gray-200 transition-colors"></div>
            </button>

            {/* Flip */}
            <button 
                onClick={toggleCamera}
                className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
            </button>
         </div>
         <p className="text-center text-white/40 text-[10px] mt-6 tracking-wider font-medium">TAP TO CAPTURE</p>
      </div>
    </div>
  );
};

export default CameraPage;
