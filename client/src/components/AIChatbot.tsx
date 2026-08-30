import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const AIChatbot: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: t('auto_aichatbot_326', '您好！我是 TRASOCHY 专属护肤顾问。请问有什么我可以帮您的？') }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [productMap, setProductMap] = useState<Record<string, { id: number; name: string; price: number; mainImage: string }>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      api.get('/products?limit=1000')
        .then((res: any) => {
          const products = res.products || res || [];
          const mapping: Record<string, { id: number; name: string; price: number; mainImage: string }> = {};
          products.forEach((p: any) => {
            mapping[p.slug] = { id: p.id, name: p.name, price: p.basePrice || p.base_price, mainImage: p.mainImage || p.main_image };
          });
          setProductMap(mapping);
        })
        .catch(err => console.error('Failed to load products mapping:', err));
    }
  }, [isOpen]);

  useEffect(() => {
    const handleOpenChat = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { productName, productSlug } = customEvent.detail || {};
      if (productName) {
        setMessages([
          { 
            role: 'assistant', 
            content: `您好！我是您的智能护肤顾问。针对您正在浏览的【${productName}】，我可以为您提供专属的护肤问答和合适的护肤搭配方案。建议搭配购买我们店里的其他系列，您可以直接点击我回复的链接查看。请问您目前的肤质是什么样的？` 
          }
        ]);
      }
      setIsOpen(true);
    };

    window.addEventListener('open-ai-chat', handleOpenChat);
    return () => window.removeEventListener('open-ai-chat', handleOpenChat);
  }, []);

  const renderMessageContent = (content: string) => {
    const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    const recommendedSlugs: string[] = [];

    while ((match = regex.exec(content)) !== null) {
      const text = match[1];
      const url = match[2];
      const index = match.index;

      if (index > lastIndex) {
        parts.push(content.substring(lastIndex, index));
      }

      if (url.startsWith('/products/')) {
        const slug = url.replace('/products/', '');
        recommendedSlugs.push(slug);
        parts.push(
          <Link
            key={index}
            to={url}
            onClick={() => setIsOpen(false)}
            className="inline-flex items-center gap-1 text-xs bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-full px-3 py-1 my-1 mx-0.5 font-semibold transition-all duration-200 cursor-pointer"
          >
            {text} (点击购买)
          </Link>
        );
      } else {
        parts.push(
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-stone-900 underline hover:text-stone-700 mx-0.5 font-medium"
          >
            {text}
          </a>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    if (recommendedSlugs.length > 0) {
      const itemsToBuy = recommendedSlugs
        .map(slug => productMap[slug])
        .filter(Boolean);

      if (itemsToBuy.length > 0) {
        parts.push(
          <div key="checkout-card" className="mt-4 p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
            <p className="text-xs font-semibold text-stone-700 flex items-center gap-1">
              ✨ 智能顾问专属推荐搭配方案：
            </p>
            <div className="space-y-2">
              {itemsToBuy.map(item => (
                <div key={item.id} className="flex items-center gap-3 bg-white p-2 rounded-lg border border-stone-100">
                  <img src={item.mainImage || '/images/default-product.png'} alt={item.name} className="w-10 h-10 object-cover rounded-md border border-stone-100" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-stone-800 truncate">{item.name}</p>
                    <p className="text-xs text-rose-500 font-semibold">¥{item.price}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/checkout', {
                  state: {
                    items: itemsToBuy.map(item => ({
                      productId: item.id,
                      quantity: 1,
                      product_name: item.name,
                      product_image: item.mainImage,
                      basePrice: item.price
                    }))
                  }
                });
              }}
              className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              一键结算此搭配 (¥{itemsToBuy.reduce((sum, item) => sum + item.price, 0).toFixed(2)})
            </button>
          </div>
        );
      }
    }

    return parts.length > 0 ? parts : content;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) throw new Error('API Error');

      const data = await response.json();
      const reply = data.reply;
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);

      // 提取推荐的商品并自动加购
      const regex = /\/products\/([a-zA-Z0-9_-]+)/g;
      let match;
      const slugsFound: string[] = [];
      while ((match = regex.exec(reply)) !== null) {
        slugsFound.push(match[1]);
      }

      if (slugsFound.length > 0) {
        setTimeout(async () => {
          let addedNames: string[] = [];
          for (const slug of slugsFound) {
            const prod = productMap[slug];
            if (prod) {
              try {
                await api.post('/cart', { productId: prod.id, quantity: 1 });
                addedNames.push(prod.name);
              } catch (e) {
                console.error('Auto add to cart failed:', prod.name, e);
              }
            }
          }
          if (addedNames.length > 0) {
            toast.success(`已为您将推荐的【${addedNames.join('、')}】自动加购！`);
            queryClient.invalidateQueries({ queryKey: ['cart'] });
          }
        }, 500);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: t('auto_aichatbot_327', '抱歉，系统开小差了，请稍后再试。') }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-[350px] h-[500px] bg-white/95 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right">
          {/* Header */}
          <div className="bg-gradient-to-r from-stone-900 to-stone-800 text-white p-4 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <div>
                <h3 className="font-medium text-sm">{t('auto_aichatbot_322', t('auto_aichatbot_322', 'TRASOCHY 智能顾问'))}</h3>
                <p className="text-[10px] text-stone-300 opacity-80">{t('auto_aichatbot_323', t('auto_aichatbot_323', '全天候护肤解答'))}</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-stone-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50/50">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex max-w-[85%] gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === 'user' ? 'bg-stone-200' : 'bg-stone-900 text-white'
                  }`}>
                    {msg.role === 'user' ? <User className="w-4 h-4 text-stone-600" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-stone-900 text-white rounded-tr-sm' 
                      : 'bg-white text-stone-800 shadow-sm border border-stone-100 rounded-tl-sm'
                  }`}>
                    {renderMessageContent(msg.content)}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-2 flex-row max-w-[85%]">
                  <div className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-3 rounded-2xl text-sm bg-white text-stone-800 shadow-sm border border-stone-100 rounded-tl-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
                    <span className="text-stone-400">{t('auto_aichatbot_324', t('auto_aichatbot_324', '正在思考...'))}</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-stone-100 shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('auto_aichatbot_325', '请输入您的问题...')}
                className="flex-1 max-h-32 min-h-[44px] bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-stone-900 resize-none transition-shadow"
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white p-3 rounded-xl transition-colors shrink-0 flex items-center justify-center"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 bg-stone-900 text-white rounded-full shadow-xl flex items-center justify-center hover:scale-105 hover:shadow-2xl transition-all duration-300 ${isOpen ? 'rotate-90 opacity-0 scale-50 pointer-events-none' : 'rotate-0 opacity-100 scale-100'}`}
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    </div>
  );
};
