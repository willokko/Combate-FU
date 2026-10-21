# Login Google e sincronização privada

O site continua no GitHub Pages. Firebase Authentication faz o login e Cloud Firestore guarda os dados. O novo gerenciador e os editores mantêm o armazenamento local como cache; não é preciso manter um servidor próprio, ativar Analytics, Cloud Functions ou Cloud Storage.

## Configuração pelo proprietário

Projeto configurado: **combate-fu**. Site: **https://willokko.github.io/Combate-FU/**.

1. No Firebase Console do projeto **combate-fu**, confirme **Authentication → Método de login → Google** habilitado, com e-mail de suporte.
2. Em **Authentication → Configurações → Domínios autorizados**, adicione **willokko.github.io**, **localhost** e **127.0.0.1**. Os campos recebem somente os domínios, sem protocolo, porta ou `/Combate-FU/`.
3. Crie o **Cloud Firestore padrão `(default)`**, modo nativo, edição Standard. Em **Firestore Database → Regras**, substitua o conteúdo pelo arquivo **firestore.rules** deste repositório e clique em **Publicar**. Não use regras públicas ou modo de teste.
4. A configuração pública Web fornecida já está em **src/config/firebase.public.js**. Ela não é uma credencial administrativa. O SDK já está instalado; não copie o exemplo com Analytics do console.
5. Faça commit e push para `main` quando quiser publicar o código. O workflow existente de Pages inclui a configuração pública e mantém `VITE_DATA_MODE=local`, que agora pode ter sincronização opcional. Login e nuvem não exigem ativar o backend remoto original.

Alternativa ao console, se você usa o Firebase CLI autenticado:

```sh
npx firebase-tools@14 login
npx firebase-tools@14 deploy --only firestore:rules,firestore:indexes --project combate-fu
```

O `--project combate-fu` é obrigatório nesses exemplos: o `.firebaserc` original continua apontando para o projeto original, cujas integrações foram preservadas. O deploy acima publica regras e a exclusão de índices dos fragmentos; **não muda o GitHub Pages**. A exclusão de índices de `chunks.data` em `firestore.indexes.json` é recomendada; a sincronização usa acesso direto por documento e funciona sem consultas indexadas.

Permaneça no plano **Spark** para uso sem faturamento. Quotas de Authentication, leituras, gravações e armazenamento se aplicam ao projeto inteiro. Cada sincronização envia uma versão compactada por deduplicação de imagens, em fragmentos, mais um documento de controle; não envia uma gravação a cada tecla. Não há promessa de serviço gratuito ilimitado. Consulte https://firebase.google.com/pricing e https://firebase.google.com/docs/firestore/quotas.

## Uso no aplicativo

- **Sem login:** a biblioteca local e os encontros antigos continuam no mesmo navegador, no mesmo endereço/base, como antes.
- **Entrar com Google:** abre uma biblioteca privada da conta, com seu próprio cache neste navegador. Nenhum dado local é enviado automaticamente à primeira conta que entrar.
- Para migrar, abra **Biblioteca local e backups → Importar dados locais para esta conta**. Confira o aviso e confirme. A operação usa a restauração existente: mescla fichas e cria cópias independentes dos encontros, preservando os dados locais originais. Readicione personagens da biblioteca se desejar novos vínculos nos encontros migrados.
- Ao salvar uma ficha ou alterar um encontro, a gravação local ocorre primeiro. Após aproximadamente 2,5 segundos sem novas alterações, começa o envio. Aguarde **Salvo na nuvem** antes de fechar o navegador ou trocar de dispositivo. **Sincronizar agora** antecipa o envio.
- Alterações feitas offline permanecem no cache desta conta. Ao recuperar a conexão, o envio é tentado novamente. Se a tentativa falhar, o aviso continua e você pode usar **Sincronizar agora**. Não há envio garantido com a aba fechada.
- Um segundo dispositivo na mesma conta recebe a versão confirmada no servidor. Downloads aguardam salvar ou descartar formulários abertos. A sincronização considera a biblioteca e os encontros completos; não é colaboração simultânea com fusão automática por campo.
- Se houver alterações concorrentes, escolha **Usar versão da nuvem** ou **Enviar versão deste dispositivo**. Ambas as versões são preservadas antes da substituição. Em **Biblioteca local e backups**, os botões **Baixar cópia preservada** permitem recuperá-las como backups. A escolha pode ser recusada novamente se outro dispositivo salvar durante a decisão.
- **Sair da conta** volta à biblioteca local original. O cache da conta continua neste navegador para recuperação offline; em computador compartilhado, faça logout e use os controles do navegador para apagar os dados do site quando terminar. Não apague os dados do navegador enquanto houver envio pendente sem exportar backup.

