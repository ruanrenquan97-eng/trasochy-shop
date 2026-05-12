# 旷视专业版测肤 (FaceStyle) 图谱渲染问题排查与修复记录

## 1. 问题背景
在接入旷视企业版测肤接口（`skinanalyze_pro` / `skinanalyze_advanced`）时，前端页面（比如“红区图”、“水分图”、“色沉图”等）仅显示数据（如红区面积 0.8%），而**无法渲染出底层带有特效高亮的图片**（图谱完全不显示，只显示原图）。

## 2. 问题排查过程
通过底层日志抓取与数据库记录分析，发现以下现象：
1. 后端成功发送了请求，旷视也成功返回了多达 65 项分析数据（包含 acne, pore, moisture 等）。
2. 但是旷视返回的 JSON 数据包中，**完全没有包含图像数据 (Base64)**。
3. 数据库中记录的 `mapUrls` 为空 `{}`。

## 3. 核心原因剖析

### 错误一：`return_maps` 参数格式下发错误
根据以往开放平台的旧逻辑，我们误以为只要向旷视接口发送 `return_maps: 1` 就能激活所有的图谱返回。
**真相：**
仔细查阅旷视最新的官方文档后发现，`return_maps` 参数**不是一个布尔值或数字**，而必须是一个**用逗号分隔的特定字符串枚举**。
如果我们发送 `return_maps=1`，旷视服务器会认为这是无效参数并直接忽略，从而拒绝下发图片。
正确的传参必须明确指定想要的图谱类型，例如：
`return_maps: "red_area,brown_area,texture_enhanced_pores,texture_enhanced_blackheads,texture_enhanced_oily_area,texture_enhanced_lines,water_area,rough_area,roi_outline_map"`

### 错误二：图谱数据在 JSON 中的返回层级不固定
旷视接口在不同版本和不同网络条件下，返回图片的 JSON 结构层级并不固定。
有时图片放在 `result.face_maps` 下，有时放在 `result.maps`，甚至有时会直接铺平暴露在最顶层的节点下。
旧代码只读取了固定的某一两层，导致即使旷视成功返回了图片，系统也会因为找不到对应路径而提取失败。

## 4. 解决方案与代码修改

### 步骤一：修正参数组装逻辑（`server/src/services/megviiAi.ts`）
我们将识别到专业版域名（包含 `facestyle`, `skinanalyze_pro`, `skinanalyze_advanced`）时的下发参数，由原先的 `1` 强行更改为官方文档要求的全量字符串：
```typescript
if (isPro && (url.includes('facestyle') || url.includes('skinanalyze_pro') || url.includes('skinanalyze_advanced'))) {
  formData.append('return_maps', 'red_area,brown_area,texture_enhanced_pores,texture_enhanced_blackheads,texture_enhanced_oily_area,texture_enhanced_lines,water_area,rough_area,roi_outline_map');
}
```

### 步骤二：增加全层级图谱提取兜底机制（`server/src/routes/skin.ts`）
为了防止因旷视修改 JSON 层级而导致提取不到图谱，我们在处理返回数据时加入了“全范围覆盖提取法”：
```typescript
const maps = {
  ...(aiResult || {}),
  ...(aiResult.result || {}),
  ...(aiResult.maps || {}),
  ...(aiResult.result?.maps || {}),
  ...(aiResult.result?.face_maps || {})
};
// 随后通过预设的字典 MAP_KEY_MAP，直接去 maps 对象里安全提取各个图谱的 base64 字符串
```

## 5. 总结与后续建议
- **查阅最新文档**：旷视的接口参数规范要求极其严格，一旦发现拿不到预期数据，务必第一时间对齐官方文档的数据结构（尤其是可选字段的字典枚举）。
- **企业专线区分**：目前公有云基础版是不支持图谱下发的。日后如果有新同事接手，必须提醒他们，要看图谱，必须配置带有企业权限的 `api-facestyle.megvii.com` 专线 URL 及配套的专用密钥。
