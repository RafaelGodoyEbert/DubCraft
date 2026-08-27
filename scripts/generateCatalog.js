import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WEB_ROOT = path.resolve(__dirname, '..');
const PROJETOS_DIR = path.join(WEB_ROOT, 'projetos');
const OUTPUT_DIR = path.join(WEB_ROOT, 'src', 'data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'catalog.json');

export function generateCatalog() {
  const startTime = Date.now();
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const projects = [];
  const allDialogues = [];

  if (!fs.existsSync(PROJETOS_DIR)) {
    if (fs.existsSync(OUTPUT_FILE)) {
      console.log('[Catalog] Pasta projetos não encontrada. Preservando catálogo pré-compilado.');
      return;
    }
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ projects: [], dialogues: [] }, null, 2));
    return;
  }

  const projectDirs = [];
  try {
    const entries = fs.readdirSync(PROJETOS_DIR);
    for (const name of entries) {
      if (name.startsWith('.')) continue;
      const fullPath = path.join(PROJETOS_DIR, name);
      try {
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
          projectDirs.push(name);
        }
      } catch {}
    }
  } catch (err) {
    console.warn('[Catalog] Aviso ao ler diretório de projetos:', err.message);
  }

  const isForce = process.argv.includes('--force') || process.argv.includes('--clean');

  if (!isForce && projectDirs.length === 0 && fs.existsSync(OUTPUT_FILE)) {
    try {
      const existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
      if (existing.projects && existing.projects.length > 0) {
        console.log(`[Catalog] Preservando catálogo pré-compilado (${existing.projects.length} projetos, ${existing.dialogues?.length || 0} falas).`);
        return;
      }
    } catch {}
  }

  for (const projectName of projectDirs) {
    const projectPath = path.join(PROJETOS_DIR, projectName);
    const projectId = `proj_${projectName.toLowerCase()}`;

    let projectInfo = {
      name: projectName === 'Black' ? 'Black (PS2 / Xbox)' : projectName,
      description: `Projeto de dublagem e localização de ${projectName}.`,
    };

    const infoPath = path.join(projectPath, 'project_info.json');
    if (fs.existsSync(infoPath)) {
      try {
        const raw = fs.readFileSync(infoPath, 'utf8');
        projectInfo = { ...projectInfo, ...JSON.parse(raw) };
      } catch (e) {
        console.warn(`[Catalog] Erro ao ler project_info.json em ${projectName}:`, e.message);
      }
    }

    // Cover image check
    let coverImage = 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80';
    for (const ext of ['png', 'jpg', 'jpeg', 'webp']) {
      const thumbFile = path.join(projectPath, `thumb.${ext}`);
      if (fs.existsSync(thumbFile)) {
        coverImage = `projetos/${projectName}/thumb.${ext}`;
        break;
      }
    }

    const projectDialogues = [];
    const discoveredSubfolders = new Set();

    function processJsonDirectory(jsonDir, audioInputDir, audioDubladoDir, subfolderName = null) {
      if (!fs.existsSync(jsonDir)) return;

      const jsonFiles = fs.readdirSync(jsonDir)
        .filter(f => f.endsWith('.json'));

      // Natural sort files
      jsonFiles.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

      for (let i = 0; i < jsonFiles.length; i++) {
        const jsonFile = jsonFiles[i];
        const fileId = path.basename(jsonFile, '.json');
        const jsonFilePath = path.join(jsonDir, jsonFile);

        let data = {};
        try {
          data = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
        } catch (err) {
          continue;
        }

        const metadata = data._metadata || {};
        const audioFileName = metadata.arquivo_original || `${fileId}.wav`;

        const hasInput = fs.existsSync(path.join(audioInputDir, audioFileName));
        const hasDublado = fs.existsSync(path.join(audioDubladoDir, audioFileName));

        const urlSubPath = subfolderName ? `${projectName}/${subfolderName}` : projectName;
        const audioOriginalUrl = hasInput ? `projetos/${urlSubPath}/audios_input/${audioFileName}` : undefined;
        const audioDubladoUrl = hasDublado ? `projetos/${urlSubPath}/audios_dublados/${audioFileName}` : undefined;

        // Determine cutscene / group name
        let cutscene = subfolderName;
        if (!cutscene) {
          if (/^CINE\d+/i.test(fileId)) {
            cutscene = `Cinemática ${fileId.match(/^CINE\d+/i)[0]}`;
          } else if (/^VIDEO\d+/i.test(fileId)) {
            cutscene = `Vídeo ${fileId.match(/^VIDEO\d+/i)[0]}`;
          } else if (/^locstrm/i.test(fileId)) {
            cutscene = `Diálogos In-Game (Streams)`;
          } else if (/^prinono/i.test(fileId)) {
            cutscene = `Príncipe (Voz/Combate)`;
          } else if (/^kl_vo/i.test(fileId)) {
            cutscene = `Kaileena / Guardiã`;
          } else if (/^mahasti/i.test(fileId)) {
            cutscene = `Mahasti`;
          } else if (/^silouet/i.test(fileId)) {
            cutscene = `Silhueta`;
          } else if (/^lordofc/i.test(fileId)) {
            cutscene = `Lord of Chaos`;
          } else if (/^thiesfx/i.test(fileId)) {
            cutscene = `Ladrões`;
          } else if (/^vizier/i.test(fileId)) {
            cutscene = `Vizir`;
          } else {
            cutscene = 'Geral / Outros';
          }
        }

        discoveredSubfolders.add(cutscene);

        const dialogue = {
          id: `dial_${projectName.toLowerCase()}_${(subfolderName || 'root').replace(/[^a-z0-9]/gi, '_')}_${fileId.replace(/[^a-z0-9]/gi, '_')}`,
          projectId,
          subfolder: subfolderName || '',
          cutsceneName: cutscene,
          lineIndex: projectDialogues.length,
          texto_original: (data.texto_original || '').trim(),
          traducao_ptbr: (data.traducao_ptbr || '').trim(),
          emocao: data.emocao || 'neutro',
          tipo_voz: data.tipo_voz || 'masculino_adulto',
          notas_dublagem: data.notas_dublagem || '',
          status: data.status || 'dublado',
          ritmo: data.ritmo || 'normal',
          comentarios: data.comentarios || '',
          speed_factor: typeof data.speed_factor === 'number' ? data.speed_factor : 1.0,
          audioOriginalUrl,
          audioDubladoUrl,
          isReviewed: data.status === 'dublado' || Boolean(data.isReviewed || data.revisado),
          updatedAt: metadata.gerado_em || new Date().toISOString(),
        };

        projectDialogues.push(dialogue);
      }
    }

    // 1. Check direct jsons_processados in project root (e.g. WarriorWithin)
    const directJsonDir = path.join(projectPath, 'jsons_processados');
    if (fs.existsSync(directJsonDir)) {
      processJsonDirectory(
        directJsonDir,
        path.join(projectPath, 'audios_input'),
        path.join(projectPath, 'audios_dublados'),
        null
      );
    }

    // 2. Check subfolders (e.g. Black/Level_00_Trench)
    const subfolders = fs.readdirSync(projectPath)
      .filter(d => !d.startsWith('.') && !d.startsWith('_') && fs.statSync(path.join(projectPath, d)).isDirectory());

    for (const subfolderName of subfolders) {
      if (['jsons_processados', 'audios_input', 'audios_dublados', 'audios_base_tts', 'vocais_separados', 'sfx_separados', 'textos_para_tts'].includes(subfolderName)) {
        continue;
      }
      const jsonDir = path.join(projectPath, subfolderName, 'jsons_processados');
      if (fs.existsSync(jsonDir)) {
        processJsonDirectory(
          jsonDir,
          path.join(projectPath, subfolderName, 'audios_input'),
          path.join(projectPath, subfolderName, 'audios_dublados'),
          subfolderName
        );
      }
    }

    const reviewedCount = projectDialogues.filter(d => d.isReviewed).length;

    const project = {
      id: projectId,
      name: projectInfo.name || projectName,
      slug: projectName.toLowerCase(),
      folderName: projectName,
      description: projectInfo.description || `Projeto de dublagem de ${projectName}`,
      coverImage,
      status: 'active',
      totalLines: projectDialogues.length,
      reviewedLines: reviewedCount,
      pendingProposalsCount: 0,
      contributorsCount: 1,
      cutscenesCount: discoveredSubfolders.size,
      githubRepo: projectInfo.githubRepo,
      githubBranch: 'main',
      githubPath: '',
      dubbedAudioBaseUrl: `projetos/${projectName}`,
      createdAt: '2026-01-20T00:00:00Z',
    };

    projects.push(project);
    allDialogues.push(...projectDialogues);

    // Save individual project dialogues.json for on-demand lazy loading (~0.3MB each instead of 20MB monolithic)
    try {
      const projectDialoguesFile = path.join(projectPath, 'dialogues.json');
      fs.writeFileSync(projectDialoguesFile, JSON.stringify(projectDialogues, null, 2), 'utf8');
      console.log(`  ✓ [Projeto ${projectName}] Gerado dialogues.json com ${projectDialogues.length} falas -> ${projectDialoguesFile}`);
    } catch (e) {
      console.warn(`  [Aviso] Falha ao salvar dialogues.json em ${projectName}:`, e.message);
    }
  }

  // Lightweight manifest for instant homepage rendering (only project summaries)
  const catalog = { projects, dialogues: [] };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(catalog, null, 2), 'utf8');

  const elapsed = Date.now() - startTime;
  console.log(`⚡ [Catalog] Manifest compilado com sucesso em ${elapsed}ms: ${projects.length} projeto(s), ${allDialogues.length} falas fracionadas -> ${OUTPUT_FILE}`);
}

generateCatalog();
