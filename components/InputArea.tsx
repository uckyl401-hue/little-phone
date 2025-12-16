
import React, { useState, useRef, useEffect } from 'react';

interface InputAreaProps {
  inputText: string;
  setInputText: (text: string) => void;
  onSendMessage: (
      text: string, 
      image?: string, 
      file?: {name: string, content: string}, 
      location?: {address: string}, 
      audioBlob?: Blob, 
      redEnvelope?: {amount: string}, 
      audioDuration?: number,
      music?: { id: string; title: string; artist: string; coverUrl: string; audioUrl: string; lyrics?: string }
  ) => void;
  disabled: boolean;
  hasSavedMusic?: boolean;
  onResumeMusic?: () => void;
  onOpenCamera: () => void;
}

const InputArea: React.FC<InputAreaProps> = ({ inputText, setInputText, onSendMessage, disabled, hasSavedMusic, onResumeMusic, onOpenCamera }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{name: string, content: string} | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  // Modals inside InputArea
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [locationAddress, setLocationAddress] = useState("Chang'an Cyber City, District 9");
  
  const [showRedEnvelopeInput, setShowRedEnvelopeInput] = useState(false);
  const [redEnvelopeAmount, setRedEnvelopeAmount] = useState("520.0");

  const [showMusicInput, setShowMusicInput] = useState(false);
  const [musicUrlInput, setMusicUrlInput] = useState("");
  const [isParsingMusic, setIsParsingMusic] = useState(false);
  const [parsedMusic, setParsedMusic] = useState<{ id: string; title: string; artist: string; coverUrl: string; audioUrl: string; lyrics?: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  
  // Music refs
  const musicFileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const lyricsFileInputRef = useRef<HTMLInputElement>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);

  const handleSend = () => {
    if ((!inputText.trim() && !selectedImage && !selectedFile) || disabled) return;
    
    onSendMessage(inputText, selectedImage || undefined, selectedFile || undefined);
    
    setSelectedImage(null);
    setSelectedFile(null);
    setIsMenuOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setIsMenuOpen(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setSelectedFile({ name: file.name, content: text });
        setIsMenuOpen(false);
      };
      reader.readAsText(file);
    }
  };

  // --- Location Logic ---
  const confirmLocation = () => {
      onSendMessage("", undefined, undefined, { address: locationAddress });
      setShowLocationInput(false);
      setIsMenuOpen(false);
  };

  // --- Transfer Logic ---
  const confirmRedEnvelope = () => {
      onSendMessage("", undefined, undefined, undefined, undefined, { amount: redEnvelopeAmount });
      setShowRedEnvelopeInput(false);
      setIsMenuOpen(false);
  }

  // --- Music Logic ---
  const parseMusicUrl = () => {
      if (!musicUrlInput) return;
      setIsParsingMusic(true);
      
      setTimeout(() => {
          setIsParsingMusic(false);
          
          let title = "未知歌曲";
          try {
             const urlParts = musicUrlInput.split('/');
             const filename = urlParts[urlParts.length - 1];
             if (filename) {
                 title = decodeURIComponent(filename.split('?')[0]);
                 if (title.lastIndexOf('.') > 0) {
                     title = title.substring(0, title.lastIndexOf('.'));
                 }
             }
          } catch (e) {
             title = "Music Track";
          }

          const defaultCover = "https://api.dicebear.com/9.x/vinyl/svg?seed=" + (title || "Music");

          setParsedMusic({
              id: Date.now().toString(),
              title: title,
              artist: "", 
              coverUrl: defaultCover,
              audioUrl: musicUrlInput,
              lyrics: ""
          });
      }, 600);
  };

  const handleMusicFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const objectUrl = URL.createObjectURL(file);
        let title = file.name;
        if (title.lastIndexOf('.') > 0) {
            title = title.substring(0, title.lastIndexOf('.'));
        }

        setParsedMusic({
            id: Date.now().toString(),
            title: title,
            artist: "",
            coverUrl: "https://api.dicebear.com/9.x/vinyl/svg?seed=" + title,
            audioUrl: objectUrl,
            lyrics: ""
        });
        setMusicUrlInput("");
    }
  };

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && parsedMusic) {
          const reader = new FileReader();
          reader.onload = () => {
              setParsedMusic({ ...parsedMusic, coverUrl: reader.result as string });
          };
          reader.readAsDataURL(file);
      }
  };

  const handleLyricsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && parsedMusic) {
          const reader = new FileReader();
          reader.onload = () => {
              setParsedMusic({ ...parsedMusic, lyrics: reader.result as string });
          };
          reader.readAsText(file);
      }
  };

  const confirmMusic = () => {
      if (parsedMusic) {
          onSendMessage("", undefined, undefined, undefined, undefined, undefined, undefined, parsedMusic);
          setShowMusicInput(false);
          setIsMenuOpen(false);
          setMusicUrlInput("");
          setParsedMusic(null);
      }
  };

  const handleResumeClick = () => {
      if (onResumeMusic) {
          onResumeMusic();
          setShowMusicInput(false);
          setIsMenuOpen(false);
      }
  }

  const handleCameraClick = () => {
      setIsMenuOpen(false);
      onOpenCamera();
  }

  // --- Audio Recording Logic ---
  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Microphone not supported");
        return;
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        recordingStartTimeRef.current = Date.now();

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunksRef.current.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const duration = Math.round((Date.now() - recordingStartTimeRef.current) / 1000);
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const finalDuration = duration < 1 ? 1 : duration;
            onSendMessage("", undefined, undefined, undefined, audioBlob, undefined, finalDuration);
        };

        mediaRecorder.start();
        setIsRecording(true);
    } catch (e) {
        console.error("Mic error", e);
    }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
      }
  };

  const MenuButton = ({ label, icon, onClick }: { label: string, icon: React.ReactNode, onClick: () => void }) => (
    <button 
      onClick={onClick}
      className="flex flex-col items-center justify-center space-y-2 p-2 hover:bg-white/10 rounded-xl transition-colors"
    >
      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm text-gray-700 hover:scale-105 transition-transform">
        {icon}
      </div>
      <span className="text-xs text-gray-600 font-medium">{label}</span>
    </button>
  );

  return (
    <div className="bg-white/30 backdrop-blur-md border-t border-white/20 shadow-lg relative z-50">
      
      {/* Location Input Overlay */}
      {showLocationInput && (
          <div className="absolute bottom-full left-0 w-full p-4 bg-white shadow-2xl animate-pop-in z-50 rounded-t-3xl border-t border-gray-100">
              <h3 className="text-sm font-bold text-gray-700 mb-2">发送位置</h3>
              <input 
                type="text" 
                value={locationAddress} 
                onChange={e => setLocationAddress(e.target.value)}
                className="w-full p-3 bg-gray-100 text-gray-900 rounded-xl border-none focus:ring-2 focus:ring-pink-300 mb-3"
              />
              <div className="flex space-x-2">
                  <button onClick={() => setShowLocationInput(false)} className="flex-1 py-2 bg-gray-200 rounded-xl text-gray-600">取消</button>
                  <button onClick={confirmLocation} className="flex-1 py-2 bg-pink-500 text-white rounded-xl font-bold">发送</button>
              </div>
          </div>
      )}

      {/* Transfer Input Overlay */}
      {showRedEnvelopeInput && (
          <div className="absolute bottom-full left-0 w-full p-4 bg-white shadow-2xl animate-pop-in z-50 rounded-t-3xl border-t border-gray-100">
              <h3 className="text-sm font-bold text-gray-700 mb-2">转账金额 (CNY)</h3>
              <input 
                type="number" 
                value={redEnvelopeAmount} 
                onChange={e => setRedEnvelopeAmount(e.target.value)}
                className="w-full p-3 bg-gray-100 text-gray-900 rounded-xl border-none focus:ring-2 focus:ring-pink-300 mb-3"
                placeholder="0.00"
              />
              <div className="flex space-x-2">
                  <button onClick={() => setShowRedEnvelopeInput(false)} className="flex-1 py-2 bg-gray-200 rounded-xl text-gray-600">取消</button>
                  <button onClick={confirmRedEnvelope} className="flex-1 py-2 bg-pink-500 text-white rounded-xl font-bold">确认</button>
              </div>
          </div>
      )}

       {/* Music Input Overlay */}
       {showMusicInput && (
          <div className="absolute bottom-full left-0 w-full p-5 bg-white shadow-2xl animate-pop-in z-50 rounded-t-3xl border-t border-gray-100 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-3">
                  <h3 className="text-base font-bold text-gray-800 flex items-center">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                       </svg>
                       一起听 (Listen Together)
                  </h3>
                  <div className="flex items-center space-x-2">
                    {hasSavedMusic && !parsedMusic && (
                        <button onClick={handleResumeClick} className="text-xs bg-pink-100 text-pink-600 px-3 py-1 rounded-full font-bold hover:bg-pink-200 transition-colors flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            继续听
                        </button>
                    )}
                    <button onClick={() => setShowMusicInput(false)} className="p-1 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                  </div>
              </div>
              
              {!parsedMusic ? (
                  <>
                    <p className="text-xs text-gray-500 mb-2">粘贴链接 或 上传本地文件:</p>
                    <div className="flex flex-col space-y-3 mb-3">
                        {/* URL Input */}
                        <div className="flex space-x-2">
                            <input 
                                type="text" 
                                value={musicUrlInput} 
                                onChange={e => setMusicUrlInput(e.target.value)}
                                className="flex-1 p-3 bg-gray-100 text-gray-900 rounded-xl border-none focus:ring-2 focus:ring-pink-300 text-sm"
                                placeholder="https://example.com/song.mp3"
                            />
                            <button 
                                onClick={parseMusicUrl} 
                                disabled={!musicUrlInput || isParsingMusic}
                                className="px-4 bg-black text-white rounded-xl font-medium text-sm disabled:opacity-50"
                            >
                                {isParsingMusic ? '...' : '解析'}
                            </button>
                        </div>
                        
                        <div className="relative flex py-1 items-center">
                            <div className="flex-grow border-t border-gray-200"></div>
                            <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">OR</span>
                            <div className="flex-grow border-t border-gray-200"></div>
                        </div>

                        <button 
                            onClick={() => musicFileInputRef.current?.click()}
                            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 text-sm font-medium hover:bg-gray-50 hover:border-pink-300 transition-all flex items-center justify-center bg-gray-50"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            上传本地音乐 (Upload MP3)
                        </button>
                        <input type="file" ref={musicFileInputRef} accept="audio/*" className="hidden" onChange={handleMusicFileChange} />
                    </div>
                  </>
              ) : (
                  <div className="space-y-4 mb-4 animate-fade-in">
                      {/* Song Info */}
                      <div className="flex space-x-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                           {/* Cover Image Preview & Upload */}
                           <div 
                              className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200 relative group cursor-pointer"
                              onClick={() => coverFileInputRef.current?.click()}
                           >
                              <img src={parsedMusic.coverUrl} className="w-full h-full object-cover" alt="cover" onError={(e) => (e.currentTarget.src='https://api.dicebear.com/9.x/vinyl/svg?seed=Error')} />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <span className="text-white text-xs text-center font-bold px-1">更换<br/>封面</span>
                              </div>
                           </div>
                           <input type="file" ref={coverFileInputRef} accept="image/*" className="hidden" onChange={handleCoverFileChange} />

                          <div className="flex-1 min-w-0 space-y-2">
                              <input 
                                value={parsedMusic.title}
                                onChange={e => setParsedMusic({...parsedMusic, title: e.target.value})}
                                className="w-full bg-transparent font-bold text-gray-800 text-sm focus:outline-none border-b border-dashed border-gray-300"
                                placeholder="歌名 (Title)"
                              />
                              <input 
                                value={parsedMusic.artist}
                                onChange={e => setParsedMusic({...parsedMusic, artist: e.target.value})}
                                className="w-full bg-transparent text-xs text-gray-500 focus:outline-none border-b border-dashed border-gray-300"
                                placeholder="歌手 (Artist)"
                              />
                              <input 
                                value={parsedMusic.coverUrl}
                                onChange={e => setParsedMusic({...parsedMusic, coverUrl: e.target.value})}
                                className="w-full bg-transparent text-[10px] text-gray-400 focus:outline-none border-b border-dashed border-gray-300"
                                placeholder="封面图片链接 (Cover URL)"
                              />
                          </div>
                      </div>

                      {/* Lyrics Input */}
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                          <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-bold text-gray-500">歌词 (Lyrics/LRC)</span>
                              <button 
                                onClick={() => lyricsFileInputRef.current?.click()}
                                className="text-[10px] bg-white border border-gray-200 px-2 py-1 rounded-lg text-gray-600 hover:bg-gray-100"
                              >
                                  上传 .lrc / .txt
                              </button>
                              <input type="file" ref={lyricsFileInputRef} accept=".lrc,.txt" className="hidden" onChange={handleLyricsFileChange} />
                          </div>
                          <textarea 
                              value={parsedMusic.lyrics || ''}
                              onChange={e => setParsedMusic({...parsedMusic, lyrics: e.target.value})}
                              className="w-full h-20 bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-600 focus:outline-none resize-none no-scrollbar"
                              placeholder="[00:00.00] 粘贴 LRC 歌词以滚动显示..."
                          />
                      </div>

                      <div className="flex space-x-2">
                          <button onClick={() => {setShowMusicInput(false); setParsedMusic(null);}} className="flex-1 py-3 bg-gray-200 rounded-xl text-gray-600 font-medium">取消</button>
                          <button 
                            onClick={confirmMusic} 
                            disabled={!parsedMusic}
                            className="flex-1 py-3 bg-pink-500 text-white rounded-xl font-bold disabled:opacity-50 shadow-lg hover:bg-pink-600 transition-colors"
                          >
                              添加到播放列表
                          </button>
                      </div>
                  </div>
              )}
          </div>
      )}

      {/* Attachments Preview Area */}
      {(selectedImage || selectedFile) && (
        <div className="flex items-center px-4 pt-4 animate-fade-in space-x-3">
          
          {selectedImage && (
            <div className="relative">
              <img src={selectedImage} alt="Preview" className="h-20 w-20 object-cover rounded-xl border-2 border-white shadow-md" />
              <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 shadow-md hover:bg-black">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </button>
            </div>
          )}

          {selectedFile && (
             <div className="relative bg-white/60 p-3 rounded-xl border border-white/40 flex items-center space-x-2 max-w-[200px]">
                <div className="bg-blue-500 text-white p-2 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <span className="text-xs text-gray-700 truncate font-medium">{selectedFile.name}</span>
                <button onClick={() => setSelectedFile(null)} className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 shadow-md hover:bg-black">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
             </div>
          )}
        </div>
      )}

      {/* Main Input Bar */}
      <div className="flex items-end space-x-2 p-3 max-w-4xl mx-auto">
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`p-3 rounded-full transition-all duration-300 shadow-sm flex-shrink-0 outline-none border-none ring-0 ${isMenuOpen ? 'bg-gray-800 text-white rotate-45' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </button>

        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
        <input type="file" ref={docInputRef} className="hidden" accept=".txt,.md,.json,.csv" onChange={handleDocChange} />

        <div className="flex-grow relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? "松开结束录音..." : (selectedFile ? "输入关于文件的要求..." : "发消息...")}
            rows={1}
            disabled={disabled || isRecording}
            className={`w-full bg-white border-none rounded-2xl py-3 px-5 focus:ring-0 focus:outline-none resize-none no-scrollbar text-lg text-gray-800 placeholder-gray-400 shadow-inner transition-all ${isRecording ? 'bg-red-50 text-red-500' : ''}`}
            style={{ minHeight: '54px' }}
          />
        </div>

        {!inputText.trim() && !selectedImage && !selectedFile && (
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            className={`p-3 rounded-full transition-all shadow-md transform flex-shrink-0 select-none ${isRecording ? 'bg-red-500 text-white animate-pulse scale-125' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          </button>
        )}

        {(inputText.trim() || selectedImage || selectedFile) && (
          <button 
            onClick={handleSend}
            className="p-3 rounded-full bg-pink-500 text-white hover:bg-pink-600 transition-all shadow-md transform hover:scale-105 active:scale-95 flex-shrink-0 animate-pop-in"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform rotate-90" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
          </button>
        )}
      </div>

      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isMenuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-6 pt-2 pb-8 grid grid-cols-4 gap-4 md:gap-8 max-w-4xl mx-auto">
          <MenuButton label="相册" onClick={() => fileInputRef.current?.click()} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />
          <MenuButton label="拍摄" onClick={handleCameraClick} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
          <MenuButton label="位置" onClick={() => { setShowLocationInput(true); }} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
          <MenuButton label="文件" onClick={() => docInputRef.current?.click()} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
          <MenuButton label="转账" onClick={() => setShowRedEnvelopeInput(true)} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>} />
          <MenuButton label="一起听" onClick={() => setShowMusicInput(true)} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>} />
        </div>
      </div>
    </div>
  );
};

export default InputArea;
