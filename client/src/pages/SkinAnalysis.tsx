import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

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

export const SkinAnalysis: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [settings, setSettings] = useState<any>({});
  

  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
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

  if (settings.feature_skin_analysis !== '1') {
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

      const endpoint = '/api/skin/analyze/megvii';

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

      setResult(data);

    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 完成图像测肤后，将结果存入 sessionStorage 并进入 AI 深度问卷
  const goToQuestionnaire = () => {
    if (!result) return;
    sessionStorage.setItem('skin_analysis_result', JSON.stringify({
      concerns: result.concerns || [],
      result: result.result || null,
      recommendations: result.recommendations || [],
      imageUrl: result.imageUrl || '',
    }));
    navigate('/quiz?step=questionnaire');
  };

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-neutral-100 flex items-center h-14 px-4">
        <button onClick={() => window.history.back()} className="p-2 -ml-2 text-neutral-600">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="flex-1 text-center font-medium text-lg pr-8">DermiVue 皮肤检测</h1>
      </header>

      <main className="p-4 max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6 mb-6">
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold mb-2">了解您的肌肤状态</h2>
            <p className="text-neutral-500 text-sm">上传面部清晰照片，获取专业AI分析报告</p>
          </div>
          <div className="bg-blue-50/50 text-blue-800/80 text-[11px] p-3 rounded-lg text-justify leading-relaxed mb-6 border border-blue-100">
            目前我们正与瑞士苏黎世大学开展一项基于人工智能的皮肤深度测试与调研。若需全面了解皮肤状态，可点击链接前往<Link to="/skin-analysis-pro-intro" className="text-blue-600 font-medium hover:underline">瑞士皮肤衰老研究中心</Link>。由于算力有限，每个账户仅限4次免费深度测试。
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
              <Link to="/profile?tab=skin_records" className="text-stone-500 hover:text-stone-800 text-sm inline-flex items-center transition-colors underline underline-offset-4">
                去个人中心查看分析报告
              </Link>
            </div>
          )}
        </div>

        {/* Results Section */}
        {result && result.success && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="font-bold text-lg px-2">DermiVue 分析报告</h3>
            
            <div className="bg-amber-50 text-amber-700 text-xs p-3 rounded-lg mx-1 border border-amber-100/50 leading-relaxed">
              因光线、手机像素及拍摄角度差异，AI 识别结果可能存在轻微偏差。本次完整的分析报告已自动归档，您可随时前往<strong>「个人中心 - 测肤报告」</strong>中查看。
            </div>
            
            <div className="bg-white p-5 rounded-xl border border-neutral-100 shadow-sm">
              <h4 className="font-medium text-neutral-800 mb-3 text-sm">核心肌肤诉求</h4>
              <div className="flex flex-wrap gap-2">
                {result.concerns && result.concerns.length > 0 ? (
                  result.concerns.map((concern: string, idx: number) => (
                    <span key={idx} className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-sm font-medium">
                      {concern}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-neutral-500">基础护理</span>
                )}
              </div>
            </div>

            {(() => {
              if (!result || !result.result) return null;
              const r = result.result.result || result.result;
              
              const renderDetail = (label: string, valueStr: string | null) => {
                if (!valueStr) return null;
                return (
                  <div className="flex justify-between items-center text-sm py-2.5 border-b border-neutral-100 last:border-0">
                    <span className="text-neutral-600">{label}</span>
                    <span className="font-medium text-primary">{valueStr}</span>
                  </div>
                );
              };

              const getEyelid = (val: any) => {
                if (!val) return null;
                if (val.value === 0) return '单眼皮';
                if (val.value === 1) return '平行双眼皮';
                if (val.value === 2) return '扇形双眼皮';
                return null;
              };

              const getBool = (val: any, t: string, f: string) => {
                if (!val) return null;
                return String(val.value) === '1' ? t : f;
              };
              
              const getSkinType = (val: any) => {
                if (!val) return null;
                const t = val.skin_type !== undefined ? val.skin_type : (val.value !== undefined ? val.value : val);
                if (t === 0) return '油性皮肤';
                if (t === 1) return '干性皮肤';
                if (t === 2) return '中性皮肤';
                if (t === 3) return '混合性皮肤';
                return null;
              };

              return (
                <div className="bg-white p-5 rounded-xl border border-neutral-100 shadow-sm">
                  <h4 className="font-medium text-neutral-800 mb-2 text-sm border-l-4 border-primary pl-2">详细分析结果</h4>
                  <div className="flex flex-col">
                    {renderDetail('肤质检测结果', getSkinType(r.skin_type))}
                    {renderDetail('痘痘检测结果', getBool(r.acne, '有痘痘', '无痘痘'))}
                    {renderDetail('黑头检测结果', getBool(r.blackhead, '有黑头', '无黑头'))}
                    {renderDetail('斑点检测结果', getBool(r.skin_spot, '有斑点', '无斑点'))}
                    {renderDetail('痣检测结果', getBool(r.mole, '有痣', '无痣'))}
                    {renderDetail('前额毛孔检测', getBool(r.pores_forehead, '毛孔粗大', '无毛孔粗大'))}
                    {renderDetail('左脸颊毛孔检测', getBool(r.pores_left_cheek, '毛孔粗大', '无毛孔粗大'))}
                    {renderDetail('右脸颊毛孔检测', getBool(r.pores_right_cheek, '毛孔粗大', '无毛孔粗大'))}
                    {renderDetail('下巴毛孔检测', getBool(r.pores_jaw, '毛孔粗大', '无毛孔粗大'))}
                    {renderDetail('抬头纹检测结果', getBool(r.forehead_wrinkle, '有抬头纹', '无抬头纹'))}
                    {renderDetail('眉间纹检测结果', getBool(r.glabella_wrinkle, '有眉间纹', '无眉间纹'))}
                    {renderDetail('鱼尾纹检测结果', getBool(r.crows_feet, '有鱼尾纹', '无鱼尾纹'))}
                    {renderDetail('眼部细纹检测', getBool(r.eye_finelines, '有眼部细纹', '无眼部细纹'))}
                    {renderDetail('法令纹检测结果', getBool(r.nasolabial_fold, '有法令纹', '无法令纹'))}
                    {renderDetail('黑眼圈检测结果', getBool(r.dark_circle, '有黑眼圈', '无黑眼圈'))}
                    {renderDetail('眼袋检测结果', getBool(r.eye_pouch, '有眼袋', '无眼袋'))}
                    {renderDetail('左眼双眼皮检测', getEyelid(r.left_eyelids))}
                    {renderDetail('右眼双眼皮检测', getEyelid(r.right_eyelids))}
                  </div>
                </div>
              );
            })()}

            {result.recommendations && result.recommendations.length > 0 && (
              <div className="bg-white p-5 rounded-xl border border-neutral-100 shadow-sm">
                <h4 className="font-medium text-neutral-800 mb-4 text-sm">为您匹配的专属护肤方案</h4>
                <div className="space-y-4">
                  {result.recommendations.map((product: any) => (
                    <Link 
                      key={product.id} 
                      to={`/products/${product.slug}`}
                      className="flex gap-4 items-center bg-neutral-50 hover:bg-neutral-100 p-3 rounded-xl border border-neutral-100 hover:border-stone-300 transition-all duration-200 cursor-pointer group"
                    >
                      <img 
                        src={product.mainImage || '/images/default-product.png'} 
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded-lg bg-white border border-neutral-100 group-hover:scale-105 transition-transform duration-200"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/images/default-product.png'; }}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm text-neutral-800 line-clamp-2 leading-snug mb-1 group-hover:text-stone-900">{product.name}</div>
                        <div className="text-rose-500 font-bold text-sm">¥{product.basePrice}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <button 
              onClick={goToQuestionnaire}
              className="w-full bg-stone-900 text-white py-3.5 rounded-full font-medium hover:bg-stone-800 transition-all mt-4 flex items-center justify-center gap-2"
            >
              继续 AI 深度问卷测肤 <ChevronRight size={16} />
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default SkinAnalysis;
