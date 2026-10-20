import { useState } from "react";
import {
  Card,
  IconButton,
  InputAdornment,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import CopyToClipboard from "react-copy-to-clipboard";
import { Close, ContentCopy } from "@mui/icons-material";
import { useTranslate } from "../../translation/translate";
import { remoteEnabled } from '../../firebase';

export default function ShareLink({ scope }) {
  const { t } = useTranslate();
  const url = window.location.href.split('#')[0] + "#/roller/" + scope;

  const [snackBarOpen, setSnackbarOpen] = useState(false);

  const snackBarClose = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }

    setSnackbarOpen(false);
  };

  return (
    <Card sx={{ p: 2, width: "100%", margin: "0 auto" }}>
      <Typography sx={{ mb: 1 }}>
        {t(remoteEnabled ? "Share this url to other players to see rolls:" : 'Rolagens locais: este endereço não compartilha resultados com outros dispositivos. O compartilhamento exige Firebase configurado.')}
      </Typography>
      <TextField
        fullWidth
        size="small"
        value={url}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <CopyToClipboard
                text={url}
                onCopy={() => {
                  setSnackbarOpen(true);
                }}
                title={t("Copy")}
              >
                <IconButton>
                  <ContentCopy />
                </IconButton>
              </CopyToClipboard>
            </InputAdornment>
          ),
        }}
      />
      <Snackbar
        open={snackBarOpen}
        autoHideDuration={5000}
        onClose={snackBarClose}
        message={t("Copied to Clipboard")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        action={
          <IconButton
            size="small"
            aria-label="close"
            color="inherit"
            onClick={snackBarClose}
          >
            <Close />
          </IconButton>
        }
      />
    </Card>
  );
}
