import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, ChevronLeft, Loader2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

// Removed Baidu skin detail interface

const compressImage = (file: File, maxWidth = 1000): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas ctx null'));
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Canvas toBlob failed'));
        // 统一转换为 jpeg，这对于手机拍照尤为重要，有助于通过 API 要求并减小体积
        const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        resolve(newFile);
      }, 'image/jpeg', 0.8);
    };
    img.onerror = (e) => reject(e);
  });
};

export class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 mt-4 break-words">
          <h2 className="font-bold mb-2">渲染崩溃 (Runtime Error)</h2>
          <pre className="text-xs whitespace-pre-wrap">{this.state.error?.message}</pre>
          <pre className="text-xs whitespace-pre-wrap mt-2">{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export const SkinAnalysisPro: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [settings, setSettings] = useState<any>({});
  

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [settingsLoading, setSettingsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // 页面跳转后确保滚到顶部
    window.scrollTo(0, 0);

    // Fetch settings to check if skin analysis feature is enabled
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setSettings(data);
        }
        setSettingsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setSettingsLoading(false);
      });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null); // Clear previous results
    }
  };

  if (settingsLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-neutral-50"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  if (settings.feature_skin_analysis_pro !== '1') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-sm border">
          <h2 className="text-xl font-bold text-gray-800 mb-2">服务暂未开放</h2>
          <p className="text-gray-500 mb-6">AI 皮肤分析功能当前处于关闭状态，请稍后再试。</p>
          <button 
            onClick={() => window.history.back()}
            className="px-6 py-2 bg-black text-white rounded-full hover:bg-neutral-800 transition"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  // Removed drawAnalysis as Megvii does not provide bounding boxes in the same format

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setLoading(true);

    try {
      // 核心修复：前端压缩图片，解决手机拍照体积太大导致 Nginx (413) 拦截并返回 HTML 报错的问题
      const compressedFile = await compressImage(selectedFile, 1000);
      
      const formData = new FormData();
      formData.append('image', compressedFile);

      const endpoint = '/api/skin/analyze/megvii-pro';

      const token = localStorage.getItem('token');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '分析失败');
      }

      if (data.recordId) {
        navigate(`/skin-analysis-pro/report/${data.recordId}`);
      } else {
        throw new Error('未返回记录ID，无法生成报告');
      }

    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-neutral-100 flex items-center h-14 px-4">
        <button onClick={() => window.history.back()} className="p-2 -ml-2 text-neutral-600">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="flex-1 text-center font-medium text-lg pr-8">DermiVue 深度皮肤检测 (Pro)</h1>
      </header>

      <main className="p-4 max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6 mb-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold mb-2">了解您的肌肤状态</h2>
            <p className="text-neutral-500 text-sm">上传面部清晰照片，获取专业AI分析报告</p>
          </div>

          {!previewUrl ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-200 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-neutral-50 transition-colors"
            >
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                <Camera className="w-8 h-8" />
              </div>
              <span className="text-neutral-600 font-medium">点击拍照或上传照片</span>
              <span className="text-neutral-400 text-xs mt-2">请确保光线充足，正脸无遮挡</span>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden bg-black flex justify-center">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="w-full h-auto object-contain max-h-[500px]"
              />
              
              {!loading && !result && (
                <button 
                  onClick={() => { setSelectedFile(null); setPreviewUrl(null); setResult(null); }}
                  className="absolute top-2 right-2 bg-black/50 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm"
                >
                  重新选择
                </button>
              )}
            </div>
          )}

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />

          <div className="mt-4 text-xs text-rose-500 leading-relaxed tracking-wide">
            * 建议您上传高清、正脸拍摄的照片，并保证光线充足，采用手机前置或后置摄像头开启闪光灯补光拍摄为佳
          </div>

          {previewUrl && !result && (
            <button 
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full mt-6 bg-black text-white py-3.5 rounded-full font-medium hover:bg-neutral-800 disabled:bg-neutral-400 flex items-center justify-center gap-2 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5" /> 现在开始AI深度测肤
                </>
              )}
            </button>
          )}

          {!result && (
            <div className="mt-5 text-center">
              <Link to="/profile" className="text-stone-500 hover:text-stone-800 text-sm inline-flex items-center transition-colors underline underline-offset-4">
                去个人中心查看分析报告
              </Link>
            </div>
          )}
        </div>

        {/* 测肤结果页面已迁移至独立报告页 SkinAnalysisProReport */}
      </main>
    </div>
  );
};

export default SkinAnalysisPro;
