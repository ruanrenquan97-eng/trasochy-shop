import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { ShoppingCart, Plus, Minus, ArrowLeft, Heart, Star, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuthStore } from '../contexts/authStore';
import { Helmet } from 'react-helmet-async';
import StoryProductLayout from '../components/StoryProductLayout';

function StarRating({ rating, size = 16, interactive = false, onChange }: { rating: number; size?: number; interactive?: boolean; onChange?: (r: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onChange?.(i)}
          onMouseEnter={() => interactive && setHover(i)}
          onMouseLeave={() => interactive && setHover(0)}
          className={`${interactive ? 'cursor-pointer' : 'cursor-default'} transition-colors`}
        >
          <Star size={size} className={(interactive && hover >= i ? 'text-amber-400' : '') || (!interactive && i <= rating ? 'text-amber-400 fill-amber-400' : 'text-stone-200')} />
        </button>
      ))}
    </div>
  );
}

export default function ProductDetailPage() {
  const { slug } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewContent, setReviewContent] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [purchaseMode, setPurchaseMode] = useState<'one-time' | 'subscription'>('one-time');
  const [frequencyDays, setFrequencyDays] = useState(30);
  const [email, setEmail] = useState('');

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug, user?.level],
    queryFn: () => api.get(`/products/${slug}`),
  }) as any;

  // Settings for point redemption
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings'),
  }) as any;

  // 收藏状态
  const { data: favCheck } = useQuery({
    queryKey: ['fav-check', product?.id],
    queryFn: () => api.get(`/favorites/check/${product.id}`),
    enabled: !!user && !!product?.id,
  }) as any;

  useEffect(() => {
    if (favCheck?.isFavorited !== undefined) {
      setIsFavorited(favCheck.isFavorited);
    }
  }, [favCheck]);

  // 评价列表
  const { data: reviewsData } = useQuery({
    queryKey: ['reviews', product?.id],
    queryFn: () => api.get(`/reviews/product/${product.id}`),
    enabled: !!product?.id,
  }) as any;

  // 已评价的商品（来自订单）
  const { data: reviewedItems } = useQuery({
    queryKey: ['my-reviewed-items'],
    queryFn: () => api.get('/orders/my?limit=100&status=delivered'),
    enabled: !!user,
  }) as any;

  const handleAddToCart = async () => {
    if (!user) { navigate('/login'); return; }
    setAdding(true);
    try {
      await api.post('/cart', { productId: product.id, quantity });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('已加入购物车');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAdding(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!user) { navigate('/login'); return; }
    try {
      if (isFavorited) {
        await api.delete(`/favorites/${product.id}`);
        toast.success('已取消收藏');
      } else {
        await api.post('/favorites', { productId: product.id });
        toast.success('已收藏');
      }
      setIsFavorited(!isFavorited);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSubmitReview = async () => {
    if (reviewRating < 1) { toast.error('请选择评分'); return; }
    if (!reviewContent.trim()) { toast.error('请输入评价内容'); return; }

    // 找到该商品在已收货订单中的 order_item
    const deliveredOrders = reviewedItems?.orders || [];
    let targetOrderItem: any = null;
    for (const order of deliveredOrders) {
      for (const item of order.items || []) {
        if (item.product_id === product.id) {
          targetOrderItem = { orderId: order.id, productId: item.product_id };
          break;
        }
      }
      if (targetOrderItem) break;
    }
    if (!targetOrderItem) { toast.error('未找到可评价的订单'); return; }

    try {
      await api.post('/reviews', {
        orderId: targetOrderItem.orderId,
        productId: targetOrderItem.productId,
        rating: reviewRating,
        content: reviewContent,
      });
      toast.success('评价成功！');
      queryClient.invalidateQueries({ queryKey: ['reviews', product.id] });
      setReviewRating(0);
      setReviewContent('');
      setShowReviewForm(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // 检查该商品是否在已收货订单中且未评价
  const canReview = (() => {
    if (!user || !product) return false;
    const deliveredOrders = reviewedItems?.orders || [];
    for (const order of deliveredOrders) {
      for (const item of order.items || []) {
        if (item.product_id === product.id) {
          // 检查是否已评价
          const reviewed = reviewsData?.reviews?.some((r: any) => r.order_id === order.id && r.product_id === product.id && r.user_id === user.id);
          return !reviewed;
        }
      }
    }
    return false;
  })();

  if (isLoading) return (
    <div className="max-w-7xl mx-auto px-6 py-24 text-center">
      <p className="text-stone-400 text-xs tracking-widest uppercase">加载中...</p>
    </div>
  );
  if (!product) return (
    <div className="max-w-7xl mx-auto px-6 py-24 text-center">
      <p className="text-stone-400 text-sm">商品不存在</p>
    </div>
  );

  const images = [product.main_image, ...(product.images || [])].filter(Boolean);

  if (settings?.feature_story_pages === '1' && product.is_story_page) {
    return (
      <>
        <Helmet>
          <title>{product.name} - 传诗奇 TRASOCHY</title>
          <meta name="description" content={product.description || ''} />
        </Helmet>
        <StoryProductLayout product={product} settings={settings} onAddToCart={async (qty) => {
          if (!user) { navigate('/login'); return; }
          setAdding(true);
          try {
            await api.post('/cart', { productId: product.id, quantity: qty });
            queryClient.invalidateQueries({ queryKey: ['cart'] });
            toast.success('已加入购物车');
          } catch (e: any) {
            toast.error(e.message);
          } finally {
            setAdding(false);
          }
        }} adding={adding} />
      </>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <Helmet>
        <title>{product.name} - 传诗奇 TRASOCHY</title>
        <meta name="description" content={product.description || ''} />
        {product.tags && <meta name="keywords" content={product.tags} />}
      </Helmet>
      {/* Breadcrumb */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-900 mb-8 tracking-widest uppercase transition-colors">
        <ArrowLeft size={12} /> 返回
      </button>

      <div className="grid md:grid-cols-2 gap-12 lg:gap-20">
        {/* 商品图片 */}
        <div className="space-y-4">
          <div className="aspect-[3/4] bg-stone-50 overflow-hidden">
            {images[activeImg] ? (
              <img src={images[activeImg]} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-200 text-7xl">◆</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((img: string, i: number) => (
                <button key={i} onClick={() => setActiveImg(i)}
                  className={`w-16 h-16 bg-stone-50 overflow-hidden border-2 transition-colors ${i === activeImg ? 'border-stone-900' : 'border-transparent'}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 商品信息 */}
        <div className="flex flex-col justify-center">
          <p className="text-xs text-stone-400 mb-3 tracking-[0.3em] uppercase">{product.category_name}</p>
          <div className="flex items-start justify-between">
            <h1 className="text-3xl font-light text-stone-900 mb-4 leading-tight tracking-tight">{product.name}</h1>
            {user && (
              <button onClick={handleToggleFavorite}
                className="flex-shrink-0 ml-4 p-2 text-stone-300 hover:text-rose-500 transition-colors">
                <Heart size={22} fill={isFavorited ? 'currentColor' : 'none'} className={isFavorited ? 'text-rose-500' : ''} />
              </button>
            )}
          </div>

          {/* 评分概览 */}
          {reviewsData?.reviewCount > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <StarRating rating={Math.round(reviewsData.avgRating)} size={14} />
              <span className="text-sm text-stone-500">{reviewsData.avgRating}分</span>
              <span className="text-xs text-stone-400">({reviewsData.reviewCount}条评价)</span>
            </div>
          )}

          {/* 价格 */}
          <div className="mb-8">
            <span className="text-3xl font-semibold text-stone-900">¥{product.currentPrice?.toFixed(2)}</span>
            {product.currentPrice !== product.base_price && (
              <span className="text-lg text-stone-300 line-through ml-3">¥{product.base_price?.toFixed(2)}</span>
            )}
            {user && user.level !== 'guest' && (
              <span className="ml-3 text-xs text-rose-500 bg-rose-50 px-2 py-0.5 tracking-wider">会员专享价</span>
            )}
          </div>

          {/* 推荐组合购买 */}
          {product.bundles && product.bundles.length > 0 && (
            <div className="mb-8">
              <p className="text-xs text-stone-400 mb-3 tracking-[0.3em] uppercase">推荐组合购买</p>
              <div className="space-y-4">
                {product.bundles.map((bundle: any) => {
                  // 计算组合中所有单品的原价总和
                  const originalTotal = bundle.items?.reduce((sum: number, item: any) => sum + item.base_price, 0) || 0;
                  const discountAmount = originalTotal - bundle.current_price;
                  
                  return (
                    <div key={bundle.id} className="border border-rose-100 bg-rose-50/30 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-stone-800">{bundle.name}</h4>
                        <div className="text-right">
                          <span className="text-lg font-semibold text-rose-600">¥{bundle.current_price?.toFixed(2)}</span>
                          {originalTotal > bundle.current_price && (
                            <span className="text-xs text-stone-400 line-through ml-2">¥{originalTotal.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                        {bundle.items?.map((item: any, i: number) => (
                          <div key={item.id} className="flex items-center flex-shrink-0">
                            {i > 0 && <Plus size={14} className="text-stone-300 mx-2" />}
                            <div className="w-12 h-12 bg-white rounded border border-stone-100 overflow-hidden" title={item.name}>
                              {item.main_image ? (
                                <img src={item.main_image} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-stone-50" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-rose-100/50">
                        <span className="text-xs text-rose-500 font-medium tracking-wide">
                          {discountAmount > 0 ? `搭配购买立省 ¥${discountAmount.toFixed(2)}` : '超值组合套餐'}
                        </span>
                        <button 
                          onClick={async () => {
                            if (!user) { navigate('/login'); return; }
                            setAdding(true);
                            try {
                              await api.post('/cart', { productId: bundle.id, quantity: 1 });
                              queryClient.invalidateQueries({ queryKey: ['cart'] });
                              toast.success(`已将组合加入购物车`);
                            } catch (e: any) {
                              toast.error(e.message);
                            } finally {
                              setAdding(false);
                            }
                          }}
                          disabled={adding}
                          className="px-4 py-1.5 bg-stone-900 text-white text-xs rounded-full hover:bg-stone-800 transition-colors disabled:opacity-50"
                        >
                          加购组合
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 商品描述 */}
          {product.description && (
            <div className="border-t border-b border-stone-200 py-6 mb-8">
              <p className="text-sm text-stone-500 leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* 库存 */}
          <div className="flex items-center gap-4 mb-8">
            <span className="text-xs text-stone-400 tracking-widest uppercase">库存</span>
            <span className={`text-sm font-medium ${product.stock < 10 ? 'text-amber-500' : 'text-stone-700'}`}>
              {product.stock > 0 ? `${product.stock} ${product.unit}` : '已售罄'}
            </span>
          </div>

          {/* 数量选择 */}
          {product.stock > 0 && (
            <>
              <div className="flex items-center gap-6 mb-8">
                <span className="text-xs text-stone-400 tracking-widest uppercase">数量</span>
                <div className="flex items-center border border-stone-300">
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-4 py-2.5 hover:bg-stone-50 text-stone-500 text-sm">
                    <Minus size={14} />
                  </button>
                  <span className="w-12 text-center text-sm text-stone-900">{quantity}</span>
                  <button onClick={() => setQuantity(q => Math.min(product.stock, q + 1))} className="px-4 py-2.5 hover:bg-stone-50 text-stone-500 text-sm">
                    <Plus size={14} />
                  </button>
                </div>
                <span className="text-xs text-stone-400">
                  小计: <span className="text-stone-900 font-medium">¥{(product.currentPrice * quantity).toFixed(2)}</span>
                </span>
              </div>

              {/* 订阅选项 */}
              {settings?.feature_subscriptions === '1' && (
                <div className="mb-8 border border-stone-200 rounded-xl overflow-hidden">
                  <button 
                    onClick={() => setPurchaseMode('one-time')}
                    className={`w-full p-4 text-left flex items-center justify-between border-b border-stone-100 ${purchaseMode === 'one-time' ? 'bg-stone-50' : 'bg-white'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${purchaseMode === 'one-time' ? 'border-stone-900' : 'border-stone-300'}`}>
                        {purchaseMode === 'one-time' && <div className="w-2 h-2 bg-stone-900 rounded-full" />}
                      </div>
                      <span className="text-sm text-stone-900">单次购买</span>
                    </div>
                    <span className="text-sm text-stone-900 font-medium">¥{(product.currentPrice * quantity).toFixed(2)}</span>
                  </button>
                  <button 
                    onClick={() => setPurchaseMode('subscription')}
                    className={`w-full p-4 text-left ${purchaseMode === 'subscription' ? 'bg-stone-50' : 'bg-white'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${purchaseMode === 'subscription' ? 'border-stone-900' : 'border-stone-300'}`}>
                          {purchaseMode === 'subscription' && <div className="w-2 h-2 bg-stone-900 rounded-full" />}
                        </div>
                        <span className="text-sm text-stone-900">定期订阅 <span className="text-xs text-rose-500 ml-1 px-1.5 py-0.5 bg-rose-50 rounded">享 9 折</span></span>
                      </div>
                      <span className="text-sm text-rose-600 font-medium">¥{(product.currentPrice * quantity * 0.9).toFixed(2)}</span>
                    </div>
                    {purchaseMode === 'subscription' && (
                      <div className="pl-7 mt-3">
                        <p className="text-xs text-stone-500 mb-2">选择配送周期：</p>
                        <select 
                          value={frequencyDays} 
                          onChange={(e) => setFrequencyDays(Number(e.target.value))}
                          className="w-full text-sm border-stone-300 rounded focus:ring-stone-900 focus:border-stone-900"
                        >
                          <option value={15}>每 15 天配送一次</option>
                          <option value={30}>每 30 天配送一次</option>
                          <option value={60}>每 60 天配送一次</option>
                        </select>
                      </div>
                    )}
                  </button>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-3">
                {purchaseMode === 'one-time' ? (
                  <>
                    <button onClick={handleAddToCart} disabled={adding}
                      className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50">
                      <ShoppingCart size={16} />
                      {adding ? '添加中...' : '加入购物车'}
                    </button>
                    <button onClick={async () => { await handleAddToCart(); navigate('/cart'); }}
                      className="flex-1 btn-outline">
                      立即购买
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => {
                      if (!user) { navigate('/login'); return; }
                      navigate('/checkout', { 
                        state: { 
                          items: [{ 
                            productId: product.id, 
                            quantity, 
                            isSubscription: true, 
                            frequencyDays,
                            product_name: product.name, 
                            product_image: images[0] 
                          }],
                          total: product.currentPrice * quantity * 0.9,
                          pointsTotal: 0
                        } 
                      });
                    }}
                    className="w-full py-3.5 bg-rose-600 text-white font-medium hover:bg-rose-700 transition-colors flex justify-center items-center"
                  >
                    立即订阅
                  </button>
                )}
              </div>

              {/* 纯积分兑换 */}
              {product.points_price > 0 && settings?.map?.points_redeem_enabled === '1' && (
                <div className="mt-4 p-4 border border-rose-200 bg-rose-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-rose-800">积分专属兑换</span>
                    <span className="text-sm text-stone-500">我的积分: {user?.points || 0}</span>
                  </div>
                  <button 
                    onClick={() => {
                      if (!user) { navigate('/login'); return; }
                      if (user.points < product.points_price * quantity) {
                        toast.error('积分不足');
                        return;
                      }
                      navigate('/checkout', { 
                        state: { 
                          items: [{ productId: product.id, quantity, isPointsRedemption: true, product_name: product.name, product_image: images[0] }],
                          total: 0,
                          pointsTotal: product.points_price * quantity
                        } 
                      });
                    }}
                    className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-sm rounded-lg transition-colors flex justify-center items-center gap-2"
                  >
                    使用 {product.points_price * quantity} 积分免费兑换
                  </button>
                </div>
              )}
            </>
          )}

          {product.stock === 0 && (
            settings?.feature_restock_notify === '1' ? (
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl">
                <p className="text-sm font-medium text-stone-900 mb-2">到货提醒</p>
                <p className="text-xs text-stone-500 mb-4">该商品暂时售罄，留下您的邮箱，我们将在补货时第一时间通知您。</p>
                <div className="flex gap-2">
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="您的邮箱地址" 
                    className="flex-1 text-sm border border-stone-300 rounded-lg px-3 py-2" 
                  />
                  <button 
                    onClick={async () => {
                      if (!email) return toast.error('请输入邮箱');
                      try {
                        await api.post('/products/restock-request', { productId: product.id, email });
                        toast.success('登记成功！到货会发送提醒邮件。');
                        setEmail('');
                      } catch (err: any) {
                        toast.error(err.message || '登记失败');
                      }
                    }}
                    className="px-4 py-2 bg-stone-900 text-white text-sm rounded-lg hover:bg-stone-800"
                  >
                    登记
                  </button>
                </div>
              </div>
            ) : (
              <button disabled className="w-full py-4 bg-stone-100 text-stone-400 text-xs tracking-widest uppercase font-medium">已售罄</button>
            )
          )}

          {!user && (
            <p className="text-center text-xs text-stone-400 mt-4 tracking-wider">
              <button onClick={() => navigate('/register')} className="text-stone-900 hover:underline uppercase tracking-wider">注册</button>
              {' '}登录享会员专属优惠
            </p>
          )}
        </div>
      </div>

      {/* 商品评价区域 */}
      <div className="mt-20 border-t border-stone-200 pt-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <p className="text-xs text-stone-400 tracking-[0.3em] uppercase">用户评价</p>
            {reviewsData?.reviewCount > 0 && (
              <>
                <div className="flex items-center gap-2">
                  <StarRating rating={Math.round(reviewsData.avgRating)} size={16} />
                  <span className="text-lg font-semibold text-stone-900">{reviewsData.avgRating}</span>
                </div>
                <span className="text-xs text-stone-400">{reviewsData.reviewCount}条评价</span>
              </>
            )}
          </div>
          {canReview && !showReviewForm && (
            <button onClick={() => setShowReviewForm(true)} className="btn-primary text-xs py-2 px-4 flex items-center gap-1">
              <Send size={14} /> 写评价
            </button>
          )}
        </div>

        {/* 评价表单 */}
        {showReviewForm && (
          <div className="card p-6 mb-8 border-stone-900">
            <h3 className="text-xs font-semibold text-stone-900 mb-4 tracking-widest uppercase">撰写评价</h3>
            <div className="mb-4">
              <label className="text-xs text-stone-400 mb-2 block tracking-wider">评分 *</label>
              <StarRating rating={reviewRating} size={24} interactive onChange={setReviewRating} />
            </div>
            <div className="mb-4">
              <label className="text-xs text-stone-400 mb-2 block tracking-wider">评价内容 *</label>
              <textarea value={reviewContent} onChange={e => setReviewContent(e.target.value)} rows={3}
                placeholder="分享您的使用体验..."
                className="w-full border border-stone-300 px-4 py-2.5 text-sm focus:outline-none focus:border-stone-900" />
            </div>
            <div className="flex gap-3">
              <button onClick={handleSubmitReview} className="btn-primary text-xs py-2 px-6">提交评价</button>
              <button onClick={() => { setShowReviewForm(false); setReviewRating(0); setReviewContent(''); }} className="btn-outline text-xs py-2 px-6">取消</button>
            </div>
          </div>
        )}

        {/* 评价列表 */}
        {reviewsData?.reviews?.length > 0 ? (
          <div className="space-y-3 max-w-3xl max-h-[320px] overflow-y-auto pr-2">
            {reviewsData.reviews.map((review: any) => (
              <div key={review.id} className="card p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 bg-stone-100 rounded-full flex items-center justify-center text-xs font-medium text-stone-600">
                      {(review.user_name || '匿名')[0]}
                    </div>
                    <span className="text-sm font-medium text-stone-700">{review.user_name || '匿名用户'}</span>
                  </div>
                  <StarRating rating={review.rating} size={10} />
                </div>
                {review.content && (
                  <p className="text-sm text-stone-600 leading-relaxed mb-1.5">{review.content}</p>
                )}
                <p className="text-[10px] text-stone-400">{new Date(review.created_at).toLocaleDateString('zh-CN')}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-stone-400">
            <Star size={32} className="mx-auto mb-2 text-stone-200" />
            <p className="text-sm">暂无评价，快来发表第一条评价吧</p>
          </div>
        )}
      </div>

      {/* 成分百科区域 */}
      {settings?.feature_ingredient_glossary === '1' && product.ingredients && product.ingredients.length > 0 && (
        <div className="mt-16 border-t border-stone-200 pt-12">
          <div className="max-w-4xl">
            <p className="text-xs text-stone-400 tracking-[0.3em] uppercase mb-8 flex items-center gap-2"><Star size={14} className="text-stone-300"/> 核心成分剖析</p>
            <div className="grid sm:grid-cols-2 gap-6">
              {product.ingredients.map((ing: any) => (
                <div key={ing.id} className="bg-stone-50 p-6 rounded-2xl border border-stone-100 hover:border-stone-200 transition-colors">
                  <h4 className="text-lg font-medium text-stone-900 mb-1">{ing.name}</h4>
                  {ing.inci_name && <p className="text-xs text-stone-400 mb-3 font-mono">{ing.inci_name}</p>}
                  {ing.benefits && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {ing.benefits.split(',').map((b: string) => (
                        <span key={b} className="px-2.5 py-1 bg-white text-stone-600 text-xs rounded-full border border-stone-200 shadow-sm">{b}</span>
                      ))}
                    </div>
                  )}
                  {ing.description && <p className="text-sm text-stone-500 leading-relaxed">{ing.description}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 真实对比图库 */}
      {settings?.feature_before_after_gallery === '1' && product.before_after_images && product.before_after_images.length > 0 && (
        <div className="mt-16 border-t border-stone-200 pt-12">
          <div className="max-w-5xl">
            <p className="text-xs text-stone-400 tracking-[0.3em] uppercase mb-8 flex items-center gap-2"><Star size={14} className="text-stone-300"/> 使用效果实测 (Before & After)</p>
            <div className="flex gap-6 overflow-x-auto pb-4 snap-x hide-scrollbar">
              {product.before_after_images.map((pair: any, idx: number) => (
                <div key={idx} className="flex-shrink-0 w-full md:w-[600px] snap-center bg-white border border-stone-100 rounded-2xl p-4 shadow-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-stone-50">
                      <img src={pair.before} alt="Before" className="w-full h-full object-cover" />
                      <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs tracking-wider uppercase font-medium">Before</div>
                    </div>
                    <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-stone-50">
                      <img src={pair.after} alt="After" className="w-full h-full object-cover" />
                      <div className="absolute top-3 right-3 bg-rose-500 text-white px-3 py-1 rounded-full text-xs tracking-wider uppercase font-medium shadow-md">After</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 详细描述区域 */}
      {product.detail && (
        <div className="mt-12 border-t border-stone-200 pt-12">
          <div className="max-w-2xl">
            <p className="text-xs text-stone-400 tracking-[0.3em] uppercase mb-6">商品详情</p>
            <div className="text-sm text-stone-600 leading-relaxed [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-3 [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-rose-500 [&_a]:underline [&_strong]:font-semibold" dangerouslySetInnerHTML={{ __html: product.detail }} />
          </div>
        </div>
      )}
    </div>
  );
}
