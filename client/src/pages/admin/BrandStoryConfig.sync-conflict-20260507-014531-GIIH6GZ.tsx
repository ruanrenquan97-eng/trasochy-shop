import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Edit2, ImageIcon, Image as ImageIcon2 } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  tags: string[];
  desc: string;
  img: string;
}

export default function BrandStoryConfig() {
  const [heroBg, setHeroBg] = useState('');
  const [techBg, setTechBg] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string>('');

  // Form states for adding/editing member
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await api.get('/admin/settings');
      const settingsMap: Record<string, string> = {};
      data.settings.forEach((s: any) => { settingsMap[s.key] = s.value; });
      
      setHeroBg(settingsMap['brand_hero_bg'] || '');
      setTechBg(settingsMap['brand_tech_bg'] || '');
      
      try {
        const members = JSON.parse(settingsMap['brand_team_members'] || '[]');
        setTeamMembers(members);
      } catch (e) {
        setTeamMembers([]);
      }
      setLoading(false);
    } catch (err) {
      toast.error('获取配置失败');
      setLoading(false);
    }
  };

  const handleSaveImages = async () => {
    setSaving(true);
    try {
      await api.put('/admin/settings', {
        settings: {
          brand_hero_bg: heroBg,
          brand_tech_bg: techBg
        }
      });
      toast.success('背景图片保存成功');
    } catch (err) {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const saveTeamMembersToDb = async (newMembers: TeamMember[]) => {
    try {
      await api.put('/admin/settings/brand_team_members', {
        value: JSON.stringify(newMembers)
      });
      toast.success('团队成员保存成功');
    } catch (err) {
      toast.error('保存团队成员失败');
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
        if (type === 'hero') setHeroBg(data.url);
        else if (type === 'tech') setTechBg(data.url);
        else if (type === 'member' && editingMember) {
          setEditingMember({ ...editingMember, img: data.url });
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
      // Edit
      updatedMembers = updatedMembers.map(m => m.id === editingMember.id ? editingMember : m);
    } else {
      // Add
      updatedMembers.push({ ...editingMember, id: 'm' + Date.now() });
    }
    
    setTeamMembers(updatedMembers);
    saveTeamMembersToDb(updatedMembers);
    setIsModalOpen(false);
    setEditingMember(null);
  };

  const handleMemberDelete = (id: string) => {
    if (confirm('确定要删除该团队成员吗？')) {
      const updatedMembers = teamMembers.filter(m => m.id !== id);
      setTeamMembers(updatedMembers);
      saveTeamMembersToDb(updatedMembers);
    }
  };

  const openAddModal = () => {
    setEditingMember({ id: '', name: '', role: '', tags: [], desc: '', img: '' });
    setIsModalOpen(true);
  };

  if (loading) return <div className="p-8 text-center text-gray-500">加载中...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">背景图片配置</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Hero BG */}
          <div className="p-4 border rounded-lg bg-slate-50">
            <h3 className="text-sm font-medium text-gray-700 mb-2">首屏背景大图 (Hero Background)</h3>
            {heroBg && (
              <img src={heroBg} alt="Hero BG" className="w-full h-32 object-cover rounded-md mb-3 border border-gray-200" />
            )}
            <div className="flex items-center gap-2">
               <label className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md cursor-pointer hover:bg-gray-50 text-sm">
                <ImageIcon size={14} />
                {uploading === 'hero' ? '上传中...' : '更换图片'}
                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'hero')} />
              </label>
              <input type="text" value={heroBg} onChange={e => setHeroBg(e.target.value)} placeholder="图片URL" className="flex-1 px-2 py-1.5 border rounded-md text-sm" />
            </div>
          </div>

          {/* Tech BG */}
          <div className="p-4 border rounded-lg bg-slate-50">
            <h3 className="text-sm font-medium text-gray-700 mb-2">核心技术背景图 (Tech Background)</h3>
            {techBg && (
              <img src={techBg} alt="Tech BG" className="w-full h-32 object-cover rounded-md mb-3 border border-gray-200" />
            )}
            <div className="flex items-center gap-2">
               <label className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md cursor-pointer hover:bg-gray-50 text-sm">
                <ImageIcon size={14} />
                {uploading === 'tech' ? '上传中...' : '更换图片'}
                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'tech')} />
              </label>
              <input type="text" value={techBg} onChange={e => setTechBg(e.target.value)} placeholder="图片URL" className="flex-1 px-2 py-1.5 border rounded-md text-sm" />
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={handleSaveImages} disabled={saving} className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm disabled:opacity-50">
            <Save size={14} /> 保存图片配置
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4 border-b pb-2">
          <h2 className="text-lg font-semibold text-gray-800">团队成员管理</h2>
          <button onClick={openAddModal} className="flex items-center gap-1 px-3 py-1.5 bg-stone-900 text-white rounded-md hover:bg-stone-800 transition text-sm">
            <Plus size={14} /> 新增成员
          </button>
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
               暂无团队成员，请点击右上角新增。
             </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {isModalOpen && editingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">{editingMember.id ? '编辑成员' : '新增成员'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="flex gap-4 items-start">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">成员照片</label>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓名 <span className="text-red-500">*</span></label>
                <input type="text" value={editingMember.name} onChange={e => setEditingMember({...editingMember, name: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="如：阮仁全 博士" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">职位 <span className="text-red-500">*</span></label>
                <input type="text" value={editingMember.role} onChange={e => setEditingMember({...editingMember, role: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="如：创始人 / 首席科学家" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">个人标签 (逗号分隔)</label>
                <input 
                  type="text" 
                  value={editingMember.tags.join(', ')} 
                  onChange={e => setEditingMember({...editingMember, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)})} 
                  className="w-full px-3 py-2 border rounded-md text-sm" 
                  placeholder="如：中科大博士后, 苏黎世大学MBA" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">简介与职责</label>
                <textarea 
                  value={editingMember.desc} 
                  onChange={e => setEditingMember({...editingMember, desc: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-md text-sm min-h-[80px] resize-y" 
                  placeholder="负责中瑞技术战略规划..." 
                />
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-100 transition text-sm">取消</button>
              <button onClick={handleMemberSave} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
