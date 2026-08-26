import React, { useState } from 'react';
import { Project, User } from '../../types';
import { Drawer } from '../common/Drawer';
import { repositoryAdapterSingleton } from '../../repositories/storageAdapter';
import { FolderPlus, Image, Sparkles, FileText, Check } from 'lucide-react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onProjectCreated: (newProject: Project) => void;
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
    name: 'Tático Militar',
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80',
  },
];

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onProjectCreated,
}) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState(COVER_PRESETS[0].url);
  const [customCover, setCustomCover] = useState('');
  const [huggingFaceUrl, setHuggingFaceUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    const autoSlug = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    setSlug(autoSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      const newProj = await repositoryAdapterSingleton.createProject({
        name: name.trim(),
        slug: slug.trim() || 'projeto-' + Date.now(),
        description: description.trim() || 'Projeto de tradução e dublagem PT-BR.',
        coverImage: customCover.trim() || coverImage,
        status: 'active',
        huggingFaceDatasetUrl: huggingFaceUrl.trim() || undefined,
      });

      // Audit Log
      await repositoryAdapterSingleton.createAuditLog({
        id: `audit_${Date.now()}`,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'PROJECT_EXPORT',
        details: `Criou o novo projeto "${newProj.name}".`,
        targetId: newProj.id,
        createdAt: new Date().toISOString(),
      });

      onProjectCreated(newProj);
      onClose();
      // Reset form
      setName('');
      setSlug('');
      setDescription('');
      setCustomCover('');
    } catch (err: any) {
      alert(err.message || 'Erro ao criar projeto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Novo Projeto de Dublagem">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
        <p className="text-zinc-400 text-xs">
          Cadastre um novo jogo ou projeto para receber falas, cutscenes e propostas de dublagem da comunidade.
        </p>

        {/* Name */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-zinc-300">Nome do Jogo / Projeto *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Ex: God of War (2005) ou Prince of Persia"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-100 text-xs focus:outline-none focus:border-amber-500 min-h-[44px]"
          />
        </div>

        {/* Slug */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-zinc-300">Identificador / Slug URL</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="god-of-war-2005"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-100 text-xs font-mono focus:outline-none focus:border-amber-500 min-h-[44px]"
          />
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-zinc-300">Descrição do Projeto</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Contexto da localização, estúdio, personagens principais..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-100 text-xs focus:outline-none focus:border-amber-500 resize-none"
          />
        </div>

        {/* Preset Cover Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-zinc-300">Imagem de Capa (Selecione ou Cole URL)</label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {COVER_PRESETS.map((preset) => {
              const isSelected = coverImage === preset.url && !customCover;
              return (
                <div
                  key={preset.name}
                  onClick={() => {
                    setCoverImage(preset.url);
                    setCustomCover('');
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
            placeholder="Ou cole o link direto da capa (https://...)"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-100 text-xs focus:outline-none focus:border-amber-500 min-h-[44px]"
          />
        </div>

        {/* Dataset HuggingFace optional */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-zinc-300">
            Repositório de Áudios / HuggingFace Dataset (Opcional)
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
            <FolderPlus className="w-4 h-4" />
            {isSubmitting ? 'Criando Projeto...' : 'Criar Projeto'}
          </button>
        </div>
      </form>
    </Drawer>
  );
};
