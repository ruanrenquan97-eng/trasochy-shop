import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import api from '../utils/api';

export function useBehaviorTracking() {
  const location = useLocation();
  const startTimeRef = useRef<number>(Date.now());
  const pathRef = useRef<string>(location.pathname);

  useEffect(() => {
    // 确保存在 sessionId
    let sessionId = localStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = uuidv4();
      localStorage.setItem('session_id', sessionId);
    }
    
    // 检查URL中是否有邀请码
    const searchParams = new URLSearchParams(location.search);
    const ref = searchParams.get('ref');
    if (ref) {
      localStorage.setItem('referralCode', ref);
    }
  }, [location.search]);

  useEffect(() => {
    // 当路径变化时，处理上一个路径的停留时间
    const now = Date.now();
    const dwellTime = Math.floor((now - startTimeRef.current) / 1000);
    const previousPath = pathRef.current;
    
    // 发送视图统计（不等待结果，静默运行）
    if (dwellTime > 0) { // 避免过短的刷屏
      let productId = null;
      if (previousPath.startsWith('/products/') && previousPath.length > 10) {
        // 由于前端只能获取slug，后端可能需要处理，或者我们记录path就可以
        // 在这里我们暂且传null，由后端通过path去分析商品，或者通过其他方式
      }
      
      api.post('/tracking/view', {
        sessionId: localStorage.getItem('session_id'),
        path: previousPath,
        dwellTime,
        productId,
      }).catch(console.error); // 忽略错误
    }

    // 更新当前追踪数据
    startTimeRef.current = now;
    pathRef.current = location.pathname;

  }, [location.pathname]);

  // 暴露手动发送事件的函数（比如点击）
  const trackEvent = (actionType: string, productId?: number) => {
    api.post('/tracking/event', {
      sessionId: localStorage.getItem('session_id'),
      path: location.pathname,
      actionType,
      productId
    }).catch(console.error);
  };

  return { trackEvent };
}
