# Classes do Codex Extra

No editor de personagem, abra **Classes**, selecione **Livro → Conteúdo bônus** e escolha a classe. Foram acrescentadas as seis classes brasileiras que faltavam:

| Classe | Benefícios iniciais | Níveis máximos dos cinco poderes | Páginas impressas |
| --- | --- | --- | --- |
| Astrólogo | +5 PM | Boitatá 3; Boto 3; Cão Dourado 3; Rasga-Mortalha 1; Saci 3 | 40–41 |
| Bandoleiro | +2 PI; armas corpo a corpo e à distância marciais | Cabra da Peste 5; Líder de Bando 1; Redistribuir Riquezas 3; Sertanejo 1; Valhacouto 3 | 42–43 |
| Cavaleiro Mágico | +5 PM; armaduras e escudos marciais | Alma Ferida 5; Coração Ardente 3; Impulso do Coração 1; Magitransformação 3; Transformação Aprimorada 3 | 48–51 |
| Forjador de Almas | +2 PI | Animar Arma 4; Coletar Almas 5; Forjar Característica 1; Forjar Feitiço 5; Manifestar Arma 1 | 52–55 |
| Lâmina Carmesim | +5 PV; armas corpo a corpo e escudos marciais | Arsenal Vermelho 1; Dobrar Sangue 1; Escudo Escarlate 2; Frenesi Sanguinolento 4; Hemofagia 5 | 56–57 |
| Malandro | +2 PI; armas à distância marciais | Engabelar 3; Explorar Fraqueza 1; Gambiarra 4; Golpe Aproveitador 3; Jeitinho 2 | 58–59 |

**Carteador/Cartomante** e **Necromante** já existiam; seus registros, poderes e fichas anteriores foram mantidos. No seletor em português, o nome existente é Carteador. Não foram criadas classes duplicadas. As outras abas e livros continuam disponíveis.

## Uso e automação

Os benefícios iniciais usam o cálculo existente de PV, PM, PI e permissões de equipamento. Poderes começam no nível zero, podem ser aumentados pelos controles existentes e aparecem na ficha ao serem aprendidos. Rasga-Mortalha libera Ritualismo somente a partir do nível 1, nas fichas normal e compacta.

As descrições incluem custos, testes, duração, limites, referências e as opções mecânicas de formas mágicas e almas. **NP** significa nível do poder; **RA** segue a nomenclatura do suplemento. O texto deste suplemento fica em português inclusive quando a interface usa outro idioma, por ainda não haver traduções destas classes brasileiras.

Escolhas e efeitos dependentes da cena continuam manuais: registre cargas astrais, Suprimentos, Ultima roubada, almas individuais, formas, Traços, segunda Origem e feitiços escolhidos nas **Notas**. Os controles de combate ajustam PV, PM, PI e condições. Equipamentos, Afinidades, Laços, relógios e modificadores temporários devem ser ajustados pelas ferramentas correspondentes e revertidos quando o efeito terminar. Por exemplo, Escudo Escarlate não altera automaticamente as Defesas ao entrar ou sair de Crise; aplique/remova seu bônus nos modificadores. Forjar Feitiço não concede feitiços comuns de Elementalista à classe: anote as escolhas e consulte a lista existente de Elementalista.

Não há execução automática de poderes, contadores específicos de cargas/almas ou gerador de formas mágicas. Isso evita aplicar parcialmente efeitos ou transformar escolhas do mestre em regras automáticas.

## Dados e compatibilidade

O catálogo está em `src/libs/codexExtraClasses.js`; a tradução usa o sistema existente. O seletor original recebe os registros pelo catálogo `src/libs/classes.js`, todos com `book: "bonus"`. Cada classe tem cinco poderes no formato original (`skillName`, `currentLvl`, `maxLvl`, `description`, `specialSkill`).

Cada personagem recebe uma cópia profunda de benefícios e poderes. Editar uma ficha não altera o catálogo nem os próximos personagens. A referência do livro é preservada no campo adicional `source`; importação/exportação de classe e de personagem mantém esse campo. Classes, equipamentos e demais campos originais não são substituídos. Os identificadores de novas classes são estáveis e não alteram identificadores antigos.

## Fonte e créditos

Fonte fornecida pelo usuário: **Fabula Ultima — Codex Extra**, Jambô Editora, edição brasileira v1.1, novembro de 2025. Conferidos os benefícios e poderes nas páginas impressas 41, 43, 49–55, 57 e 59 (páginas do PDF = página impressa + 2).

Criação de Fabula Ultima: **Emanuele Galletto**. Redação adicional do Codex: **Thiago Rosa e Davide Di Benedetto**. As seis classes brasileiras, assim como seus poderes heroicos, são © 2025 **Jambô Editora**, publicadas no livro sob a Licença Aberta de Fabula Ultima TTRPG v1.0. Carteador, Necromante e os demais conteúdos mencionados nos créditos do livro são © 2022–2025 **Need Games e Rooster Games**. Todos os direitos da edição brasileira são reservados à Jambô. A licença do código do aplicativo não transfere direitos sobre esses conteúdos. Os poderes heroicos adicionais do suplemento não fazem parte desta alteração.

As descrições do aplicativo são adaptações para consulta das regras fornecidas. O PDF, sua diagramação e suas ilustrações não são distribuídos no repositório ou no site. Permanecem válidos os créditos, a licença e os avisos existentes do Fultimator e dos conteúdos de Fabula Ultima.

## Verificação

Execute `npm test` para verificar catálogo, níveis, benefícios, Ritualismo, isolamento entre personagens, exportação/importação e sincronização em combate, junto com os testes anteriores. Execute `npm run build:pages` para gerar o site estático com a configuração de publicação existente.

Validação desta alteração: **35 testes passaram** (29 anteriores e 6 novos), build de produção com base `/Combate-FU/` concluído. No navegador em layout móvel, foram verificadas as oito opções do livro bônus, a inclusão de Astrólogo e Cavaleiro Mágico, níveis dos poderes, salvamento e recarregamento. A ficha fictícia **Teste Codex Extra** recuperou os bônus acumulados (+10 PM máximos) e Ritualismo habilitado por Rasga-Mortalha. Os avisos de tamanho de bundle e da base Browserslist continuam sendo os avisos existentes do build.
