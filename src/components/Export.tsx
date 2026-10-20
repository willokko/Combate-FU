import { useState } from "react";
import useDownloadJSON from "../hooks/useDownloadJSON";
import { Code } from "@mui/icons-material";
import { Tooltip, IconButton, Menu, MenuItem, Snackbar } from "@mui/material";
import { useTranslate } from "../translation/translate";
import { safeDatabase } from '../data/localStore';
import { remoteEnabled } from '../firebase';

type Props = {
  name?: string;
  dataType: string;
  data?: any;
};

enum ExportAction {
  FILE,
  CLIPBOARD,
}

function Export({ name = "", dataType, data = {} }: Props) {
  const { t } = useTranslate();
  const exportData = { ...data, dataType };
  if (!remoteEnabled && ['pc', 'npc'].includes(dataType)) {
    const original = safeDatabase().collections[dataType === 'pc' ? 'player-personal' : 'npc-personal']?.[data.id];
    if (original) for (const key of ['id', 'uid']) {
      if (original[key] === undefined) delete exportData[key]; else exportData[key] = original[key];
    }
  }
  const [downloadJSON, copyToClipboard] = useDownloadJSON(name, exportData);

  const [isSnackbarOpen, setIsSnackbarOpen] = useState(false);
  const [exportAnchor, setExportAnchor] = useState(null);
  const isExportMenuOpen = Boolean(exportAnchor);

  function handleOpenExportMenu(event) {
    setExportAnchor(event.currentTarget);
  }

  function handleCloseExportMenu() {
    setExportAnchor(null);
  }

  function handleSnackbarOpen() {
    setIsSnackbarOpen(true);
  }

  function handleSnackbarClose() {
    setIsSnackbarOpen(false);
  }

  function exportJSON(action: ExportAction) {
    switch (action) {
      case ExportAction.FILE:
        downloadJSON();
        break;
      case ExportAction.CLIPBOARD:
        copyToClipboard();
        handleSnackbarOpen();
        break;
      default:
        break;
    }
    handleCloseExportMenu();
  }

  return (
    <>
      <Tooltip title={t("Export")}>
        <IconButton onClick={handleOpenExportMenu}>
          <Code />
        </IconButton>
      </Tooltip>

      {/* Menu component shows a modal in the whole screen. Can't rely on mouseover or mouseleave events */}
      <Menu
        anchorEl={exportAnchor}
        open={isExportMenuOpen}
        onClose={handleCloseExportMenu}
      >
        <MenuItem
          onClick={() => {
            exportJSON(ExportAction.FILE);
          }}
        >
          {t("export_json_file")}
        </MenuItem>
        <MenuItem
          onClick={() => {
            exportJSON(ExportAction.CLIPBOARD);
          }}
        >
          {t("copy_json_clipboard")}
        </MenuItem>
      </Menu>
      <Snackbar
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        open={isSnackbarOpen}
        autoHideDuration={2000}
        onClose={handleSnackbarClose}
        message={t("Copied to Clipboard!")}
      />
    </>
  );
}

export default Export;
