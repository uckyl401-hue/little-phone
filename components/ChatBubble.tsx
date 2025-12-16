import React, { useState, useRef, useEffect } from 'react';
import { Message, UserSettings } from '../types';

interface ChatBubbleProps {
  message: Message;
  settings: UserSettings;
  onFavorite: (msg: Message) => void;
  isSaved?: boolean;
  onOpenMusicRoom?: (music: any) => void;
}

// Minimalist Audio Player Component
const MinimalAudioPlayer = ({ src, isMe, duration }: { src: string, isMe: boolean, duration?: number }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
  
    const togglePlay = () => {
      if (!audioRef.current) return;
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    };
  
    return (
      <div className="flex items-center space-x-2">
         <div className={`flex items-center space-x-3 p-1 transition-all min-w-[100px]`}>
            <button 
                onClick={togglePlay} 
                className={`p-2 rounded-full shadow-sm flex items-center justify-center w-8 h-8 ${isMe ? 'bg-white text-gray-900' : 'bg-gray-200 text-gray-700'}`}
            >
            {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
            )}
            </button>
            
            {/* Minimalist Visual Waveform */}
            <div className="flex space-x-1 items-center h-4">
                <div className={`w-1 h-2 rounded-full ${isMe ? 'bg-white/70' : 'bg-gray-400'} ${isPlaying ? 'animate-pulse' : ''}`}></div>
                <div className={`w-1 h-4 rounded-full ${isMe ? 'bg-white/90' : 'bg-gray-500'} ${isPlaying ? 'animate-pulse delay-75' : ''}`}></div>
                <div className={`w-1 h-3 rounded-full ${isMe ? 'bg-white/80' : 'bg-gray-400'} ${isPlaying ? 'animate-pulse delay-150' : ''}`}></div>
                <div className={`w-1 h-5 rounded-full ${isMe ? 'bg-white' : 'bg-gray-600'} ${isPlaying ? 'animate-pulse' : ''}`}></div>
                <div className={`w-1 h-3 rounded-full ${isMe ? 'bg-white/80' : 'bg-gray-400'} ${isPlaying ? 'animate-pulse delay-100' : ''}`}></div>
                <div className={`w-1 h-2 rounded-full ${isMe ? 'bg-white/60' : 'bg-gray-400'} ${isPlaying ? 'animate-pulse' : ''}`}></div>
            </div>
            <audio ref={audioRef} src={src} onEnded={() => setIsPlaying(false)} className="hidden" />
         </div>
         
         {/* Duration Display */}
         {duration && (
             <span className={`text-xs font-medium whitespace-nowrap ${isMe ? 'text-white/80' : 'text-gray-500'}`}>
                 {duration}"
             </span>
         )}
      </div>
    )
  }

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, settings, onFavorite, isSaved, onOpenMusicRoom }) => {
  const isMe = message.sender === 'me';

  // Format time
  const timeString = message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Compute Font Classes
  const fontClass = {
      'sans': 'font-sans',
      'serif': 'font-serif',
      'mono': 'font-mono'
  }[settings.fontFamily || 'sans'];

  const sizeClass = {
      'small': 'text-sm',
      'medium': 'text-base',
      'large': 'text-lg'
  }[settings.fontSize || 'medium'];

  // Special handling for Red Envelope to remove default bubble styling
  const isRedEnvelope = !!message.redEnvelope;
  
  // State for Red Envelope Status (Simulate Interaction)
  const [reStatus, setReStatus] = useState<'sent' | 'received' | 'collecting'>(message.redEnvelope?.status || 'sent');

  // Music Player State (Mini)
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const musicRef = useRef<HTMLAudioElement>(null);

  // Effect: If I sent it, simulate partner receiving/accepting it after delay
  useEffect(() => {
    if (isRedEnvelope && isMe && reStatus === 'sent') {
        const timer = setTimeout(() => {
            setReStatus('received');
        }, 3500); // 3.5s delay to simulate partner clicking 'Accept'
        return () => clearTimeout(timer);
    }
  }, [isRedEnvelope, isMe, reStatus]);

  // Handle click to collect (If partner sent it)
  const handleCollect = () => {
      if (!isMe && reStatus === 'sent') {
          setReStatus('collecting');
          setTimeout(() => {
              setReStatus('received');
          }, 1200); // 1.2s loading delay
      }
  };

  const toggleMusic = (e: React.MouseEvent) => {
      e.stopPropagation();
      if(!musicRef.current) return;
      if(isMusicPlaying) {
          musicRef.current.pause();
      } else {
          musicRef.current.play();
      }
      setIsMusicPlaying(!isMusicPlaying);
  }

  const handleExpandMusic = () => {
      if (onOpenMusicRoom && message.music) {
          onOpenMusicRoom(message.music);
      }
  }

  return (
    <div className={`flex w-full mb-5 animate-pop-in ${isMe ? 'justify-end' : 'justify-start'} group`}>
      
      {/* Partner Avatar */}
      {!isMe && (
        <div className="flex-shrink-0 mr-3 flex flex-col justify-end">
           <img 
            src={settings.partnerAvatar} 
            alt="Partner" 
            className="w-10 h-10 rounded-full object-cover shadow-sm border border-white/50"
          />
        </div>
      )}

      <div className={`flex flex-col max-w-[85%] ${isMe ? 'items-end' : 'items-start'}`}>
        
        <div className="relative">
            {/* The Bubble */}
            <div 
            className={`
                relative shadow-sm break-words
                ${isRedEnvelope 
                   ? 'bg-transparent border-none p-0' 
                   : (isMe 
                      // User: Darker shade than wallpaper (50% Black), High Contrast Text
                      ? 'backdrop-blur-md bg-black/50 text-white rounded-[22px] rounded-tr-[4px] border border-white/10 shadow-md px-4 py-3' 
                      // Robot: Solid White
                      : 'bg-white text-gray-900 rounded-[22px] rounded-tl-[4px] px-4 py-3')
                }
                ${fontClass} ${sizeClass}
            `}
            >
            {/* Image Content */}
            {message.image && (
                <div className="mb-2 rounded-lg overflow-hidden">
                <img src={message.image} alt="Shared" className="max-w-full h-auto object-cover" />
                </div>
            )}

            {/* Minimalist Audio Content */}
            {message.audioUrl && (
                <MinimalAudioPlayer src={message.audioUrl} isMe={isMe} duration={message.audioDuration} />
            )}

            {/* Transfer Content (Red Envelope) - Interactive Card */}
            {message.redEnvelope && (
                <div 
                    onClick={handleCollect}
                    className={`
                        w-[230px] rounded-[6px] flex flex-col shadow-sm overflow-hidden transition-all duration-500 relative cursor-pointer
                        ${reStatus === 'received' ? 'bg-[#E17575]' : 'bg-[#FFB7C5]'}
                    `}
                >
                     {/* Loading Overlay */}
                     {reStatus === 'collecting' && (
                         <div className="absolute inset-0 bg-black/10 flex items-center justify-center z-20 backdrop-blur-[1px]">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                         </div>
                     )}

                     {reStatus === 'received' ? (
                        /* RECEIVED STATE (Darker Pink/Red Receipt) */
                        <>
                            <div className="flex items-center space-x-3 p-3 animate-fade-in">
                                <div className="w-10 h-10 rounded-full border-[1.5px] border-white flex items-center justify-center flex-shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <div className="flex flex-col text-white justify-center">
                                    <span className="text-[15px] font-medium leading-tight">已收款</span>
                                    <span className="text-[12px] opacity-90 leading-tight mt-1">¥{parseFloat(message.redEnvelope.amount).toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="bg-white/15 py-[6px] px-3">
                                <span className="text-[10px] text-white/95 font-medium block">转账</span>
                            </div>
                        </>
                     ) : (
                        /* PENDING STATE (Light Pink Transfer) */
                        <>
                            <div className="flex items-center space-x-3 p-3">
                                <div className="w-10 h-10 rounded-full border-[1.5px] border-white flex items-center justify-center flex-shrink-0">
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                     </svg>
                                </div>
                                <div className="flex flex-col text-white justify-center">
                                    <span className="text-[15px] font-medium leading-tight">¥{parseFloat(message.redEnvelope.amount).toFixed(2)}</span>
                                     <span className="text-[12px] opacity-90 leading-tight mt-1">
                                        {isMe ? '等待对方确认' : '请收款'}
                                     </span>
                                </div>
                            </div>
                            <div className="bg-white/15 py-[6px] px-3">
                                <span className="text-[10px] text-white/95 font-medium block">转账</span>
                            </div>
                        </>
                     )}
                </div>
            )}

            {/* MUSIC PLAYER CARD (Together Listen) */}
            {message.music && (
                <div 
                    onClick={handleExpandMusic}
                    className={`relative overflow-hidden rounded-xl w-[260px] cursor-pointer group/music ${isMe ? 'bg-white/10 border border-white/20' : 'bg-gray-50 border border-gray-100'}`}
                >
                    <div className="absolute inset-0 z-0 opacity-20 bg-cover bg-center blur-xl transition-all duration-700" style={{ backgroundImage: `url(${message.music.coverUrl})` }}></div>
                    
                    {/* Expand Hint Overlay */}
                    <div className="absolute inset-0 z-20 bg-black/20 opacity-0 group-hover/music:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-xs font-bold bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">点击全屏</span>
                    </div>

                    <div className="relative z-10 p-3 flex items-center space-x-3">
                         {/* Rotating Album Art */}
                         <div className={`relative w-14 h-14 rounded-full flex-shrink-0 overflow-hidden border-2 ${isMe ? 'border-white/50' : 'border-gray-200'} shadow-md`}>
                            <img 
                                src={message.music.coverUrl} 
                                className={`w-full h-full object-cover ${isMusicPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`} 
                                alt="Cover"
                            />
                            {/* Center hole for vinyl look */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className={`w-3 h-3 rounded-full ${isMe ? 'bg-black/50' : 'bg-white/80'}`}></div>
                            </div>
                         </div>
                         
                         {/* Info & Controls */}
                         <div className="flex-1 flex flex-col justify-center min-w-0">
                             <span className={`text-sm font-bold truncate ${isMe ? 'text-white' : 'text-gray-900'}`}>{message.music.title}</span>
                             <span className={`text-xs truncate ${isMe ? 'text-white/70' : 'text-gray-500'}`}>{message.music.artist}</span>
                             
                             <div className="flex items-center mt-1 justify-between">
                                 {/* Fake waveform */}
                                 <div className="flex items-center space-x-1">
                                     {[1,2,3,4].map(i => (
                                         <div key={i} className={`w-0.5 rounded-full ${isMusicPlaying ? 'animate-breathe' : 'h-1'} ${isMe ? 'bg-pink-300' : 'bg-pink-400'}`} style={{ height: isMusicPlaying ? `${Math.random() * 12 + 4}px` : '4px', animationDuration: '0.6s' }}></div>
                                     ))}
                                 </div>

                                 {/* Shared Avatars Mini (Together) */}
                                 <div className="flex -space-x-2 mr-2">
                                     <img src={settings.partnerAvatar} className="w-4 h-4 rounded-full border border-white" alt="p"/>
                                     <img src={settings.userAvatar} className="w-4 h-4 rounded-full border border-white" alt="u"/>
                                 </div>
                             </div>
                         </div>

                         {/* Play Button */}
                         <button 
                            onClick={toggleMusic}
                            className={`relative z-30 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 ${isMusicPlaying ? 'bg-pink-500 text-white' : 'bg-white text-gray-800'}`}
                         >
                             {isMusicPlaying ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                             ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-0.5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                </svg>
                             )}
                         </button>
                    </div>
                    {/* Audio Element */}
                    <audio ref={musicRef} src={message.music.audioUrl} onEnded={() => setIsMusicPlaying(false)} className="hidden" />
                </div>
            )}

            {/* Location Content */}
            {message.location && (
                <div className={`mb-2 p-2 rounded-lg flex items-center space-x-2 ${isMe ? 'bg-transparent border border-white/20' : 'bg-gray-100'}`}>
                    <div className="bg-red-500 text-white p-2 rounded-full flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <span className="font-bold text-sm">位置信息</span>
                        <span className="text-xs opacity-75 truncate">{message.location.address}</span>
                    </div>
                </div>
            )}

            {/* File Content */}
            {message.file && (
                <div className={`mb-2 p-2 rounded-lg flex items-center space-x-2 ${isMe ? 'bg-transparent border border-white/20' : 'bg-gray-100 border border-gray-200'}`}>
                    <div className="bg-blue-500 text-white p-2 rounded-lg flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <span className="font-bold text-sm truncate max-w-[150px]">{message.file.name}</span>
                        <span className="text-xs opacity-75">文本文件</span>
                    </div>
                </div>
            )}

            {/* Text Content */}
            {message.text && (
                <div className="whitespace-pre-wrap leading-relaxed tracking-wide drop-shadow-sm">
                    {message.text}
                </div>
            )}
            </div>

            {/* Favorite Button (Loving Click) - Adjusted position */}
            {!isRedEnvelope && !message.music && (
            <button 
                onClick={() => onFavorite(message)}
                className={`absolute ${isMe ? '-left-5' : '-right-5'} top-1/2 -translate-y-1/2 transition-all p-1 
                  ${isSaved 
                    ? 'text-red-500 opacity-100' 
                    : 'text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100'
                  }`}
                title="收藏"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isSaved ? 'fill-current' : 'fill-none'}`} viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
            </button>
            )}
        </div>

        {/* Timestamp & Read Status */}
        <div className={`flex items-center mt-1 ${isMe ? 'mr-1 justify-end' : 'ml-1 justify-start'}`}>
            {isMe && (
                <span className="text-[10px] text-gray-400 mr-1.5 font-medium">
                    {message.readStatus === 'read' ? '已读' : '送达'}
                </span>
            )}
            <span className="text-[10px] text-gray-500/80 font-medium">
                {timeString}
            </span>
        </div>
      </div>

       {/* User Avatar */}
       {isMe && (
        <div className="flex-shrink-0 ml-3 flex flex-col justify-end">
           <img 
            src={settings.userAvatar} 
            alt="Me" 
            className="w-10 h-10 rounded-full object-cover shadow-sm border border-white/50"
          />
        </div>
      )}
    </div>
  );
};

export default ChatBubble;