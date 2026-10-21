# Fultimator — combate e biblioteca local

Esta versão deriva do [Fultimator original](https://github.com/fultimator/fultimator), commit base `5623ae23f5fee41bcb90b57e53e835c7b039f132`. O clone completo mantém o histórico Git e o remoto original. Não foi criado nem publicado um fork na sua conta do GitHub. A licença MIT, os créditos e os avisos de conteúdo do projeto foram preservados. Consulte também [o inventário e a inspeção técnica](INSPECAO.md).

## Instalar e executar

Requer Node.js 22 e npm. A versão local não exige contas, credenciais ou servidor próprio.

```sh
npm ci
npm start
```

Abra `http://localhost:3000/`. O português do Brasil é o idioma inicial; as opções de tema e idioma originais continuam disponíveis. Para voltar ao site original, use uma instalação separada e migre as fichas por JSON. Não há acesso automático aos dados de outro domínio.

```sh
npm test
npm run build
npm run preview
```

Os testes usam `node:test`, sem instalar outro framework. Os exemplos em `tests/fixtures/pc.json` e `npc.json` usam os objetos de criação reais das galerias originais, com nomes e conteúdo fictícios; `scripts/create-test-fixtures.mjs` registra sua origem.

Nesta máquina, o comando global `npm` está apontando para uma instalação ausente. Com as dependências já instaladas, os equivalentes diretos são `node node_modules/vite/bin/vite.js` (executar), `node --test tests/*.test.js` (testar), `node node_modules/vite/bin/vite.js build` (build) e `node node_modules/vite/bin/vite.js preview --base=/Combate-FU/` (prévia do build em subpasta). Se precisar instalar as dependências antes de corrigir o PATH do npm, use no PowerShell `& 'C:\Program Files\nodejs\node.exe' 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' ci`.

## Usar o combate

**Nuvem opcional:** esta versão também oferece login Google e sincronização privada pelo projeto Firebase configurado. A biblioteca sem login continua local e separada. Confira **[NUVEM.md](NUVEM.md)** para publicar regras, autorizar domínios e importar dados locais. Os avisos sobre ausência de sincronização nas instruções locais abaixo descrevem o uso sem login e o backend remoto original.

### Retratos do dispositivo

No editor de personagem, abra **Informações**; no editor de adversário, abra as informações básicas. Clique em **Escolher imagem do dispositivo**, escolha o arquivo, confira a prévia e **salve a ficha**. O campo de URL e os botões de atualizar/remover continuam disponíveis. O retrato aparece nas fichas, biblioteca e cartões de combate que usam essa ficha.

Aceita PNG, JPG, WebP e GIF de até **10 MB**. A imagem é reduzida proporcionalmente para no máximo **512 pixels** no maior lado e **64 KiB**, usando WebP ou JPEG. GIF vira um retrato estático. Arquivos vazios, tipos não suportados, imagens danificadas e dimensões excessivas são recusados sem trocar o retrato anterior. O arquivo original no computador não é alterado.

O retrato local é incorporado ao campo original `imgurl` como uma URL de dados. Ele acompanha os JSONs de ficha, encontro e backup, sem hospedagem de imagem ou credenciais. O armazenamento interno guarda apenas uma cópia de cada imagem repetida nas fichas e no histórico; o formato público dos JSONs continua contendo a imagem completa. Dados antigos são lidos automaticamente. O limite total de armazenamento do navegador ainda se aplica; falhas de gravação preservam os dados anteriores e são informadas pelo sistema existente.

Personagens vinculados recebem a imagem atualizada ao salvar pelo editor. Adversários e cópias independentes já adicionados ao encontro mantêm sua própria ficha: adicione novamente a ficha atualizada quando quiser trocar o retrato dessas instâncias.

### Fluxo do encontro

1. Abra **Gerenciador de combate**, dê um nome ao encontro e escolha **Criar encontro**.
2. Clique em **Adicionar participante**. Pesquise personagens ou adversários da biblioteca, selecione vários e ajuste a quantidade de cópias dos adversários. Cada cópia tem identidade e estado próprios.
3. Também é possível importar arquivos JSON individuais, vários arquivos, um array de fichas ou o ZIP produzido por **Exportar todos os NPCs** do original. **Colar JSON** aceita o mesmo conteúdo. A leitura da área de transferência depende da permissão do navegador; o campo manual está sempre disponível.
4. Confira a prévia. Se houver registro semelhante por ID, conteúdo ou nome, escolha usar o existente, atualizar, criar cópia ou ignorar. Os dados só são gravados ao confirmar. Um erro invalida a operação inteira.
5. Personagens da biblioteca são vinculados por padrão. Marque **Usar cópia independente** para preservar os recursos da biblioteca. Um personagem só pode ter um vínculo em encontro ativo; encontros encerrados não podem editar recursos sem reabertura explícita.
6. Os cartões mostram PV, PM, PI, Pontos de Fábula e outros pares `current/max` reconhecidos em `stats`. Adversários usam os cálculos de PV/PM do projeto; vilões têm o contador de Ultima. **Dano** subtrai PV finais, **Cura** soma PV, e os controles de PM deixam explícito o sinal. A operação **Definir (=)** ajusta manualmente o recurso escolhido.
7. Marque as caixas de seleção para aplicar recursos ou condições em vários alvos. Operações em recursos incompatíveis ou custos insuficientes são recusadas integralmente. Condições repetidas não se acumulam e as imunidades são respeitadas.
8. **Ficha** abre o painel lateral com a ficha compacta original de personagem (classes, equipamentos, magias, habilidades, vínculos, notas e demais seções) ou a ficha original de NPC. Há rolagens, identificação/equipe, quantidade de turnos, notas/efeitos temporários e acesso ao JSON completo. A edição estrutural continua nos editores originais.
9. Defina o vencedor da iniciativa; o mestre pode ajustar o lado ativo e a rodada. **Marcar turno realizado** alterna o lado quando ainda há turnos do outro lado. Elite e campeões usam a quantidade de turnos definida pelo original. É possível intervir manualmente. **Próxima rodada** limpa os turnos, mantendo recursos e efeitos.
10. **Histórico e desfazer** restaura a última das 20 alterações recentes, inclusive os recursos sincronizados. Não substitui recursos modificados posteriormente fora daquela ação. As fichas gravadas durante uma importação continuam na biblioteca ao desfazer sua adição ao encontro.

**Encerrar combate** mantém os recursos finais. **Remover do encontro** também preserva os valores sincronizados e não apaga a ficha. Recuperação de recursos é sempre explícita pelos controles. Fichas independentes podem ser salvas na biblioteca e exportadas atualizadas; para vinculá-las depois, selecione o registro salvo pelo seletor de biblioteca.

## Dados e formatos compatíveis

O original exporta um objeto JSON com `dataType: "pc"` ou `"npc"` (`src/components/Export.tsx`). O exportador em lote de NPCs produz um ZIP de objetos individuais, inclusive sem `dataType`. A importação reconhece esses objetos brutos pela estrutura. Arrays de objetos são uma conveniência adicional desta versão, não um formato de coleção alegado como original.

Personagens mantêm `info`, `attributes`, `stats.hp/mp/ip.current/max`, `statuses`, `modifiers`, `classes`, equipamentos, notas e campos desconhecidos. Nenhuma conversão para NPC é feita. A ficha original fica separada da instância, dos recursos e dos efeitos temporários. IDs locais e propriedade local não substituem `id`/`uid` de origem nos JSONs exportados.

No vínculo, somente `stats.<recurso>.current` e `info.fabulapoints`, quando equivalentes, são sincronizados. Máximos, condições do encontro, equipamentos e classes não são sobrescritos pelo combate. Alterações salvas pelo editor original atualizam a instância ativa. A condição persistente original é preservada; condições do encontro são separadas.

O NPC original não tem campos persistentes equivalentes a PV/PM atuais. Seu JSON exportado mantém esse formato, enquanto seus recursos temporários são incluídos na exportação completa do encontro. Não se promete restaurar recursos de NPC ao importar somente a ficha original.

Encontros portáteis usam `dataType: "fultimator-encounter"`, `version: 1`, rodada, lado inicial/ativo, notas, relógios e participantes com fichas completas e estado independente. Sua importação cria outro encontro e remove vínculos locais. Assim, um arquivo externo não pode alterar silenciosamente uma ficha local. O histórico de desfazer não integra a exportação portátil.

O simulador antigo persiste encontros no Firestore como referências `selectedNPCs` com `id`, `combatId` e `combatStats`; esse documento não contém as fichas completas. Ele continua acessível em `#/legacy-combat-sim`. Para migrar, exporte suas fichas e adicione-as ao novo gerenciador. Documentos antigos incompletos e versões futuras desconhecidas são recusados com uma mensagem, sem apagar ou converter dados existentes.

## Persistência e backup

As fichas e os encontros do novo gerenciador são salvos em `localStorage`, em uma chave própria por URL base: `fultimator.local.v1:/<repositorio>/`. Tema, configurações e chaves antigas não são apagados. Cada operação grava biblioteca e encontro em uma única escrita; falhas de quota ou permissão deixam a gravação anterior intacta e exibem um diagnóstico. Dados corrompidos não são sobrescritos automaticamente; o aviso permite baixar o conteúdo bruto para recuperação.

Abra **Biblioteca local e backups → Baixar backup da biblioteca e encontros** regularmente. O backup contém as fichas de personagens e NPCs e os encontros do novo gerenciador. Os históricos/salas do rolador e os encontros do simulador antigo não integram esse backup específico.

**Restaurar backup** valida o arquivo inteiro, mescla fichas sem apagar as existentes e cria cópias independentes dos encontros. Vínculos não são restabelecidos automaticamente: reconecte explicitamente pela biblioteca. Também é possível exportar uma ficha ou encontro individual.

O armazenamento pertence ao navegador, origem e URL base. Limpar os dados do site, usar navegação privada, trocar de navegador/dispositivo ou mudar o nome do repositório pode exigir restauração de backup. A capacidade é limitada pela quota do navegador; retratos em base64 e encontros muito grandes consomem mais espaço. Não há sincronização entre dispositivos, sala compartilhada ou garantia de edição simultânea em várias abas. Eventos de armazenamento atualizam a interface em outras abas, mas não substituem uma infraestrutura transacional de colaboração.

## Publicar no GitHub Pages

1. Crie seu fork do repositório original ou um repositório derivado e envie este código, preservando créditos e licença. O código local já está disponível; autenticação e publicação na sua conta não foram realizadas por esta implementação.
2. Em **Settings → Pages**, selecione **Source: GitHub Actions**.
3. O workflow `.github/workflows/pages.yml` executa `npm ci`, os testes, o build e a publicação no push para `main` ou em **Run workflow**.
4. `scripts/build-pages.mjs` lê o nome do repositório em `GITHUB_REPOSITORY`, configura a base `/<repositorio>/` e força o modo local. Repositórios `usuario.github.io` usam `/`. Não são necessários secrets.
5. Abra `https://usuario.github.io/repositorio/#/combat-sim`. As rotas com hash não exigem reescrita do servidor; navegar diretamente e atualizar uma ficha ou encontro funciona no Pages.

Para verificar localmente uma subpasta:

```powershell
$env:VITE_BASE_PATH = '/Combate-FU/'
npm run build:pages
npm run preview -- --base=/Combate-FU/
```

No Linux/macOS: `VITE_BASE_PATH=/Combate-FU/ npm run build:pages`. O HTML usa `%BASE_URL%` para ícones e manifest; imagens importadas pelo Vite recebem a base do build. A hospedagem estática não exige Firebase para combate, fichas, importação/exportação, biblioteca e ferramentas de cálculo locais.

## Integrações externas preservadas

| Função | Dependência e comportamento |
| --- | --- |
| Editores, fichas, biblioteca, combate e calculadoras | Locais por padrão, sem contas. O adaptador mantém as interfaces de persistência usadas pelos componentes originais. |
| Login, galerias/compêndio compartilhados, encontros antigos na nuvem, salas de rolagens entre dispositivos | Exigem Firebase Auth e Firestore próprios, regras/autorização e dados de conteúdo. `VITE_DATA_MODE=remote` com as variáveis do `.env.example` reativa o backend original. O novo gerenciador e sua biblioteca continuam locais e separados da nuvem. Migração por JSON. |
| Compêndio no modo local | Exibe apenas adversários publicados nesta instalação. Os dados remotos originais não estão no repositório e não são redistribuídos nem baixados automaticamente. |
| Catálogo oficial/comunitário de recursos, submissões e moderação | Exige Supabase com tabelas `resources`, `authors`, `submissions` e suas políticas/RLS, além da identidade exigida pelo serviço. Sem configuração, a página informa a dependência; as outras ferramentas continuam operando. Links de recursos e livros seguem disponíveis na página inicial. |
| Feedback, denúncia e notificações Discord | Os componentes originais permanecem, mas envio exige um serviço configurado. Não configure webhooks secretos em `VITE_*`, pois qualquer variável Vite é pública. Para produção, adapte um proxy próprio; sem serviço, use os issues do seu repositório. |
| Retratos externos e fontes Google | Dependem da rede e das políticas CORS do servidor. Há avatar/fontes de fallback. Não são necessários para o gerenciamento de recursos. |
| Deploy Firebase original | Workflows preservados, desabilitados até definir a variável de repositório `ENABLE_FIREBASE_DEPLOY=true`. Exige o seu projeto e conta de serviço em secrets do Actions; não faz parte do Pages. |

Use uma instalação remota separada para evitar confundir propriedade local e remota. Para o workflow Firebase opcional, defina a variável `FIREBASE_PROJECT_ID`, o secret `FIREBASE_SERVICE_ACCOUNT` e as configurações públicas do seu projeto. Para `npm run deploy`, configure também seu próprio projeto em `.firebaserc` com o Firebase CLI. A configuração pública de Firebase não equivale à permissão de usar a base original. Nunca publique contas de serviço, chaves `service_role`, tokens ou webhooks no pacote estático.

## Regras e limites de automação

Conferência feita no Livro Básico PT-BR fornecido localmente, páginas impressas 61–63 (iniciativa, alternância e múltiplos turnos), 84–85 (Crise, limites e custos completos) e 94 (condições e imunidades). Referência pública do jogo e materiais oficiais: [NEED GAMES](https://need.games/fabula-ultima/). Cálculos de adversários reutilizam `src/libs/npcs.js`; contagem de turnos segue a implementação original do simulador.

O sistema não automatiza custos/efeitos de habilidades, Guarda, afinidades, modificadores condicionais, recuperação ao fim da cena, fuga/rendição, dano de magias ou ações adicionais dentro do mesmo turno. Use os controles manuais e os textos originais da ficha. O botão de dano recebe **perda final de PV**. As ferramentas especializadas de dano, estudo, configurações e reordenação do simulador anterior continuam disponíveis no **Simulador original**; seus encontros são separados do novo gerenciador.

O build conserva avisos herdados de tamanho de chunks e dados Browserslist antigos. Não foram trocadas bibliotecas ou atualizadas dependências sem necessidade. As novas telas usam o sistema `t` e um catálogo adicional em `src/translation/combatManager.json`; PT-BR está completo para o fluxo novo. Outros idiomas mantêm as traduções originais e usam PT-BR como fallback para as novas mensagens.
