# Inspeção e inventário

Base: `fultimator/fultimator`, branch `main`, commit `5623ae23f5fee41bcb90b57e53e835c7b039f132`. A pasta de trabalho estava vazia antes do clone. Foram lidos README, CONTRIBUTING, licença MIT, `character_model.md`, modelos TypeScript, validação, hooks de export/import, componentes de ficha, rotas, Firebase/Supabase, workflows e simulador. Não havia `AGENTS.md` no projeto clonado.

## Arquitetura identificada

- SPA React 18 + Vite 6, JavaScript/TypeScript, Material UI 5 e temas próprios. React Router 6 com rotas declaradas em `src/index.jsx`.
- Firestore original: `player-personal`, `npc-personal`, `encounters`, rolagens e rolagens preparadas. Auth Google condicionava bibliotecas e combate. Supabase abastece o catálogo externo de recursos.
- `src/routes/player-gallery` contém o construtor real de personagem; `player-edit` e `character-sheet` usam os componentes completos originais. `src/types/Players.ts` tem divergências históricas (por exemplo, `stats.*.base` e `attributes.will`) e não foi usado para inventar um formato: o código executável e os JSONs de exportação foram a referência.
- NPCs usam `attributes.will`, `species`, `attacks`, `affinities`, equipamento, magias, extras/rank e fórmulas em `src/libs/npcs.js`.
- Exportação original: objeto inteiro com `dataType`, cópia de JSON para clipboard; lote de NPCs em ZIP de objetos brutos. O simulador antigo grava referências às fichas, em vez de snapshots completos.
- Preferências originais usam localStorage/Zustand. O novo armazenamento tem chave separada e versionada e não limpa chaves antigas.

## Inventário preservado

| Área | Rota com hash | Implementação e disponibilidade |
| --- | --- | --- |
| Página inicial, créditos, avisos e links | `#/` | `Home.tsx`, preservada |
| Galeria/editor de personagens | `#/pc-gallery`, `#/pc-gallery/:id` | Originais, persistência local padrão ou Firebase configurado |
| Ficha completa/compacta e imagem | `#/character-sheet/:id` | Componentes originais, preservados |
| Classes, habilidades, magias e conteúdos de suplementos | Dentro do editor de personagem | Componentes e libs originais preservados |
| Equipamentos, vínculos, notas, companheiros e veículos | Dentro do editor/fichas | Originais preservados; painel de combate reutiliza a ficha compacta |
| Galeria/editor de adversários | `#/npc-gallery`, `#/npc-gallery/:id` | Originais, persistência local padrão ou Firebase configurado |
| Compêndio de adversários | `#/npc-compedium` | Busca original; conteúdo local publicado ou serviço Firebase próprio |
| Itens, armas normais/customizadas, armaduras/escudos, acessórios, arcanos, rituais e projetos | `#/generate` | `generator` e `routes/equip`, preservados |
| Rolador e rolagens preparadas | `#/roller`, `#/roller/:scope` | Original; resultados locais, compartilhamento exige Firebase |
| Combate original: estudo, dano/afinidades, configurações, notas, reordenação e rolagens | `#/legacy-combat-sim`, `#/legacy-combat-sim/:id` | Componentes preservados, encontros separados |
| Gerenciador de combate com personagens reais | `#/combat-sim`, `#/combat-sim/:id` | Implementação nova integrada ao layout/tema original |
| Biblioteca local, importação e backups | `#/local-library` | Nova, compartilha fichas com os editores em modo local |
| Catálogo de recursos e moderação | `#/resources` | Componentes preservados; aviso explícito sem Supabase |
| Temas, modo escuro, idiomas, exportação de imagem/JSON | Menus e editores originais | Preservados; navegação e links adaptados ao Pages |

## Arquivos da alteração

- `src/data/localStore.js`: leitura protegida, transações locais, versão, notificações e diagnóstico.
- `src/data/firestore.js`, `hooks.js`: porta mínima para as APIs usadas pelos editores; delega ao SDK no modo remoto. Não pretende ser uma implementação genérica de Firestore.
- `src/data/sheets.js`, `library.js`: reconhecimento/validação de formatos, recursos, preservação integral e resolução explícita de duplicatas.
- `src/data/encounters.js`: instâncias, sincronização seletiva, turnos, desfazer, importação/exportação e backups.
- `src/data/files.js`: arquivos, ZIP e downloads.
- `src/components/combatManager/*`, `src/routes/combat/Local*`, `CombatManager.jsx`: UI do gerenciador, seletor, ficha lateral e biblioteca.
- `src/index.jsx`, `vite.config.js`, `index.html`, `scripts/build-pages.mjs`, `.github/workflows/pages.yml`: rotas HashRouter e publicação em subpasta.
- Integrações originais: troca mecânica de imports da persistência/hooks; Firebase opcional; Supabase sem credenciais não lança erro de inicialização; links com hash; correção do setter de scroll indefinido no editor de personagem, observado durante a inspeção.
- `tests/`: fixtures reais com dados fictícios e testes de regras de dados. `docs/VALIDACAO.md` registra a validação executada.

Licença e créditos não foram substituídos. O texto integral do livro fornecido localmente não foi adicionado ao repositório.
