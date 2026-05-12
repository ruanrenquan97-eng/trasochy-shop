import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import api from '../utils/api';

export default function ArticlesPage() {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const limit = 12;

  const { data, isLoading } = useQuery({
    queryKey: ['articles', page, keyword],
    queryFn: () => api.get('/articles?page=' + page + '&limit=' + limit + '&keyword=' + keyword),
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <Helmet>
        <title>护肤研究所 - TRASOCHY</title>
        <meta name="description" content="TRASOCHY护肤研究所，探索前沿护肤科技与护肤知识。" />
      </Helmet>

      <div className="text-center mb-16">
        <h1 className="text-4xl font-light text-stone-900 tracking-widest uppercase mb-4">护肤研究所</h1>
        <p className="text-sm text-stone-500 tracking-widest">探索前沿生物科技，解读肌肤语言</p>
      </div>

      {/* 搜索框 */}
      <div className="flex justify-center mb-12">
        <input
          type="text"
          placeholder="搜索护肤文章..."
          value={keyword}
          onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
          className="w-full max-w-md px-6 py-3 border-b border-stone-300 bg-transparent text-center focus:outline-none focus:border-stone-900 transition-colors uppercase tracking-widest text-sm placeholder-stone-400"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-stone-400">加载中...</div>
      ) : data?.articles?.length === 0 ? (
        <div className="text-center py-20 text-stone-400 tracking-widest">暂无相关文章</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {data?.articles?.map((article: any) => (
              <Link key={article.id} to={'/articles/' + article.slug} className="group block">
                <div className="aspect-[4/3] bg-stone-100 overflow-hidden mb-4 rounded-sm">
                  {article.cover_image ? (
                    <img
                      src={article.cover_image}
                      alt={article.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-300 font-serif italic text-2xl tracking-widest bg-stone-50">
                      TRASOCHY
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-stone-900 group-hover:text-stone-600 transition-colors mb-2 line-clamp-2">
                    {article.title}
                  </h3>
                  <div className="flex items-center justify-between text-xs text-stone-400 tracking-widest">
                    <span>{new Date(article.published_at || article.created_at).toLocaleDateString()}</span>
                    {article.keywords && (
                      <span className="uppercase">{JSON.parse(article.keywords || '[]').join(' • ')}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* 分页 */}
          {data?.total > limit && (
            <div className="flex justify-center gap-2 mt-16">
              {Array.from({ length: Math.ceil(data.total / limit) }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={'w-8 h-8 flex items-center justify-center text-xs tracking-widest transition-colors ' + (page === i + 1 ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-100')}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
