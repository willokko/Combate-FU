const editors = new Set(), listeners = new Set();
export const hasUnsavedEdits = () => editors.size > 0;
export function setEditorDirty(editor, dirty) {
  const before = hasUnsavedEdits();
  if (dirty) editors.add(editor); else editors.delete(editor);
  if (before !== hasUnsavedEdits()) listeners.forEach(listener => listener());
}
export function subscribeEditing(listener) { listeners.add(listener); return () => listeners.delete(listener); }
