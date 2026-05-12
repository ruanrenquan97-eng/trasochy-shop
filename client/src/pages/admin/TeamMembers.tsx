import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Edit2, ImageIcon, Image as ImageIcon2, Bot, RefreshCw } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  tags: string[];
  desc: string;
  fullDesc?: string;
  img: string;
  isInnovationCenter?: boolean;
  en?: { name: string; role: string; tags: string[]; desc: string; fullDesc?: string; };
  de?: { name: string; role: string; tags: string[]; desc: string; fullDesc?: string; };
}

export interface MemberCertificate {
  id: string;
  title: string;
  img: string;
  memberId: string;
  en?: { title: string };
  de?: { title: string };
}

export default function AdminTeamMembers() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [certificates, setCertificates] = useState<MemberCertificate[]>([]);
  const [editingCert, setEditingCert] = useState<MemberCertificate | null>(null);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await api.get('/admin/settings');
      const settingsMap: Record<string, string> = {};
      data.settings.forEach((s: any) => { settingsMap[s.key] = s.value; });
      
      try {
        if (settingsMap['brand_team_members']) setTeamMembers(JSON.parse(settingsMap['brand_team_members']));
      } catch (e) { setTeamMembers([]); }

      try {
        if (settingsMap['brand_member_certificates']) setCertificates(JSON.parse(settingsMap['brand_member_certificates']));
      } catch (e) { setCertificates([]); }
      
      setLoading(false);
    } catch (err) {
      toast.error('获取配置失败');
      setLoading(false);
    }
  };

  const saveTeamMembersToDb = async (newMembers: TeamMember[]) => {
    try {
      await api.put('/admin/settings/brand_team_members', { value: JSON.stringify(newMembers) });
      toast.success('成员保存成功！', { id: 'saveTeam' });
    } catch (err: any) {
      toast.error(err.response?.data?.error || '保存成员失败', { id: 'saveTeam' });
    }
  };

  const saveCertificatesToDb = async (newCerts: MemberCertificate[]) => {
    try {
      await api.put('/admin/settings/brand_member_certificates', { value: JSON.stringify(newCerts) });
      toast.success('证书保存成功！', { id: 'saveCerts' });
    } catch (err: any) {
      toast.error(err.response?.data?.error || '保存证书失败', { id: 'saveCerts' });
    }
  };

  const handleTranslateAllMembers = async () => {
    if (teamMembers.length === 0) return;
    toast.loading('正在逐一翻译成员...', { id: 'transTeam' });
    try {
      const newMembers = [...teamMembers];
      for (const m of newMembers) {
        const textToTrans = { 
          name: m.name || '', 
          role: m.role || '', 
          tags: Array.isArray(m.tags) ? m.tags.join(' | ') : '', 
          desc: m.desc || '',
          fullDesc: m.fullDesc || ''
        };
        const enRes: any = await api.post('/ai/translate', { texts: textToTrans, targetLang: 'en' });
        const deRes: any = await api.post('/ai/translate', { texts: textToTrans, targetLang: 'de' });
        
        const enTrans = enRes.translated || {};
        const deTrans = deRes.translated || {};
        
        const parseTags = (t: any, defaultTags: string[]) => {
          if (Array.isArray(t)) return t;
          if (typeof t === 'string' && t) return t.split('|').map((s:string)=>s.trim());
          return defaultTags;
        };

        m.en = { 
          name: enTrans.name || m.name, 
          role: enTrans.role || m.role, 
          tags: parseTags(enTrans.tags, m.tags || []), 
          desc: enTrans.desc || m.desc,
          fullDesc: enTrans.fullDesc || m.fullDesc
        };
        m.de = { 
          name: deTrans.name || m.name, 
          role: deTrans.role || m.role, 
          tags: parseTags(deTrans.tags, m.tags || []), 
          desc: deTrans.desc || m.desc,
          fullDesc: deTrans.fullDesc || m.fullDesc
        };
      }
      setTeamMembers(newMembers);
      await saveTeamMembersToDb(newMembers);
      toast.success('成员自动翻译并保存成功！', { id: 'transTeam' });
    } catch (err) {
      toast.error('自动翻译部分成员失败', { id: 'transTeam' });
    }
  };

  const handleUpload = async (file: File, type: string) => {
    setUploading(type);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/upload/image', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        if (type === 'member' && editingMember) {
          setEditingMember({ ...editingMember, img: data.url });
        } else if (type === 'cert' && editingCert) {
          setEditingCert({ ...editingCert, img: data.url });
        }
        toast.success('图片上传成功');
      } else {
         toast.error(data.error || '上传失败');
      }
    } catch (err) {
      toast.error('上传出错');
    } finally {
      setUploading('');
    }
  };

  const handleMemberSave = () => {
    if (!editingMember) return;
    if (!editingMember.name || !editingMember.role) {
      toast.error('姓名和职位为必填项');
      return;
    }
    
    let updatedMembers = [...teamMembers];
    if (teamMembers.find(m => m.id === editingMember.id)) {
      updatedMembers = updatedMembers.map(m => m.id === editingMember.id ? editingMember : m);
    } else {
      updatedMembers.push({ ...editingMember, id: 'm' + Date.now() });
    }
    
    setTeamMembers(updatedMembers);
    saveTeamMembersToDb(updatedMembers);
    setIsModalOpen(false);
    setEditingMember(null);
  };

  const handleMemberDelete = (id: string) => {
    if (confirm('确定要删除该成员吗？')) {
      const updatedMembers = teamMembers.filter(m => m.id !== id);
      setTeamMembers(updatedMembers);
      saveTeamMembersToDb(updatedMembers);
    }
  };

  const openAddModal = () => {
    setEditingMember({ id: '', name: '', role: '', tags: [], desc: '', fullDesc: '', img: '', isInnovationCenter: false, en: { name: '', role: '', tags: [], desc: '', fullDesc: '' }, de: { name: '', role: '', tags: [], desc: '', fullDesc: '' } });
    setIsModalOpen(true);
  };

  const handleCertSave = () => {
    if (!editingCert) return;
    if (!editingCert.title || !editingCert.memberId || !editingCert.img) {
      toast.error('标题、图片和归属成员为必填项');
      return;
    }
    
    let updatedCerts = [...certificates];
    if (certificates.find(c => c.id === editingCert.id)) {
      updatedCerts = updatedCerts.map(c => c.id === editingCert.id ? editingCert : c);
    } else {
      updatedCerts.push({ ...editingCert, id: 'c' + Date.now() });
    }
    
    setCertificates(updatedCerts);
    saveCertificatesToDb(updatedCerts);
    setIsCertModalOpen(false);
    setEditingCert(null);
  };

  const handleCertDelete = (id: string) => {
    if (confirm('确定要删除该证书吗？')) {
      const updatedCerts = certificates.filter(c => c.id !== id);
      setCertificates(updatedCerts);
      saveCertificatesToDb(updatedCerts);
    }
  };

  const openAddCertModal = () => {
    setEditingCert({ id: '', title: '', img: '', memberId: '', en: { title: '' }, de: { title: '' } });
    setIsCertModalOpen(true);
  };

  if (loading) return <div className="p-8 text-center text-gray-500">加载中...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
      <div className="flex items-center justify-between mb-4 border-b pb-2">
        <h2 className="text-lg font-semibold text-gray-800">瑞士创研中心成员管理</h2>
        <div className="flex gap-2">
          <button onClick={handleTranslateAllMembers} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition text-sm">
            <Bot size={14} /> 一键翻译现有成员
          </button>
          <button onClick={openAddModal} className="flex items-center gap-1 px-3 py-1.5 bg-stone-900 text-white rounded-md hover:bg-stone-800 transition text-sm">
            <Plus size={14} /> 新增成员
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teamMembers.map((member) => (
          <div key={member.id} className="border rounded-lg overflow-hidden flex flex-col bg-white">
            <div className="h-40 bg-gray-100 relative">
              {member.img ? (
                <img src={member.img} alt={member.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">无图片</div>
              )}
              <div className="absolute top-2 right-2 flex gap-1">
                <button onClick={() => { setEditingMember(member); setIsModalOpen(true); }} className="p-1.5 bg-white/90 text-blue-600 rounded-md shadow-sm hover:bg-white transition">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => handleMemberDelete(member.id)} className="p-1.5 bg-white/90 text-red-600 rounded-md shadow-sm hover:bg-white transition">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="font-bold text-gray-800">{member.name}</h3>
              <p className="text-xs text-blue-600 mb-2 font-medium">{member.role}</p>
              <div className="flex flex-wrap gap-1 mb-2">
                {member.tags.map((tag, i) => (
                  <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{tag}</span>
                ))}
              </div>
               <p className="text-xs text-gray-500 line-clamp-3">{member.desc}</p>
            </div>
          </div>
        ))}
        {teamMembers.length === 0 && (
           <div className="col-span-full py-8 text-center text-gray-500 text-sm bg-gray-50 rounded-lg border border-dashed">
             暂无中心成员，请点击右上角新增。
           </div>
        )}
      </div>

      <div className="mt-12 mb-4 border-b pb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">荣誉资质证书管理</h2>
        <button onClick={openAddCertModal} className="flex items-center gap-1 px-3 py-1.5 bg-stone-900 text-white rounded-md hover:bg-stone-800 transition text-sm">
          <Plus size={14} /> 新增证书
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {certificates.map((cert) => {
          const member = teamMembers.find(m => m.id === cert.memberId);
          return (
            <div key={cert.id} className="border rounded-lg overflow-hidden flex flex-col bg-white">
              <div className="aspect-[3/4] bg-gray-100 relative group">
                {cert.img ? (
                  <img src={cert.img} alt={cert.title} className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">无图片</div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                  <button onClick={() => { setEditingCert(cert); setIsCertModalOpen(true); }} className="p-2 bg-white text-blue-600 rounded-full shadow hover:scale-110 transition">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleCertDelete(cert.id)} className="p-2 bg-white text-red-600 rounded-full shadow hover:scale-110 transition">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="p-3 bg-gray-50 flex flex-col items-center border-t">
                <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full mb-1 w-full text-center truncate">
                  所属: {member ? member.name : '未知成员'}
                </span>
                <p className="text-xs text-gray-800 font-medium text-center line-clamp-2" title={cert.title}>{cert.title}</p>
              </div>
            </div>
          );
        })}
        {certificates.length === 0 && (
           <div className="col-span-full py-8 text-center text-gray-500 text-sm bg-gray-50 rounded-lg border border-dashed">
             暂无荣誉资质证书，请点击右上角新增。
           </div>
        )}
      </div>

      {/* Edit Member Modal */}
      {isModalOpen && editingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">{editingMember.id ? '编辑成员' : '新增成员'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="flex gap-4 items-start pb-4 border-b">
                <div className="w-24 h-32 bg-gray-100 border rounded-lg overflow-hidden shrink-0 flex flex-col">
                  {editingMember.img ? (
                    <img src={editingMember.img} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-xs gap-1">
                      <ImageIcon2 size={20} />无照片
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">成员照片 (全局通用)</label>
                  <div className="flex gap-2">
                    <label className="flex items-center justify-center px-3 py-1.5 bg-gray-100 border border-gray-300 text-gray-700 rounded-md cursor-pointer hover:bg-gray-200 text-sm whitespace-nowrap">
                      {uploading === 'member' ? '上传中...' : '本地上传'}
                      <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'member')} />
                    </label>
                    <input 
                      type="text" 
                      value={editingMember.img} 
                      onChange={e => setEditingMember({...editingMember, img: e.target.value})} 
                      placeholder="或输入图片URL" 
                      className="flex-1 px-2 py-1.5 border rounded-md text-sm" 
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">建议尺寸 3:4 比例，例如 600x800</p>
                </div>
              </div>

              {/* 中文 */}
              <div className="space-y-4">
                <h4 className="font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded inline-block text-sm">中文内容</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">姓名 <span className="text-red-500">*</span></label>
                  <input type="text" value={editingMember.name} onChange={e => setEditingMember({...editingMember, name: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="如：阮仁全 博士" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">职位 <span className="text-red-500">*</span></label>
                  <input type="text" value={editingMember.role} onChange={e => setEditingMember({...editingMember, role: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="如：创始人 / 首席科学家" />
                </div>
                <div className="flex items-center gap-2 bg-blue-50 p-3 rounded-md border border-blue-100">
                  <input 
                    type="checkbox" 
                    id="isInnovationCenter"
                    checked={!!editingMember.isInnovationCenter} 
                    onChange={e => setEditingMember({...editingMember, isInnovationCenter: e.target.checked})} 
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" 
                  />
                  <label htmlFor="isInnovationCenter" className="text-sm font-medium text-blue-800 cursor-pointer">
                    属于“创研中心成员”（打勾后将显示在前台的创新中心界面）
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">个人标签 (逗号或竖线分隔)</label>
                  <input 
                    type="text" 
                    value={editingMember.tags.join(' | ')} 
                    onChange={e => setEditingMember({...editingMember, tags: e.target.value.split(/[\|,]/).map(t => t.trim()).filter(Boolean)})} 
                    className="w-full px-3 py-2 border rounded-md text-sm" 
                    placeholder="如：中科大博士后 | 苏黎世大学MBA" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">简介 (卡片展示)</label>
                  <textarea 
                    value={editingMember.desc} 
                    onChange={e => setEditingMember({...editingMember, desc: e.target.value})} 
                    className="w-full px-3 py-2 border rounded-md text-sm h-24 resize-none" 
                    placeholder="请输入成员的简短介绍..." 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">详细介绍 (独立主页展示)</label>
                  <textarea 
                    value={editingMember.fullDesc || ''} 
                    onChange={e => setEditingMember({...editingMember, fullDesc: e.target.value})} 
                    className="w-full px-3 py-2 border rounded-md text-sm h-48 resize-y" 
                    placeholder="请输入成员的完整详细介绍（支持多段落）..." 
                  />
                </div>
              </div>

              {/* English */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-bold text-gray-700 bg-blue-50 text-blue-700 px-3 py-1 rounded inline-block text-sm">English</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name (EN)</label>
                  <input type="text" value={editingMember.en?.name || ''} onChange={e => setEditingMember({...editingMember, en: { ...editingMember.en, name: e.target.value } as any})} className="w-full px-3 py-2 border rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role (EN)</label>
                  <input type="text" value={editingMember.en?.role || ''} onChange={e => setEditingMember({...editingMember, en: { ...editingMember.en, role: e.target.value } as any})} className="w-full px-3 py-2 border rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags (EN) (| separated)</label>
                  <input 
                    type="text" 
                    value={editingMember.en?.tags?.join(' | ') || ''} 
                    onChange={e => setEditingMember({...editingMember, en: { ...editingMember.en, tags: e.target.value.split(/[\|,]/).map(t => t.trim()).filter(Boolean) } as any})} 
                    className="w-full px-3 py-2 border rounded-md text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Desc (EN) - Short</label>
                  <textarea 
                    value={editingMember.en?.desc || ''} 
                    onChange={e => setEditingMember({...editingMember, en: { ...editingMember.en, desc: e.target.value } as any})} 
                    className="w-full px-3 py-2 border rounded-md text-sm h-24 resize-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Desc (EN) - Detail Page</label>
                  <textarea 
                    value={editingMember.en?.fullDesc || ''} 
                    onChange={e => setEditingMember({...editingMember, en: { ...editingMember.en, fullDesc: e.target.value } as any})} 
                    className="w-full px-3 py-2 border rounded-md text-sm h-48 resize-y" 
                  />
                </div>
              </div>

              {/* Deutsch */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-bold text-gray-700 bg-emerald-50 text-emerald-700 px-3 py-1 rounded inline-block text-sm">Deutsch</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name (DE)</label>
                  <input type="text" value={editingMember.de?.name || ''} onChange={e => setEditingMember({...editingMember, de: { ...editingMember.de, name: e.target.value } as any})} className="w-full px-3 py-2 border rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role (DE)</label>
                  <input type="text" value={editingMember.de?.role || ''} onChange={e => setEditingMember({...editingMember, de: { ...editingMember.de, role: e.target.value } as any})} className="w-full px-3 py-2 border rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags (DE) (| separated)</label>
                  <input 
                    type="text" 
                    value={editingMember.de?.tags?.join(' | ') || ''} 
                    onChange={e => setEditingMember({...editingMember, de: { ...editingMember.de, tags: e.target.value.split(/[\|,]/).map(t => t.trim()).filter(Boolean) } as any})} 
                    className="w-full px-3 py-2 border rounded-md text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Desc (DE) - Short</label>
                  <textarea 
                    value={editingMember.de?.desc || ''} 
                    onChange={e => setEditingMember({...editingMember, de: { ...editingMember.de, desc: e.target.value } as any})} 
                    className="w-full px-3 py-2 border rounded-md text-sm h-24 resize-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Desc (DE) - Detail Page</label>
                  <textarea 
                    value={editingMember.de?.fullDesc || ''} 
                    onChange={e => setEditingMember({...editingMember, de: { ...editingMember.de, fullDesc: e.target.value } as any})} 
                    className="w-full px-3 py-2 border rounded-md text-sm h-48 resize-y" 
                  />
                </div>
              </div>

            </div>
            
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition text-sm">取消</button>
              <button onClick={handleMemberSave} className="px-6 py-2 bg-stone-900 text-white rounded-md hover:bg-stone-800 transition text-sm">保存</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Certificate Modal */}
      {isCertModalOpen && editingCert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">{editingCert.id ? '编辑证书' : '新增证书'}</h3>
              <button onClick={() => setIsCertModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex flex-col items-center mb-4">
                <div className="w-32 h-40 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden flex flex-col items-center justify-center mb-2 relative">
                  {editingCert.img ? (
                    <img src={editingCert.img} alt="" className="w-full h-full object-contain p-1" />
                  ) : (
                    <span className="text-gray-400 text-xs">无图片</span>
                  )}
                  <label className="absolute inset-0 cursor-pointer bg-black/0 hover:bg-black/10 transition flex items-center justify-center">
                    <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'cert')} />
                  </label>
                </div>
                <div className="text-center">
                  <label className="cursor-pointer text-blue-600 text-sm hover:underline">
                    {uploading === 'cert' ? '上传中...' : '点击上传证书图片'}
                    <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'cert')} />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">归属成员 <span className="text-red-500">*</span></label>
                <select 
                  value={editingCert.memberId} 
                  onChange={e => setEditingCert({...editingCert, memberId: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md text-sm bg-white"
                >
                  <option value="">-- 请选择成员 --</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">证书名称 (中文) <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={editingCert.title} 
                  onChange={e => setEditingCert({...editingCert, title: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-md text-sm" 
                  placeholder="如：荣誉教授证书" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">证书名称 (English)</label>
                <input 
                  type="text" 
                  value={editingCert.en?.title || ''} 
                  onChange={e => setEditingCert({...editingCert, en: { title: e.target.value }})} 
                  className="w-full px-3 py-2 border rounded-md text-sm" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">证书名称 (Deutsch)</label>
                <input 
                  type="text" 
                  value={editingCert.de?.title || ''} 
                  onChange={e => setEditingCert({...editingCert, de: { title: e.target.value }})} 
                  className="w-full px-3 py-2 border rounded-md text-sm" 
                />
              </div>
            </div>
            
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setIsCertModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition text-sm">取消</button>
              <button onClick={handleCertSave} className="px-6 py-2 bg-stone-900 text-white rounded-md hover:bg-stone-800 transition text-sm">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
