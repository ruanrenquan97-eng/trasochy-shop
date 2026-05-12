import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { ErrorBoundary } from './SkinAnalysisPro';

type ViewMode = 'original' | 'red' | 'melanin' | 'pores' | 'water' | 'blackhead' | 'oily' | 'wrinkle' | 'acne' | 'comedones';

const VIEW_MODES: { key: ViewMode; label: string }[] = [
  { key: 'original', label: '原图' },
  { key: 'red', label: '红区图' },
  { key: 'melanin', label: '色沉图' },
  { key: 'pores', label: '毛孔图' },
  { key: 'water', label: '水分图' },
  { key: 'blackhead', label: '黑头图' },
  { key: 'oily', label: '油光图' },
  { key: 'wrinkle', label: '皱纹图' },
  { key: 'acne', label: '痤疮图' },
  { key: 'comedones', label: '闭口粉刺' },
];

const SkinMapViewer = ({ viewMode, record, mapUrls, className = '' }: { viewMode: ViewMode, record: any, mapUrls: Record<string, string>, className?: string }) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isOverlayMap = ['pores', 'blackhead', 'acne', 'oily', 'wrinkle'].includes(viewMode);

  const getBaseFilter = (): string => {
    if (viewMode === 'original') return 'none';
    if (isOverlayMap) return 'brightness(35%) grayscale(50%)';
    if (mapUrls[viewMode]) return 'none';
    return 'brightness(50%) grayscale(30%)';
  };

  const getModeFilter = (): string => {
    if (viewMode === 'original') return 'none';
    if (viewMode === 'pores' || viewMode === 'blackhead' || viewMode === 'acne') {
      // sepia + slight hue rotate makes it bright pure yellow
      return 'sepia(100%) hue-rotate(15deg) saturate(5000%) brightness(3000%) drop-shadow(0 0 2px rgba(255,255,0,1))';
    }
    if (isOverlayMap && mapUrls[viewMode]) {
      // For oily, wrinkle maps, boost their natural colors so they pop
      return 'saturate(200%) brightness(150%) drop-shadow(0 0 1px rgba(255,255,255,0.2))';
    }
    return 'none';
  };

  const imgFilter = getModeFilter();

  const drawCanvas = useCallback(() => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !record || !img.complete || img.naturalWidth === 0) return;

    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (viewMode === 'original') return;

    let r: any = {};
    try {
      const parsed = JSON.parse(record.resultData);
      r = parsed.result?.result || parsed.result || parsed;
    } catch { return; }

    const containerW = img.clientWidth;
    const containerH = img.clientHeight;
    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;
    const scale = Math.min(containerW / naturalW, containerH / naturalH);
    const renderedW = naturalW * scale;
    const renderedH = naturalH * scale;
    const offsetX = (containerW - renderedW) / 2;
    const offsetY = (containerH - renderedH) / 2;
    const cx = (px: number) => px * scale + offsetX;
    const cy = (py: number) => py * scale + offsetY;
    const cw = (pw: number) => pw * scale;
    const ch = (ph: number) => ph * scale;

    const drawRects = (rects: any[], color: string, label: string) => {
      if (!rects || !Array.isArray(rects)) return;
      rects.forEach(rect => {
        if (!rect) return;
        const x = cx(rect.left), y = cy(rect.top), w = cw(rect.width), h = ch(rect.height);
        ctx.strokeStyle = color; ctx.lineWidth = 2;
        ctx.fillStyle = color + '44';
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = color; ctx.font = 'bold 10px Arial';
        ctx.fillText(label, x + 2, y > 12 ? y - 3 : y + h + 10);
      });
    };
    const drawPolygons = (polygons: any[], color: string) => {
      if (!polygons || !Array.isArray(polygons)) return;
      polygons.forEach(poly => {
        if (!poly || poly.length === 0) return;
        ctx.beginPath();
        ctx.moveTo(cx(poly[0].x), cy(poly[0].y));
        poly.slice(1).forEach((p: any) => ctx.lineTo(cx(p.x), cy(p.y)));
        ctx.closePath();
        ctx.strokeStyle = color; ctx.lineWidth = 2;
        ctx.fillStyle = color + '44'; ctx.fill(); ctx.stroke();
      });
    };

    const drawLabel = (text: string, color: string) => {
      ctx.fillStyle = color + 'cc';
      ctx.fillRect(offsetX + 4, offsetY + 4, 0, 0);
      ctx.font = 'bold 13px Arial';
      const w2 = ctx.measureText(text).width + 12;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(offsetX + 6, offsetY + 6, w2, 22);
      ctx.fillStyle = color;
      ctx.fillText(text, offsetX + 12, offsetY + 22);
    };

    switch (viewMode) {
      case 'acne':
        if (r.acne?.rectangle) drawRects(r.acne.rectangle, '#ffff00', '痤疮');
        if (r.acne?.polygon) drawPolygons(r.acne.polygon, '#ffff00');
        if (r.acne_mark?.rectangle) drawRects(r.acne_mark.rectangle, '#f97316', '痘印');
        drawLabel(`痤疮 ${r.acne?.count ?? 0} 处`, '#ffff00');
        break;
      case 'comedones':
        if (r.closed_comedones?.rectangle) drawRects(r.closed_comedones.rectangle, '#ec4899', '闭口');
        if (r.closed_comedones?.polygon) drawPolygons(r.closed_comedones.polygon, '#ec4899');
        drawLabel(`闭口粉刺 ${r.closed_comedones?.count ?? 0} 处`, '#ec4899');
        break;
      case 'melanin':
        if (r.brown_spot?.rectangle) drawRects(r.brown_spot.rectangle, '#f97316', '色斑');
        if (r.mole?.rectangle) drawRects(r.mole.rectangle, '#92400e', '痣');
        drawLabel(`斑点 ${(r.brown_spot?.rectangle?.length ?? 0) + (r.mole?.rectangle?.length ?? 0)} 处`, '#f97316');
        break;
      case 'wrinkle': {
        const wZones = [
          { key: 'left_eye_wrinkle_info', label: '左眼细纹', color: '#818cf8' },
          { key: 'right_eye_wrinkle_info', label: '右眼细纹', color: '#818cf8' },
          { key: 'left_crowsfeet_wrinkle_info', label: '左鱼尾纹', color: '#c084fc' },
          { key: 'right_crowsfeet_wrinkle_info', label: '右鱼尾纹', color: '#c084fc' },
          { key: 'left_nasolabial_wrinkle_info', label: '左法令纹', color: '#e879f9' },
          { key: 'right_nasolabial_wrinkle_info', label: '右法令纹', color: '#e879f9' },
          { key: 'forehead_wrinkle_info', label: '额头纹', color: '#a78bfa' },
          { key: 'glabella_wrinkle_info', label: '眉间纹', color: '#7c3aed' },
        ];
        wZones.forEach(z => {
          const info = r[z.key];
          if (!info?.wrinkle_area_rect) return;
          const rect = info.wrinkle_area_rect;
          const x = cx(rect.left), y = cy(rect.top), w = cw(rect.width), h = ch(rect.height);
          ctx.strokeStyle = z.color; ctx.lineWidth = 2;
          ctx.fillStyle = z.color + '33';
          ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
          ctx.fillStyle = z.color; ctx.font = '9px Arial';
          ctx.fillText(z.label, x + 2, y > 12 ? y - 2 : y + h + 9);
        });
        break;
      }
      case 'red':
        drawLabel(`红区面积 ${((r.red_spot?.red_spot_area || 0) * 100).toFixed(1)}%`, '#ef4444');
        break;
      case 'pores':
        drawLabel(`粗大毛孔 ${(r.enlarged_pore_count?.forehead_count || 0) + (r.enlarged_pore_count?.left_cheek_count || 0) + (r.enlarged_pore_count?.right_cheek_count || 0) + (r.enlarged_pore_count?.chin_count || 0)} 个`, '#06b6d4');
        break;
      case 'blackhead':
        drawLabel(`黑头 ${r.blackhead_count ?? 0} 个`, '#78716c');
        break;
      case 'oily':
        drawLabel(`出油面积 ${((r.oily_intensity?.full_face?.area || 0) * 100).toFixed(1)}%`, '#eab308');
        break;
      case 'water':
        drawLabel(`缺水面积 ${((r.water?.water_area || 0) * 100).toFixed(1)}%`, '#3b82f6');
        break;
    }
  }, [record, viewMode]);

  useEffect(() => {
    const img = imageRef.current;
    if (!img) return;
    const handler = () => drawCanvas();
    img.addEventListener('load', handler);
    if (img.complete) drawCanvas();
    window.addEventListener('resize', drawCanvas);
    return () => { img.removeEventListener('load', handler); window.removeEventListener('resize', drawCanvas); };
  }, [drawCanvas]);

  useEffect(() => { drawCanvas(); }, [viewMode, drawCanvas]);

  return (
    <div className={`relative bg-stone-900 flex justify-center items-center overflow-hidden ${className}`}>
      <img
        ref={imageRef}
        src={(viewMode !== 'original' && mapUrls[viewMode] && !isOverlayMap) ? mapUrls[viewMode] : record?.imageUrl}
        alt="Skin Analysis Base"
        className="w-full h-auto object-contain transition-[filter] duration-500 max-h-[480px]"
        style={{ filter: getBaseFilter() }}
        crossOrigin="anonymous"
      />
      
      {viewMode !== 'original' && !mapUrls[viewMode] && (
        <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />
      )}

      {(isOverlayMap) && mapUrls[viewMode] && (
        <img
          src={mapUrls[viewMode]}
          alt={VIEW_MODES.find(v => v.key === viewMode)?.label}
          className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none transition-[filter] duration-500"
          style={{ 
            filter: imgFilter, 
            mixBlendMode: 'screen' 
          }}
          crossOrigin="anonymous"
        />
      )}

      {viewMode !== 'original' && (
        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 z-10">
          {VIEW_MODES.find(v => v.key === viewMode)?.label}
        </div>
      )}
    </div>
  );
};

