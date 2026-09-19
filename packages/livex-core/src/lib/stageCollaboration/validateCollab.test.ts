import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictResolver } from './ConflictResolver';
import { serializeStage } from './StageSerializer';
import { deserializeStage } from './StageDeserializer';

vi.mock('../security', () => {
  const store: Record<string, string> = {};
  return {
    secureReadLocal: (k: string, u: string) => store[k] ?? null,
    secureWriteLocal: (k: string, v: string, u: string) => {
      store[k] = v;
    },
    _store: store,
  };
});

vi.mock('../firebase', () => {
  return {
    getFirebaseDb: () => ({}),
  };
});

vi.mock('firebase/firestore', () => {
  return {
    doc: (_db: any, col: string, id?: string) => ({ id: id ?? 'mock_doc_id', path: `${col}/${id ?? 'mock_doc_id'}` }),
    collection: (_db: any, name: string) => name,
    setDoc: vi.fn().mockResolvedValue(true),
  };
});

describe('StageX Collaboration Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ConflictResolver', () => {
    it('should filter out duplicate operations', () => {
      const resolver = new ConflictResolver();
      const isDuplicate1 = resolver.checkAndRegisterOp('op-123');
      const isDuplicate2 = resolver.checkAndRegisterOp('op-123');

      expect(isDuplicate1).toBe(false);
      expect(isDuplicate2).toBe(true);
    });

    it('should ignore echo operations from current user', () => {
      const resolver = new ConflictResolver();
      const op = {
        id: 'op-1',
        authorId: 'user-1',
        timestamp: 1000,
        type: 'move' as const,
        payload: { id: 'element-1', x: 10, y: 20 },
      };

      const result = resolver.shouldApplyOperation(op, 'user-1');
      expect(result).toBe(false);
    });

    it('should apply operations using Last-Write-Wins ordering', () => {
      const resolver = new ConflictResolver();
      
      const opOld = {
        id: 'op-old',
        authorId: 'user-2',
        timestamp: 500,
        type: 'move' as const,
        payload: { id: 'element-1', x: 5, y: 5 },
      };

      const opNew = {
        id: 'op-new',
        authorId: 'user-3',
        timestamp: 1000,
        type: 'move' as const,
        payload: { id: 'element-1', x: 10, y: 10 },
      };

      const applyNew = resolver.shouldApplyOperation(opNew, 'user-1');
      expect(applyNew).toBe(true);

      const applyOld = resolver.shouldApplyOperation(opOld, 'user-1');
      expect(applyOld).toBe(false);
    });
  });

  describe('StageSerializer & StageDeserializer', () => {
    it('should correctly serialize and deserialize stage keys', async () => {
      const mockStorage = await import('../security') as any;
      
      mockStorage._store['stagecoreProject'] = 'project-data';
      mockStorage._store['scCustomElements'] = 'custom-elements-data';

      const snap = serializeStage();
      expect(snap['stagecoreProject']).toBe('project-data');
      expect(snap['scCustomElements']).toBe('custom-elements-data');

      mockStorage._store['stagecoreProject'] = '';
      mockStorage._store['scCustomElements'] = '';

      const mockIframe = {
        contentWindow: {
          postMessage: vi.fn(),
        },
      } as any;

      deserializeStage(snap, mockIframe);

      expect(mockStorage._store['stagecoreProject']).toBe('project-data');
      expect(mockStorage._store['scCustomElements']).toBe('custom-elements-data');
      expect(mockIframe.contentWindow.postMessage).toHaveBeenCalled();
    });
  });
});
