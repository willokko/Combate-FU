# Validação executada

Data: 20 de outubro de 2026. Ambiente local: Windows, Node.js 22.13.1; build com Vite 6.2.2. Código original obtido de `fultimator/fultimator`, sem trocar a tecnologia ou remover seus componentes.

## Testes automatizados

`node --test tests/*.test.js`: **29 testes aprovados, 0 falhas**. O mesmo comando é usado por `npm test` e pelo workflow do Pages. Cobertura:

- Reconhecimento de JSON `pc`, `npc`, NPC bruto e arrays; equivalência entre arquivo e texto colado.
- Validação de dados inválidos, recursos negativos, máximos, números não inteiros e custos integrais de PM.
- Preservação profunda de classes, equipamentos, habilidades, notas, extensões desconhecidas e metadados `id`/`uid`.
- Sincronização seletiva de PV, PM, PI e Fábula; alteração de personagem pelo editor original; cópias independentes e três cópias de NPC com estados isolados.
- Operações em vários alvos, rollback atômico de operação incompatível, efeitos temporários e Crise em PV máximos ímpares.
- Alternância de lados, elite com vários turnos, avanço de rodada sem recuperação implícita, encerramento e bloqueio de vínculos concorrentes.
- Desfazer com sincronização, proteção contra alterações posteriores e preservação de edição de classe feita depois do dano.
- Recuperação do encontro persistido, ficha/encontro portáteis, importação com tipos numéricos normalizados e versões desconhecidas recusadas.
- Resolução de duplicatas, escolha entre vários registros semelhantes, backup com mesclagem, falha de quota e dados corrompidos sem sobrescrita.
- Filtros, busca e paginação usados pelo compêndio original na persistência local.

As fixtures foram produzidas a partir dos objetos de criação do código original, com dados fictícios. Nenhuma ficha real do usuário foi usada nos testes.

## Aceitação no navegador

| Cenário solicitado | Verificação |
| --- | --- |
| 1. Personagem real da biblioteca, sem conversão | Selecionados dois personagens locais em uma única adição. Ambos ficaram vinculados; a ficha lateral exibiu a ficha compacta original, incluindo classes. |
| 2. Importar JSON exportado de personagem | Importados `tests/fixtures/pc.json` e `npc.json` pelo seletor de arquivos, com prévia e recursos reconhecidos. |
| 3. Colar o mesmo JSON | Conteúdo de `pc.json` colado, validado e adicionado com escolha explícita de cópia independente. |
| 4. Vários personagens e adversários | Encontro com personagens reais e três NPCs; posteriormente adicionados mais dois personagens da biblioteca na mesma operação. |
| 5. Três cópias de NPC | Uma cópia recebeu dano: primeira/segunda/terceira ficaram inicialmente em 50/45/50 PV, respectivamente. IDs e recursos independentes também cobertos por testes. |
| 6. Recursos e condições | Dano, gasto de PM e condição em personagem; dano e condição em vários alvos. Cura, PI, Fábula e limites cobertos por testes. |
| 7. Biblioteca atualizada | Editor original mostrou 33/45 PV após dano no combate. Outras operações foram conferidas na biblioteca local. |
| 8. Dados preservados | Ficha original e classes acessíveis; exportação real resultou em `dataType: pc`, ID de origem, PV atualizados, classe, arma e extensão desconhecida intactos. Comparação profunda nos testes. |
| 9. Cópia independente | Cópia caiu de 45 para 40 PV, enquanto seu registro na biblioteca permaneceu com 45/45 PV. |
| 10. Atualizar página | Recarregados o ambiente de desenvolvimento e a rota de encontro no pacote de produção; recursos, turnos, condições e lado ativo recuperados. |
| 11. Desfazer | Condição desfeita pelo histórico na interface. Reversão de recursos e conflitos posteriores cobertos por testes. |
| 12. Exportar/reimportar | Backup baixado na interface e restaurado em outra origem local de teste; encontro completo exportado, reimportado e aberto; JSON atualizado de personagem baixado e inspecionado. Reimportação da ficha atualizada coberta por teste. |
| 13. JSON inválido | Colagem inválida exibiu explicação em português e manteve o botão de adição desabilitado. Persistência anterior preservada nos testes. |
| 14. Outras ferramentas | Teste de carregamento das galerias de personagens/NPCs, calculadoras, rolador, compêndio, recursos e simulador original no pacote de produção. Editor completo de personagem também verificado. Não foi feita validação exaustiva de cada habilidade, suplemento e integração remota do aplicativo original. |
| 15. Pages e subpasta | Build concluído com base `/Combate-FU/`; `vite preview` servido em `http://127.0.0.1:4173/Combate-FU/`; assets, navegação com hash e atualização da rota de encontro conferidos. |

## Interface e artefatos

Layout verificado no tamanho padrão de computador e em viewport móvel de 390 × 844. Um excesso de largura de 8 px encontrado no grid foi corrigido; a medição posterior mostrou largura do conteúdo igual à largura disponível. Estados de vínculo, Crise, condição e turno são identificados por texto além de cores. Os controles usam rótulos e componentes acessíveis do Material UI.

- [Captura do painel](screenshots/combat-preview.jpg).
- [Captura completa em computador](screenshots/combat-desktop.jpg).
- [Captura completa em celular](screenshots/combat-mobile.jpg).

As imagens mostram dados fictícios usados durante a verificação; não são conteúdo inicial obrigatório da aplicação.

## Build e limites reais

`VITE_BASE_PATH=/Combate-FU/ node scripts/build-pages.mjs`: **build concluído**. `git diff --check`: sem erros de whitespace. O workflow executa o mesmo processo com base derivada de `GITHUB_REPOSITORY`.

O npm global desta máquina aponta para um caminho de instalação ausente em `AppData/Roaming`. As dependências foram instaladas com o `npm-cli.js` da instalação válida do Node em `C:/Program Files/nodejs/`; testes e builds foram executados diretamente com Node. O projeto não altera a instalação global. Os comandos npm documentados funcionam com uma instalação normal; a documentação principal inclui os comandos diretos equivalentes para este ambiente.

Permanecem avisos herdados de Browserslist antigo, tamanho de chunks e uma depreciação `punycode` do SDK Firebase no teste de compatibilidade do adaptador. O build não falha por esses avisos.

Não foram testados login real, bancos remotos, webhooks, moderação ou publicação efetiva em GitHub/Firebase, pois nenhum serviço/credencial próprio foi configurado. A configuração do Pages e as integrações opcionais foram entregues em código e documentadas; o aplicativo local e seu pacote estático foram executados. Efeitos de habilidades, afinidades e custos condicionais exigem resolução manual; isso é exposto na interface e no guia.
