import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, ArrowLeft, Calendar, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';

// pdf.js
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export default function ClinicalReportDetailPage() {
  const { slug } = useParams();
  const { t } = useTranslation();

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['clinical-report', slug],
    queryFn: () => api.get(`/clinical-reports/${slug}`),
    retry: false
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen pt-24 flex flex-col items-center justify-center text-stone-500">
        <FileText size={48} className="mb-4 text-stone-300" />
        <p className="text-lg">报告未找到或已下线</p>
        <Link to="/articles" className="mt-4 px-6 py-2 bg-stone-900 text-white rounded-full hover:bg-stone-800 transition-colors">
          返回研究院
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-stone-50 min-h-screen pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* 返回按钮 */}
        <Link to="/articles" className="inline-flex items-center text-sm text-stone-500 hover:text-stone-900 mb-8 group transition-colors">
          <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" />
          返回列表
        </Link>

        {/* 报告头部 */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden mb-8">
          <div className="p-8 md:p-12">
            <div className="flex flex-col md:flex-row gap-10">
              
              {/* 左侧封面 */}
              {report.cover_image && (
                <div className="w-full md:w-1/3 shrink-0">
                  <img 
                    src={report.cover_image} 
                    alt={report.title} 
                    className="w-full aspect-[3/4] object-cover rounded-xl shadow-md border border-stone-100"
                  />
                </div>
              )}

              {/* 右侧信息 */}
              <div className="flex-1 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-stone-100 text-stone-600 text-xs font-medium rounded-full mb-6 w-fit">
                  <FileText size={14} /> 临床报告
                </div>
                
                <h1 className="text-3xl md:text-4xl font-serif text-stone-900 mb-6 leading-tight">
                  {report.title}
                </h1>
                
                <div className="flex items-center text-stone-500 text-sm mb-8 gap-4">
                  {report.published_at && (
                    <span className="flex items-center gap-1.5">
                      <Calendar size={14} />
                      {new Date(report.published_at).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className="bg-stone-50 p-6 rounded-xl border border-stone-100 mb-8">
                  <h3 className="text-sm font-bold text-stone-900 mb-3 tracking-widest uppercase">摘要 (Summary)</h3>
                  <div className="text-stone-600 text-sm leading-relaxed whitespace-pre-wrap">
                    {report.summary || '暂无摘要'}
                  </div>
                </div>

                {/* 阅读按钮 */}
                {report.pdf_url && (
                  <a 
                    href="#pdf-viewer"
                    onClick={(e) => { e.preventDefault(); document.getElementById('pdf-viewer')?.scrollIntoView({ behavior: 'smooth' }); }}
                    className="inline-flex items-center justify-center px-8 py-3.5 bg-stone-900 text-white font-medium rounded-full hover:bg-stone-800 transition-colors shadow-lg shadow-stone-900/20 w-fit"
                  >
                    <FileText size={18} className="mr-2" /> 在线阅读完整报告
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* PDF Canvas Viewer */}
        {report.pdf_url && (
          <div id="pdf-viewer">
            <ProtectedPDFViewer url={report.pdf_url} />
          </div>
        )}
      </div>
    </div>
  );
}

// ======================== Protected PDF Viewer ========================
function ProtectedPDFViewer({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 加载 PDF 文档
  useEffect(() => {
    setLoading(true);
    setError('');
    const loadingTask = pdfjsLib.getDocument(url);
    loadingTask.promise.then((doc: any) => {
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      setCurrentPage(1);
      setLoading(false);
    }).catch((err: any) => {
      console.error('PDF load error:', err);
      setError('PDF 加载失败，请稍后再试');
      setLoading(false);
    });
  }, [url]);

  // 渲染当前页面为 canvas
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;
    try {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d')!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (err) {
      console.error('Page render error:', err);
    }
  }, [pdfDoc, currentPage, scale]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // 禁止右键、拖拽、复制
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const prevent = (e: Event) => e.preventDefault();
    el.addEventListener('contextmenu', prevent);
    el.addEventListener('dragstart', prevent);
    el.addEventListener('selectstart', prevent);
    el.addEventListener('copy', prevent);
    return () => {
      el.removeEventListener('contextmenu', prevent);
      el.removeEventListener('dragstart', prevent);
      el.removeEventListener('selectstart', prevent);
      el.removeEventListener('copy', prevent);
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-20 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin mb-4"></div>
        <p className="text-sm text-stone-500">正在加载报告文档...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-20 flex items-center justify-center">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-stone-900 text-white px-6 py-3 flex items-center justify-between text-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-lg hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="font-medium tabular-nums tracking-wide">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-lg hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
            disabled={scale <= 0.5}
            className="p-1.5 rounded-lg hover:bg-stone-700 disabled:opacity-30 transition-colors"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-xs font-medium w-12 text-center tabular-nums">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale(s => Math.min(3, s + 0.25))}
            disabled={scale >= 3}
            className="p-1.5 rounded-lg hover:bg-stone-700 disabled:opacity-30 transition-colors"
          >
            <ZoomIn size={16} />
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="overflow-auto bg-stone-100 flex justify-center p-6" style={{ maxHeight: '80vh' }}>
        <canvas
          ref={canvasRef}
          className="shadow-xl rounded"
          style={{ pointerEvents: 'none' }}
        />
      </div>
    </div>
  );
}
