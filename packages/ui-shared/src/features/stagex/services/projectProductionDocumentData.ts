import {
  useStagexStore,
  type GearItem,
  type SetlistSong,
  type BandMember,
} from '../state/useStagexStore';
import { StageBridge } from './StageBridgeService';

export interface ProductionDocumentChannel {
  ch: string;
  source: string;
  performer: string;
  mic: string;
  phantom: boolean;
  notes: string;
}

export interface ProductionDocumentMember extends BandMember {
  assignedElements: string[];
}

export interface ProductionDocumentSectionsConfig {
  stagePlot: boolean;
  inputPatch: boolean;
  technicalRequirements: boolean;
  technicalNotes: boolean;
  setlist: boolean;
  gear: boolean;
  bandCrew: boolean;
}

export const DEFAULT_PRODUCTION_DOCUMENT_SECTIONS: ProductionDocumentSectionsConfig = {
  stagePlot: true,
  inputPatch: true,
  technicalRequirements: true,
  technicalNotes: true,
  setlist: true,
  gear: true,
  bandCrew: true,
};

export interface ProductionDocumentData {
  // Document Identity
  projectName: string;
  sceneName: string;
  sceneIdx: number;
  totalScenes: number;
  date: string;
  time: string;
  documentId: string;
  isSquare: boolean;
  stageDimensions: string;

  // Logistics / Venue / Contacts
  venue?: string;
  contactName?: string;
  contactPhone?: string;
  notes: string;

  // Technical Requirements (Rider)
  requirements: {
    foh: string[];
    monitor: string[];
    power: string[];
    hospitality: string[];
    custom: string[];
  };
  totalRequirementsCount: number;

  // Stage Plot Elements & Connections
  elements: any[];
  connections: any[];
  refW: number;
  refH: number;

  // Input Channels & Patch
  channels: ProductionDocumentChannel[];

  // Setlist
  setlist: SetlistSong[];
  totalSetlistMinutes: number;
  totalSetlistDurationFormatted: string;

  // Gear Inventory
  gear: GearItem[];
  totalGearItems: number;
  totalGearUnits: number;
  packedGearUnits: number;
  remainingGearUnits: number;

  // Band & Crew
  members: ProductionDocumentMember[];
  totalMembers: number;
  assignedMembersCount: number;
  unassignedMembersCount: number;

  // Preferences projection
  showElementNames?: boolean;
}

/**
 * Pure projection function extracting all relevant Setup & Stage state
 * into a single unified Production Document contract.
 */
