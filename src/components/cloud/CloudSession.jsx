import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { auth, cloudEnabled, googleAuthProvider } from '../../firebase.js';
import { acknowledgeCloud, acceptCloudDatabase, getAccountScope, readDatabase, setAccountScope, subscribe, STORE_KEY } from '../../data/localStore.js';
import { createCloudSync } from '../../data/cloudProtocol.js';
import { createFirestoreCloud } from '../../data/cloudFirestore.js';
import { hasUnsavedEdits, subscribeEditing } from '../../data/cloudEditing.js';
import { useTranslate } from '../../translation/translate';

const CloudContext = createContext({ enabled: false, user: null, state: 'local', error: '', engine: null });
export const useCloudSession = () => useContext(CloudContext);
export function cloudError(error) {
  const messages = {
    'auth/unauthorized-domain': 'Autorize este domínio em Firebase → Authentication → Configurações → Domínios autorizados.',
    'auth/popup-blocked': 'O navegador bloqueou o login. Permita pop-ups para este site e tente novamente.',
    'auth/popup-closed-by-user': 'A janela de login foi fechada. Seus dados locais foram mantidos.',
    'auth/cancelled-popup-request': 'Já existe uma janela de login aberta.',
    'auth/network-request-failed': 'Não foi possível conectar ao Google. Confira sua conexão.',
    'auth/operation-not-supported-in-this-environment': 'Abra o site em um navegador como Chrome, Edge ou Firefox para entrar com Google.',
    'permission-denied': 'O Firebase recusou o acesso. Publique as regras firestore.rules no projeto combate-fu e tente sincronizar novamente.',
    'resource-exhausted': 'A cota gratuita do Firebase foi atingida. As alterações permanecem neste dispositivo; tente novamente após a renovação da cota.',
    'unavailable': 'A nuvem está indisponível. As alterações permanecem neste dispositivo; tente sincronizar quando a conexão voltar.',
    'failed-precondition': 'Confira se o Firestore foi criado no banco padrão (default), no modo nativo, e se terminou a ativação.',
  };
  return messages[error?.code] || error?.message || (typeof error === 'string' ? error : '');
}
export default function CloudSession({ children }) {
  const [session, setSession] = useState({ enabled: cloudEnabled, user: null, state: 'local', error: '', engine: null });
  const [ready, setReady] = useState(!cloudEnabled);
  const [scope, setScope] = useState('local');
  useEffect(() => {
    if (!cloudEnabled) return;
    let engine, active = true;
    const unsubscribe = onAuthStateChanged(auth, user => {
      engine?.stop(); engine = null;
      setAccountScope(user?.uid);
      const profile = user?.uid || 'local'; setScope(profile);
      setSession({ enabled: true, user, state: user ? 'loading' : 'local', error: '', engine: null });
      if (user) {
        const uid = user.uid;
        const profileKey = STORE_KEY;
        engine = createCloudSync({
          remote: createFirestoreCloud(uid),
          local: {
            read: () => readDatabase(), subscribe, isEditing: hasUnsavedEdits,
            accept: acceptCloudDatabase, acknowledge: acknowledgeCloud,
            preserveConflict(database) {
              // Do not overwrite an earlier conflict backup.
              localStorage.setItem(`${profileKey}:conflict:${crypto.randomUUID()}`, JSON.stringify(database));
            },
          },
          status: status => { if (active && getAccountScope() === uid) setSession(current => ({ ...current, ...status, error: cloudError({ code: status.code, message: status.error }) })); },
        });
        setSession(current => ({ ...current, engine }));
      }
      setReady(true);
    }, error => { setSession(current => ({ ...current, error: cloudError(error) })); setReady(true); });
    const reconnect = () => { void engine?.sync(); };
    const unsubscribeEditing = subscribeEditing(reconnect);
    window.addEventListener('online', reconnect);
    return () => { active = false; engine?.stop(); unsubscribe(); unsubscribeEditing(); window.removeEventListener('online', reconnect); };
  }, []);
  if (!ready) return <Box role="status" sx={{ p: 4 }}><CircularProgress size={24} /> Verificando sessão…</Box>;
  return <CloudContext.Provider value={session}><React.Fragment key={scope}>{children}</React.Fragment></CloudContext.Provider>;
}

export function CloudAccount() {
  const session = useCloudSession();
  const { t } = useTranslate();
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  if (!session.enabled) return null;
  const login = async () => {
    if (hasUnsavedEdits()) { setError('Salve ou descarte a edição aberta antes de trocar de biblioteca.'); return; }
    setBusy(true); setError('');
    try {
      googleAuthProvider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error) { setError(cloudError(error)); }
    finally { setBusy(false); }
  };
  const logout = async () => {
    if (hasUnsavedEdits()) { setError('Salve ou descarte a edição aberta antes de trocar de biblioteca.'); return; }
    setBusy(true); setError('');
    try { await signOut(auth); } catch (error) { setError(cloudError(error)); }
    finally { setBusy(false); }
  };
  const labels = {
    local: 'Biblioteca local · sem sincronização', loading: 'Conectando à nuvem…', syncing: 'Sincronizando…',
    synced: 'Salvo na nuvem', pending: 'Alterações neste dispositivo · envio pendente',
    conflict: 'Conflito entre dispositivos', error: 'Alterações locais preservadas · confira a sincronização',
    editing: 'Edição aberta · salve ou descarte a ficha para sincronizar',
  };
  return <Stack spacing={1} sx={{ my: 1 }}>
    <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
      <Typography variant="body2" role="status">{session.user ? `${session.user.email || session.user.displayName} · ` : ''}{t(labels[session.state])}</Typography>
      {session.user ? <><Button size="small" onClick={() => session.engine?.sync()} disabled={session.state === 'syncing'}>{t('Sincronizar agora')}</Button><Button size="small" onClick={logout} disabled={busy}>{t('Sair da conta')}</Button></> : <Button variant="outlined" size="small" onClick={login} disabled={busy}>{t('Entrar com Google')}</Button>}
    </Stack>
    {(error || session.error) && <Alert severity="warning">{t(error || session.error)}</Alert>}
    {session.state === 'conflict' && <Alert severity="warning">
      {t('A biblioteca foi alterada em outro dispositivo. A escolha vale para a biblioteca e os encontros completos. Ambas as versões serão guardadas neste navegador antes da substituição.')}
      <Stack direction="row" gap={1} flexWrap="wrap"><Button onClick={() => session.engine?.resolve('remote')}>{t('Usar versão da nuvem')}</Button><Button onClick={() => session.engine?.resolve('local')}>{t('Enviar versão deste dispositivo')}</Button></Stack>
    </Alert>}
  </Stack>;
}
