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
    // Apenas colaboradores que tiveram propostas aprovadas recebem créditos no jogo
    const sorted = [...contributors]
      .filter((c) => (c.approvedCount || 0) > 0)
      .sort((a, b) => b.approvedCount - a.approvedCount);

    if (sorted.length === 0) {
      if (format === 'json') {
        return JSON.stringify({ project_name: project.name, contributors: [] }, null, 2);
      }
      if (format === 'markdown') {
        return `# Créditos de Tradução & Dublagem — ${project.name}\n\n*Nenhuma fala comunitária foi marcada como aprovada até o momento.*\n`;
      }
      return `CRÉDITOS DE DUBLAGEM — ${project.name}\n\nNenhuma fala comunitária foi aprovada ainda.\n`;
    }

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
   * Generates production-ready ZIP containing jsons_processados, individual cutscene folders and dubcraft_config.json
   */
  public async generateProjectZip(
    project: Project,
    dialogues: Dialogue[]
  ): Promise<Blob> {
    const zip = new JSZip();

    // 1. Export each individual speech JSON in its correct subfolder/jsons_processados structure
    const cutscenesMap = new Map<string, Dialogue[]>();

    dialogues.forEach((d) => {
      // Determine file id and filename (e.g. "0.json", "2_00A4A392.json")
      let fileId = `${d.lineIndex}`;
      if (d.audioOriginalUrl) {
        const match = d.audioOriginalUrl.match(/\/([^\/\\]+)\.(wav|mp3|ogg|flac|aac)$/i);
        if (match && match[1]) fileId = match[1];
      } else if (d.audioDubladoUrl) {
        const match = d.audioDubladoUrl.match(/\/([^\/\\]+)\.(wav|mp3|ogg|flac|aac)$/i);
        if (match && match[1]) fileId = match[1];
      } else if (d.id) {
        const parts = d.id.split('_');
        if (parts.length > 0) fileId = parts[parts.length - 1];
      }

      const jsonFileName = fileId.endsWith('.json') ? fileId : `${fileId}.json`;
      const audioFileName = fileId.endsWith('.wav') ? fileId : `${fileId.replace(/\.json$/i, '')}.wav`;

      const singleJsonData = {
        texto_original: d.texto_original,
        traducao_ptbr: d.traducao_ptbr,
        emocao: d.emocao || 'neutro',
        tipo_voz: d.tipo_voz || 'masculino_adulto',
        notas_dublagem: d.notas_dublagem || '',
        _metadata: {
          arquivo_original: audioFileName,
          gerado_em: d.updatedAt || new Date().toISOString(),
          project: project.name,
          location: 'DubCraft Web Community',
        },
        status: d.status || 'dublado',
        ritmo: d.ritmo || 'normal',
        comentarios: d.comentarios || '',
        speed_factor: typeof d.speed_factor === 'number' ? d.speed_factor : 1.0,
      };

      const serializedSingle = JSON.stringify(singleJsonData, null, 2);

      // Save inside subfolder/jsons_processados if project uses subfolders, otherwise root jsons_processados
      if (d.subfolder && d.subfolder.trim()) {
        zip.file(`${d.subfolder}/jsons_processados/${jsonFileName}`, serializedSingle);
      } else {
        zip.file(`jsons_processados/${jsonFileName}`, serializedSingle);
      }

      // Group for cutscene consolidated view
      const cutsceneGroupKey = d.cutsceneName || d.subfolder || 'geral';
      if (!cutscenesMap.has(cutsceneGroupKey)) {
        cutscenesMap.set(cutsceneGroupKey, []);
      }
      cutscenesMap.get(cutsceneGroupKey)!.push(d);
    });

    // 2. Export consolidated cutscene files inside jsons_cutscenes folder with .json extension
    cutscenesMap.forEach((cutsceneDialogues, groupName) => {
      const safeGroupName = groupName.endsWith('.json') ? groupName : `${groupName}.json`;
      const cutsceneContent = cutsceneDialogues.map((d) => ({
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
      }));

      zip.file(`jsons_cutscenes/${safeGroupName}`, JSON.stringify(cutsceneContent, null, 2));
    });

    // 3. Export full dialogues.json and config files
    const validDialogues = dialogues.filter((d) => d.status !== 'ignorar');
    const configData = {
      project_id: project.id,
      project_name: project.name,
      slug: project.slug,
      status: project.status,
      total_lines: validDialogues.length,
      reviewed_lines: validDialogues.filter((d) => d.isReviewed).length,
      ignored_lines: dialogues.filter((d) => d.status === 'ignorar').length,
      cutscenes_count: cutscenesMap.size,
      exported_at: new Date().toISOString(),
      generator: 'DubCraft Studio v2.0 (OrganizarPOP Engine)',
    };

    zip.file('editor_config.json', JSON.stringify(configData, null, 2));
    zip.file('dubcraft_config.json', JSON.stringify(configData, null, 2));
    zip.file('dialogues.json', JSON.stringify(dialogues, null, 2));

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
