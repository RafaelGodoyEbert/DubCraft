import React, { useState, useEffect } from 'react';
import { Project, User } from '../../types';
import { Drawer } from '../common/Drawer';
import { repositoryAdapterSingleton } from '../../repositories/storageAdapter';
import { Settings, Image, Type, Radio, Check, Save } from 'lucide-react';

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  currentUser: User;
  onProjectUpdated: () => void;
}

const COVER_PRESETS = [
  {
    name: 'Príncipe & Areias',
    url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Ação & Combate',
    url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Épico & Fantasia',
    url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Furtividade & Assassinos',
    url: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Tático Militar (Black)',
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Ficção Científica & Futuro',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
  },
];

const FONT_PRESETS = [
  { name: 'Padrão (Inter / Sans-serif Moderno)', value: 'sans' },
  { name: 'Gamer / Display (Títulos Marcantes)', value: 'font-display' },
  { name: 'Monospaçado (Técnico / Militar)', value: 'font-mono' },
  { name: 'Serif Clássico (Épico / Medieval)', value: 'font-serif' },
];

export const EditProjectModal: React.FC<EditProjectModalProps> = ({
  isOpen,
  onClose,
  project,
  currentUser,
  onProjectUpdated,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [customCover, setCustomCover] = useState('');
  const [fontFamily, setFontFamily] = useState('sans');
  const [audioBaseUrl, setAudioBaseUrl] = useState('');
  const [huggingFaceUrl, setHuggingFaceUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description);
      setCoverImage(project.coverImage);
      setCustomCover(project.coverImage);
      setFontFamily(project.fontFamily || 'sans');
      setAudioBaseUrl(project.dubbedAudioBaseUrl || '');
      setHuggingFaceUrl(project.huggingFaceDatasetUrl || '');
    }
  }, [project, isOpen]);

  if (!project) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      const updated: Project = {
        ...project,
        name: name.trim(),
        description: description.trim(),
        coverImage: customCover.trim() || coverImage,
        fontFamily,
        dubbedAudioBaseUrl: audioBaseUrl.trim() || undefined,
        huggingFaceDatasetUrl: huggingFaceUrl.trim() || undefined,
      };

      await repositoryAdapterSingleton.updateProject(updated);

      // Audit log
      await repositoryAdapterSingleton.createAuditLog({
        id: `audit_${Date.now()}`,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'REPUTATION_ADJUST',
        details: `Atualizou as configurações visuais, fontes e capa do projeto "${updated.name}".`,
        targetId: updated.id,
        createdAt: new Date().toISOString(),
      });

      onProjectUpdated();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar projeto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={`Editar Jogo — ${project.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
        <p className="text-zinc-400 text-xs">
          Personalize a capa, tipografia, URLs de CDN de áudio e informações do projeto.
        </p>

        {/* Name */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-zinc-300">Nome do Projeto *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-100 text-xs focus:outline-none focus:border-amber-500 min-h-[44px]"
          />
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-zinc-300">Descrição</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-100 text-xs focus:outline-none focus:border-amber-500 resize-none"
          />
        </div>

        {/* Typography / Font Style Selection */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-zinc-300 flex items-center gap-1">
            <Type className="w-3.5 h-3.5 text-amber-400" /> Estilo de Fonte / Tipografia da Interface
          </label>
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-200 text-xs focus:outline-none focus:border-amber-500 min-h-[44px]"
          >
            {FONT_PRESETS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        {/* Cover Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-zinc-300 flex items-center gap-1">
            <Image className="w-3.5 h-3.5 text-amber-400" /> Imagem de Capa
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {COVER_PRESETS.map((preset) => {
              const isSelected = customCover === preset.url;
              return (
                <div
                  key={preset.name}
                  onClick={() => {
                    setCoverImage(preset.url);
                    setCustomCover(preset.url);
                  }}
                  className={`cursor-pointer rounded-xl overflow-hidden border transition-all relative aspect-video ${
                    isSelected
                      ? 'border-amber-500 ring-2 ring-amber-500/50 shadow'
                      : 'border-zinc-800 hover:border-zinc-700 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                  {isSelected && (
                    <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                      <span className="p-0.5 bg-amber-500 text-zinc-950 rounded-full">
                        <Check className="w-3 h-3" />
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <input
            type="url"
            value={customCover}
            onChange={(e) => setCustomCover(e.target.value)}
            placeholder="URL direta da imagem (https://...)"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-100 text-xs focus:outline-none focus:border-amber-500 min-h-[44px]"
          />
        </div>

        {/* Audio CDN / Base URL */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-zinc-300 flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-amber-400" /> URL Base de Áudio / CDN (Opcional)
          </label>
          <input
            type="url"
            value={audioBaseUrl}
            onChange={(e) => setAudioBaseUrl(e.target.value)}
            placeholder="https://seu-cdn-ou-storage.com/pop_audios"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-100 text-xs focus:outline-none focus:border-amber-500 min-h-[44px]"
          />
        </div>

        {/* HuggingFace Dataset URL */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-zinc-300">
            Link do HuggingFace Dataset (Opcional)
          </label>
          <input
            type="url"
            value={huggingFaceUrl}
            onChange={(e) => setHuggingFaceUrl(e.target.value)}
            placeholder="https://huggingface.co/datasets/..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-100 text-xs focus:outline-none focus:border-amber-500 min-h-[44px]"
          />
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs rounded-xl border border-zinc-800 min-h-[44px]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow transition-all flex items-center gap-2 min-h-[44px] disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </Drawer>
  );
};
