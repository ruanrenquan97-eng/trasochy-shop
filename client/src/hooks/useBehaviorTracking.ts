import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import api from '../utils/api';

export function useBehaviorTracking() {
  const location = useLocation();
  const startTimeRef = useRef<number>(Date.now());
  const pathRef = useRef<string>(location.pathname);
  const isHeartbeatActiveRef = useRef<boolean>(true);

  // 确保 session_id 初始化并捕获邀请码
  useEffect(() => {
    let sessionId = localStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = uuidv4();
      localStorage.setItem('session_id', sessionId);
    }
    
    const searchParams = new URLSearchParams(location.search);
    const ref = searchParams.get('ref');
    if (ref) {
      localStorage.setItem('referralCode', ref);
    }
  }, [location.search]);

  const sendTrackingView = (targetPath: string, dwellSeconds: number) => {
    if (dwellSeconds <= 0) return;

    const sessionId = localStorage.getItem('session_id') || 'guest';
    const payload = JSON.stringify({
      sessionId,
      path: targetPath,
      dwellTime: dwellSeconds,
    });

    // 优先使用 sendBeacon 确保在离开页面或关标签时 100% 送达
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/tracking/view', blob);
    } else {
      api.post('/tracking/view', JSON.parse(payload)).catch(() => {});
    }
  };

  useEffect(() => {
    const now = Date.now();
    const previousPath = pathRef.current;
    const dwellTime = Math.floor((now - startTimeRef.current) / 1000);
    
    // 路由切换时记录上一个页面的停留时长
    if (dwellTime > 0 && previousPath) {
      sendTrackingView(previousPath, dwellTime);
    }

    startTimeRef.current = now;
    pathRef.current = location.pathname;

    // 当用户停留在商品页面（/products/xxx）时，开启每 20 秒的心跳记录，防止用户直接关网页丢失时长
    const interval = setInterval(() => {
      if (pathRef.current.startsWith('/products/') && pathRef.current.length > 10) {
        const currentNow = Date.now();
        const intervalDwell = Math.floor((currentNow - startTimeRef.current) / 1000);
        if (intervalDwell >= 20) {
          sendTrackingView(pathRef.current, intervalDwell);
          startTimeRef.current = currentNow; // 重置心跳起点
        }
      }
    }, 20000);

    return () => {
      clearInterval(interval);
    };
  }, [location.pathname]);

  // 处理窗口关闭 / 刷新 / 切换后台时的停留时长补报
  useEffect(() => {
    const handleUnload = () => {
      const now = Date.now();
      const dwellTime = Math.floor((now - startTimeRef.current) / 1000);
      if (dwellTime > 0 && pathRef.current) {
        sendTrackingView(pathRef.current, dwellTime);
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, []);

  // 暴露手动发送事件的函数（比如点击商品/加入购物车等）
  const trackEvent = (actionType: string, productId?: number) => {
    api.post('/tracking/event', {
      sessionId: localStorage.getItem('session_id'),
      path: location.pathname,
      actionType,
      productId
    }).catch(() => {});
  };

  return { trackEvent };
}
