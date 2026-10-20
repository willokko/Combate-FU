// Regras adaptadas do Codex Extra, edição brasileira v1.1 (Jambô, 2025).
// Classes brasileiras e respectivos poderes © 2025 Jambô Editora.
// Créditos e referências: docs/CODEX_EXTRA.md. Não inclui o PDF ou suas imagens.

export const codexExtraTranslations = {
  'CodexExtra.Source': 'Codex Extra, p. {0}. Regras © 2025 Jambô Editora. NP = nível do poder. Registre escolhas, cargas, almas e formas nas Notas. Efeitos temporários dos poderes são aplicados manualmente no combate e nos modificadores da ficha.',
};
const translate = (key, text) => {
  codexExtraTranslations[key] = text;
  return key;
};
const skill = (id, name, maxLvl, description, specialSkill = '') => ({
  skillName: translate(`CodexExtra.${id}`, name),
  currentLvl: 0,
  maxLvl,
  description: translate(`CodexExtra.${id}.description`, description),
  specialSkill,
});
const benefits = ({ hp = 0, mp = 0, ip = 0, melee = false, ranged = false, armor = false, shields = false } = {}) => ({
  hpplus: hp, mpplus: mp, ipplus: ip, isCustomBenefit: false,
  martials: { melee, ranged, armor, shields },
  rituals: { ritualism: false },
  spellClasses: [],
});
const entry = (name, label, pages, initialBenefits, skills) => ({
  name: translate(name, label),
  book: 'bonus',
  source: { title: 'Codex Extra', edition: 'pt-BR v1.1', pages },
  benefits: benefits(initialBenefits),
  skills,
});

