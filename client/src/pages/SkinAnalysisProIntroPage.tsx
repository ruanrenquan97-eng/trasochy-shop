import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Camera, ChevronLeft } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export default function SkinAnalysisProIntroPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <Helmet>
        <title>瑞士皮肤衰老检测中心 - TRASOCHY</title>
      </Helmet>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-stone-100 flex items-center h-14 px-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-stone-600">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="flex-1 text-center font-medium text-lg pr-8">瑞士皮肤衰老检测中心</h1>
      </header>

      {/* Equipment Gallery Section */}
      <section className="max-w-6xl mx-auto px-4 mt-8 mb-12">
        <div className="text-center mb-10">
          <h3 className="text-2xl font-medium text-stone-900 tracking-wide mb-3">尖端临床检测设备支持</h3>
          <p className="text-stone-500 text-sm max-w-2xl mx-auto">
            系统背后的皮肤大模型，依托于以下顶级医疗级设备的百万级临床图像库联合训练而成。
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-2 rounded-xl border border-stone-100 shadow-sm group">
            <div className="aspect-square overflow-hidden rounded-lg bg-stone-50 mb-3">
              <img src="/images/visia_machine.png" alt="DermiVue 皮肤分析仪" className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700" />
            </div>
            <h4 className="text-center text-sm font-medium text-stone-800">DermiVue 面部皮肤分析仪</h4>
          </div>
          <div className="bg-white p-2 rounded-xl border border-stone-100 shadow-sm group">
            <div className="aspect-square overflow-hidden rounded-lg bg-stone-50 mb-3">
              <img src="/images/skin_scanner.png" alt="3D 面部扫描仪" className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700" />
            </div>
            <h4 className="text-center text-sm font-medium text-stone-800">高精度 3D 轮廓扫描仪</h4>
          </div>
          <div className="bg-white p-2 rounded-xl border border-stone-100 shadow-sm group">
            <div className="aspect-square overflow-hidden rounded-lg bg-stone-50 mb-3">
              <img src="/images/probe_analyzer.png" alt="接触式探头皮肤检测仪" className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700" />
            </div>
            <h4 className="text-center text-sm font-medium text-stone-800">多维探头式皮肤分析仪</h4>
          </div>
          <div className="bg-white p-2 rounded-xl border border-stone-100 shadow-sm group">
            <div className="aspect-square overflow-hidden rounded-lg bg-stone-50 mb-3">
              <img src="/images/lab_microscope.png" alt="高倍率显微镜" className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700" />
            </div>
            <h4 className="text-center text-sm font-medium text-stone-800">临床级医学显微镜</h4>
          </div>
        </div>
      </section>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-gradient-to-br from-stone-900 to-stone-800 text-white py-12 px-6 text-center rounded-2xl shadow-sm">
          <h2 className="text-2xl md:text-3xl font-light tracking-wide mb-4">全面了解您的肌肤维度</h2>
          <p className="text-stone-300 text-sm md:text-base leading-relaxed max-w-2xl mx-auto">
            深度解析多达50余项精确维度的皮肤检测分析。上传照片即可获取您的专属报告。
          </p>
        </div>
      </div>

      {/* Content Layout */}
      <main className="max-w-6xl mx-auto px-4 mt-8 flex flex-col lg:flex-row gap-8">
        
        {/* Left: AI Face & Buttons */}
        <div className="lg:w-[55%] flex flex-col gap-4">
          <div className="bg-[#1c1c1c] rounded-xl shadow-sm border border-stone-800 p-2 overflow-hidden">
             <img 
               src="/images/ai_skin_demo_10maps_new.png" 
               alt="AI Demo Face 10 Maps" 
               className="w-full h-auto object-contain rounded-lg" 
             />
          </div>

          {/* New Side-by-Side Images */}
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
               <img 
                 src="/images/ai_demo_score_cards.png" 
                 alt="Score Cards Demo" 
                 className="w-full h-auto object-cover" 
               />
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
               <img 
                 src="/images/ai_demo_report.png" 
                 alt="AI Report Demo" 
                 className="w-full h-auto object-cover" 
               />
            </div>
          </div>

          <div className="mt-4">
            <Link to="/skin-analysis-pro" className="flex items-center justify-center gap-2 w-full bg-stone-900 text-white px-8 py-4 rounded-xl font-medium tracking-widest text-lg hover:bg-stone-800 transition-colors shadow-xl">
              <Camera size={20} />
              现在开始AI深度测试
            </Link>
          </div>
        </div>

        {/* Right: Detailed Mock Results */}
        <div className="lg:w-[45%] bg-white rounded-xl shadow-sm border border-stone-100 p-6 md:p-8 overflow-y-auto max-h-[800px] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-stone-200 [&::-webkit-scrollbar-thumb]:rounded-full">
          
          <div className="flex justify-between items-center py-2 border-b border-stone-50 text-[15px]">
            <span className="text-stone-600">肌龄</span>
            <span className="text-blue-500">25岁</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-stone-50 text-[15px]">
            <span className="text-stone-600">总体分数</span>
            <span className="text-blue-500">71</span>
          </div>

          <h3 className="text-lg font-bold mt-6 mb-3 text-stone-900">肤质分析</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between items-center py-1">
              <span className="text-stone-600">肤质分类</span>
              <span className="text-blue-500">混合型</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-stone-600">油光分数</span>
              <span className="text-blue-500">39</span>
            </div>
            
            <p className="text-stone-400 italic mt-3 mb-1 font-serif">全脸</p>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">出油严重程度</span>
              <span className="text-blue-500">出油严重</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">面积占比</span>
              <span className="text-blue-500">37.00%</span>
            </div>

            <p className="text-stone-400 italic mt-3 mb-1 font-serif">额头</p>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">出油严重程度</span>
              <span className="text-blue-500">出油严重</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">面积占比</span>
              <span className="text-blue-500">39.00%</span>
            </div>

            <div className="flex justify-between items-center py-1 mt-4">
              <span className="text-stone-600">水分分数</span>
              <span className="text-blue-500">62</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-stone-600">缺水严重程度</span>
              <span className="text-blue-500">中度</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">全脸缺水面积占比</span>
              <span className="text-blue-500">33.30%</span>
            </div>
          </div>

          <h3 className="text-lg font-bold mt-8 mb-3 text-stone-900">肤色分析</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between items-center py-1">
              <span className="text-stone-600">东亚肤色分类</span>
              <span className="text-blue-500">白皙</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-stone-600">ITA肤色分型</span>
              <span className="text-blue-500">0 -very light</span>
            </div>
          </div>

          <h3 className="text-lg font-bold mt-8 mb-3 text-stone-900">粗糙度分析</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between items-center py-1">
              <span className="text-stone-600">黑头分数</span>
              <span className="text-blue-500">81</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-stone-600">黑头个数</span>
              <span className="text-blue-500">64个</span>
            </div>
            <div className="flex justify-between items-center py-1 mt-2">
              <span className="text-stone-600">毛孔分数</span>
              <span className="text-blue-500">70</span>
            </div>
            
            <p className="text-stone-400 italic mt-3 mb-1 font-serif">额头</p>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">毛孔分数</span>
              <span className="text-blue-500">54</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">粗大毛孔数</span>
              <span className="text-blue-500">460</span>
            </div>

            <p className="text-stone-400 italic mt-3 mb-1 font-serif">左脸颊</p>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">毛孔分数</span>
              <span className="text-blue-500">65</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">粗大毛孔数</span>
              <span className="text-blue-500">161</span>
            </div>

            <div className="flex justify-between items-center py-1 mt-4">
              <span className="text-stone-600">整体面部粗糙面积占比</span>
              <span className="text-blue-500">25.30%</span>
            </div>
          </div>

          <h3 className="text-lg font-bold mt-8 mb-3 text-stone-900">色素沉着</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between items-center py-1">
              <span className="text-stone-600">棕区分数</span>
              <span className="text-blue-500">83</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-stone-600">严重程度</span>
              <span className="text-blue-500">轻度</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-stone-600">色素沉着区域全脸占比</span>
              <span className="text-blue-500">10.10%</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-stone-600">黄褐斑 / 雀斑</span>
              <span className="text-blue-500">无</span>
            </div>
          </div>

          <h3 className="text-lg font-bold mt-8 mb-3 text-stone-900">敏感性与衰老性</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between items-center py-1">
              <span className="text-stone-600">敏感性分数</span>
              <span className="text-blue-500">93</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-stone-600">敏感皮肤面积占比</span>
              <span className="text-blue-500">0.20%</span>
            </div>
            <div className="flex justify-between items-center py-1 mt-4 pt-3 border-t border-stone-50">
              <span className="text-stone-600">总体皱纹分数</span>
              <span className="text-blue-500">75</span>
            </div>
            <p className="text-stone-400 italic mt-3 mb-1 font-serif">左眼鱼尾纹</p>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">分数</span>
              <span className="text-blue-500">32</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">严重程度</span>
              <span className="text-blue-500">中度</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">细纹数量和深纹数量</span>
              <span className="text-blue-500">2, 1</span>
            </div>

            <p className="text-stone-400 italic mt-3 mb-1 font-serif">右眼鱼尾纹</p>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">分数</span>
              <span className="text-blue-500">8</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">严重程度</span>
              <span className="text-blue-500">轻度</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">细纹数量和深纹数量</span>
              <span className="text-blue-500">1, 0</span>
            </div>

            <p className="text-stone-400 italic mt-3 mb-1 font-serif">眉间纹</p>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">分数</span>
              <span className="text-blue-500">1</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">严重程度</span>
              <span className="text-blue-500">无</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">细纹数量和深纹数量</span>
              <span className="text-blue-500">1, 0</span>
            </div>

            <p className="text-stone-400 italic mt-3 mb-1 font-serif">左嘴角纹</p>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">分数</span>
              <span className="text-blue-500">100</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">严重程度</span>
              <span className="text-blue-500">重度</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">深纹数量</span>
              <span className="text-blue-500">1</span>
            </div>

            <p className="text-stone-400 italic mt-3 mb-1 font-serif">右嘴角纹</p>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">分数</span>
              <span className="text-blue-500">0</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">严重程度</span>
              <span className="text-blue-500">无</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">深纹数量</span>
              <span className="text-blue-500">0</span>
            </div>

            <p className="text-stone-400 italic mt-3 mb-1 font-serif">左法令纹</p>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">分数</span>
              <span className="text-blue-500">22</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">严重程度</span>
              <span className="text-blue-500">轻度</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">深纹数量</span>
              <span className="text-blue-500">1</span>
            </div>

            <p className="text-stone-400 italic mt-3 mb-1 font-serif">右法令纹</p>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">分数</span>
              <span className="text-blue-500">17</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">严重程度</span>
              <span className="text-blue-500">轻度</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">深纹数量</span>
              <span className="text-blue-500">1</span>
            </div>

            <p className="text-stone-400 italic mt-3 mb-1 font-serif">左脸皱纹</p>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">分数</span>
              <span className="text-blue-500">0</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">严重程度</span>
              <span className="text-blue-500">无</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">细纹数量和深纹数量</span>
              <span className="text-blue-500">0, 0</span>
            </div>

            <p className="text-stone-400 italic mt-3 mb-1 font-serif">右脸皱纹</p>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">分数</span>
              <span className="text-blue-500">0</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">严重程度</span>
              <span className="text-blue-500">无</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">细纹数量和深纹数量</span>
              <span className="text-blue-500">0, 0</span>
            </div>
          </div>

          <h3 className="text-lg font-bold mt-8 mb-3 text-stone-900">眼部分析</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between items-center py-1">
              <span className="text-stone-600">眼袋检测</span>
              <span className="text-blue-500">无</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-stone-600">眼袋严重程度</span>
              <span className="text-blue-500">-</span>
            </div>
            <div className="flex justify-between items-center py-1 mt-2">
              <span className="text-stone-600">黑眼圈分数</span>
              <span className="text-blue-500">100</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">左眼黑眼圈分数</span>
              <span className="text-blue-500">100</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">右眼黑眼圈分数</span>
              <span className="text-blue-500">100</span>
            </div>
            <div className="flex justify-between items-center py-1 mt-2">
              <span className="text-stone-600">黑眼圈类型检测</span>
              <span className="text-blue-500">无黑眼圈</span>
            </div>
            <div className="flex justify-between items-center py-1 mt-2">
              <span className="text-stone-600">黑眼圈严重程度</span>
              <span className="text-blue-500">-</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">左眼血管型黑眼圈严重程度</span>
              <span className="text-blue-500">无</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">右眼血管型黑眼圈严重程度</span>
              <span className="text-blue-500">无</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">左眼色素型黑眼圈严重程度</span>
              <span className="text-blue-500">无</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">右眼色素型黑眼圈严重程度</span>
              <span className="text-blue-500">无</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">左眼结构型黑眼圈严重程度</span>
              <span className="text-blue-500">无</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-stone-600">右眼结构型黑眼圈严重程度</span>
              <span className="text-blue-500">无</span>
            </div>
          </div>

        </div>
      </main>



      <div className="pb-12 mt-12"></div>
    </div>
  );
}