Use **Baixar backup da biblioteca e encontros** regularmente. Fichas e encontros exportados mantêm o formato anterior, inclusive imagens incorporadas.

## Segurança e formato interno

Cada UID usa exclusivamente `users/{uid}/sync/head` e `users/{uid}/snapshots/{generation}/chunks/{index}`. As regras verificam `request.auth.uid == uid` e negam todos os outros caminhos. Fragmentos são criados de forma imutável. A troca do ponteiro de versão usa uma transação e compara a versão de origem, impedindo que uma versão antiga sobrescreva silenciosamente uma nova.

O formato interno é versionado, com até 32 fragmentos de 180.000 caracteres e limite adicional de 8 MiB por envio. O limite de armazenamento local pode ser atingido antes disso. A deduplicação de imagens evita copiar o mesmo retrato em todas as entradas do histórico. No servidor, são mantidas a versão atual e a anterior; versões mais antigas são removidas após o commit da nova versão. Uma falha interrompida antes da troca do ponteiro pode deixar fragmentos órfãos; eles nunca passam a ser a biblioteca ativa e podem ser removidos administrativamente no console.

Não são publicados e-mails, fichas ou retratos como conteúdo público do Pages. Nunca inclua conta de serviço, chave privada ou senha em arquivos `VITE_*` ou na configuração Web. Esta integração não dá acesso à biblioteca da conta no domínio original do Fultimator. Outros provedores de login, compartilhamento de fichas entre contas e o simulador remoto antigo não foram ativados por esta alteração.

Para desabilitar a integração, configure `VITE_ENABLE_CLOUD=false` no build. O modo antigo `VITE_DATA_MODE=remote` continua separado: não use esse modo para ativar a nova sincronização.

## Verificação

`npm test` inclui os testes de isolamento por conta, persistência offline, fragmentação e Unicode, sincronização entre clientes simulados, conflitos, alterações durante envio/download, proteção de formulários e cancelamento ao trocar de conta, além dos testes anteriores.

As regras têm testes contra o emulador do Firestore, sem acessar o projeto real:

```sh
npx firebase-tools@14 emulators:exec --only firestore --project demo-combate-fu "node --test tests/firebaseRules.emulator.mjs"
```

Requer Node 22 e Java 21. O workflow **Validar regras privadas do Firestore** roda esse comando no GitHub Actions. Login real, domínios autorizados e regras publicadas precisam ser verificados no projeto do proprietário. Um build e testes locais não confirmam que essa configuração externa foi publicada.

Nesta alteração foram executados os testes de unidade e os quatro testes do emulador: isolamento entre contas e anônimo, imutabilidade dos fragmentos, recusa de versões/caminhos inválidos e publicação/recuperação/conflito pelo adaptador real. No Windows desta máquina, foi necessário apontar a propriedade Java `jdk.net.unixdomain.tmpdir` para uma pasta temporária sem acentos para o emulador iniciar. Isso não afeta o site ou o Firebase em produção.

Fontes técnicas: https://firebase.google.com/docs/auth/web/google-signin, https://firebase.google.com/docs/firestore/manage-data/transactions e https://firebase.google.com/docs/firestore/security/rules-conditions.