export function projectProductionDocumentData(
  state?: ReturnType<typeof useStagexStore.getState>,
  targetSceneIdx?: 'current' | 'all' | number
): ProductionDocumentData {
  const store = state || useStagexStore.getState();

  // Check live iframe state if available for real-time canvas accuracy
  const liveWin = StageBridge.getWin();
  const liveState = liveWin?.state;

  // Ensure live scene in iframe is flushed if available
  try {
    if (liveWin && typeof (liveWin as any)._persistCurrentScene === 'function') {
      (liveWin as any)._persistCurrentScene();
    }
  } catch (_) {}

  const activeScenes =
    liveState?.scenes && liveState.scenes.length > 0
      ? liveState.scenes
      : store.scenes && store.scenes.length > 0
        ? store.scenes
        : [{ name: 'Main Stage', elements: store.elements || [] }];

  let selectedIdx = 0;
  if (
    typeof targetSceneIdx === 'number' &&
    targetSceneIdx >= 0 &&
    targetSceneIdx < activeScenes.length
  ) {
    selectedIdx = targetSceneIdx;
  } else if (typeof liveState?.currentSceneIdx === 'number') {
    selectedIdx = liveState.currentSceneIdx;
  } else if (typeof store.currentSceneIdx === 'number') {
    selectedIdx = store.currentSceneIdx;
  }

  const currentScene = activeScenes[selectedIdx] || activeScenes[0] || { name: 'Main Stage' };
  const sceneName = currentScene.name || `Scene ${selectedIdx + 1}`;

  // Stage Elements for this scene — robust cascade across live iframe, scene, store, and localStorage
  let currentElements: any[] = [];
  if (
    Array.isArray(liveState?.elements) &&
    liveState.elements.length > 0 &&
    (liveState.currentSceneIdx === selectedIdx || selectedIdx === 0)
  ) {
    currentElements = liveState.elements;
  } else if (
    currentScene &&
    Array.isArray(currentScene.elements) &&
    currentScene.elements.length > 0
  ) {
    currentElements = currentScene.elements;
  } else if (Array.isArray(store.elements) && store.elements.length > 0) {
    currentElements = store.elements;
  } else {
    // Check localStorage fallback
    try {
      const raw =
        typeof localStorage !== 'undefined' ? localStorage.getItem('stagecoreProject') : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        const sc = Array.isArray(parsed.scenes) ? parsed.scenes[selectedIdx] : null;
        currentElements =
          sc && Array.isArray(sc.elements) && sc.elements.length > 0
            ? sc.elements
            : Array.isArray(parsed.elements)
              ? parsed.elements
              : [];
      }
    } catch (_) {}
  }

  // If still empty but liveState or store has elements in any scene, retrieve them
  if (currentElements.length === 0) {
    if (Array.isArray(liveState?.elements) && liveState.elements.length > 0) {
      currentElements = liveState.elements;
    } else if (Array.isArray(store.elements) && store.elements.length > 0) {
      currentElements = store.elements;
    }
  }

  // Connections
  let currentConnections: any[] = [];
  if (liveState?.connections && (liveState.currentSceneIdx === selectedIdx || selectedIdx === 0)) {
    currentConnections = liveState.connections;
  } else if (currentScene && Array.isArray(currentScene.connections)) {
    currentConnections = currentScene.connections;
  } else {
    try {
      const raw =
        typeof localStorage !== 'undefined' ? localStorage.getItem('stagecoreProject') : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        const sc = Array.isArray(parsed.scenes) ? parsed.scenes[selectedIdx] : null;
        currentConnections = (sc && sc.connections) || parsed.connections || [];
      }
    } catch (_) {}
  }

  // Canvas Dimensions
  const isSquare = store.preferences?.stageShape === 'square';
  const stageDimensions = isSquare ? "28' × 28'" : "32' × 18'";
  const refW =
    liveState?.canvasW && liveState.canvasW > 0 ? liveState.canvasW : isSquare ? 800 : 800;
  const refH =
    liveState?.canvasH && liveState.canvasH > 0 ? liveState.canvasH : isSquare ? 800 : 450;

  // Formatted Timestamps
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
  const timeFormatted = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  // Technical Requirements (Rider)
  const reqs = {
    foh: [] as string[],
    monitor: [] as string[],
    power: [] as string[],
    hospitality: [] as string[],
    custom: [] as string[],
  };

  const needs = store.riderNeeds || [];
  needs.forEach((n) => {
    const t = n.type || 'custom';
    if (reqs[t]) {
      reqs[t].push(n.value);
    } else {
      reqs.custom.push(n.value);
    }
  });

  const totalRequirementsCount =
    reqs.foh.length +
    reqs.monitor.length +
    reqs.power.length +
    reqs.hospitality.length +
    reqs.custom.length;

  // Production Logistics
  const riderConfig = store.riderConfig || {};
  const notes = (riderConfig.notes && riderConfig.notes.trim()) || '';

  // Band & Crew with assigned elements
  const members: ProductionDocumentMember[] = (store.members || []).map((m) => {
    const assigned = currentElements
      .filter((el) => el.memberId === m.id)
      .map((el) => el.label || el.name || el.type || 'Stage Element');
    return {
      ...m,
      assignedElements: assigned,
    };
  });

  const assignedMembersCount = members.filter((m) => m.assignedElements.length > 0).length;
  const unassignedMembersCount = Math.max(0, members.length - assignedMembersCount);

  // Channels / Patch List
  // Priority: If currentElements exist on stage, map them 1:1 to channels matching stage elements exactly.
  // Enrich from store.riderChannels if available.
  let channels: ProductionDocumentChannel[] = [];
  if (currentElements.length > 0) {
    channels = currentElements.map((el, idx) => {
      const labelStr = (el.label || el.name || '').toLowerCase();
      const chIdStr = el.channelId ? String(el.channelId).replace(/^CH-?/i, '') : String(idx + 1);

      // Check if store.riderChannels has a match
      const riderCh = (store.riderChannels || []).find(
        (rc) => String(rc.ch) === chIdStr || rc.source?.toLowerCase() === labelStr
      );

      const assignedMember = members.find((m) => m.id === el.memberId);
      const performerName =
        assignedMember?.name ||
        (el.performer && el.performer.trim()) ||
        (riderCh?.performer && riderCh.performer.trim()) ||
        '';

      const mic =
        (riderCh?.mic && riderCh.mic.trim()) ||
        (el.transducer && el.transducer.trim()) ||
        (el.mic && el.mic.trim()) ||
        '';

      const isPhantom = riderCh !== undefined ? Boolean(riderCh.phantom) : Boolean(el.phantom);

      const chNotes =
        (riderCh?.notes && riderCh.notes.trim()) ||
        (el.notes && el.notes.trim()) ||
        (el.mix && el.mix.trim()) ||
        '';

      return {
        ch: chIdStr.padStart(2, '0'),
        source: (riderCh?.source || el.label || el.name || `Input ${idx + 1}`).toUpperCase(),
        performer: performerName,
        mic,
        phantom: isPhantom,
        notes: chNotes,
      };
    });
  } else if (store.riderChannels && store.riderChannels.length > 0) {
    channels = store.riderChannels.map((c, idx) => ({
      ch: String(c.ch || idx + 1).padStart(2, '0'),
      source: (c.source || `Channel ${idx + 1}`).toUpperCase(),
      performer: (c.performer && c.performer.trim()) || '',
      mic: (c.mic && c.mic.trim()) || '',
      phantom: Boolean(c.phantom),
      notes: (c.notes && c.notes.trim()) || '',
    }));
  }

  // Setlist calculations
  const setlist = store.setlist || [];
  let totalSeconds = 0;
  setlist.forEach((song) => {
    const parts = (song.duration || '04:00').split(':').map((p) => parseInt(p, 10) || 0);
    if (parts.length === 2) {
      totalSeconds += parts[0] * 60 + parts[1];
    } else {
      totalSeconds += 240;
    }
  });
  const totalSetlistMinutes = Math.round(totalSeconds / 60);
  const durMins = Math.floor(totalSeconds / 60);
  const durSecs = totalSeconds % 60;
  const totalSetlistDurationFormatted = `${durMins}:${String(durSecs).padStart(2, '0')}`;

  // Gear Inventory calculations
  const gear = store.gear || [];
  let totalGearUnits = 0;
  let packedGearUnits = 0;
  gear.forEach((item) => {
    const q = item.qty || 1;
    totalGearUnits += q;
    if (item.packed) {
      packedGearUnits += q;
    }
  });
  const remainingGearUnits = Math.max(0, totalGearUnits - packedGearUnits);

  let projectName =
    store.projectName || (store as any).name || liveState?.name || liveState?.projectName;
  if (!projectName || projectName === 'Main Stage') {
    try {
      const raw =
        typeof localStorage !== 'undefined' ? localStorage.getItem('stagecoreProject') : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.name || parsed.projectName) {
          projectName = parsed.name || parsed.projectName;
        }
      }
    } catch (_) {}
  }
  if (!projectName) projectName = 'Main Stage';

  return {
    projectName,
    sceneName,
    sceneIdx: selectedIdx,
    totalScenes: activeScenes.length,
    date: dateFormatted,
    time: timeFormatted,
    documentId: `STAGE-PROD-${now.getFullYear()}`,
    isSquare,
    stageDimensions,

    venue: riderConfig.venue?.trim() || undefined,
    contactName: riderConfig.contactName?.trim() || undefined,
    contactPhone: riderConfig.contactPhone?.trim() || undefined,
    notes,

    requirements: reqs,
    totalRequirementsCount,

    elements: currentElements,
    connections: currentConnections,
    refW,
    refH,

    channels,

    setlist,
    totalSetlistMinutes,
    totalSetlistDurationFormatted,

    gear,
    totalGearItems: gear.length,
    totalGearUnits,
    packedGearUnits,
    remainingGearUnits,

    members,
    totalMembers: members.length,
    assignedMembersCount,
    unassignedMembersCount,

    showElementNames: store.preferences?.productionShowElementNames !== false,
  };
}
