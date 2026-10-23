# Compêndio de adversários

O catálogo em `#/npc-compedium` inclui **4.476 fichas públicas da comunidade Fultimator**: **415 em português brasileiro** e **4.061 em inglês**, capturadas em 23/10/2026. Os demais idiomas não são distribuídos nesta instalação. Os textos das fichas permanecem no idioma original, sem tradução automática.

## Uso

O compêndio utiliza a apresentação original do Fultimator: ícones grandes por espécie, nome, barra de nível, categoria, idioma e botão **Pesquisar**. Os filtros são aplicados ao pesquisar. O idioma inicial é português; inglês também está disponível. As seis fichas da página aparecem abertas na própria lista, em duas colunas no computador e uma no celular, usando o mesmo `NpcPretty` do projeto original. O botão **Recolher/Expandir** controla todas as fichas; cada ficha também pode ser aberta ou fechada individualmente.

A fileira abaixo de cada ficha mantém os ícones de copiar, compartilhar, baixar imagem, denunciar e exportar JSON, além do crédito do autor. O menu do ícone **Copiar para o Criador de Adversários** oferece **Copiar para biblioteca**, **Adicionar ao combate** e as mesmas operações para as seis fichas da página. A cópia abre a prévia de importação existente. Se já houver uma ficha semelhante, escolha usar o registro, atualizar explicitamente ou criar uma cópia. Nenhum registro pessoal é substituído automaticamente.

O compartilhamento gera um link público `#/npc-compedium?npc=<identificador>` que abre a ficha sem depender da biblioteca do destinatário. O ícone de exportação oferece JSON individual ou cópia para a área de transferência; o botão de imagem utiliza o exportador original. A denúncia encaminha o usuário ao canal do Fultimator de origem, sem simular o envio de um relato para um serviço que esta instalação não administra.

**Adicionar ao combate** permite escolher um encontro ativo ou criar um encontro. A próxima prévia permite escolher o lado, a quantidade de cópias de cada adversário e se a ficha deve também ser salva na biblioteca. Cada participante tem recursos independentes. Um encontro novo só é gravado quando a adição é confirmada.

**Meus adversários publicados**, no menu de cópia, preserva a busca anterior das fichas marcadas como publicadas na biblioteca desta instalação. O catálogo comunitário e a biblioteca pessoal são separados. A nuvem recebe apenas as cópias e encontros que o usuário salvar, sem enviar todo o catálogo para a conta.

Como no original, a ordenação padrão usa a data de publicação decrescente; um intervalo de nível específico ordena primeiro pelo nível. A navegação utiliza **Itens anteriores/Próximos itens**.

## Origem, créditos e dados

- Origem: [compêndio do Fultimator](https://fultimator.com/npc-compedium), coleção pública `npc-personal` do projeto `fabula-ultima-helper`.
- A captura usou somente documentos com `published == true`, por requisições de leitura sem autenticação. Não acessa fichas privadas, não usa credenciais administrativas e não modifica o serviço original.
- Os campos originais, inclusive `createdBy`, `uid`, `id`, ataques, magias, habilidades e campos adicionais, são preservados. `dataType: "npc"` identifica o formato de exportação do aplicativo. Timestamps usam a serialização `{ seconds, nanoseconds }` do exportador original.
- A autoria das fichas continua pertencendo aos seus respectivos criadores; os créditos aparecem em cada resultado e acompanham o JSON. A licença MIT do código não é uma relicença atribuída ao conteúdo de terceiros.
- Fultimator é uma produção independente da [equipe Fultimator](https://github.com/fultimator/fultimator). Os avisos do projeto e a referência à [Fabula Ultima Third-Party Tabletop License 1.0](https://need.games/wp-content/uploads/2024/06/Fabula-Ultima-Third-Party-Tabletop-License-1.0.pdf) permanecem no aplicativo. Fabula Ultima é de Emanuele Galletto, Need Games e Rooster Games. Este catálogo não é um bestiário oficial da editora.

Foram recebidas 4.489 fichas nos dois idiomas solicitados. Treze não passaram na validação por nome vazio, ajuste não inteiro ou PV/PM finais inválidos. Nenhuma foi corrigida com valores inventados. O campo `excluded` de `public/compendium/index.json` registra o identificador, o nome e o motivo de cada exclusão. Ajustes **negativos inteiros** de PV/PM são aceitos quando produzem recursos finais válidos, como no modelo original.

## Publicação e manutenção

Os arquivos em `public/compendium/` são distribuídos pelo mesmo workflow do GitHub Pages. O índice contém resumos; as fichas completas ficam em pacotes de até 100 registros, carregados sob demanda. Os nomes dos pacotes incluem seu hash para evitar misturar índice novo com fichas antigas em cache. O aplicativo usa `BASE_URL`, inclusive em `/Combate-FU/`.

Não é necessário configurar o Firebase para consultar esse catálogo, exportar fichas, copiá-las ou usá-las no combate local. O catálogo é uma cópia estática; mudanças futuras no serviço original não chegam automaticamente. Links de imagens que já existam nas fichas continuam dependendo de seus respectivos hosts. Como nos demais recursos de um site estático, o primeiro carregamento dos arquivos exige conexão; as cópias salvas na biblioteca permanecem no navegador.

Para atualizar manualmente a captura, caso o serviço original continue oferecendo leitura pública:

```powershell
node scripts/capture-public-compendium.mjs tmp/public-compendium/capture.json
node scripts/package-public-compendium.mjs tmp/public-compendium/capture.json
npm test
npm run build:pages
```

O empacotador inclui apenas `pt-BR` e `en`. O arquivo intermediário é ignorado pelo Git. A captura para diante de recusa do serviço; não tenta obter acesso privado. Revise os novos conteúdos, créditos, exclusões e diferenças antes de publicar uma atualização.

Os testes verificam todas as fichas distribuídas, idiomas, recursos, IDs únicos, filtros, caminhos do Pages, recuperação de downloads, preservação de dados e autores, importação sem sobrescrita e isolamento entre cópias no combate.

Validação desta entrega: 64 testes passaram e o build com base `/Combate-FU/` foi concluído. No navegador, foram conferidos o filtro inicial em português, a busca em inglês, a ficha completa, a prévia/cópia para biblioteca e a detecção de registro repetido. Um encontro criado a partir do compêndio recebeu três cópias de um adversário; após aplicar 7 de dano somente à segunda e atualizar a página, os PV continuaram em 60/53/60. Um JSON em inglês baixado pelo botão da interface foi revalidado e comparado integralmente com sua ficha de origem, sem diferenças.

Na restauração do layout original, foram acrescentados testes de ordenação por publicação/nível e de links públicos, totalizando 66 testes. No navegador foram conferidos seis exemplares expandidos por página, recolhimento global, aplicação explícita da pesquisa, fichas em inglês, menu de cópia/combate e abertura de uma ficha por link compartilhado. A tela também foi conferida em 390 px, sem rolagem horizontal.
