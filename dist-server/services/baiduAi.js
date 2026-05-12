"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBaiduAccessToken = getBaiduAccessToken;
exports.analyzeSkin = analyzeSkin;
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const API_KEY = process.env.BAIDU_API_KEY || '';
const SECRET_KEY = process.env.BAIDU_SECRET_KEY || '';
/**
 * 获取百度 AI 的 Access Token
 */
async function getBaiduAccessToken(dynamicApiKey, dynamicApiSecret) {
    const currentApiKey = (dynamicApiKey || API_KEY).trim();
    const currentApiSecret = (dynamicApiSecret || SECRET_KEY).trim();
    if (!currentApiKey || !currentApiSecret) {
        throw new Error('未配置百度的 API_KEY 或 SECRET_KEY');
    }
    const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${currentApiKey}&client_secret=${currentApiSecret}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    });
    const data = await response.json();
    if (data.error) {
        throw new Error(`获取 Token 失败: ${data.error_description}`);
    }
    return data.access_token;
}
/**
 * 调用皮肤分析 API
 * @param imageBase64 图片的 Base64 编码 (不带前缀)
 * @param dynamicApiKey 可选，动态传入的 API Key
 * @param dynamicApiSecret 可选，动态传入的 API Secret
 * @returns 皮肤分析结果 JSON
 */
async function analyzeSkin(imageBase64, dynamicApiKey, dynamicApiSecret) {
    const token = await getBaiduAccessToken(dynamicApiKey, dynamicApiSecret);
    const url = `https://aip.baidubce.com/rest/2.0/face/v1/skinanalyze?access_token=${token}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            image: imageBase64,
            image_type: 'BASE64'
        })
    });
    const data = await response.json();
    if (data.error_code) {
        throw new Error(`分析失败: ${data.error_msg}`);
    }
    return data.result;
}
