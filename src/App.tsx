/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  LogOut, 
  Lock, 
  Image as ImageIcon, 
  X,
  MoreHorizontal,
  Upload,
  Link as LinkIcon,
  Play,
  Video as VideoIcon,
  Heart
} from 'lucide-react';
import { db, loginAnonymously, auth } from './firebase';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, setDoc, deleteDoc, doc } from 'firebase/firestore';
import Masonry from 'react-masonry-css';
import { cn } from './lib/utils';

// Constants
const PASSWORD = 'hgh';
const STORAGE_KEY = 'hgh_auth_session';

// Types
interface Pin {
  id: string;
  imageUrl: string;
  type: 'image' | 'video';
  title?: string;
  description?: string;
  createdAt: any;
}

interface UserSave {
  pinId: string;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const [pins, setPins] = useState<Pin[]>([]);
  const [userSaves, setUserSaves] = useState<Set<string>>(new Set());
  const [filterMode, setFilterMode] = useState<'all' | 'saved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);

  // Auth logic
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === PASSWORD) {
      localStorage.setItem(STORAGE_KEY, 'true');
      setIsAuthenticated(true);
      loginAnonymously();
    } else {
      setError('密码不正确');
      setPassword('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsAuthenticated(false);
  };

  // Data fetching
  useEffect(() => {
    if (!isAuthenticated) return;

    const pinsUnsub = onSnapshot(
      query(collection(db, 'pins'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const pinsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pin));
        setPins(pinsList);
      }
    );

    let savesUnsub = () => {};
    if (auth.currentUser) {
      savesUnsub = onSnapshot(
        query(collection(db, 'saves')),
        (snapshot) => {
          const saveIds = new Set<string>();
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.uid === auth.currentUser?.uid) {
              saveIds.add(data.pinId);
            }
          });
          setUserSaves(saveIds);
        }
      );
    }

    return () => {
      pinsUnsub();
      savesUnsub();
    };
  }, [isAuthenticated, auth.currentUser]);

  const filteredPins = useMemo(() => {
    let result = pins;
    if (filterMode === 'saved') {
      result = result.filter(pin => userSaves.has(pin.id));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(pin => 
        pin.title?.toLowerCase().includes(q) || 
        pin.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [pins, searchQuery, filterMode, userSaves]);

  const toggleSave = async (e: React.MouseEvent, pinId: string) => {
    e.stopPropagation();
    if (!auth.currentUser) return;
    
    const saveId = `${auth.currentUser.uid}_${pinId}`;
    if (userSaves.has(pinId)) {
      await deleteDoc(doc(db, 'saves', saveId));
    } else {
      await setDoc(doc(db, 'saves', saveId), {
        uid: auth.currentUser.uid,
        pinId,
        createdAt: serverTimestamp()
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-neutral-200/50 border border-neutral-100"
        >
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-red-200">
              <Lock className="text-white w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold text-neutral-900">欢迎浏览</h1>
            <p className="text-neutral-500 mt-3 text-center text-lg">请输入浏览密码以继续访问</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="在此输入密码..."
                className="w-full px-6 py-5 bg-neutral-100 rounded-3xl border-none focus:ring-2 focus:ring-red-500 transition-all outline-none text-xl"
                autoFocus
              />
              {error && <p className="text-red-500 text-sm mt-3 ml-2 font-medium">{error}</p>}
            </div>
            <button
              type="submit"
              className="w-full py-5 bg-red-500 text-white rounded-3xl font-bold text-xl hover:bg-red-600 active:scale-[0.98] transition-all shadow-xl shadow-red-200"
            >
              验证并进入
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl px-6 h-24 flex items-center gap-6">
        <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer shadow-md shadow-red-100">
          <ImageIcon className="text-white w-7 h-7" />
        </div>
        
        <div className="hidden lg:flex gap-2">
          <button 
            onClick={() => setFilterMode('all')}
            className={cn(
              "px-8 py-3 rounded-full font-bold transition-all",
              filterMode === 'all' ? "bg-neutral-900 text-white shadow-lg shadow-neutral-200" : "hover:bg-neutral-100"
            )}
          >
            首页
          </button>
          <button 
            onClick={() => setFilterMode('saved')}
            className={cn(
              "px-8 py-3 rounded-full font-bold transition-all",
              filterMode === 'saved' ? "bg-neutral-900 text-white shadow-lg shadow-neutral-200" : "hover:bg-neutral-100"
            )}
          >
            我的保存
          </button>
        </div>

        <div className="flex-1 max-w-4xl relative h-14">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-400 w-6 h-6" />
          <input
            type="text"
            placeholder="搜寻您的灵感碎片..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-full bg-neutral-100 rounded-full pl-14 pr-6 focus:ring-4 focus:ring-neutral-200 outline-none transition-all text-lg"
          />
        </div>

        <div className="flex gap-4">
          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="w-14 h-14 bg-neutral-100 rounded-full flex items-center justify-center hover:bg-neutral-200 transition-all group"
            title="上传图片"
          >
            <Plus className="text-neutral-600 group-hover:scale-110 transition-transform" />
          </button>
          <button 
            onClick={handleLogout}
            className="w-14 h-14 bg-neutral-100 rounded-full flex items-center justify-center hover:bg-red-50 transition-all text-neutral-600 hover:text-red-600"
            title="退出"
          >
            <LogOut />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-32 pb-20 px-6 md:px-12">
        <Masonry
          breakpointCols={{
            default: 6,
            1920: 5,
            1440: 4,
            1024: 3,
            768: 2,
            500: 1
          }}
          className="flex -ml-6 w-auto"
          columnClassName="pl-6 bg-clip-padding"
        >
          {filteredPins.map((pin) => (
            <motion.div
              layout
              key={pin.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 group relative cursor-zoom-in"
              onClick={() => setSelectedPin(pin)}
            >
              <div className="relative rounded-3xl overflow-hidden bg-neutral-100 transition-all duration-500 transform group-hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)]">
                {pin.type === 'video' ? (
                  <div className="relative">
                    <video
                      src={pin.imageUrl}
                      className="w-full h-auto object-cover block"
                      muted
                      loop
                      playsInline
                      onMouseOver={(e) => e.currentTarget.play()}
                      onMouseOut={(e) => e.currentTarget.pause()}
                    />
                    <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm p-2 rounded-full text-white">
                      <Play size={16} fill="white" />
                    </div>
                  </div>
                ) : (
                  <img
                    src={pin.imageUrl}
                    alt={pin.title}
                    className="w-full h-auto object-cover block"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                )}
                
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-6">
                  <div className="flex justify-end">
                    <button 
                      onClick={(e) => toggleSave(e, pin.id)}
                      className={cn(
                        "px-6 py-4 rounded-full font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2",
                        userSaves.has(pin.id) ? "bg-red-600 text-white" : "bg-white text-black hover:bg-neutral-100"
                      )}
                    >
                      <Heart size={18} fill={userSaves.has(pin.id) ? "white" : "none"} />
                      {userSaves.has(pin.id) ? "已保存" : "保存"}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between text-white">
                    <div className="flex-1 truncate mr-4">
                      <p className="font-bold text-lg truncate drop-shadow-md">{pin.title || '未命名感悟'}</p>
                    </div>
                    <button className="w-10 h-10 flex items-center justify-center bg-white/90 rounded-full text-black hover:bg-white transition-all shadow-md">
                      <MoreHorizontal size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </Masonry>

        {filteredPins.length === 0 && (
          <div className="flex flex-col items-center justify-center py-40 text-neutral-300">
            <div className="w-32 h-32 bg-neutral-50 rounded-full flex items-center justify-center mb-8 border-4 border-dashed border-neutral-100">
              <ImageIcon size={48} className="opacity-30" />
            </div>
            <p className="text-2xl font-medium text-neutral-400">发现未被定义的精彩</p>
            <button 
              onClick={() => setIsUploadModalOpen(true)}
              className="mt-8 bg-red-600 text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-red-700 transition-all shadow-xl shadow-red-100"
            >
              立即开启
            </button>
          </div>
        )}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <UploadModal 
            onClose={() => setIsUploadModalOpen(false)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPin && (
          <ImagePreviewModal 
            pin={selectedPin} 
            onClose={() => setSelectedPin(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ImagePreviewModal({ pin, onClose }: { pin: Pin, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-10">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/90 backdrop-blur-sm cursor-zoom-out"
      />
      
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative max-w-full max-h-full flex flex-col items-center"
      >
        <button 
          onClick={onClose}
          className="absolute -top-12 right-0 md:-right-12 text-white/70 hover:text-white transition-colors p-2"
        >
          <X size={32} />
        </button>
        
        <div className="bg-white rounded-[2rem] overflow-hidden shadow-2xl flex flex-col lg:flex-row max-h-[85vh] lg:max-h-[90vh]">
          <div className="flex-1 overflow-auto bg-neutral-50 flex items-center justify-center min-w-[300px] lg:min-w-[600px]">
            {pin.type === 'video' ? (
              <video 
                src={pin.imageUrl} 
                className="max-w-full h-auto object-contain block"
                controls
                autoPlay
                playsInline
              />
            ) : (
              <img 
                src={pin.imageUrl} 
                alt={pin.title} 
                className="max-w-full h-auto object-contain block"
                referrerPolicy="no-referrer"
              />
            )}
          </div>
          
          <div className="w-full lg:w-96 p-8 flex flex-col justify-between bg-white border-l border-neutral-100">
            <div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-4">{pin.title || '灵感碎片'}</h2>
              <div className="flex items-center gap-3 text-neutral-500">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <ImageIcon size={16} />
                </div>
                <span className="text-sm font-medium">收集于灵感中心</span>
              </div>
            </div>
            
            <div className="mt-8 pt-8 border-t border-neutral-100 space-y-4">
              <a 
                href={pin.imageUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full py-4 bg-neutral-100 rounded-2xl font-bold text-lg hover:bg-neutral-200 transition-all text-neutral-900 gap-2"
              >
                查看源文件
              </a>
              <button 
                onClick={onClose}
                className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold text-lg hover:bg-neutral-800 transition-all shadow-lg"
              >
                返回
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Modal Components
function UploadModal({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'image' | 'video'>('image');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState('');

  const handlePublish = async (mediaUrl: string, pinTitle: string, mediaType: 'image' | 'video') => {
    if (!mediaUrl) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'pins'), {
        imageUrl: mediaUrl,
        type: mediaType,
        title: pinTitle || '新灵感',
        createdAt: serverTimestamp()
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handlePublish(url, title, type);
  };

  // Drag and Drop Handling
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setDragError('');

    const textData = e.dataTransfer.getData('text/plain');
    const htmlData = e.dataTransfer.getData('text/html');
    
    if (textData && (textData.startsWith('http') || textData.includes('data:image') || textData.includes('data:video'))) {
      const isVideo = textData.toLowerCase().match(/\.(mp4|webm|ogg|mov)$/) || textData.includes('data:video');
      setUrl(textData);
      setType(isVideo ? 'video' : 'image');
      return;
    }

    if (htmlData) {
      const match = htmlData.match(/src="([^"]+)"/);
      if (match && match[1]) {
        const isVideo = match[1].toLowerCase().match(/\.(mp4|webm|ogg|mov)$/);
        setUrl(match[1]);
        setType(isVideo ? 'video' : 'image');
        return;
      }
    }

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');

      if (isImage || isVideo) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            handlePublish(event.target.result as string, file.name.split('.')[0], isVideo ? 'video' : 'image');
          }
        };
        reader.readAsDataURL(file);
      } else {
        setDragError('请拖拽有效的图片、视频文件或链接');
      }
    }
  }, []);

  useEffect(() => {
    // Detect type from URL manual input
    if (url) {
      const isVideo = url.toLowerCase().match(/\.(mp4|webm|ogg|mov)$/);
      setType(isVideo ? 'video' : 'image');
    }
  }, [url]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative bg-white w-full max-w-4xl rounded-[3rem] overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[500px]"
      >
        {/* Left Side: Drag and Drop Area */}
        <div 
          className={cn(
            "flex-1 p-10 flex flex-col items-center justify-center transition-all duration-300 min-h-[300px]",
            isDragging ? "bg-red-50" : "bg-neutral-50"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {url ? (
            <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden shadow-lg bg-white border-8 border-white">
              {type === 'video' ? (
                <video src={url} className="w-full h-full object-cover" autoPlay muted loop />
              ) : (
                <img src={url} className="w-full h-full object-cover" alt="Preview" />
              )}
              <button 
                onClick={() => setUrl('')}
                className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            <div className={cn(
              "w-full aspect-[3/4] border-4 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center text-neutral-400 group cursor-pointer transition-all",
              isDragging ? "border-red-400 bg-red-50/50" : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-100/50"
            )}>
              <div className={cn(
                "w-20 h-20 rounded-full bg-white flex items-center justify-center mb-6 shadow-sm transition-transform",
                isDragging ? "scale-110 text-red-500" : "group-hover:scale-105"
              )}>
                <Upload size={32} />
              </div>
              <p className="text-xl font-bold text-neutral-600 px-8 text-center">
                {isDragging ? '放开以提取媒体' : '将图片、视频或链接拖拽至此'}
              </p>
              <p className="text-sm mt-4 opacity-60">支持 WebM, MP4, JPEG, PNG 等</p>
              {dragError && <p className="text-red-500 text-sm mt-4 font-bold">{dragError}</p>}
            </div>
          )}
        </div>

        {/* Right Side: Form */}
        <div className="flex-1 p-10 flex flex-col justify-center border-l border-neutral-100 bg-white">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">发布灵感</h2>
            <button onClick={onClose} className="p-3 hover:bg-neutral-100 rounded-full transition-colors md:hidden">
              <X />
            </button>
          </div>
          
          <form onSubmit={handleManualSubmit} className="space-y-8">
            <div className="space-y-4">
              <div className="flex bg-neutral-100 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setType('image')}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                    type === 'image' ? "bg-white shadow-sm text-neutral-900" : "text-neutral-500 hover:text-neutral-700"
                  )}
                >
                  <ImageIcon size={18} /> 图片
                </button>
                <button
                  type="button"
                  onClick={() => setType('video')}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                    type === 'video' ? "bg-white shadow-sm text-neutral-900" : "text-neutral-500 hover:text-neutral-700"
                  )}
                >
                  <VideoIcon size={18} /> 视频
                </button>
              </div>

              <div className="relative group">
                <LinkIcon size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-red-500 transition-colors" />
                <input
                  type="url"
                  placeholder="手动输入媒体网址..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full pl-14 pr-6 py-5 bg-neutral-100 rounded-[1.5rem] border-none focus:ring-2 focus:ring-red-500 outline-none transition-all text-lg"
                />
              </div>
              
              <input
                type="text"
                placeholder="起个动人的标题..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-6 py-5 bg-neutral-100 rounded-[1.5rem] border-none focus:ring-2 focus:ring-red-500 outline-none transition-all text-lg"
              />
            </div>

            <div className="pt-4">
              <button
                disabled={isSubmitting || !url}
                className="w-full py-5 bg-red-600 text-white rounded-[1.5rem] font-bold text-xl hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:grayscale shadow-xl shadow-red-100"
              >
                {isSubmitting ? '捕捉中...' : '发布灵感'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full mt-4 py-3 text-neutral-400 font-bold hover:text-neutral-600 transition-colors"
              >
                取消
              </button>
            </div>
          </form>
          
          <div className="mt-10 p-5 bg-blue-50 rounded-2xl border border-blue-100">
            <p className="text-blue-600 text-sm leading-relaxed">
              <strong>提示：</strong> 支持图片与视频混排。将视频链接（.mp4等）拖入左侧可直接识别。
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