export const codexExtraClasses = [
  entry('Astrologer', 'Astrólogo', '40-41', { mp: 5 }, [
    skill('Astrologer.Boitata', 'Constelação do Boitatá', 3,
      'Use uma ação e gaste **5 PM** para fazer um teste de **【AST + VON】** contra a Defesa Mágica de um inimigo visível. Se acertar, cause **【NP × 10】 de dano de fogo**. Pode consumir 1 carga celeste para tornar uma criatura visível Resistente a fogo até o fim da cena.\nGere também **【NP】 cargas solares**, que duram até o fim da cena.'),
    skill('Astrologer.Boto', 'Constelação do Boto', 3,
      'Use uma ação e gaste **5 PM** para alinhar os astros de um aliado visível. Até o fim da cena, ele pode substituir um atributo de um teste por **AST ou VON**. Pode consumir 1 carga solar para dar **+1 nesse teste**.\nGere também **【NP】 cargas estelares**, que duram até o fim da cena.'),
    skill('Astrologer.GoldenDog', 'Constelação do Cão Dourado', 3,
      'Use uma ação e gaste **10 PM** para amaldiçoar um inimigo visível. Até o início do seu próximo turno, todas as fontes de dano de luz contra ele causam **【NP】 de dano adicional**. Pode consumir 1 carga estelar para que todo dano de luz contra ele ignore **Imunidades e Resistências**.\nGere também **【NP】 cargas meteóricas**, que duram até o fim da cena.'),
    skill('Astrologer.BarnOwl', 'Constelação da Rasga-Mortalha', 1,
      'Você pode realizar rituais da disciplina **Ritualismo**. Também pode usar essa disciplina para consultar as estrelas sobre possíveis eventos futuros, obter conhecimento de lendas e realizar pequenos desejos.', 'Ritualism'),
    skill('Astrologer.Saci', 'Constelação do Saci', 3,
      'Use uma ação e gaste **10 PM** para acelerar um aliado visível. No próximo turno dele, ele pode fazer uma ação **Equipamento, Guarda, Estudo ou Objetivo** sem gastar uma ação. Pode consumir 1 carga meteórica para conceder também um ataque livre; considere a **RA como 0** no cálculo de dano desse ataque.\nGere também **【NP】 cargas celestes**, que duram até o fim da cena.'),
  ]),
  entry('Outlaw', 'Bandoleiro', '42-43', { ip: 2, melee: true, ranged: true }, [
    skill('Outlaw.Tough', 'Cabra da Peste', 5,
      '**Uma vez por cena, em Crise**, use uma ação e gaste **1 Ponto de Fábula** para remover todas as suas condições e recuperar **【NP × 10】 PV**. Se gastar **1 Ponto de Ultima em vez de Fábula**, recupere também **【NP × 10】 PM**.'),
    skill('Outlaw.Leader', 'Líder de Bando', 1,
      'Ao liderar um teste em grupo, se ao menos um apoiador tiver um Laço com você, some as **duas maiores forças** desses Laços, em vez de somente a maior.'),
    skill('Outlaw.Wealth', 'Redistribuir Riquezas', 3,
      'No fim de um conflito em que um vilão foi reduzido a **0 PV**, receba **【1d6 × NP】 PI** para distribuir entre os PJs. Se o vilão tiver **mais de 1 Ponto de Ultima no fim do conflito**, roube 1 dele e anote na sua ficha. Você só pode guardar **1 Ponto de Ultima** por vez.'),
    skill('Outlaw.Hinterland', 'Sertanejo', 1,
      'Ao adquirir este poder, descreva sua conexão com uma região árida e desafiadora, distante da costa e dos costumes da civilização. Combine com o grupo o que significa ser sertanejo no seu mundo. Essa região conta como uma **segunda Origem**; ao evocá-la, você pode gastar **1 Ponto de Ultima no lugar de 1 Ponto de Fábula**.'),
    skill('Outlaw.Refuge', 'Valhacouto', 3,
      'No fim de um descanso, gaste **1 Ponto de Fábula** para seu bando trazer **【NP + 1】 Suprimentos**, que duram até o próximo uso deste poder. Durante um teste de Viagem, gaste 1 Suprimento para rolar o dado novamente. Também pode gastar 1 Suprimento para criar uma barraca mágica. Se gastar **1 Ponto de Ultima ao usar o poder**, receba **+2 Suprimentos**.'),
  ]),
  entry('Magic Knight', 'Cavaleiro Mágico', '48-51', { mp: 5, armor: true, shields: true }, [
    skill('MagicKnight.WoundedSoul', 'Alma Ferida', 5,
      '**Uma vez por cena, ao entrar em Crise**, crie Laços de **desconfiança** com até **【NP】 inimigos visíveis**. Duram até o fim da cena. Não apague Laços existentes: se ultrapassar o limite, escolha tantos Laços atuais quanto o excedente e suspenda-os até o fim da cena.'),
    skill('MagicKnight.BurningHeart', 'Coração Ardente', 3,
      'Enquanto estiver em uma **forma mágica**, ao evocar um Laço de **desconfiança, inferioridade e/ou ódio** num teste de Precisão ou Magia para causar dano, cause **【NP × 2】 de dano adicional** do mesmo tipo.'),
    skill('MagicKnight.HeartImpulse', 'Impulso do Coração', 1,
      'Reduza o custo de **Magitransformação** em PM pela quantidade de Laços com **admiração, lealdade e/ou afeto** que você possui. O custo mínimo é **20 PM**.'),
    skill('MagicKnight.Transformation', 'Magitransformação', 3,
      'A cada aquisição deste poder, crie uma nova **forma mágica**. Use uma ação e gaste **25 PM** para assumir uma das suas formas.\n\n**Criar uma forma:** combine 1 motivação, 1 aura e 2 focos. Depois, essas escolhas só podem mudar por poderes específicos. Registre as escolhas nas notas da ficha.\n\n**Motivação:** Afeto afeta cada aliado presente com quem você tem um Laço; Raiva afeta cada inimigo presente com quem você tem um Laço.\n**Auras (Afeto / Raiva):** Fraqueza: imunidade a fraco / fica fraco. Coragem: imunidade a abalado / fica abalado. Tolice: imunidade a atordoado / fica atordoado. Zelo: imunidade a lento / fica lento. Os efeitos de Afeto duram até o fim da cena ou enquanto os efeitos do foco durarem.\n\n**Focos:** escolha no máximo 1 arma e 1 armadura entre as opções dos dois focos. Os itens escolhidos substituem os equipados; se um item for pior que o atual, você pode manter o atual, mudando apenas o tipo de dano da arma, se necessário. Todos os ataques passam a causar o tipo de dano do foco. É permitido combinar aspectos dos focos, como arco curto com dano de gelo.\n**Ardente:** arma de fogo ou arco básico, armadura básica; fogo.\n**Brilhante:** espada básica, armadura marcial básica; luz.\n**Celeste:** arma arcana básica, armadura básica; ar.\n**Congelante:** arma de luta ou arremesso básica, armadura básica; gelo.\n**Eletrizante:** lança básica, armadura marcial básica; raio.\n**Rochoso:** arma pesada ou malho básico, armadura marcial básica; terra.\n**Sombrio:** adaga básica, armadura marcial básica; trevas.\n\nOs focos duram até o fim da cena, morte, inconsciência ou saída da forma. Pode encerrar a forma a qualquer momento; num conflito, somente no próprio turno, antes ou depois de uma ação.'),
    skill('MagicKnight.ImprovedTransformation', 'Transformação Aprimorada', 3,
      'A cada aquisição, escolha a arma ou armadura de uma das suas formas mágicas. No fim de cada descanso, para cada item escolhido, substitua sua característica ou acrescente uma caso não tenha, como num item raro (**Livro Básico, p. 266 em diante**). Exige aprovação do mestre e custo da característica de no máximo **【40 × seu nível】 zênites**.'),
  ]),
  entry('Soul Smith', 'Forjador de Almas', '52-55', { ip: 2 }, [
    skill('SoulSmith.Animate', 'Animar Arma', 4,
      'No seu turno, use uma ação e gaste **1 Ponto de Alma** para animar uma arma equipada, liberando os espaços de mão que ocupava. Ela flutua, perde **multi** e não pode receber essa propriedade. No fim de cada rodada, faz **um único ataque** com seu teste de Precisão, considerando **RA 0** para o dano. Dura **【NP】 rodadas** ou até animar outra arma.'),
    skill('SoulSmith.Collect', 'Coletar Almas', 5,
      'Colete Pontos de Alma de inimigos derrotados para fortalecer seus poderes. Seu limite é **【NP + 1】 Pontos de Alma**. Quando um inimigo chega a **0 PV em um conflito**, você pode aprisionar sua alma e receber **1 Ponto de Alma**.\n\n**Registre cada alma separadamente**, com as informações fornecidas pelo mestre: espécie da criatura; um Traço dela; um tipo de dano não físico ao qual ela tinha Resistência ou Absorção; e um de seus feitiços ofensivos, caso tivesse algum. Esses dados determinam os benefícios ao gastar a alma em Forjar Característica, Forjar Feitiço ou Manifestar Arma, descritos nesses poderes.'),
    skill('SoulSmith.Quality', 'Forjar Característica', 1,
      'Use a ação **Inventário** e gaste **10 PM ou 1 Ponto de Alma** para moldar uma característica de arma (**Livro Básico, p. 269**) em uma arma ao alcance. Custo máximo da característica: **【500 + seu nível × 40】 zênites**. Dura até o fim da cena; um item só pode ter **uma característica moldada** por vez.\n\n**Ao gastar uma alma**, a arma recebe também um benefício, pela mesma duração, conforme a espécie associada:\n**Construto:** reduza todo dano sofrido por você em 1, antes de aplicar Afinidades.\n**Demônio:** Resistência ao tipo de dano associado à alma.\n**Elemental:** o dano da arma do tipo associado à alma ignora Resistências e Imunidades.\n**Fera:** a arma causa +2 de dano.\n**Humanoide:** pode equipar essa arma mesmo que seja marcial e você não tenha a permissão correspondente.\n**Monstro:** testes de Precisão da arma também são críticos se ambos os dados mostrarem 5.\n**Morto-vivo:** ao causar dano com a arma, o alvo não pode recuperar PV até o fim do próximo turno dele.\n**Planta:** escolha imunidade a abalado ou atordoado. Não remove uma condição que já esteja sofrendo.'),
    skill('SoulSmith.Spell', 'Forjar Feitiço', 5,
      'A cada aquisição, escolha um **feitiço ofensivo de Elementalista** (**Livro Básico, p. 188-189**). Use **Inventário** e gaste **10 PM ou 1 Ponto de Alma** para infundir um desses feitiços em uma arma ao alcance. Até o fim da cena, um PJ equipado com a arma pode usar **Feitiço** para lançá-lo **uma única vez**, usando a fórmula de Precisão da arma no teste de Magia.\nAo gastar uma alma, você pode infundir o **feitiço ofensivo associado a ela**, em vez de um dos seus feitiços de Elementalista.'),
    skill('SoulSmith.Manifest', 'Manifestar Arma', 1,
      'No seu turno em um conflito, use **Equipamento** e gaste **10 PM ou 1 Ponto de Alma** para manifestar uma arma básica, destruindo qualquer arma anteriormente manifestada assim. Pode equipá-la imediatamente se tiver mãos livres. Pode trocar um atributo do teste de Precisão dessa arma por **VON** (por exemplo, VON + DES num arco curto).\nAo gastar uma alma, a arma passa a causar o **tipo de dano associado**, que não pode ser alterado. Também pode evocar o **Traço associado à alma uma vez por cena**, como se fosse um dos seus Traços.'),
  ]),
  entry('Crimson Blade', 'Lâmina Carmesim', '56-57', { hp: 5, melee: true, shields: true }, [
    skill('CrimsonBlade.Arsenal', 'Arsenal Vermelho', 1,
      'Use uma ação e gaste **5 PV** para cobrir uma arma corpo a corpo equipada com seu sangue até o fim da cena. A arma dispara cortes de sangue que podem atingir alvos normalmente fora do alcance corpo a corpo. Um alvo voador atingido é imediatamente forçado a pousar.\n**Em Crise**, não gaste PV e pode fazer **um ataque livre** como parte da mesma ação.'),
    skill('CrimsonBlade.Bloodbend', 'Dobrar Sangue', 1,
      'Use uma ação e gaste **20 PM** para escolher um ataque básico ou feitiço conhecido de um inimigo visível. Faça um teste oposto de **【VON + VIG】** contra ele. Se vencer, ele deve usar a ação escolhida no próximo turno dele, contra um alvo escolhido por você.'),
    skill('CrimsonBlade.Shield', 'Escudo Escarlate', 2,
      'Enquanto estiver **em Crise**, sua **Defesa e Defesa Mágica** aumentam em **【NP】**.'),
    skill('CrimsonBlade.Frenzy', 'Frenesi Sanguinolento', 4,
      'Ao conseguir um **sucesso crítico em um ataque corpo a corpo**, pode gastar a oportunidade gerada para recuperar **【NP × 10】 PV**.'),
    skill('CrimsonBlade.Hemophagy', 'Hemofagia', 5,
      '**Uma vez por rodada**, quando outra criatura fizer você perder PV, pode gastar **10 PV** para fazer um **ataque livre contra ela**, depois da resolução da ação dela. Se acertar, substitua o dano da arma por **【NP + RA do teste de Precisão】 de dano físico**.'),
  ]),
  entry('Trickster', 'Malandro', '58-59', { ip: 2, ranged: true }, [
    skill('Trickster.Deceive', 'Engabelar', 3,
      '**Uma vez por cena**, quando um aliado ou inimigo visível fizer um teste, gaste **10 PM** para fazer o mesmo teste com **bônus ou penalidade de 【NP】**, à sua escolha. Pode trocar seu resultado com o dele. Até o fim da cena, pode usar o resultado trocado como a rolagem de um dos seus testes.'),
    skill('Trickster.Weakness', 'Explorar Fraqueza', 1,
      'No começo do seu turno, pode gastar **10 PM** para usar **Estudo sem custo de ação**, antes ou depois da sua ação. Use **【AST + DES】** no teste aberto.'),
    skill('Trickster.JuryRig', 'Gambiarra', 4,
      '**Uma vez por cena**, use **Inventário** e gaste até **【NP × 2】 PI** para modificar uma arma equipada com os materiais disponíveis. Para cada **2 PI**, escolha: **+1 em Precisão**, **+2 de dano**, **+1 em testes de Objetivo** ou **ataques da arma causam dano de veneno**. As modificações duram até o fim da cena, quando se quebram.'),
    skill('Trickster.Opportunist', 'Golpe Aproveitador', 3,
      'Ao atacar **uma única criatura que sofra ao menos uma condição**, pode trocar um atributo de Precisão da arma por **DES** e recebe **+【NP】 no teste de Precisão**.'),
    skill('Trickster.Knack', 'Jeitinho', 2,
      'Quando um aliado passar em um teste para preencher ou apagar seções de um relógio, pode gastar até **【NP × 20】 PM**. Preencha ou apague **1 seção por 20 PM gastos**. Você não pode fazer testes para influenciar esse relógio até o fim do seu próximo turno.'),
  ]),
];
