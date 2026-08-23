import React from 'react';
import { DataProvider, useData } from './context/DataContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardHome } from './components/dashboard/DashboardHome';
import { TopicTree } from './components/topics/TopicTree';
import { TopicDetail } from './components/topics/TopicDetail';
import { KnowledgeGraph } from './components/graph/KnowledgeGraph';
import { StudyProgressView } from './components/progress/StudyProgressView';
import { NotesManager } from './components/notes/NotesManager';
import { ResourcesManager } from './components/resources/ResourcesManager';
import { AdvancedSearch } from './components/search/AdvancedSearch';
import { AIResearchStudio } from './components/ai/AIResearchStudio';
import { AbhidharmaMatrix } from './components/matrix/AbhidharmaMatrix';
import { DivinationMatrix } from './components/matrix/DivinationMatrix';
import { MultilingualLexicon } from './components/lexicon/MultilingualLexicon';
import {
  LayoutDashboard,
  FolderTree,
  Share2,
  TrendingUp,
  FileText,
  Library,
  Search,
  Sparkles,
} from 'lucide-react';

function AppContent() {
  const { activeTab, setActiveTab, selectedTopicId } = useData();

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardHome />;
      case 'topics':
        return selectedTopicId ? <TopicDetail /> : <TopicTree />;
      case 'graph':
        return <KnowledgeGraph />;
      case 'progress':
        return <StudyProgressView />;
      case 'notes':
        return <NotesManager />;
      case 'resources':
        return <ResourcesManager />;
      case 'search':
        return <AdvancedSearch />;
      case 'ai_studio':
        return (
          <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <AIResearchStudio />
          </div>
        );
      case 'abhidharma_matrix':
        return <AbhidharmaMatrix />;
      case 'divination_matrix':
        return <DivinationMatrix />;
      case 'lexicon':
        return <MultilingualLexicon />;
      default:
        return <DashboardHome />;
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans selection:bg-amber-200 selection:text-amber-950">
      {/* Top Navigation */}
      <Navbar />

      {/* Main Container: Sidebar + Content */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto pb-16 md:pb-0">
        {/* Desktop & Tablet Sidebar */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Dynamic Center Stage */}
        <main className="flex-1 overflow-y-auto min-w-0">
          {renderActiveTab()}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-stone-100/95 backdrop-blur-md border-t border-stone-200 flex items-center justify-around py-2 px-1">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-2 rounded-xl transition ${
            activeTab === 'dashboard' ? 'text-amber-900 bg-amber-100' : 'text-stone-600'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Tổng quan</span>
        </button>

        <button
          onClick={() => setActiveTab('topics')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-2 rounded-xl transition ${
            activeTab === 'topics' ? 'text-amber-900 bg-amber-100' : 'text-stone-600'
          }`}
        >
          <FolderTree className="w-4 h-4" />
          <span>Chủ đề</span>
        </button>

        <button
          onClick={() => setActiveTab('graph')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-2 rounded-xl transition ${
            activeTab === 'graph' ? 'text-amber-900 bg-amber-100' : 'text-stone-600'
          }`}
        >
          <Share2 className="w-4 h-4" />
          <span>Đồ thị</span>
        </button>

        <button
          onClick={() => setActiveTab('progress')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-2 rounded-xl transition ${
            activeTab === 'progress' ? 'text-amber-900 bg-amber-100' : 'text-stone-600'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Tiến độ</span>
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-2 rounded-xl transition ${
            activeTab === 'notes' ? 'text-amber-900 bg-amber-100' : 'text-stone-600'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Ghi chú</span>
        </button>
      </nav>
    </div>
  );
}

export function App() {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
}

export default App;
