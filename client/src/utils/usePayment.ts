/**
 * 支付工具函数
 */

/**
 * 检测是否在微信内置浏览器中
 */
export function isWechatBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('micromessenger');
}

/**
 * 跳转微信H5支付
 */
export function openWechatH5(h5Url: string) {
  if (h5Url) {
    window.location.href = h5Url;
  }
}

/**
 * 微信JSAPI支付（微信内置浏览器）
 */
export function callWechatJSAPI(params: {
  appId: string;
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: string;
  paySign: string;
}): Promise<boolean> {
  return new Promise((resolve) => {
    // @ts-ignore - WeixinJSBridge 是微信注入的全局对象
    if (typeof WeixinJSBridge === 'undefined') {
      resolve(false);
      return;
    }

    // @ts-ignore
    WeixinJSBridge.invoke(
      'getBrandWCPayRequest',
      {
        appId: params.appId,
        timeStamp: params.timeStamp,
        nonceStr: params.nonceStr,
        package: params.package,
        signType: params.signType,
        paySign: params.paySign,
      },
      (res: any) => {
        // get_brand_wcpay_request:ok 表示支付成功
        resolve(res?.err_msg === 'get_brand_wcpay_request:ok');
      }
    );
  });
}

/**
 * 提交支付宝表单（创建隐藏iframe/表单跳转）
 */
export function submitAlipayForm(formHtml: string) {
  // 如果直接返回了完整的跳转 URL
  if (formHtml.startsWith('http://') || formHtml.startsWith('https://')) {
    window.location.href = formHtml;
    return;
  }

  // 创建一个临时div来解析表单HTML
  const div = document.createElement('div');
  div.innerHTML = formHtml;

  // 找到form元素并提交
  const form = div.querySelector('form') as HTMLFormElement;
  if (form) {
    // 将form追加到body中
    form.style.display = 'none';
    document.body.appendChild(form);
    form.submit();
  } else {
    // 如果不是form格式，可能是一个完整的HTML页面或跳转URL
    // 尝试提取URL
    const match = formHtml.match(/href=["']([^"']+)["']/);
    if (match?.[1]) {
      window.location.href = match[1];
    }
  }
}

/**
 * 支付结果轮询
 */
export function pollPaymentResult(
  orderNo: string,
  onSuccess: () => void,
  onFail?: () => void,
  maxAttempts: number = 15,
  intervalMs: number = 2000
): { stop: () => void } {
  let attempts = 0;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const poll = async () => {
    if (stopped || attempts >= maxAttempts) {
      if (attempts >= maxAttempts && onFail) {
        onFail();
      }
      return;
    }

    attempts++;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // 未登录，跳过轮询
        timer = setTimeout(poll, intervalMs);
        return;
      }

      const response = await fetch(`/api/payment/query/${orderNo}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (data.success) {
        if (data.status === 'paid') {
          stopped = true;
          onSuccess();
          return;
        }
        if (data.status === 'failed') {
          stopped = true;
          if (onFail) onFail();
          return;
        }
      }
    } catch (e) {
      // 网络错误，继续轮询
      console.warn('[Payment Poll] 轮询请求失败，继续...');
    }

    timer = setTimeout(poll, intervalMs);
  };

  // 启动轮询
  poll();

  return {
    stop: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
  };
}
