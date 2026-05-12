import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.bubble.css'; // 使用 bubble 主题用于只读显示，或者自己写样式
import api from '../utils/api';

// 简单 Markdown 转 HTML
const mdToHtml = (md: string) => {
  if (!md) return '';
  let html = md
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-stone-800 mt-8 mb-4 tracking-wider">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-stone-900 mt-12 mb-6 pb-3 border-b border-stone-200 flex items-center gap-3 tracking-widest"><span class="block w-1.5 h-5 bg-stone-900"></span>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-12 mb-8 text-center tracking-widest">$1</h1>')
    .replace(/^> (.*$)/gim, '<blockquote class="relative border-l-4 border-stone-800 bg-stone-50 pl-6 pr-4 py-5 my-8 text-stone-700 rounded-r-lg text-sm leading-[1.8] tracking-wide">$1</blockquote>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong class="text-stone-900 font-bold">$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em class="text-stone-600 italic">$1</em>')
    .replace(/!\[(.*?)\]\((.*?)\)/gim, '<figure class="my-10"><img alt="$1" src="$2" class="w-full rounded-sm shadow-sm" /><figcaption class="text-center text-xs text-stone-400 mt-3 tracking-widest">$1</figcaption></figure>')
    .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" class="text-stone-900 font-medium underline underline-offset-4 decoration-stone-300 hover:decoration-stone-900 transition-colors">$1</a>')
    .replace(/\n$/gim, '<br />')
    .replace(/^\s*[-*+] (.*$)/gim, '<li class="ml-6 list-disc mb-3 text-stone-700 leading-[1.8] tracking-wide">$1</li>')
    // 简单的段落处理
    .split('\\n\\n').map(p => {
      if (p.trim().startsWith('<h') || p.trim().startsWith('<ul') || p.trim().startsWith('<li') || p.trim().startsWith('<blockquote') || p.trim().startsWith('<figure')) {
        return p;
      }
      return '<p class="mb-6 leading-[2] tracking-wide text-stone-700 text-justify">' + p + '</p>';
    }).join('\\n');
  return '<div class="space-y-2">' + html + '</div>';
};

export default function ArticleDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const { data: article, isLoading, error } = useQuery({
    queryKey: ['article', slug],
    queryFn: () => api.get('/articles/' + slug),
    retry: false
  });

  if (isLoading) return <div className="text-center py-32 text-stone-400">加载中...</div>;
  
  if (error || !article) {
    return (
      <div className="text-center py-32">
        <h2 className="text-2xl font-light text-stone-900 mb-4">文章未找到</h2>
        <button onClick={() => navigate('/articles')} className="text-sm text-stone-500 hover:text-stone-900 underline underline-offset-4">
          返回护肤研究所
        </button>
      </div>
    );
  }

  const htmlContent = mdToHtml(article.content);

  return (
    <article className="max-w-3xl mx-auto px-6 py-12 md:py-20">
      <Helmet>
        <title>{article.title} - TRASOCHY</title>
        <meta name="description" content={article.content.substring(0, 150)} />
      </Helmet>

      <button onClick={() => navigate('/articles')} className="flex items-center gap-2 text-xs text-stone-400 hover:text-stone-900 transition-colors uppercase tracking-widest mb-12">
        <ArrowLeft size={14} /> 返回
      </button>

      <header className="mb-12 text-center">
        {article.keywords && (
          <div className="text-xs text-stone-400 tracking-widest uppercase mb-6">
            {JSON.parse(article.keywords || '[]').join(' • ')}
          </div>
        )}
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-light text-stone-900 mb-8 leading-tight">
          {article.title}
        </h1>
        <div className="text-sm text-stone-400 flex items-center justify-center gap-4">
          <span>{new Date(article.published_at || article.created_at).toLocaleDateString()}</span>
        </div>
      </header>

      {article.cover_image && (
        <div className="aspect-video w-full bg-stone-100 mb-16 rounded-sm overflow-hidden">
          <img src={article.cover_image} alt={article.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div 
        className="max-w-none font-sans"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
      
      <div className="mt-24 pt-12 border-t border-stone-200 text-center">
        <p className="text-sm text-stone-500 italic mb-6">想要了解更多护肤奥秘？</p>
        <Link to="/products" className="btn-primary px-8 py-3 text-sm">
          探索全系产品
        </Link>
      </div>
    </article>
  );
}
