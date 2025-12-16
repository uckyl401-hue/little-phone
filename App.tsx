
import React, { useState, useEffect, useRef } from 'react';
import ChatBubble from './components/ChatBubble';
import InputArea from './components/InputArea';
import SettingsModal from './components/SettingsModal';
import CameraPage from './components/CameraPage';
import { Message, UserSettings, SendingStatus } from './types';
import { DEFAULT_SETTINGS } from './constants';
import { sendMessageToGemini } from './services/geminiService';

// Define Song type
interface Song {
    id: string;
    title: string;
    artist: string;
    coverUrl: string;
    audioUrl: string;
    lyrics?: string;
}

// Helper to parse LRC
interface LrcLine {
    time: number;
    text: string;
}

const parseLrc = (lrc: string): LrcLine[] => {
    const lines = lrc.split('\n');
    const result: LrcLine[] = [];
    const timeReg = /\[(\d{2}):(\d{2})(\.\d{2,3})?\]/;
    for (const line of lines) {
        const match = timeReg.exec(line);
        if (match) {
            const min = parseInt(match[1]);
            const sec = parseInt(match[2]);
            const ms = match[3] ? parseFloat(match[3]) : 0;
            const time = min * 60 + sec + ms;
            const text = line.replace(timeReg, '').trim();
            if (text) result.push({ time, text });
        }
    }
    return result.sort((a, b) => a.time - b.time);
}

// Helper for time format
const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// --- EFFECT OVERLAY COMPONENT ---
const EffectOverlay = ({ type }: { type: 'snow' | 'love' | null }) => {
    if (!type) return null;

    const particles = Array.from({ length: 30 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100 + '%',
        animationDuration: Math.random() * 3 + 2 + 's',
        animationDelay: Math.random() * 2 + 's',
        fontSize: Math.random() * 20 + 20 + 'px',
    }));

    return (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
            {particles.map((p) => (
                <div
                    key={p.id}
                    className="particle"
                    style={{
                        left: p.left,
                        animation: type === 'snow' 
                            ? `fall ${p.animationDuration} linear infinite` 
                            : `floatUp ${p.animationDuration} ease-in infinite`,
                        animationDelay: p.animationDelay,
                        fontSize: p.fontSize,
                        top: type === 'snow' ? '-50px' : 'auto',
                        bottom: type === 'love' ? '-50px' : 'auto',
                        color: type === 'love' ? '#ff4d6d' : '#ffffff'
                    }}
                >
                    {type === 'snow' ? '❄️' : '❤️'}
                </div>
            ))}
        </div>
    );
};

