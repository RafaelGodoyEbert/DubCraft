import React, { useState, useEffect } from 'react';
import { Project, User } from './types';
import { Header } from './components/common/Header';
import { MobileBottomNav } from './components/common/MobileBottomNav';
import { ProjectList } from './components/project/ProjectList';
import { ReviewScreen } from './components/review/ReviewScreen';
import { LeaderboardScreen } from './components/community/LeaderboardScreen';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AuthModal } from './components/auth/AuthModal';
import { CreateProjectModal } from './components/admin/CreateProjectModal';
import { EditProjectModal } from './components/admin/EditProjectModal';
import { initMockAuth } from './services/auth/mockAuthProvider';
import { initFirebaseAuth } from './services/auth/firebaseAuthProvider';
import { repositoryAdapterSingleton } from './repositories/storageAdapter';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<string>('projects');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [targetImportProjectId, setTargetImportProjectId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Initialize Auth Service (Firebase Auth if configured, otherwise Mock Auth)
    const authProvider = initFirebaseAuth() || initMockAuth();
    const unsubscribe = authProvider.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });

    // Load initial projects
    async function loadData() {
      setIsLoading(true);
      const data = await repositoryAdapterSingleton.getProjects();
      setProjects(data);
      if (data.length > 0) {
        setCurrentProject(data[0]);
      }
      setIsLoading(false);
    }
    loadData();

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSelectProject = (project: Project) => {
    setCurrentProject(project);
    setActiveTab('review');
  };

  const handleRefreshProjects = async () => {
    const data = await repositoryAdapterSingleton.getProjects();
    setProjects(data);
    if (currentProject) {
      const updated = data.find((p) => p.id === currentProject.id);
      if (updated) setCurrentProject(updated);
    }
  };

  const handleOpenImport = (project?: Project) => {
    setTargetImportProjectId(project ? project.id : undefined);
    setIsImportModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-zinc-400">
            Iniciando DubCraft Studio...
          </p>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-amber-500 selection:text-zinc-950">
      {/* Top Header */}
      <Header
        currentUser={currentUser}
        onOpenProfileModal={() => setIsAuthModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main View Container */}
      <main className="max-w-6xl mx-auto px-4 pt-4 pb-12">
        {activeTab === 'projects' && (
          <ProjectList
            projects={projects}
            onSelectProject={handleSelectProject}
            onOpenCreateProject={isAdmin ? () => setIsCreateModalOpen(true) : undefined}
            onOpenImportJson={isAdmin ? handleOpenImport : undefined}
            onEditProject={isAdmin ? (project) => setEditingProject(project) : undefined}
            onNavigateToAdmin={isAdmin ? () => setActiveTab('admin') : undefined}
          />
        )}

        {activeTab === 'review' && currentProject && (
          <ReviewScreen
            currentProject={currentProject}
            onSelectProject={setCurrentProject}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'ranking' && (
          <LeaderboardScreen projects={projects} currentProject={currentProject || undefined} />
        )}

        {activeTab === 'admin' && isAdmin && (
          <AdminDashboard
            projects={projects}
            currentUser={currentUser}
            onRefresh={handleRefreshProjects}
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
      />

      {/* Authentication & User Profile Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onUserChanged={(newUser) => setCurrentUser(newUser)}
      />

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        currentUser={currentUser}
        onProjectCreated={handleRefreshProjects}
      />

      {/* Edit Project Modal */}
      <EditProjectModal
        isOpen={Boolean(editingProject)}
        onClose={() => setEditingProject(null)}
        project={editingProject}
        currentUser={currentUser}
        onProjectUpdated={handleRefreshProjects}
      />

      {/* JSON & Maps Importer Modal */}
      <JSONImporterModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        projects={projects}
        defaultProjectId={targetImportProjectId}
        currentUser={currentUser}
        onImportCompleted={handleRefreshProjects}
      />
    </div>
  );
}