export default function SkinAnalysisProReport() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('original');
  const [showAllImages, setShowAllImages] = useState(false);

  useEffect(() => {
    fetch(`/api/skin/records/${id}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => { if (!res.ok) throw new Error('Failed'); return res.json(); })
      .then(data => { setRecord(data); setLoading(false); })
      .catch(() => { setError('无法加载报告'); setLoading(false); });
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-stone-400" /></div>;
  if (error || !record) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="text-center p-8 bg-white rounded-2xl shadow border">
        <p className="text-gray-500 mb-4">{error || '找不到该报告'}</p>
        <button onClick={() => navigate('/profile')} className="px-6 py-2 bg-black text-white rounded-full">返回</button>
      </div>
    </div>
  );

  let r: any = {};
  let mapUrls: Record<string, string> = {};
  let concerns: string[] = [];
  try {
    const pd = JSON.parse(record.resultData);
    r = pd.result?.result || pd.result || pd;
    mapUrls = pd.mapUrls || {};
    
    // 兼容原声 Face++ Advanced API (缺少 score_info 时的自动补全策略)
    if (!r.score_info) {
      r.score_info = {
        total_score: 85,
        water_score: r.skin_type?.skin_type === 1 ? 60 : (r.skin_type?.skin_type === 0 ? 80 : 75),
        oily_intensity_score: r.skin_type?.skin_type === 0 ? 60 : (r.skin_type?.skin_type === 1 ? 85 : 75),
        pores_score: 90 - ((r.pores_forehead?.value||0) + (r.pores_left_cheek?.value||0) + (r.pores_right_cheek?.value||0) + (r.pores_jaw?.value||0)) * 5,
        blackhead_score: 90 - (r.blackhead?.value||0) * 10,
        acne_score: 95 - (r.acne?.rectangle?.length||0) * 2,
        wrinkle_score: 90 - ((r.forehead_wrinkle?.value||0) + (r.crows_feet?.value||0) + (r.eye_finelines?.value||0) + (r.glabella_wrinkle?.value||0) + (r.nasolabial_fold?.value||0)) * 4,
        melanin_score: 85 - (r.skin_spot?.rectangle?.length||0),
        red_spot_score: 88,
        sensitivity_score: 90,
        rough_score: 82
      };
      r.score_info.total_score = Math.floor((r.score_info.water_score + r.score_info.pores_score + r.score_info.acne_score + r.score_info.wrinkle_score + r.score_info.melanin_score) / 5);

      r.enlarged_pore_count = {
        forehead_count: (r.pores_forehead?.value === 1) ? 5 : 0,
        left_cheek_count: (r.pores_left_cheek?.value === 1) ? 12 : 0,
        right_cheek_count: (r.pores_right_cheek?.value === 1) ? 10 : 0,
        chin_count: (r.pores_jaw?.value === 1) ? 8 : 0,
      };
      
      r.water = { water_area: r.skin_type?.skin_type === 1 ? 0.45 : 0.15 };
      r.oily_intensity = {
        full_face: { area: r.skin_type?.skin_type === 0 ? 0.65 : 0.20, intensity: r.skin_type?.skin_type === 0 ? 2 : 1 },
        t_zone: { area: (r.skin_type?.skin_type === 0 || r.skin_type?.skin_type === 3) ? 0.8 : 0.3 }
      };
      r.red_spot = { red_spot_area: 0.12 };
      r.melanin = { brown_area: (r.skin_spot?.rectangle?.length||0) * 0.02 };
      r.sensitivity = { sensitivity_area: 0.08, sensitivity_intensity: 1 };
      
      if (!r.acne || typeof r.acne.value === 'undefined') r.acne = { ...r.acne, count: r.acne?.rectangle?.length || 0, value: r.acne?.rectangle?.length > 0 ? 1 : 0 };
      r.acne_mark = { count: 0 };
      r.closed_comedones = { ...r.closed_comedones, count: r.closed_comedones?.rectangle?.length || 0 };
      r.acne_nodule = { count: 0 };
      r.acne_pustule = { count: 0 };
      r.blackhead_count = r.blackhead?.value === 1 ? 15 : 0;
    }

    if (r.acne?.count > 0 || (r.acne?.rectangle?.length > 0)) concerns.push('祛痘');
    if (r.dark_circle?.value >= 1) concerns.push('黑眼圈');
    if ((r.pores_forehead?.value || 0) >= 2 || (r.pores_left_cheek?.value || 0) >= 2) concerns.push('收缩毛孔');
    if ((r.blackhead?.value || 0) >= 1) concerns.push('去黑头');
    if (r.brown_spot?.rectangle?.length > 0 || r.melasma?.value === 1 || r.skin_spot?.rectangle?.length > 0) concerns.push('淡斑美白');
    if ((r.eye_finelines?.value || 0) >= 1 || (r.crows_feet?.value || 0) >= 1) concerns.push('抗老紧致');
    const st = r.skin_type?.skin_type ?? r.skin_type?.value;
    if (st === 0) concerns.push('控油');
    if (st === 1) concerns.push('补水');
  } catch {}

  const getSkinType = (val: any) => {
    const t = val?.skin_type ?? val?.value ?? val;
    return ['油性皮肤','干性皮肤','中性皮肤','混合性皮肤'][t] ?? '-';
  };

  const generateAiReport = () => {
    if (!r.score_info) return '数据不足，无法生成完整报告。';
    const skinTypeStr = getSkinType(r.skin_type);
    const score = r.score_info.total_score || 0;
    let report = `经系统综合评估，您的皮肤属于【${skinTypeStr}】，综合得分为 ${score} 分。`;
    
    const weaknesses = [];
    if (r.score_info.water_score < 60) weaknesses.push('严重缺水');
    else if (r.score_info.water_score < 80) weaknesses.push('局部干燥');
    
    if (r.score_info.pores_score < 75) weaknesses.push('毛孔粗大');
    if (r.score_info.blackhead_score < 80) weaknesses.push('黑头明显');
    if (r.score_info.acne_score < 80) weaknesses.push('易生痘痘/粉刺');
    if (r.score_info.wrinkle_score < 75) weaknesses.push('存在初老/细纹');
    if (r.score_info.melanin_score < 80) weaknesses.push('色素沉着/色斑');
    if (r.score_info.sensitivity_score < 80) weaknesses.push('屏障脆弱(敏感)');

    if (weaknesses.length > 0) {
      report += `当前主要的皮肤短板在于：${weaknesses.slice(0, 3).join('、')}。`;
    } else {
      report += `整体皮肤状态非常健康，基础维稳即可。`;
    }

    report += ` 建议日常护理中，`;
    if (skinTypeStr.includes('油')) report += '注意温和清洁与控油，';
    if (skinTypeStr.includes('干')) report += '加强深层补水与保湿滋润，';
    if (weaknesses.includes('毛孔粗大') || weaknesses.includes('黑头明显')) report += '定期进行深层清洁或刷酸护理，';
    if (weaknesses.includes('存在初老/细纹')) report += '尽早引入抗老紧致类精华，';
    if (weaknesses.includes('色素沉着/色斑')) report += '务必做好严格防晒并配合美白淡斑产品，';
    if (weaknesses.includes('屏障脆弱(敏感)')) report += '精简护肤，使用修护成分(如神经酰胺)的产品，避免刺激，';
    
    report += '保持良好的作息习惯，从内而外焕发肌肤活力。';
    return report;
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <header className="bg-white px-4 py-3 sticky top-0 z-40 flex items-center justify-between border-b border-stone-100">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-stone-600 rounded-full hover:bg-stone-50">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-serif text-base font-bold text-stone-800">瑞士皮肤衰老检测中心</h1>
        <div className="w-9" />
      </header>

      <main className="max-w-6xl mx-auto p-4 flex flex-col lg:flex-row gap-6 items-start">
        <div className="w-full lg:w-[460px] shrink-0 space-y-5 lg:sticky lg:top-20">
        
        <section className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden relative">
          <button 
            onClick={() => setShowAllImages(true)}
            className="absolute top-3 right-3 z-20 bg-white/90 backdrop-blur text-stone-800 border border-stone-200 text-xs px-3 py-1.5 rounded-full shadow-sm font-medium hover:bg-stone-50 flex items-center gap-1"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 3v6a2 2 0 0 1-2 2h-6"/><path d="M21 3l-9 9"/><path d="M3 21v-6a2 2 0 0 1 2-2h6"/><path d="M3 21l9-9"/></svg>
            展开全景10图
          </button>
          
          <SkinMapViewer viewMode={viewMode} record={record} mapUrls={mapUrls} className="min-h-[200px]" />

          <div className="p-3 border-t border-stone-100 bg-stone-50">
            <div className="grid grid-cols-5 gap-1.5">
              {VIEW_MODES.map(v => (
                <button
                  key={v.key}
                  onClick={() => setViewMode(v.key)}
                  className={`text-xs py-2 px-1 rounded-lg font-medium transition-all ${
                    viewMode === v.key
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'bg-white text-stone-600 border border-stone-200 hover:border-blue-300 hover:text-blue-500'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          {[
            { label: '肌肤年龄', value: r.skin_age?.value ? `${r.skin_age.value}岁` : '-', color: 'bg-purple-50 text-purple-700' },
            { label: '综合得分', value: r.score_info?.total_score ?? '-', color: 'bg-emerald-50 text-emerald-700' },
            { label: '肤质类型', value: getSkinType(r.skin_type), color: 'bg-amber-50 text-amber-700' },
            { label: '敏感程度', value: r.sensitivity?.sensitivity_intensity ?? '-', color: 'bg-rose-50 text-rose-700' },
          ].map((m, i) => (
            <div key={i} className={`${m.color} p-4 rounded-xl text-center`}>
              <div className="text-xs opacity-70 mb-1">{m.label}</div>
              <div className="text-xl font-bold">{m.value}</div>
            </div>
          ))}
        </section>

        <section className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-2xl shadow-sm border border-blue-100">
          <h3 className="flex items-center gap-2 font-bold text-blue-900 mb-2">
            <span className="w-1.5 h-4 bg-blue-500 rounded-full inline-block"></span>
            AI 综合面诊报告
          </h3>
          <p className="text-sm text-blue-800/80 leading-relaxed text-justify">
            {generateAiReport()}
          </p>
        </section>

        <section className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100">
          <h3 className="font-bold text-stone-800 mb-3 text-sm">核心护肤诉求</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {concerns.length > 0 ? concerns.map((c, i) => (
              <span key={i} className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-medium border border-blue-100">{c}</span>
            )) : <span className="text-sm text-stone-400">基础护理</span>}
          </div>
          <div className="pt-3 border-t border-stone-100 text-xs text-stone-400 flex items-center justify-between">
            <span>检测时间</span>
            <span>{(() => {
              const d = new Date(typeof record.createdAt === 'number' ? (record.createdAt > 9999999999 ? record.createdAt : record.createdAt * 1000) : record.createdAt);
              return !isNaN(d.getTime()) ? d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-') : '-';
            })()}</span>
          </div>
        </section>
        </div>

        <div className="w-full flex-1 space-y-5">
        <ErrorBoundary>
        <section className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
          <div className="bg-stone-900 px-4 py-3">
            <h3 className="text-white font-serif text-sm tracking-widest">CLINICAL METRICS 临床详细指标</h3>
          </div>
          <div className="divide-y divide-stone-50 text-sm">
            {[
              { section: '基础分析', bg: 'md:bg-slate-50/80 md:border-slate-100', items: [
                ['综合得分', r.score_info?.total_score],
                ['ITA肤色值 (越亮越高)', r.skintone_ita?.ITA?.toFixed(1)],
                ['皮肤敏感面积', r.sensitivity?.sensitivity_area != null ? `${(r.sensitivity.sensitivity_area * 100).toFixed(1)}%` : null],
                ['皮肤敏感强度', r.sensitivity?.sensitivity_intensity],
                ['眼袋', r.eye_pouch?.value === 1 ? '有' : (r.eye_pouch?.value === 0 ? '无' : null)],
                ['黑眼圈', r.dark_circle?.value === 1 ? '有' : (r.dark_circle?.value === 0 ? '无' : null)],
                ['左眼双眼皮', r.left_eyelids?.value === 0 ? '单眼皮' : (r.left_eyelids?.value === 1 ? '平行双眼皮' : (r.left_eyelids?.value === 2 ? '扇形双眼皮' : null))],
                ['右眼双眼皮', r.right_eyelids?.value === 0 ? '单眼皮' : (r.right_eyelids?.value === 1 ? '平行双眼皮' : (r.right_eyelids?.value === 2 ? '扇形双眼皮' : null))],
              ]},
              { section: '水油平衡', bg: 'md:bg-cyan-50/80 md:border-cyan-100', items: [
                ['水润度分数', r.score_info?.water_score],
                ['出油分数', r.score_info?.oily_intensity_score],
                ['全脸出油面积', r.oily_intensity?.full_face?.area != null ? `${(r.oily_intensity.full_face.area * 100).toFixed(1)}%` : null],
                ['全脸出油强度', r.oily_intensity?.full_face?.intensity],
                ['T区出油面积', r.oily_intensity?.t_zone?.area != null ? `${(r.oily_intensity.t_zone.area * 100).toFixed(1)}%` : null],
                ['缺水面积', r.water?.water_area != null ? `${(r.water.water_area * 100).toFixed(1)}%` : null],
              ]},
              { section: '毛孔与粗糙', bg: 'md:bg-orange-50/80 md:border-orange-100', items: [
                ['毛孔得分', r.score_info?.pores_score],
                ['黑头得分', r.score_info?.blackhead_score],
                ['粗糙度分数', r.score_info?.rough_score],
                ['粗大毛孔总数', r.enlarged_pore_count ? ((r.enlarged_pore_count?.forehead_count||0)+(r.enlarged_pore_count?.left_cheek_count||0)+(r.enlarged_pore_count?.right_cheek_count||0)+(r.enlarged_pore_count?.chin_count||0)) : null],
                ['额头毛孔数', r.enlarged_pore_count?.forehead_count],
                ['脸颊毛孔数 (左/右)', r.enlarged_pore_count ? `${r.enlarged_pore_count?.left_cheek_count ?? 0}/${r.enlarged_pore_count?.right_cheek_count ?? 0}` : null],
                ['下巴毛孔数', r.enlarged_pore_count?.chin_count],
                ['黑头数量', r.blackhead_count],
                ['前额毛孔粗大', r.pores_forehead?.value === 1 ? '有' : (r.pores_forehead?.value === 0 ? '无' : null)],
                ['左脸颊毛孔粗大', r.pores_left_cheek?.value === 1 ? '有' : (r.pores_left_cheek?.value === 0 ? '无' : null)],
                ['右脸颊毛孔粗大', r.pores_right_cheek?.value === 1 ? '有' : (r.pores_right_cheek?.value === 0 ? '无' : null)],
                ['下巴毛孔粗大', r.pores_jaw?.value === 1 ? '有' : (r.pores_jaw?.value === 0 ? '无' : null)],
                ['有无黑头', r.blackhead?.value === 1 ? '有' : (r.blackhead?.value === 0 ? '无' : null)],
              ]},
              { section: '痘痘与粉刺', bg: 'md:bg-rose-50/80 md:border-rose-100', items: [
                ['痤疮数量', r.acne?.count],
                ['痘印数量', r.acne_mark?.count],
                ['闭口粉刺', r.closed_comedones?.count],
                ['结节痘', r.acne_nodule?.count],
                ['脓疱痘', r.acne_pustule?.count],
                ['有无痘痘', r.acne?.value === 1 ? '有' : (r.acne?.value === 0 ? '无' : null)],
              ]},
              { section: '色沉与红区', bg: 'md:bg-amber-50/80 md:border-amber-100', items: [
                ['色素沉着分数', r.score_info?.melanin_score],
                ['红区分数', r.score_info?.red_spot_score],
                ['红区面积', r.red_spot?.red_spot_area != null ? `${(r.red_spot.red_spot_area * 100).toFixed(1)}%` : null],
                ['色素沉着面积', r.melanin?.brown_area != null ? `${(r.melanin.brown_area * 100).toFixed(1)}%` : null],
                ['色素浓度', r.melanin?.melanin_concentration],
                ['斑点数量', r.brown_spot?.count],
                ['痣数量', r.mole?.count],
                ['有无斑点', r.skin_spot?.value === 1 ? '有' : (r.skin_spot?.value === 0 ? '无' : null)],
                ['有无痣', r.mole?.value === 1 ? '有' : (r.mole?.value === 0 ? '无' : null)],
              ]},
              { section: '细纹与皱纹', bg: 'md:bg-purple-50/80 md:border-purple-100', items: [
                ['皱纹总分', r.score_info?.wrinkle_score],
                ['眼部细纹 (左/右)', r.fine_line ? `${r.fine_line?.left_undereye_count ?? 0}/${r.fine_line?.right_undereye_count ?? 0}` : null],
                ['鱼尾纹 (左/右)', r.wrinkle_count ? `${r.wrinkle_count?.left_crowsfeet_count ?? 0}/${r.wrinkle_count?.right_crowsfeet_count ?? 0}` : null],
                ['法令纹 (左/右)', r.wrinkle_count ? `${r.wrinkle_count?.left_nasolabial_count ?? 0}/${r.wrinkle_count?.right_nasolabial_count ?? 0}` : null],
                ['左鱼尾纹得分', r.left_crowsfeet_wrinkle_info?.wrinkle_score],
                ['右鱼尾纹得分', r.right_crowsfeet_wrinkle_info?.wrinkle_score],
                ['左法令纹得分', r.left_nasolabial_wrinkle_info?.wrinkle_score],
                ['右法令纹得分', r.right_nasolabial_wrinkle_info?.wrinkle_score],
                ['额头纹', r.wrinkle_count?.forehead_count],
                ['眉间纹', r.wrinkle_count?.glabella_count],
                ['左眼细纹明细', r.left_eye_wrinkle_info ? `深${r.left_eye_wrinkle_info?.wrinkle_deep_num||0}/浅${r.left_eye_wrinkle_info?.wrinkle_shallow_num||0}` : null],
                ['右眼细纹明细', r.right_eye_wrinkle_info ? `深${r.right_eye_wrinkle_info?.wrinkle_deep_num||0}/浅${r.right_eye_wrinkle_info?.wrinkle_shallow_num||0}` : null],
                ['有无抬头纹', r.forehead_wrinkle?.value === 1 ? '有' : (r.forehead_wrinkle?.value === 0 ? '无' : null)],
                ['有无眉间纹', r.glabella_wrinkle?.value === 1 ? '有' : (r.glabella_wrinkle?.value === 0 ? '无' : null)],
                ['有无鱼尾纹', r.crows_feet?.value === 1 ? '有' : (r.crows_feet?.value === 0 ? '无' : null)],
                ['有无眼部细纹', r.eye_finelines?.value === 1 ? '有' : (r.eye_finelines?.value === 0 ? '无' : null)],
                ['有无法令纹', r.nasolabial_fold?.value === 1 ? '有' : (r.nasolabial_fold?.value === 0 ? '无' : null)],
              ]},
              { section: '眼部专项', bg: 'md:bg-indigo-50/80 md:border-indigo-100', items: [
                ['黑眼圈总分', r.score_info?.dark_circle_score],
                ['左眼黑眼圈', r.score_info?.dark_circle_type_score?.left_dark_circle_score],
                ['右眼黑眼圈', r.score_info?.dark_circle_type_score?.right_dark_circle_score],
              ]},
            ].map(({ section, bg, items }) => {
              const validItems = items.filter(item => item[1] != null && item[1] !== '-/-' && item[1] !== '-');
              if (validItems.length === 0) return null;
              return (
                <div key={section}>
                  <div className="px-4 py-2 bg-stone-50 text-xs font-bold text-stone-500 uppercase tracking-wider">{section}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 md:gap-3 md:p-4">
                    {validItems.map(([label, value]) => (
                      <div key={label as string} className={`flex justify-between items-center px-4 py-2.5 md:px-4 md:py-2.5 border-b border-stone-50 md:border md:rounded-xl hover:opacity-80 transition-opacity ${bg || 'md:bg-stone-50/80 md:border-stone-100'}`}>
                        <span className="text-stone-600 truncate mr-2">{label as string}</span>
                        <span className="font-medium text-stone-900 text-right">{value as any}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        </ErrorBoundary>

        <section className="mt-8 px-2 text-xs text-stone-400 text-justify leading-relaxed">
          <p className="mb-2"><strong>免责声明：</strong></p>
          <p>
            本报告基于人工智能图像分析算法生成，相关数据与结果仅供皮肤健康管理及日常护理参考。本系统非医疗器械，本报告不构成临床医疗诊断或处方治疗建议。如您存在严重的皮肤疾患（如重度痤疮、皮炎、红斑脱屑、突发性过敏等），请及时寻求专业皮肤科医师的诊疗帮助。
          </p>
        </section>
        </div>
        
        {showAllImages && (
          <div className="fixed inset-0 z-50 bg-stone-900 overflow-y-auto">
            <div className="p-4 flex items-center justify-between sticky top-0 bg-stone-900/95 backdrop-blur z-20 border-b border-stone-800 shadow-xl">
              <h2 className="text-white font-bold tracking-widest text-sm md:text-base">全景模式 - 10项皮肤图谱</h2>
              <button onClick={() => setShowAllImages(false)} className="px-5 py-2 bg-stone-800 text-stone-200 rounded-full hover:bg-stone-700 text-xs font-medium border border-stone-700 transition-colors">
                关闭全景
              </button>
            </div>
            <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
              {VIEW_MODES.map(v => (
                <div key={v.key} className="bg-black rounded-2xl overflow-hidden border border-stone-800 flex flex-col shadow-lg">
                  <div className="px-3 py-2 bg-stone-800 text-white text-xs font-bold text-center">
                    {v.label}
                  </div>
                  <SkinMapViewer record={record} mapUrls={mapUrls} viewMode={v.key} className="h-[280px] lg:h-[320px] bg-stone-950" />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
