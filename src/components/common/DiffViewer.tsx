import React from 'react';
import { computeWordDiff } from '../../domain/diff';

interface DiffViewerProps {
  originalText: string;
  proposedText: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ originalText, proposedText }) => {
  const chunks = computeWordDiff(originalText, proposedText);

  return (
    <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-sm font-sans leading-relaxed">
      <div className="text-xs font-semibold text-zinc-500 mb-1">Visualização de Alterações (Diff):</div>
      <div className="flex flex-wrap gap-1 items-baseline">
        {chunks.map((chunk, index) => {
          if (chunk.added) {
            return (
              <span
                key={index}
                className="bg-emerald-950/80 text-emerald-300 font-medium px-1 py-0.5 rounded border border-emerald-800/60"
              >
                {chunk.value}
              </span>
            );
          }
          if (chunk.removed) {
            return (
              <span
                key={index}
                className="bg-rose-950/80 text-rose-300 line-through px-1 py-0.5 rounded border border-rose-800/60"
              >
                {chunk.value}
              </span>
            );
          }
          return (
            <span key={index} className="text-zinc-300">
              {chunk.value}
            </span>
          );
        })}
      </div>
    </div>
  );
};
