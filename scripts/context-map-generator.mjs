import fs from 'fs';
import path from 'path';

const workspaceRoot = process.cwd();
const contextMapPath = path.join(workspaceRoot, 'docs', 'context_map.md');

const mapContent = `# Context Minimization Map

This map defines the absolute minimal context targets for future AI sessions. To conserve token counts and maintain model attention, future sessions must restrict file reads to the specified directories and files.

---

## 1. Context Scopes per Feature Area

### If working on OTA Updates:
- **Read only**:
  - [ota_updater.md](file:///${workspaceRoot.replace(/\\/g, '/')}/docs/ota_updater.md)
  - [knowledge/ota/state-machine.md](file:///${workspaceRoot.replace(/\\/g, '/')}/knowledge/ota/state-machine.md)
  - [knowledge/ota/rollback.md](file:///${workspaceRoot.replace(/\\/g, '/')}/knowledge/ota/rollback.md)
  - [knowledge/updater/packageinstaller.md](file:///${workspaceRoot.replace(/\\/g, '/')}/knowledge/updater/packageinstaller.md)
- **Inspect directory**:
  - \`packages/livex-core/src/lib/updater/\`

### If working on Firebase & Sync Backend:
- **Read only**:
  - [firebase.md](file:///${workspaceRoot.replace(/\\/g, '/')}/docs/firebase.md)
  - [supabase.md](file:///${workspaceRoot.replace(/\\/g, '/')}/docs/supabase.md)
  - [knowledge/firebase/client.md](file:///${workspaceRoot.replace(/\\/g, '/')}/knowledge/firebase/client.md)
  - [knowledge/firebase/security.md](file:///${workspaceRoot.replace(/\\/g, '/')}/knowledge/firebase/security.md)
- **Inspect directory**:
  - \`packages/livex-core/src/lib/syncBackends/\`

### If working on Android UI & Safe Areas:
- **Read only**:
  - [android.md](file:///${workspaceRoot.replace(/\\/g, '/')}/docs/android.md)
  - [knowledge/android/safe-area.md](file:///${workspaceRoot.replace(/\\/g, '/')}/knowledge/android/safe-area.md)
  - [knowledge/android/capacitor.md](file:///${workspaceRoot.replace(/\\/g, '/')}/knowledge/android/capacitor.md)
- **Inspect directory**:
  - \`packages/ui-android/src/\`

### If working on Stagex Backend integration:
- **Read only**:
  - [architecture.md](file:///${workspaceRoot.replace(/\\/g, '/')}/docs/architecture.md)
  - [knowledge/architecture/monorepo.md](file:///${workspaceRoot.replace(/\\/g, '/')}/knowledge/architecture/monorepo.md)
- **Inspect directory**:
  - \`lib/api-client-react/\`

### If working on Chordex Practice suite logic:
- **Read only**:
  - [engineering_guide.md](file:///${workspaceRoot.replace(/\\/g, '/')}/docs/engineering_guide.md)
  - [knowledge/react/hooks.md](file:///${workspaceRoot.replace(/\\/g, '/')}/knowledge/react/hooks.md)
- **Inspect directory**:
  - \`packages/livex-core/src/store/\`

### If Debugging WebView or Database states:
- **Read only**:
  - [debugging.md](file:///${workspaceRoot.replace(/\\/g, '/')}/docs/debugging.md)
  - [knowledge/debugging/webview.md](file:///${workspaceRoot.replace(/\\/g, '/')}/knowledge/debugging/webview.md)
  - [knowledge/debugging/diagnostics-ui.md](file:///${workspaceRoot.replace(/\\/g, '/')}/knowledge/debugging/diagnostics-ui.md)
- **Inspect file**:
  - \`packages/ui-shared/src/components/DevToolsDashboard.tsx\`

### If Releasing packages or updating CI:
- **Read only**:
  - [release_process.md](file:///${workspaceRoot.replace(/\\/g, '/')}/docs/release_process.md)
  - [knowledge/android/build.md](file:///${workspaceRoot.replace(/\\/g, '/')}/knowledge/android/build.md)
  - [knowledge/updater/keystore.md](file:///${workspaceRoot.replace(/\\/g, '/')}/knowledge/updater/keystore.md)
- **Inspect directory**:
  - \`.github/workflows/\`

Source:
* \`docs/ai_workflow.md\`
`;

fs.writeFileSync(contextMapPath, mapContent, 'utf8');
console.log(`Context Minimization Map successfully generated: ${contextMapPath}`);