// --- MUSIC ROOM COMPONENT ---
const MusicRoom = ({ 
    currentSong,
    playlist,
    isPlaying,
    onClose, 
    onPlayPause,
    onNext,
    onPrev,
    onSelectSong,
    onRemoveSong,
    userAvatar,
    partnerAvatar,
    currentTime,
    duration, // Song duration
    listenDuration // Session duration
  }: { 
    currentSong: Song | null;
    playlist: Song[];
    isPlaying: boolean;
    onClose: () => void;
    onPlayPause: () => void;
    onNext: () => void;
    onPrev: () => void;
    onSelectSong: (song: Song) => void;
    onRemoveSong: (id: string) => void;
    userAvatar: string;
    partnerAvatar: string;
    currentTime: number;
    duration: number;
    listenDuration: number;
  }) => {
    const [showPlaylist, setShowPlaylist] = useState(false);
    const [viewMode, setViewMode] = useState<'vinyl' | 'lyrics'>('vinyl'); // 'vinyl' or 'lyrics'
    
    // Lyrics State
    const [lrcLines, setLrcLines] = useState<LrcLine[]>([]);
    const [activeLineIndex, setActiveLineIndex] = useState(-1);
    const lyricsContainerRef = useRef<HTMLDivElement>(null);
  
    // Effect: Parse Lyrics when song changes
    useEffect(() => {
        if (currentSong?.lyrics) {
            const parsed = parseLrc(currentSong.lyrics);
            setLrcLines(parsed);
        } else {
            setLrcLines([]);
        }
        setActiveLineIndex(-1);
    }, [currentSong]);

    // Find Active Lyric Line based on currentTime prop
    useEffect(() => {
        if (lrcLines.length > 0) {
            let idx = lrcLines.findIndex(line => line.time > currentTime) - 1;
            if (idx < 0) {
                idx = currentTime < lrcLines[0].time ? -1 : lrcLines.length - 1;
            }
            setActiveLineIndex(idx);
        }
    }, [currentTime, lrcLines]);

    // Auto-scroll lyrics
    useEffect(() => {
        if (viewMode === 'lyrics' && activeLineIndex !== -1 && lyricsContainerRef.current) {
            const container = lyricsContainerRef.current;
            const activeEl = container.children[activeLineIndex] as HTMLElement;
            if (activeEl) {
                activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [activeLineIndex, viewMode]);

    const toggleView = () => {
        setViewMode(prev => prev === 'vinyl' ? 'lyrics' : 'vinyl');
    }

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    if (!currentSong) return null;
  
    return (
       <div className="fixed inset-0 z-[60] bg-gray-900 text-white flex flex-col font-sans overflow-hidden animate-fade-in transition-all duration-500">
          
          {/* Background Blur - Changes with Cover */}
          <div className="absolute inset-0 z-0 opacity-50 bg-cover bg-center blur-3xl scale-125 transition-all duration-1000 ease-in-out" style={{ backgroundImage: `url(${currentSong.coverUrl})` }}></div>
          <div className="absolute inset-0 z-0 bg-black/40"></div>
          
          {/* Header */}
          <div className="relative z-20 w-full px-6 py-4 flex justify-between items-center mt-2">
              <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 backdrop-blur-md transition-colors group">
                  <svg className="w-6 h-6 text-white group-hover:scale-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              
              <div className="flex flex-col items-center">
                  <div className="flex items-center space-x-2 bg-black/20 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-xs font-mono font-medium tracking-wide text-white/90">一起听 {formatTime(listenDuration)}</span>
                  </div>
              </div>

              <button onClick={() => setShowPlaylist(!showPlaylist)} className={`p-2 rounded-full transition-colors ${showPlaylist ? 'bg-pink-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                   <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
          </div>
  
          {/* Avatars Listening Together */}
          <div className="relative z-20 flex justify-center items-center space-x-4 mt-2 mb-2 animate-fade-in opacity-90">
             <div className="relative group">
                 <img src={partnerAvatar} className="w-12 h-12 rounded-full border-2 border-white/30 shadow-lg object-cover" alt="Partner"/>
                 <div className="absolute -bottom-1 -right-1 bg-pink-500 rounded-full p-1 border border-white">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                 </div>
             </div>
             
             {/* Connection Waves */}
             <div className="flex space-x-1 items-center h-8">
                 <div className="w-1 bg-white/50 rounded-full animate-breathe" style={{ height: '40%' }}></div>
                 <div className="w-1 bg-white/60 rounded-full animate-breathe" style={{ height: '70%', animationDelay: '0.1s' }}></div>
                 <div className="w-1 bg-white/80 rounded-full animate-breathe" style={{ height: '100%', animationDelay: '0.2s' }}></div>
                 <div className="w-1 bg-white/60 rounded-full animate-breathe" style={{ height: '70%', animationDelay: '0.3s' }}></div>
                 <div className="w-1 bg-white/50 rounded-full animate-breathe" style={{ height: '40%', animationDelay: '0.4s' }}></div>
             </div>

             <div className="relative group">
                 <img src={userAvatar} className="w-12 h-12 rounded-full border-2 border-white/30 shadow-lg object-cover" alt="User"/>
             </div>
          </div>

          {/* Main Content Area */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full px-6 overflow-hidden">
              
              {/* LAYOUT: Vinyl / Lyrics Toggle */}
              <div 
                className="relative w-full flex items-center justify-center transition-all duration-700 ease-in-out h-[50vh] cursor-pointer"
                onClick={toggleView}
              >
                   {/* Vinyl View */}
                   <div 
                        className={`absolute transition-all duration-700 ease-in-out flex flex-col items-center ${viewMode === 'vinyl' ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-75 -translate-y-20 pointer-events-none'}`}
                   >
                        <div className={`relative w-64 h-64 md:w-80 md:h-80 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-gray-800 bg-gray-900 flex items-center justify-center overflow-hidden ${isPlaying ? 'animate-[spin_10s_linear_infinite]' : ''}`} style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}>
                            <img src={currentSong.coverUrl} className="w-full h-full object-cover opacity-90" alt="cover"/>
                            <div className="absolute inset-0 bg-gradient-to-tr from-black/30 to-transparent"></div>
                            <div className="absolute w-20 h-20 bg-gray-900 rounded-full border-4 border-gray-800 flex items-center justify-center">
                                <div className="w-2 h-2 bg-black rounded-full"></div>
                            </div>
                        </div>
                        <div className="mt-8 text-center px-4">
                            <h2 className="text-2xl font-bold truncate drop-shadow-md">{currentSong.title}</h2>
                            <p className="text-lg text-white/60 truncate mt-1">{currentSong.artist}</p>
                        </div>
                   </div>

                   {/* Lyrics View */}
                   <div 
                        className={`absolute w-full h-full transition-all duration-700 ease-in-out flex flex-col items-center justify-center ${viewMode === 'lyrics' ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-110 translate-y-20 pointer-events-none'}`}
                   >
                        <div 
                            ref={lyricsContainerRef}
                            className="w-full max-w-md h-full overflow-y-auto no-scrollbar text-center space-y-5 mask-image-gradient py-[50%]"
                        >
                            {lrcLines.length > 0 ? (
                                lrcLines.map((line, idx) => (
                                    <p 
                                        key={idx} 
                                        className={`transition-all duration-300 px-4 ${
                                            idx === activeLineIndex 
                                            ? 'text-white text-xl md:text-2xl font-bold scale-105 drop-shadow-md' 
                                            : 'text-white/40 text-base'
                                        }`}
                                    >
                                        {line.text}
                                    </p>
                                ))
                            ) : (
                                currentSong.lyrics ? (
                                    <p className="text-xl md:text-2xl font-medium leading-relaxed whitespace-pre-wrap text-white/90 drop-shadow-md px-4">
                                        {currentSong.lyrics}
                                    </p>
                                ) : (
                                    <p className="text-white/40 italic">暂无歌词 (No Lyrics)</p>
                                )
                            )}
                        </div>
                        <p className="absolute bottom-4 text-white/50 text-xs tracking-widest">点击返回封面</p>
                   </div>
              </div>

              {/* Playlist Overlay (Slide Up) */}
              <div 
                onClick={(e) => e.stopPropagation()}
                className={`absolute inset-x-0 bottom-0 top-20 bg-black/80 backdrop-blur-xl rounded-t-3xl transition-transform duration-300 z-30 flex flex-col ${showPlaylist ? 'translate-y-0' : 'translate-y-full'}`}
              >
                   <div className="p-4 border-b border-white/10 flex justify-between items-center">
                       <h3 className="font-bold">播放列表 ({playlist.length})</h3>
                       <button onClick={() => setShowPlaylist(false)} className="text-white/60 hover:text-white">Close</button>
                   </div>
                   <div className="flex-1 overflow-y-auto p-4 space-y-2">
                       {playlist.map((s, idx) => (
                           <div 
                                key={s.id + idx} 
                                className={`flex items-center space-x-3 p-3 rounded-xl transition-colors group ${currentSong.id === s.id ? 'bg-white/20' : 'hover:bg-white/10'}`}
                           >
                               <div className="flex-1 flex items-center space-x-3 cursor-pointer" onClick={() => { onSelectSong(s); setShowPlaylist(false); }}>
                                    <img src={s.coverUrl} className="w-10 h-10 rounded-md object-cover" alt="mini"/>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-bold truncate ${currentSong.id === s.id ? 'text-pink-400' : 'text-white'}`}>{s.title}</p>
                                        <p className="text-xs text-white/50 truncate">{s.artist}</p>
                                    </div>
                                    {currentSong.id === s.id && isPlaying && (
                                        <div className="flex space-x-1">
                                            <div className="w-1 h-3 bg-pink-500 animate-pulse"></div>
                                            <div className="w-1 h-3 bg-pink-500 animate-pulse delay-75"></div>
                                            <div className="w-1 h-3 bg-pink-500 animate-pulse delay-150"></div>
                                        </div>
                                    )}
                               </div>
                               
                               {/* Remove Button */}
                               <button 
                                onClick={() => onRemoveSong(s.id)}
                                className="p-2 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                               >
                                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                               </button>
                           </div>
                       ))}
                   </div>
              </div>
          </div>
  
          {/* Footer Controls */}
          <div className="relative z-20 w-full px-8 pb-10 pt-4 max-w-md mx-auto bg-gradient-to-t from-gray-900 to-transparent">
               
               {/* Progress Bar */}
               <div className="flex justify-between text-xs text-white/50 mb-1 font-mono">
                   <span>{formatTime(currentTime)}</span>
                   <span>{formatTime(duration || 0)}</span>
               </div>
               <div className="w-full h-1.5 bg-white/20 rounded-full mb-8 overflow-hidden cursor-pointer group">
                   <div className="h-full bg-pink-500 group-hover:bg-pink-400 transition-all duration-300 ease-linear relative" style={{ width: `${progressPercent}%` }}>
                       <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow-sm"></div>
                   </div>
               </div>
  
               {/* Play Controls */}
               <div className="flex items-center justify-center space-x-10">
                    <button onClick={onPrev} className="text-white/60 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
                    </button>
                    
                    <button onClick={onPlayPause} className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all">
                        {isPlaying ? (
                            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                        ) : (
                            <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        )}
                    </button>
  
                    <button onClick={onNext} className="text-white/60 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
                    </button>
               </div>
          </div>
       </div>
    );
  }

// --- MINI PLAYER COMPONENT ---
const MiniPlayer = ({ 
    song, 
    isPlaying, 
    onOpen, 
    onClose,
    listenDuration,
    position,
    setPosition
}: { 
    song: Song, 
    isPlaying: boolean, 
    onOpen: () => void,
    onClose: () => void,
    listenDuration: number,
    position: {x: number, y: number},
    setPosition: (pos: {x: number, y: number}) => void
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const hasMoved = useRef(false);
    const elementRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDragging(true);
        hasMoved.current = false;
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        dragOffset.current = {
            x: clientX - position.x,
            y: clientY - position.y
        };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent | TouchEvent) => {
            if (!isDragging) return;
            e.preventDefault(); 
            hasMoved.current = true;
            const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
            
            const newX = clientX - dragOffset.current.x;
            const newY = clientY - dragOffset.current.y;
            
            // Dynamic bounds based on actual element size
            let width = 240; // Fallback
            let height = 60;
            if (elementRef.current) {
                const rect = elementRef.current.getBoundingClientRect();
                width = rect.width;
                height = rect.height;
            }

            const maxX = window.innerWidth - width - 10; // 10px margin
            const maxY = window.innerHeight - height - 10;

            const constrainedX = Math.max(10, Math.min(newX, maxX));
            const constrainedY = Math.max(10, Math.min(newY, maxY));

            setPosition({
                x: constrainedX,
                y: constrainedY
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('touchmove', handleMouseMove, { passive: false });
            window.addEventListener('touchend', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleMouseMove);
            window.removeEventListener('touchend', handleMouseUp);
        };
    }, [isDragging, setPosition]);

    const handleClick = () => {
        if (!hasMoved.current) {
            onOpen();
        }
    }

    return (
        <div 
            ref={elementRef}
            style={{ left: position.x, top: position.y }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
            onClick={handleClick}
            className="fixed z-40 bg-black/80 backdrop-blur-md rounded-full pl-2 pr-3 py-2 flex items-center space-x-3 shadow-xl border border-white/10 cursor-pointer hover:bg-black/90 transition-colors animate-pop-in max-w-[240px] touch-none select-none"
        >
             <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/30 flex-shrink-0 pointer-events-none">
                 <img 
                    src={song.coverUrl} 
                    className={`w-full h-full object-cover ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`} 
                    alt="mini"
                 />
                 <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                 </div>
             </div>
             <div className="flex flex-col min-w-0 flex-1 pointer-events-none">
                 <span className="text-xs font-bold text-white truncate max-w-[100px]">{song.title}</span>
                 <div className="flex items-center space-x-1">
                     <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                     <span className="text-[10px] text-white/70 font-mono">{formatTime(listenDuration)}</span>
                 </div>
             </div>
             <button 
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 text-white/50 hover:text-white transition-colors flex-shrink-0"
             >
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
        </div>
    )
}

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [savedMessages, setSavedMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<SendingStatus>(SendingStatus.Idle);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  
  // Active Effect (Snow/Love)
  const [activeEffect, setActiveEffect] = useState<'snow' | 'love' | null>(null);

  // Call State
  const [isCallActive, setIsCallActive] = useState(false);
  const isCallActiveRef = useRef(false);
  const [callState, setCallState] = useState<'connecting' | 'connected'>('connecting');
  const [callTranscript, setCallTranscript] = useState<string>("");
  const recognitionRef = useRef<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const isMutedRef = useRef(false);
  const [callDuration, setCallDuration] = useState(0);

  // Call Duration Timer
  useEffect(() => {
    let interval: any;
    if (isCallActive && callState === 'connected') {
        interval = setInterval(() => {
            setCallDuration(prev => prev + 1);
        }, 1000);
    } else {
        setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [isCallActive, callState]);


  // --- MUSIC STATE (Global) ---
  const [isMusicRoomOpen, setIsMusicRoomOpen] = useState(false);
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Music Progress & Timer State
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [listenDuration, setListenDuration] = useState(0); // Total session time (seconds)
  
  // Mini Player Position State
  const [miniPlayerPos, setMiniPlayerPos] = useState({ x: window.innerWidth - 240, y: 80 });

  // Timer Effect
  useEffect(() => {
    let interval: any;
    if (isPlaying && playlist.length > 0) {
      interval = setInterval(() => {
        setListenDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playlist.length]);

  // Handle Audio Element Events
  const handleAudioTimeUpdate = () => {
      if (audioRef.current) {
          setAudioCurrentTime(audioRef.current.currentTime);
          setAudioDuration(audioRef.current.duration || 0);
      }
  };

  const handleAudioEnded = () => {
      playNext();
  };

  // Sync Audio Source with State
  useEffect(() => {
     const currentSong = playlist[currentSongIndex];
     if (currentSong && audioRef.current) {
         // Only change src if it's different to avoid reloading same song
         const urlPath = new URL(currentSong.audioUrl, window.location.href).href;
         if (audioRef.current.src !== urlPath) {
             audioRef.current.src = currentSong.audioUrl;
             audioRef.current.load();
             if (isPlaying) {
                 const p = audioRef.current.play();
                 if (p) p.catch(e => console.log("Autoplay blocked", e));
             }
         } else {
             // Resume/Pause handling
             if (isPlaying) {
                 const p = audioRef.current.play();
                 if (p) p.catch(e => console.log("Play blocked", e));
             } else {
                 audioRef.current.pause();
             }
         }
     } else if (!currentSong && audioRef.current) {
         audioRef.current.pause();
         setIsPlaying(false);
     }
  }, [currentSongIndex, playlist, isPlaying]);


  // Load playlist logic
  useEffect(() => {
    try {
        const savedPlaylist = localStorage.getItem('lovenote_playlist');
        if (savedPlaylist) {
            const parsed = JSON.parse(savedPlaylist);
            const validSongs = parsed.filter((s: Song) => s.audioUrl.startsWith('http'));
            if (validSongs.length > 0) {
                setPlaylist(validSongs);
            }
        }
    } catch (e) { console.error("Failed to load playlist", e); }
  }, []);

  // Save playlist logic
  useEffect(() => {
      const validSongs = playlist.filter(s => s.audioUrl.startsWith('http'));
      localStorage.setItem('lovenote_playlist', JSON.stringify(validSongs));
  }, [playlist]);

  // Input State
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length === 0) {
       const initialMsg: Message = {
        id: 'init-1',
        sender: 'partner',
        text: "我会永远陪在你身边。",
        timestamp: new Date(),
      };
      setMessages([initialMsg]);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, status]);

  useEffect(() => {
    isCallActiveRef.current = isCallActive;
  }, [isCallActive]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const handleFavorite = (msg: Message) => {
      if (!savedMessages.some(m => m.id === msg.id)) {
          setSavedMessages([...savedMessages, msg]);
      } else {
          setSavedMessages(savedMessages.filter(m => m.id !== msg.id));
      }
  };

  const updateRandomAvatar = () => {
      if (settings.partnerAvatarList && settings.partnerAvatarList.length > 1) {
          const list = settings.partnerAvatarList;
          let nextAvatar = list[Math.floor(Math.random() * list.length)];
          if (list.length > 1 && nextAvatar === settings.partnerAvatar) {
              nextAvatar = list[Math.floor(Math.random() * list.length)];
          }
          setSettings(prev => ({ ...prev, partnerAvatar: nextAvatar }));
      }
  };

  // --- CORE SEND LOGIC ---
  const handleSendMessage = async (
      text: string, 
      image?: string, 
      file?: {name: string, content: string}, 
      location?: {address: string},
      audioBlob?: Blob,
      redEnvelope?: {amount: string},
      audioDuration?: number,
      music?: { id: string; title: string; artist: string; coverUrl: string; audioUrl: string; lyrics?: string }
  ) => {
    
    // Check for Emojis to trigger effects from USER input
    if (text) {
        if (/❄️|雪/.test(text)) {
            setActiveEffect('snow');
            setTimeout(() => setActiveEffect(null), 5000);
        } else if (/❤️|💗|💓|💕|💖|💘|💝|爱|Love/i.test(text)) {
            setActiveEffect('love');
            setTimeout(() => setActiveEffect(null), 5000);
        }
    }

    // MUSIC LOGIC: Add to playlist and open room
    if (music) {
        setPlaylist(prev => {
            const exists = prev.find(s => s.id === music.id || s.audioUrl === music.audioUrl);
            if (exists) return prev;
            return [...prev, music];
        });
        
        setPlaylist(prev => {
             const newIdx = prev.length; // It will be the last one
             setCurrentSongIndex(newIdx);
             return [...prev, music];
        });
        setIsPlaying(true);
        setIsMusicRoomOpen(true);
        // Reset listen timer only if new session (optional, keeping cumulative for now)
        return;
    }

    const currentIsCallActive = isCallActiveRef.current;

    // Send user message
    // NOTE: We now allow sending messages even during a call to display them "on this page"
    const msgId = Date.now().toString();
    const userMsg: Message = {
        id: msgId,
        sender: 'me',
        text: text,
        image: image,
        file: file ? { ...file, type: 'text' } : undefined,
        location: location ? { ...location, lat: 0, lng: 0 } : undefined,
        audioUrl: audioBlob ? URL.createObjectURL(audioBlob) : undefined,
        audioDuration: audioDuration,
        redEnvelope: redEnvelope ? { amount: redEnvelope.amount, status: 'sent' } : undefined,
        timestamp: new Date(),
        readStatus: 'sent', // Initial Status
    };
    
    // Prevent adding empty text if it's just audio blob from call
    if (text || image || file || location || audioBlob || redEnvelope) {
        setMessages(prev => [...prev, userMsg]);
    }

    // If not a voice stream from call (which clears input automatically), clear text
    if (!currentIsCallActive) {
        setInputText('');
    }
      
    // Simulate Read Delay (1.5s) if not instant call stream
    if (!currentIsCallActive) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, readStatus: 'read' } : m));
        setStatus(SendingStatus.Typing);
    }

    try {
      if (!currentIsCallActive) await new Promise(r => setTimeout(r, 800)); // Additional thinking delay
      
      let contextText = text;
      if (audioBlob) contextText = "[User sent a voice message]";
      if (redEnvelope) contextText = `[User sent a Transfer of ${redEnvelope.amount} CNY]`;
      if (location) contextText = `[User sent location: ${location.address}]`;
      if (file) contextText = `[User uploaded file: ${file.name}]\n${file.content}`;

      // Skip empty AI requests
      if (!contextText.trim() && !image) return;

      let responseText = await sendMessageToGemini(contextText, settings, image, file);
      
      if (currentIsCallActive) {
          // Update transcript for overlay but ALSO send message to chat
          setCallTranscript(responseText);
          // Fall through to add message to chat...
      }

      // Check for Emojis to trigger effects from BOT response
      if (responseText) {
        if (/❄️|雪/.test(responseText)) {
            setActiveEffect('snow');
            setTimeout(() => setActiveEffect(null), 5000);
        } else if (/❤️|💗|💓|💕|💖|💘|💝|爱/.test(responseText)) {
            setActiveEffect('love');
            setTimeout(() => setActiveEffect(null), 5000);
        }
      }

      let stickerToSend: string | null = null;
      if (responseText.includes("[STICKER]") && settings.stickerPack && settings.stickerPack.length > 0) {
        responseText = responseText.replace("[STICKER]", "").trim();
        const randomIndex = Math.floor(Math.random() * settings.stickerPack.length);
        stickerToSend = settings.stickerPack[randomIndex];
      }

      const partnerMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'partner',
        text: responseText,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, partnerMsg]);
      updateRandomAvatar();

      if (stickerToSend) {
         const stickerMsg: Message = {
          id: (Date.now() + 2).toString(),
          sender: 'partner',
          text: '',
          image: stickerToSend,
          timestamp: new Date(),
        };
        setTimeout(() => {
          setMessages(prev => [...prev, stickerMsg]);
        }, 300);
      }

      setStatus(SendingStatus.Idle);

    } catch (error) {
      console.error(error);
      setStatus(SendingStatus.Idle);
    }
  };

  const startCall = () => {
    setIsCallActive(true);
    setCallState('connecting');
    setCallTranscript("正在连接...");
    setIsMuted(false);
    setIsSpeakerOn(false);
    
    setTimeout(() => {
        setCallState('connected');
        setCallTranscript("");
        startSpeechRecognition();
    }, 2000);
  };

  const endCall = () => {
      setIsCallActive(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
  };

  const startSpeechRecognition = () => {
     if (!('webkitSpeechRecognition' in window)) {
        setCallTranscript("Browser does not support speech recognition.");
        return;
     }

     if (recognitionRef.current) return;

     // @ts-ignore
     const recognition = new window.webkitSpeechRecognition();
     recognition.lang = 'zh-CN';
     recognition.continuous = true;
     recognition.interimResults = false;
     
     recognition.onresult = (event: any) => {
         const current = event.resultIndex;
         const transcript = event.results[current][0].transcript;
         if (transcript.trim() && !isMutedRef.current) {
             handleSendMessage(transcript);
         }
     };
     
     recognition.onerror = (event: any) => {
         console.error("Speech Error", event.error);
         if (event.error === 'not-allowed') {
             setCallTranscript("Microphone permission denied.");
             endCall();
         }
     };

     recognition.onend = () => {
         if (isCallActiveRef.current) {
             try {
                recognition.start();
             } catch(e) {}
         }
     };
     
     recognitionRef.current = recognition;
     try {
        recognition.start();
     } catch (e) {
        console.error("Failed to start recognition", e);
     }
  };

  // Music Controls
  const playNext = () => {
      if (playlist.length === 0) return;
      setCurrentSongIndex(prev => (prev + 1) % playlist.length);
      setIsPlaying(true);
  };

  const playPrev = () => {
    if (playlist.length === 0) return;
    setCurrentSongIndex(prev => (prev - 1 + playlist.length) % playlist.length);
    setIsPlaying(true);
  };
  
  const removeSong = (id: string) => {
      setPlaylist(prev => {
          const newPlaylist = prev.filter(s => s.id !== id);
          if (newPlaylist.length === 0) {
              setIsMusicRoomOpen(false);
              setIsPlaying(false);
          } else if (currentSongIndex >= newPlaylist.length) {
              setCurrentSongIndex(0);
          }
          return newPlaylist;
      });
  };
  
  const resumeMusic = () => {
      if (playlist.length > 0) {
          setIsMusicRoomOpen(true);
          // Optional: Auto start playing
          // setIsPlaying(true);
      }
  };

  const handleOpenMusicRoom = (song: Song) => {
      const idx = playlist.findIndex(s => s.id === song.id);
      if (idx !== -1) {
          setCurrentSongIndex(idx);
          setIsMusicRoomOpen(true);
      } else {
          // If message song not in playlist, add it
          setPlaylist(prev => [...prev, song]);
          setCurrentSongIndex(playlist.length); // New last index
          setIsMusicRoomOpen(true);
          setIsPlaying(true);
      }
  }

  const handleCloseMusic = () => {
      setIsPlaying(false);
      setIsMusicRoomOpen(false);
      setIsMiniPlayerVisible(false);
  }

  // New state for visibility of mini player
  const [isMiniPlayerVisible, setIsMiniPlayerVisible] = useState(true);

  useEffect(() => {
      if (isMusicRoomOpen) {
          setIsMiniPlayerVisible(false);
      } else if (playlist.length > 0 && isPlaying) {
          setIsMiniPlayerVisible(true);
      }
  }, [isMusicRoomOpen, playlist.length, isPlaying]);

  const handlePhotoCaptured = (image: string) => {
      handleSendMessage("", image);
      setShowCamera(false);
  }

  return (
    <div className="relative flex flex-col h-full mx-auto max-w-lg md:max-w-2xl bg-white shadow-2xl overflow-hidden font-sans">
      <EffectOverlay type={activeEffect} />

      {/* Hidden Global Audio Element */}
      <audio 
          ref={audioRef}
          onTimeUpdate={handleAudioTimeUpdate}
          onEnded={handleAudioEnded}
      />

      {/* Dynamic Background */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-700"
        style={{ 
          backgroundImage: settings.backgroundImage ? `url(${settings.backgroundImage})` : 'none',
          backgroundColor: settings.backgroundImage ? 'transparent' : '#ffffff' 
        }}
      />
      
      {settings.backgroundImage && (
        <div className="absolute inset-0 z-0 bg-white/5" /> 
      )}

      {/* Header */}
      {!isCallActive ? (
        <header className="relative z-10 flex items-center justify-between px-4 py-3 bg-white/10 backdrop-blur-md border-b border-white/20 transition-all">
            <div className="flex items-center pl-2">
            <h1 className="font-semibold text-lg text-gray-800 tracking-tight drop-shadow-sm">{settings.partnerName}</h1>
            </div>
            
            <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/40 shadow-sm">
                <img src={settings.partnerAvatar} className="w-full h-full object-cover" alt="avatar" />
            </div>

            <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-gray-700 hover:bg-white/40 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
            </button>
            </div>
        </header>
      ) : (
        <div className="relative z-10 flex items-center justify-between px-4 py-4 bg-gray-900/95 text-white backdrop-blur-md shadow-lg transition-all border-b border-white/5">
             <div className="flex items-center space-x-3">
                 <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-green-500 shadow-md">
                    <img src={settings.partnerAvatar} alt="Partner" className="w-full h-full object-cover" />
                 </div>
                 <div className="flex flex-col">
                     <span className="font-bold text-sm tracking-wide">{settings.partnerName}</span>
                     <span className="text-xs text-green-400 font-mono flex items-center">
                         <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse mr-1.5"></span>
                         {formatTime(callDuration)}
                     </span>
                 </div>
             </div>
             <div className="px-3 py-1 bg-white/10 rounded-full text-[10px] text-white/70">
                 语音通话中
             </div>
        </div>
      )}

      {/* Mini Player Overlay (Zoom Out View) */}
      {!isMusicRoomOpen && isMiniPlayerVisible && playlist.length > 0 && currentSongIndex < playlist.length && (
          <MiniPlayer 
              song={playlist[currentSongIndex]} 
              isPlaying={isPlaying} 
              onOpen={() => setIsMusicRoomOpen(true)}
              onClose={() => { setIsPlaying(false); setIsMiniPlayerVisible(false); }}
              listenDuration={listenDuration}
              position={miniPlayerPos}
              setPosition={setMiniPlayerPos}
          />
      )}

      {/* Camera Full-Screen Overlay */}
      {showCamera && (
          <CameraPage 
             onClose={() => setShowCamera(false)}
             onCapture={handlePhotoCaptured}
          />
      )}

      {/* Chat Area */}
      <main className="relative z-10 flex-grow overflow-y-auto p-4 no-scrollbar">
        {messages.map((msg) => (
          <ChatBubble 
            key={msg.id} 
            message={msg} 
            settings={settings} 
            onFavorite={handleFavorite}
            isSaved={savedMessages.some(m => m.id === msg.id)}
            onOpenMusicRoom={handleOpenMusicRoom}
          />
        ))}
        {status === SendingStatus.Typing && (
          <div className="flex items-center space-x-1 mt-2 ml-4 opacity-60"><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div></div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Footer Area - Switches based on Mode */}
      {!isCallActive ? (
        <div className="relative z-20">
            <InputArea 
            inputText={inputText}
            setInputText={setInputText}
            onSendMessage={handleSendMessage} 
            disabled={status !== SendingStatus.Idle && status !== SendingStatus.Typing} 
            hasSavedMusic={playlist.length > 0}
            onResumeMusic={resumeMusic}
            onOpenCamera={() => setShowCamera(true)}
            />
        </div>
      ) : (
        <div className="relative z-20 pb-8 pt-6 px-6 bg-gray-900/95 backdrop-blur-md border-t border-white/5 flex flex-col items-center justify-center space-y-4">
             {/* Visualizer */}
             <div className="flex items-center space-x-1 h-8 mb-2">
                 {[1,2,3,4,5,6,7].map(i => (
                     <div key={i} className="w-1 bg-green-500 rounded-full animate-breathe" style={{ height: Math.random() * 20 + 10 + 'px', animationDuration: Math.random() + 0.5 + 's' }}></div>
                 ))}
             </div>
             
             {/* Call Controls */}
             <div className="flex items-center justify-center space-x-8 w-full max-w-xs">
                 <button onClick={() => setIsMuted(!isMuted)} className={`p-4 rounded-full transition-all ${isMuted ? 'bg-white text-gray-900' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                    {isMuted ? <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg> : <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>}
                 </button>
                 
                 <button onClick={endCall} className="p-5 bg-red-500 rounded-full text-white shadow-xl hover:bg-red-600 hover:scale-105 transition-transform active:scale-95">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .55-.32 1.02-.82 1.27-1.35.65-2.53 1.58-3.53 2.7-.37.41-1 .41-1.38 0l-1.3-1.3c-.38-.38-.38-1 0-1.38C2.69 11.66 7.11 9.5 12 9.5s9.31 2.16 11.63 4.61c.38.38.38 1 0 1.38l-1.3 1.3c-.38.38-1 .38-1.38 0-1-1.12-2.18-2.05-3.53-2.7-.5-.25-.82-.72-.82-1.27v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
                 </button>

                 <button onClick={() => setIsSpeakerOn(!isSpeakerOn)} className={`p-4 rounded-full transition-all ${isSpeakerOn ? 'bg-white text-gray-900' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                 </button>
             </div>
        </div>
      )}

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings}
        onSave={setSettings}
        savedMessages={savedMessages}
      />
      
      {/* MUSIC ROOM OVERLAY (Zoom In View) */}
      {isMusicRoomOpen && playlist.length > 0 && (
          <MusicRoom 
            currentSong={playlist[currentSongIndex]} 
            playlist={playlist}
            isPlaying={isPlaying}
            onClose={() => setIsMusicRoomOpen(false)} // Now just minimizes
            onPlayPause={() => setIsPlaying(!isPlaying)}
            onNext={playNext}
            onPrev={playPrev}
            onSelectSong={(song) => {
                const idx = playlist.findIndex(s => s.id === song.id);
                if (idx !== -1) {
                    setCurrentSongIndex(idx);
                    setIsPlaying(true);
                }
            }}
            onRemoveSong={removeSong}
            userAvatar={settings.userAvatar}
            partnerAvatar={settings.partnerAvatar}
            currentTime={audioCurrentTime}
            duration={audioDuration}
            listenDuration={listenDuration}
          />
      )}
    </div>
  );
};

export default App;
