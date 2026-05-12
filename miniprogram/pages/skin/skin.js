Page({
  data: {
    imageUrl: '',
    isAnalyzing: false,
    analysisResult: null,
    concerns: [],
    recommendations: []
  },

  // 拍照或选择相册
  takePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera', 'album'],
      camera: 'front',
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.setData({
          imageUrl: tempFilePath,
          isAnalyzing: true
        });
        this.uploadForAnalysis(tempFilePath);
      }
    });
  },

  // 上传至后端进行旷视分析
  uploadForAnalysis(filePath) {
    const token = wx.getStorageSync('token'); // 假设小程序已登录并保存了 JWT token
    const API_BASE = 'http://localhost:5000/api'; // 开发环境地址，生产环境替换为真实域名

    wx.uploadFile({
      url: `${API_BASE}/skin/analyze/megvii`,
      filePath: filePath,
      name: 'image',
      header: {
        'Authorization': `Bearer ${token}` // 需要携带鉴权 Token
      },
      success: (res) => {
        try {
          const data = JSON.parse(res.data);
          if (data.success) {
            this.setData({
              isAnalyzing: false,
              analysisResult: data.result,
              concerns: data.concerns,
              recommendations: data.recommendations
            });
          } else {
            wx.showToast({ title: data.error || '分析失败', icon: 'none' });
            this.setData({ isAnalyzing: false });
          }
        } catch (e) {
          wx.showToast({ title: '服务器响应错误', icon: 'none' });
          this.setData({ isAnalyzing: false });
        }
      },
      fail: (err) => {
        wx.showToast({ title: '网络请求失败', icon: 'none' });
        this.setData({ isAnalyzing: false });
      }
    });
  },

  // 跳转官网购买
  goToBuy(e) {
    const productId = e.currentTarget.dataset.id;
    // 您的官网域名，小程序后台需配置为业务域名
    const baseUrl = 'https://www.trasochy.com'; 
    const url = `${baseUrl}/product/${productId}?source=miniprogram`;
    
    // 跳转到内嵌的 web-view 页面
    wx.navigateTo({
      url: `/pages/webview/webview?url=${encodeURIComponent(url)}`
    });
  },

  // 重新测试
  resetTest() {
    this.setData({
      imageUrl: '',
      isAnalyzing: false,
      analysisResult: null,
      concerns: [],
      recommendations: []
    });
  }
});
