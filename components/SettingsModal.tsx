
import React, { useRef, useEffect, useState } from 'react';
import { UserSettings, Message } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (newSettings: UserSettings) => void;
  savedMessages: Message[];
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave, savedMessages }) => {
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
  const [activeTab, setActiveTab] = useState<'settings' | 'persona' | 'favorites'>('settings');
  
  // Cropper State
  const [cropperImage, setCropperImage] = useState<string | null>(null);
  const [cropScale, setCropScale] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startDrag, setStartDrag] = useState({ x: 0, y: 0 });
  const [cropTarget, setCropTarget] = useState<'partnerAvatar' | 'userAvatar' | null>(null);

  const partnerAvatarRef = useRef<HTMLInputElement>(null);
  const userAvatarRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const stickerInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Refs for cropping math
  const imageRef = useRef<HTMLImageElement>(null);
  const cropBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
    }
  }, [isOpen, settings]);

  const handleChange = (key: keyof UserSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  // --- Image Handling & Cropper Logic ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: 'partnerAvatar' | 'userAvatar' | 'backgroundImage') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (key === 'backgroundImage') {
           setLocalSettings(prev => ({ ...prev, [key]: result }));
        } else {
           // Open Cropper
           setCropperImage(result);
           setCropTarget(key as 'partnerAvatar' | 'userAvatar');
           // Reset crop state
           setCropScale(1);
           setCropOffset({ x: 0, y: 0 });
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset Input so same file can be selected again
    e.target.value = '';
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      setStartDrag({ x: e.clientX - cropOffset.x, y: e.clientY - cropOffset.y });
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      setCropOffset({
          x: e.clientX - startDrag.x,
          y: e.clientY - startDrag.y
      });
  };

  const handleMouseUp = () => setIsDragging(false);

  const performCrop = () => {
      if (!canvasRef.current || !imageRef.current || !cropBoxRef.current || !cropTarget) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = imageRef.current;
      const cropBox = cropBoxRef.current;

      // 1. Get rectangles relative to viewport
      const cropRect = cropBox.getBoundingClientRect();
      const imgRect = img.getBoundingClientRect();

      // 2. Set canvas size to a decent resolution (e.g., 500x500)
      const outputSize = 500;
      canvas.width = outputSize;
      canvas.height = outputSize;

      if (ctx) {
        // 3. Calculate mapping ratios
        // We want to map the pixels under cropRect to the canvas
        
        // Horizontal ratio: natural width / displayed width
        const scaleX = img.naturalWidth / imgRect.width;
        const scaleY = img.naturalHeight / imgRect.height;

        // Calculate the position of the crop box relative to the image
        // (Remember: cropRect.left - imgRect.left gives the x offset of the box inside the image)
        // If imgRect.left > cropRect.left, the image starts to the right of the crop box (empty space on left)
        
        const pixelX = (cropRect.left - imgRect.left) * scaleX;
        const pixelY = (cropRect.top - imgRect.top) * scaleY;
        const pixelWidth = cropRect.width * scaleX;
        const pixelHeight = cropRect.height * scaleY;

        // Fill background white
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, outputSize, outputSize);

        // Draw the slice of the image
        ctx.drawImage(
            img,
            pixelX, pixelY, pixelWidth, pixelHeight, // Source rectangle
            0, 0, outputSize, outputSize             // Destination rectangle
        );

        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);

        if (cropTarget === 'partnerAvatar') {
            setLocalSettings(prev => ({ 
                ...prev, 
                partnerAvatar: croppedDataUrl,
                partnerAvatarList: [...(prev.partnerAvatarList || []), croppedDataUrl]
            }));
        } else {
            setLocalSettings(prev => ({ ...prev, [cropTarget]: croppedDataUrl }));
        }
        
        setCropperImage(null);
        setCropTarget(null);
      }
  };


  const removePartnerAvatar = (index: number) => {
      const newList = localSettings.partnerAvatarList.filter((_, i) => i !== index);
      if (newList.length === 0) return; 
      setLocalSettings(prev => ({
          ...prev,
          partnerAvatarList: newList,
          partnerAvatar: newList[0] 
      }));
  };

  const handleStickerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newStickers: string[] = [];
      let processedCount = 0;
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) newStickers.push(reader.result as string);
          processedCount++;
          if (processedCount === files.length) {
            setLocalSettings(prev => ({ ...prev, stickerPack: [...(prev.stickerPack || []), ...newStickers] }));
          }
        };
        reader.readAsDataURL(file as Blob);
      });
    }
    // Reset
    e.target.value = '';
  };

  const removeSticker = (index: number) => {
    setLocalSettings(prev => ({ ...prev, stickerPack: prev.stickerPack.filter((_, i) => i !== index) }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 backdrop-blur-[2px] animate-fade-in">
      
      {/* CROPPER MODAL OVERLAY */}
      {cropperImage && (
          <div className="absolute inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-4 animate-fade-in">
              <div className="bg-[#1c1c1e] text-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-white/10 flex flex-col items-center">
                  <h3 className="text-center font-bold mb-6 text-lg tracking-wide">调整头像</h3>
                  
                  {/* Cropper Container */}
                  <div className="relative w-[280px] h-[280px] mb-6 flex items-center justify-center">
                      
                      {/* Fixed Crop Frame (The Window) */}
                      <div 
                        ref={cropBoxRef}
                        className="absolute inset-0 z-20 border-2 border-white rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] pointer-events-none"
                      ></div>

                      {/* Movable Image Container */}
                      <div 
                        className="w-full h-full cursor-move touch-none flex items-center justify-center"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onTouchStart={(e) => {
                            setIsDragging(true);
                            setStartDrag({ x: e.touches[0].clientX - cropOffset.x, y: e.touches[0].clientY - cropOffset.y });
                        }}
                        onTouchMove={(e) => {
                            if (!isDragging) return;
                            setCropOffset({
                                x: e.touches[0].clientX - startDrag.x,
                                y: e.touches[0].clientY - startDrag.y
                            });
                        }}
                        onTouchEnd={() => setIsDragging(false)}
                      >
                         <img 
                            ref={imageRef}
                            src={cropperImage} 
                            alt="Crop target"
                            className="max-w-none select-none pointer-events-none"
                            style={{ 
                                transform: `translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${cropScale})`,
                                width: '280px',
                                height: 'auto'
                            }}
                            draggable={false}
                         />
                      </div>
                  </div>
                  
                  {/* Zoom Removed as requested */}

                  <div className="flex space-x-3 w-full">
                      <button onClick={() => setCropperImage(null)} className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors">取消</button>
                      <button onClick={performCrop} className="flex-1 py-3 bg-white text-black hover:bg-gray-200 rounded-xl font-bold transition-colors">确认</button>
                  </div>
                  
                  {/* Hidden Canvas */}
                  <canvas ref={canvasRef} className="hidden"></canvas>
              </div>
          </div>
      )}

      <div className="bg-white/60 backdrop-blur-3xl w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/50">
        
        {/* Header Tabs */}
        <div className="px-6 py-4 border-b border-white/20 flex justify-between items-center bg-white/40">
          <div className="flex space-x-4">
            <button 
              onClick={() => setActiveTab('settings')}
              className={`text-sm font-bold transition-colors ${activeTab === 'settings' ? 'text-gray-900 border-b-2 border-black' : 'text-gray-500'}`}
            >
              设置
            </button>
            <button 
              onClick={() => setActiveTab('persona')}
              className={`text-sm font-bold transition-colors ${activeTab === 'persona' ? 'text-gray-900 border-b-2 border-black' : 'text-gray-500'}`}
            >
              人设
            </button>
            <button 
              onClick={() => setActiveTab('favorites')}
              className={`text-sm font-bold transition-colors ${activeTab === 'favorites' ? 'text-gray-900 border-b-2 border-black' : 'text-gray-500'}`}
            >
              收藏夹
            </button>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-8 no-scrollbar flex-1">
          
          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <>
               {/* Avatars & Background */}
               <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-400/20 pb-1">个人资料</h3>
                <div className="space-y-6">
                  {/* Partner Name & Avatar List */}
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-2">对方昵称 & 头像库</label>
                    <div className="flex items-center space-x-3 mb-3">
                         <input type="text" value={localSettings.partnerName} onChange={(e) => handleChange('partnerName', e.target.value)} className="flex-1 px-3 py-2 bg-white/50 border border-white/40 rounded-xl focus:outline-none text-sm text-black" placeholder="对方昵称" />
                    </div>
                    
                    {/* Avatar Grid */}
                    <div className="grid grid-cols-5 gap-2">
                        {localSettings.partnerAvatarList?.map((avatar, idx) => (
                             <div key={idx} className={`relative aspect-square rounded-full border-2 overflow-hidden cursor-pointer ${localSettings.partnerAvatar === avatar ? 'border-pink-500' : 'border-white/50'}`}
                                onClick={() => handleChange('partnerAvatar', avatar)}
                             >
                                <img src={avatar} className="w-full h-full object-cover" alt="partner"/>
                                {localSettings.partnerAvatarList.length > 1 && (
                                    <button onClick={(e) => {e.stopPropagation(); removePartnerAvatar(idx)}} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 text-white text-xs">X</button>
                                )}
                             </div>
                        ))}
                        <button onClick={() => partnerAvatarRef.current?.click()} className="aspect-square rounded-full border-2 border-dashed border-gray-400/50 flex items-center justify-center text-gray-500 hover:bg-white/20">
                            +
                        </button>
                    </div>
                    <input type="file" ref={partnerAvatarRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'partnerAvatar')} />
                  </div>

                  {/* User Name & Avatar */}
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-2">我的头像 & 昵称</label>
                     <div className="flex items-center space-x-3">
                      <div className="relative group cursor-pointer" onClick={() => userAvatarRef.current?.click()}>
                         <img src={localSettings.userAvatar} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" alt="me"/>
                         <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"><span className="text-white text-xs">改</span></div>
                      </div>
                      <input type="text" value={localSettings.userName} onChange={(e) => handleChange('userName', e.target.value)} className="flex-1 px-3 py-2 bg-white/50 border border-white/40 rounded-xl focus:outline-none text-sm text-black" placeholder="我的昵称" />
                      <input type="file" ref={userAvatarRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'userAvatar')} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-2">背景图片</label>
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-lg border-2 border-white/40 shadow-sm bg-cover bg-center" style={{ backgroundImage: localSettings.backgroundImage ? `url(${localSettings.backgroundImage})` : 'none', backgroundColor: '#f9fafb' }} />
                      <button onClick={() => bgInputRef.current?.click()} className="px-4 py-2 bg-white/40 text-gray-700 text-sm font-medium rounded-lg hover:bg-white/60 transition-colors border border-white/30">选择</button>
                      <button onClick={() => handleChange('backgroundImage', '')} className="px-3 py-2 text-gray-500 text-sm hover:text-red-400 transition-colors">清除</button>
                      <input type="file" ref={bgInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'backgroundImage')} />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* LANGUAGE SETTINGS */}
              <div>
                 <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
                    语言 (Language)
                </h3>
                <div className="flex bg-white/50 rounded-xl p-1 gap-1">
                   {['Chinese', 'English', 'Japanese', 'Korean'].map(lang => (
                        <button 
                            key={lang}
                            onClick={() => handleChange('language', lang)}
                            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${localSettings.language === lang ? 'bg-black text-white shadow-md' : 'text-gray-600 hover:bg-white/50'}`}
                        >
                            {lang}
                        </button>
                   ))}
                </div>
              </div>

              {/* AI MODEL SELECTION */}
               <div>
                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    AI 模型 (Model)
                </h3>
                <div className="flex flex-col space-y-2 bg-white/40 p-1 rounded-2xl">
                    {[
                        { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
                        { id: 'gemini-3-pro-preview', label: 'Gemini 3.0 Pro' },
                        { id: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek V3 (SiliconFlow)' },
                        { id: 'deepseek-ai/DeepSeek-R1', label: 'DeepSeek R1 (SiliconFlow)' },
                        { id: 'Qwen/Qwen2.5-72B-Instruct', label: 'Qwen 2.5 72B (SiliconFlow)' },
                        { id: 'Qwen/Qwen2.5-32B-Instruct', label: 'Qwen 2.5 32B (SiliconFlow)' },
                        { id: 'Qwen/Qwen2.5-14B-Instruct', label: 'Qwen 2.5 14B (SiliconFlow)' },
                        { id: 'Qwen/Qwen2.5-7B-Instruct', label: 'Qwen 2.5 7B (SiliconFlow)' },
                        { id: 'Qwen/Qwen2.5-Coder-32B-Instruct', label: 'Qwen 2.5 Coder 32B' },
                        { id: 'deepseek-r1', label: 'Deepseek (Direct)' },
                        { id: 'claude-3-5-sonnet-20240620', label: 'Claude 3.5 Sonnet' }
                    ].map((model) => (
                        <button
                            key={model.id}
                            onClick={() => handleChange('modelId', model.id)}
                            className={`
                                relative w-full text-left px-5 py-3 rounded-xl transition-all flex justify-between items-center
                                ${localSettings.modelId === model.id ? 'bg-black text-white shadow-lg' : 'hover:bg-white/50 text-gray-500'}
                            `}
                        >
                            <span className="font-medium text-sm">{model.label}</span>
                            {localSettings.modelId === model.id && (
                                <div className="w-2 h-2 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
                            )}
                        </button>
                    ))}
                </div>
              </div>

              {/* Font Settings */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-400/20 pb-1">字体设置</h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-800">字体样式</span>
                        <div className="flex space-x-2">
                             <button onClick={() => handleChange('fontFamily', 'sans')} className={`px-3 py-1 text-xs rounded-md ${localSettings.fontFamily === 'sans' ? 'bg-black text-white' : 'bg-white/50'}`}>Sans</button>
                             <button onClick={() => handleChange('fontFamily', 'serif')} className={`px-3 py-1 text-xs rounded-md font-serif ${localSettings.fontFamily === 'serif' ? 'bg-black text-white' : 'bg-white/50'}`}>Serif</button>
                             <button onClick={() => handleChange('fontFamily', 'mono')} className={`px-3 py-1 text-xs rounded-md font-mono ${localSettings.fontFamily === 'mono' ? 'bg-black text-white' : 'bg-white/50'}`}>Mono</button>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-800">字体大小</span>
                        <div className="flex space-x-2">
                             <button onClick={() => handleChange('fontSize', 'small')} className={`px-3 py-1 text-xs rounded-md ${localSettings.fontSize === 'small' ? 'bg-black text-white' : 'bg-white/50'}`}>小</button>
                             <button onClick={() => handleChange('fontSize', 'medium')} className={`px-3 py-1 text-xs rounded-md ${localSettings.fontSize === 'medium' ? 'bg-black text-white' : 'bg-white/50'}`}>中</button>
                             <button onClick={() => handleChange('fontSize', 'large')} className={`px-3 py-1 text-xs rounded-md ${localSettings.fontSize === 'large' ? 'bg-black text-white' : 'bg-white/50'}`}>大</button>
                        </div>
                    </div>
                </div>
              </div>

              {/* API Keys */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-400/20 pb-1">API 配置</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">Gemini API Key</label>
                    <input 
                      type="password" 
                      value={localSettings.geminiKey}
                      onChange={(e) => handleChange('geminiKey', e.target.value)}
                      className="w-full px-4 py-2 bg-white/50 border border-white/40 rounded-xl focus:ring-2 focus:ring-black/10 focus:outline-none text-sm shadow-sm text-black"
                      placeholder="AI Studio Key (Optional)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">SiliconFlow API Key (Recommended)</label>
                    <input 
                      type="password" 
                      value={localSettings.siliconFlowKey}
                      onChange={(e) => handleChange('siliconFlowKey', e.target.value)}
                      className="w-full px-4 py-2 bg-white/50 border border-white/40 rounded-xl focus:ring-2 focus:ring-black/10 focus:outline-none text-sm shadow-sm text-black"
                      placeholder="sk-..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">DeepSeek API Key (Direct)</label>
                    <input 
                      type="password" 
                      value={localSettings.deepSeekKey}
                      onChange={(e) => handleChange('deepSeekKey', e.target.value)}
                      className="w-full px-4 py-2 bg-white/50 border border-white/40 rounded-xl focus:ring-2 focus:ring-black/10 focus:outline-none text-sm shadow-sm text-black"
                      placeholder="sk-..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">Claude API Key</label>
                    <input 
                      type="password" 
                      value={localSettings.claudeKey}
                      onChange={(e) => handleChange('claudeKey', e.target.value)}
                      className="w-full px-4 py-2 bg-white/50 border border-white/40 rounded-xl focus:ring-2 focus:ring-black/10 focus:outline-none text-sm shadow-sm text-black"
                      placeholder="sk-ant-..."
                    />
                  </div>
                </div>
              </div>

              {/* Stickers */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-400/20 pb-1">表情包设置</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-800">发送频率 ({localSettings.stickerFrequency}%)</label>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={localSettings.stickerFrequency}
                      onChange={(e) => handleChange('stickerFrequency', Number(e.target.value))}
                      className="w-full h-2 bg-white/30 rounded-lg appearance-none cursor-pointer border border-white/20"
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {localSettings.stickerPack?.map((sticker, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg border border-white/40 overflow-hidden group">
                        <img src={sticker} alt="sticker" className="w-full h-full object-cover" />
                        <button onClick={() => removeSticker(idx)} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                           <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ))}
                    <button onClick={() => stickerInputRef.current?.click()} className="aspect-square rounded-lg border-2 border-dashed border-gray-400/50 flex flex-col items-center justify-center text-gray-500 hover:bg-white/20 transition-colors">
                      <span className="text-xl font-light">+</span>
                    </button>
                  </div>
                  <input type="file" ref={stickerInputRef} className="hidden" accept="image/*" multiple onChange={handleStickerUpload} />
                </div>
              </div>
            </>
          )}

          {/* PERSONA TAB */}
          {activeTab === 'persona' && (
             <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider mb-4 border-b border-gray-400/20 pb-1">AI 基础档案 (Basic Info)</h3>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                          <label className="block text-xs font-medium text-black mb-1">年龄 (Age)</label>
                          <input type="text" value={localSettings.partnerAge} onChange={(e) => handleChange('partnerAge', e.target.value)} className="w-full px-3 py-2 bg-white/50 border border-white/40 rounded-xl focus:outline-none text-sm text-black" placeholder="24岁" />
                      </div>
                      <div>
                          <label className="block text-xs font-medium text-black mb-1">职业 (Job)</label>
                          <input type="text" value={localSettings.partnerOccupation} onChange={(e) => handleChange('partnerOccupation', e.target.value)} className="w-full px-3 py-2 bg-white/50 border border-white/40 rounded-xl focus:outline-none text-sm text-black" placeholder="设计师" />
                      </div>
                      <div className="col-span-2">
                          <label className="block text-xs font-medium text-black mb-1">MBTI / 性格关键词</label>
                          <input type="text" value={localSettings.partnerMBTI} onChange={(e) => handleChange('partnerMBTI', e.target.value)} className="w-full px-3 py-2 bg-white/50 border border-white/40 rounded-xl focus:outline-none text-sm text-black" placeholder="ENFP, 乐观, 粘人" />
                      </div>
                  </div>

                  {/* System Instruction */}
                  <div className="mb-4">
                      <label className="block text-sm font-medium text-black mb-2">角色指令 (System Instruction)</label>
                      <textarea
                        value={localSettings.systemInstruction}
                        onChange={(e) => handleChange('systemInstruction', e.target.value)}
                        className="w-full h-48 px-4 py-3 bg-white/50 border border-white/40 rounded-xl focus:ring-2 focus:ring-black/10 focus:outline-none text-sm shadow-sm leading-relaxed text-black resize-none no-scrollbar"
                        placeholder="在此输入AI的性格设定、说话语气等..."
                      />
                      <p className="text-xs text-gray-600 mt-2">提示: 描述得越具体，AI扮演得越像。</p>
                  </div>
                  
                  {/* Quick Presets */}
                  <div className="flex gap-2 flex-wrap">
                      <button 
                        onClick={() => handleChange('systemInstruction', '你是一个温柔体贴的男友，说话轻声细语，总是关心我的生活。')}
                        className="px-3 py-1 bg-white/40 rounded-lg text-xs hover:bg-white/60 text-black border border-black/10"
                      >
                          温柔男友
                      </button>
                      <button 
                        onClick={() => handleChange('systemInstruction', '你是一个霸道总裁，说话简洁有力，但也非常宠爱我。')}
                        className="px-3 py-1 bg-white/40 rounded-lg text-xs hover:bg-white/60 text-black border border-black/10"
                      >
                          霸道总裁
                      </button>
                      <button 
                        onClick={() => handleChange('systemInstruction', '你是一个幽默风趣的朋友，总是能讲笑话逗我开心。')}
                        className="px-3 py-1 bg-white/40 rounded-lg text-xs hover:bg-white/60 text-black border border-black/10"
                      >
                          幽默伙伴
                      </button>
                  </div>
                </div>

                {/* Reply Length */}
                <div>
                 <h3 className="text-xs font-bold text-black uppercase tracking-wider mb-4 border-b border-gray-400/20 pb-1">回复偏好</h3>
                 <div className="flex bg-white/50 rounded-xl p-1">
                    <button 
                         onClick={() => handleChange('replyLength', 'short')}
                         className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${localSettings.replyLength === 'short' ? 'bg-white shadow-sm text-black border border-gray-200' : 'text-gray-600'}`}
                       >
                         短句
                    </button>
                    <button 
                         onClick={() => handleChange('replyLength', 'medium')}
                         className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${localSettings.replyLength === 'medium' ? 'bg-white shadow-sm text-black border border-gray-200' : 'text-gray-600'}`}
                       >
                         一段话
                    </button>
                    <button 
                         onClick={() => handleChange('replyLength', 'long')}
                         className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${localSettings.replyLength === 'long' ? 'bg-white shadow-sm text-black border border-gray-200' : 'text-gray-600'}`}
                       >
                         长文
                    </button>
                 </div>
              </div>
             </div>
          )}

          {/* FAVORITES TAB */}
          {activeTab === 'favorites' && (
             <div className="space-y-4">
                {savedMessages.length === 0 ? (
                    <div className="text-center text-gray-500 py-10">
                        <p>暂无收藏消息</p>
                        <p className="text-xs mt-2">点击聊天气泡旁的爱心进行收藏</p>
                    </div>
                ) : (
                    savedMessages.map((msg, idx) => (
                        <div key={idx} className="bg-white/40 p-3 rounded-xl border border-white/30 shadow-sm">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-gray-600">{msg.sender === 'me' ? '我' : localSettings.partnerName}</span>
                                <span className="text-[10px] text-gray-400">{new Date(msg.timestamp).toLocaleDateString()}</span>
                            </div>
                            <div className="text-sm text-gray-800 whitespace-pre-wrap">{msg.text || '[图片/文件]'}</div>
                            {msg.image && <img src={msg.image} className="mt-2 h-16 rounded-md object-cover" alt="saved" />}
                        </div>
                    ))
                )}
             </div>
          )}

        </div>

        {/* Footer */}
        {activeTab !== 'favorites' && (
            <div className="px-6 py-4 border-t border-white/20 bg-white/10 flex justify-end">
                <button onClick={handleSave} className="px-8 py-3 bg-black text-white hover:bg-gray-800 font-bold rounded-2xl transition-all shadow-lg transform active:scale-95">保存</button>
            </div>
        )}
      </div>
    </div>
  );
};

export default SettingsModal;
