import { Button } from "@mui/material";
import { auth, googleAuthProvider, remoteEnabled } from "../firebase";

import { signInWithPopup } from "@firebase/auth";

export function SignIn() {
  if (!remoteEnabled) return <span>Modo local: não é necessário entrar em uma conta.</span>;
  const signInWithGoogle = () => {
    signInWithPopup(auth, googleAuthProvider);
  };

  return (
    <Button variant="contained" onClick={signInWithGoogle}>
      Sign in with Google
    </Button>
  );
}
