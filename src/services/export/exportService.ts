import JSZip from 'jszip';
import { Project, ProjectContributor, Dialogue, ExportFormat } from '../../types';

export class ExportService {
  /**
   * Generates formatted credits text for community contributors.
   */
  public generateCredits(
    project: Project,
    contributors: ProjectContributor[],
    format: ExportFormat
  ): string {
    const sorted = [...contributors].sort((a, b) => b.approvedCount - a.approvedCount);

    if (format === 'json') {
      return JSON.stringify(
        {
          project_name: project.name,
          generated_at: new Date().toISOString(),
          total_reviewed_lines: project.reviewedLines,
          status: project.status,
          contributors: sorted.map((c, i) => ({
            rank: i + 1,
            name: c.userName,
            approved_contributions: c.approvedCount,
            total_proposals: c.totalProposals,
            role: c.userRole,
            reputation: c.reputation,
          })),
        },
        null,
        2
      );
    }

    if (format === 'markdown') {
      let md = `# Créditos de Tradução & Dublagem — ${project.name}\n\n`;
      md += `*Gerado em ${new Date().toLocaleDateString('pt-BR')} via DubCraft Studio — Plataforma de Revisão*\n\n`;
      md += `### 🏆 Top Contribuidores da Comunidade\n\n`;

      sorted.forEach((c, idx) => {
        const medal = idx === 0 ? '🥇 ' : idx === 1 ? '🥈 ' : idx === 2 ? '🥉 ' : '  ';
        md += `${medal}**${idx + 1}. ${c.userName}** — ${c.approvedCount} falas aprovadas (${c.totalProposals} enviadas)\n`;
      });

      md += `\n---\n*Agradecimentos especiais a todos os revisores e atores pela dedicação à localização do jogo.*`;
      return md;
    }

    // Default TXT
    let txt = `====================================================\n`;
    txt += `  CRÉDITOS DE TRADUÇÃO E DUBLAGEM — ${project.name.toUpperCase()}\n`;
    txt += `  DubCraft Studio (Localização e Dublagem Comunitária)\n`;
    txt += `====================================================\n\n`;
    txt += `STATUS DO PROJETO: ${project.status.toUpperCase()}\n`;
    txt += `FALAS REVISADAS: ${project.reviewedLines} / ${project.totalLines}\n\n`;
    txt += `EQUIPE DE COLABORADORES E REVISORES:\n\n`;

    sorted.forEach((c, idx) => {
      txt += `${idx + 1}. ${c.userName} — ${c.approvedCount} falas aprovadas\n`;
    });

    txt += `\nGerado em: ${new Date().toLocaleString('pt-BR')}\n`;
    return txt;
  }

  /**
   * Generates production-ready ZIP containing jsons_cutscenes, jsons_processados and dubcraft_config.json
   */
  public async generateProjectZip(
    project: Project,
    dialogues: Dialogue[]
  ): Promise<Blob> {
    const zip = new JSZip();

    // Group dialogues by cutscene JSON file name
    const grouped: Record<string, Dialogue[]> = {};
    dialogues.forEach((d) => {
      const filename = d.cutsceneName || 'cutscene_01.json';
      if (!grouped[filename]) {
        grouped[filename] = [];
      }
      grouped[filename].push(d);
    });

    const processadosDir = zip.folder('jsons_processados');
    const cutscenesDir = zip.folder('jsons_cutscenes');

    // For each file group, build JSON structure
    Object.entries(grouped).forEach(([filename, fileDialogues]) => {
      const jsonContent = fileDialogues.map((d) => {
        return {
          lineIndex: d.lineIndex,
          texto_original: d.texto_original,
          traducao_ptbr: d.traducao_ptbr,
          emocao: d.emocao,
          tipo_voz: d.tipo_voz,
          notas_dublagem: d.notas_dublagem,
          status: d.status,
          ritmo: d.ritmo,
          comentarios: d.comentarios,
          speed_factor: d.speed_factor,
        };
      });

      const serialized = JSON.stringify(jsonContent, null, 2);
      if (processadosDir) {
        processadosDir.file(filename, serialized);
      }
      if (cutscenesDir) {
        cutscenesDir.file(filename, serialized);
      }
    });

    // Editor config metadata
    const configData = {
      project_id: project.id,
      project_name: project.name,
      slug: project.slug,
      status: project.status,
      total_lines: dialogues.length,
      reviewed_lines: dialogues.filter((d) => d.isReviewed).length,
      cutscenes_count: Object.keys(grouped).length,
      exported_at: new Date().toISOString(),
      generator: 'DubCraft Studio v2.0 (OrganizarPOP Engine)',
    };
    zip.file('editor_config.json', JSON.stringify(configData, null, 2));
    zip.file('dubcraft_config.json', JSON.stringify(configData, null, 2));

    return await zip.generateAsync({ type: 'blob' });
  }

  /**
   * Helper to trigger native browser file download
   */
  public downloadFile(filename: string, blob: Blob | string, mimeType: string = 'application/octet-stream') {
    const dataBlob = typeof blob === 'string' ? new Blob([blob], { type: mimeType }) : blob;
    const url = URL.createObjectURL(dataBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const exportServiceSingleton = new ExportService();
