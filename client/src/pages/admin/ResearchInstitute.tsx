import React, { useState } from 'react';
import { FlaskConical, FileText, Microscope, Users } from 'lucide-react';
import AdminArticles from './Articles';
import AdminClinicalReports from './ClinicalReports';
import AdminAcademicConfig from './AcademicConfig';
import AdminTeamMembers from './TeamMembers';
import AdminUserCases from './UserCases';

type Tab = 'articles' | 'clinical' | 'academic' | 'members' | 'user-cases';

export default function AdminResearchInstitute() {
  const [activeTab, setActiveTab] = useState<Tab>('articles');

  const tabs: { key: Tab; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      key: 'articles',
      label: '护肤科普文章',
      icon: <FileText size={16} />,
      desc: '管理公开科普内容与AI自动发文',
    },
    {
      key: 'clinical',
      label: '临床报告',
      icon: <Microscope size={16} />,
      desc: '管理临床研究报告',
    },
    {
      key: 'academic',
      label: '学术成果',
      icon: <FlaskConical size={16} />,
      desc: '管理学术论文、专利、获奖证书',
    },
    {
      key: 'members',
      label: '瑞士创研中心成员',
      icon: <Users size={16} />,
      desc: '管理中心成员及资质证书',
    },
    {
      key: 'user-cases',
      label: '用户案例',
      icon: <FileText size={16} />,
      desc: '管理用户护肤案例反馈',
    },
  ];

  return (
    <div>
      {/* 顶部标题 */}
      <div className="px-8 pt-8 pb-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-stone-800">皮肤医学研究院</h1>
          <p className="text-sm text-stone-500 mt-1">管理研究院的全部内容：科普文章、临床报告与学术成果</p>
        </div>

        {/* Tab 导航 */}
        <div className="flex gap-1 border-b border-stone-200">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? 'border-stone-900 text-stone-900'
                  : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 各子模块内容，通过 display 切换避免重复 mount */}
      <div className={activeTab === 'articles' ? 'block' : 'hidden'}>
        <AdminArticles />
      </div>
      <div className={activeTab === 'clinical' ? 'block' : 'hidden'}>
        <AdminClinicalReports />
      </div>
      <div className={activeTab === 'academic' ? 'block' : 'hidden'}>
        <AdminAcademicConfig />
      </div>
      <div className={activeTab === 'members' ? 'block' : 'hidden'}>
        <AdminTeamMembers />
      </div>
      <div className={activeTab === 'user-cases' ? 'block' : 'hidden'}>
        <AdminUserCases />
      </div>
    </div>
  );
}
