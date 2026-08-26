# 🎙️ DubCraft Studio

<div align="center">

![DubCraft Studio](https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1200&auto=format&fit=crop&q=80)

**Plataforma Web Colaborativa de Revisão, Votação e Localização de Dublagens de Jogos**

[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase_Auth-Google_%26_Email-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare_Workers-D1_SQL-F38020?style=flat-square&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)

</div>

---

## 📌 Visão Geral

O **DubCraft Studio** é uma plataforma moderna e responsiva projetada para gerenciar e revisar projetos comunitários de dublagem e localização de jogos clássicos e modernos (como *Prince of Persia: The Sands of Time*, *Black (PS2)*, entre outros).

A comunidade pode escutar os áudios originais e dublados, comparar transcrições, sugerir novas traduções, votar em propostas e sinalizar problemas de áudio (como sotaque PT-PT ou entonação), tudo de forma rápida, segura e com custo zero de infraestrutura.

---

## ✨ Principais Funcionalidades

### 🎧 1. Revisão e Player Comparativo de Áudio
* **Player A/B Instantâneo:** Ouça o áudio original em inglês e o áudio dublado lado a lado.
* **Controle de Velocidade:** Ajuste fino de playback (0.5x, 0.75x, 1.0x, 1.25x, 1.5x) e atalhos de teclado (`Espaço`, `Shift + Espaço`).
* **Visualizador de Diff:** Destaque visual em tempo real das alterações propostas de texto e tradução.

### 🗳️ 2. Sistema de Propostas & Votação Comunitária
* **Ponderação por Reputação:** Usuários ganham pontos de reputação e níveis (*Novo*, *Experiente*, *Trusted*, *Moderador*, *Admin*).
* **Consenso Automático:** Propostas que atingem score positivo da comunidade são promovidas automaticamente para a versão oficial.
* **🎙️ Chamados Rápidos de Áudio:** Atalhos de 1 clique para sinalizar regravação de áudio (Sotaque de Portugal, ruído, tom ou ritmo) sem precisar alterar o texto.

### 🛡️ 3. Disjuntor de Segurança (Circuit Breaker) & Telemetria
* **100% no Plano Gratuito:** O front-end estático roda no **GitHub Pages** (leituras ilimitadas), o login no **Firebase Auth** (50.000 usuários/mês grátis) e as gravações no **Cloudflare D1** (100.000 escritas/dia grátis).
* **Disjuntor Inteligente:** Em momentos de pico viral, se o limite diário de segurança for atingido, o sistema pausa as novas escritas automaticamente com aviso elegante e reabre à meia-noite (00:00 UTC), mantendo a leitura e os áudios 100% no ar.

### 👑 4. Painel de Controle Administrativo
* **Gestão Multi-Jogos:** Suporte a múltiplos projetos simultâneos com catálogo automático.
* **Monitor de Cotas em Tempo Real:** Gráficos e indicadores de consumo diário de leituras, escritas e autenticações.
* **Exportação para Produção (ZIP):** Download com 1 clique de todos os JSONs processados e créditos formatados em Markdown/TXT para inclusão no jogo final.
* **Gestão e Limpeza de Usuários:** Concessão de selo *Trusted* e exclusão de contas inativas.

---

## 🏗️ Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                 GitHub Pages (Front-end Estático)           │
│  • Catálogo consolidado (catalog.json)                      │
│  • Áudios MP3/WAV em CDN global                             │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
        (1. Login Google/Email)        (2. Votos / Propostas)
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      Firebase Auth           │ │  Cloudflare Workers + D1   │
│  • Google Sign-In Popup      │ │  • SQLite Serverless Edge  │
│  • 50.000 MAU Grátis         │ │  • 100k writes/dia Grátis  │
└──────────────────────────────┘ └────────────────────────────┘
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos
* [Node.js](https://nodejs.org/) (versão 18 ou superior)

### Passo a Passo
1. Clone o repositório:
   ```bash
   git clone https://github.com/RafaelGodoyEbert/DubCraft.git
   cd DubCraft
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
   Acesse a aplicação em `http://localhost:3000`.

---

## ⚙️ Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto (use [.env.example](.env.example) como base):

```env
# Firebase Authentication (Login Google + E-mail)
VITE_FIREBASE_API_KEY="sua-api-key"
VITE_FIREBASE_AUTH_DOMAIN="seu-projeto.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="seu-projeto"
VITE_FIREBASE_STORAGE_BUCKET="seu-projeto.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"
VITE_FIREBASE_APP_ID="1:123456789:web:abcdef"

# API Serverless de Votação (Cloudflare Workers + D1)
VITE_CLOUD_API_URL="https://sua-api.workers.dev"
```

> **Nota:** Se as variáveis do Firebase não forem preenchidas, a aplicação iniciará automaticamente em **Modo Demonstração (Mock Auth)** com usuários e dados de teste pré-configurados.

---

## 📦 Scripts Disponíveis

* `npm run dev` — Inicia o servidor local de desenvolvimento.
* `npm run catalog` — Compila automaticamente todos os JSONs e áudios da pasta `projetos/` gerando o `catalog.json`.
* `npm run build` — Compila o catálogo e gera a versão otimizada para produção na pasta `dist/`.
* `npm run preview` — Pré-visualiza o build de produção localmente.
* `1_iniciar_local.bat` — Atalho para Windows para iniciar o servidor local.
* `2_gerar_build_pages.bat` — Atalho para gerar o build do GitHub Pages.
* `3_publicar_github_pages_automatico.bat` — Publicação automática com 1 clique para o GitHub Pages.

---

## ☁️ Deploy do Backend (Cloudflare Workers + D1)

As instruções completas, esquema SQL e código da API Edge estão na pasta [`cloudflare_backend/`](./cloudflare_backend):
* 📄 [`cloudflare_backend/schema.sql`](./cloudflare_backend/schema.sql) — Estrutura do banco SQLite D1.
* ⚡ [`cloudflare_backend/worker.js`](./cloudflare_backend/worker.js) — API Serverless com Disjuntor de Segurança.
* 📖 [`cloudflare_backend/COMO_CONFIGURAR_CLOUDFLARE_D1.md`](./cloudflare_backend/COMO_CONFIGURAR_CLOUDFLARE_D1.md) — Guia de 2 minutos para colocar a API no ar.

---

## 📄 Licença

Este projeto é desenvolvido para a comunidade de tradução e dublagem de jogos. Sinta-se livre para contribuir!
