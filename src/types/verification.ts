/**
 * ARH Phase 7: Session Verification Data Model
 * Runtime-only verification tracking for active provider connections and chat sessions.
 * Never persisted in localStorage, sessionStorage, or databases.
 */

export type VerificationStageStatus = 
  | 'NOT_TESTED' 
  | 'RUNNING' 
  | 'PASSED' 
  | 'FAILED' 
  | 'SKIPPED';

export type OverallVerificationStatus = 
  | 'NOT_VERIFIED' 
  | 'PARTIALLY_VERIFIED' 
  | 'VERIFIED' 
  | 'FAILED';

export interface VerificationStageResult {
  status: VerificationStageStatus;
  timestamp?: number;
  durationMs?: number;
  error?: string;
  details?: string;
}

export interface VerificationStages {
  providerDetection: VerificationStageResult;
  connectionStrategy: VerificationStageResult;
  authentication: VerificationStageResult;
  modelDiscovery: VerificationStageResult;
  modelSelection: VerificationStageResult;
  chat: VerificationStageResult;
  streaming: VerificationStageResult;
  stopGeneration: VerificationStageResult;
}

export interface ProviderSessionVerification {
  providerId: string;
  providerName: string;
  overall: OverallVerificationStatus;
  stages: VerificationStages;
  startedAt: number;
  lastUpdatedAt: number;
}

export function createInitialVerification(
  providerId: string,
  providerName: string
): ProviderSessionVerification {
  const now = Date.now();
  return {
    providerId,
    providerName,
    overall: 'NOT_VERIFIED',
    startedAt: now,
    lastUpdatedAt: now,
    stages: {
      providerDetection: { status: 'NOT_TESTED' },
      connectionStrategy: { status: 'NOT_TESTED' },
      authentication: { status: 'NOT_TESTED' },
      modelDiscovery: { status: 'NOT_TESTED' },
      modelSelection: { status: 'NOT_TESTED' },
      chat: { status: 'NOT_TESTED' },
      streaming: { status: 'NOT_TESTED' },
      stopGeneration: { status: 'NOT_TESTED' }
    }
  };
}

export function calculateOverallStatus(stages: VerificationStages): OverallVerificationStatus {
  const stageValues = Object.values(stages);
  
  const anyFailed = stageValues.some(s => s.status === 'FAILED');
  if (anyFailed) {
    return 'FAILED';
  }

  // Key core stages for verification
  const coreStages: (keyof VerificationStages)[] = [
    'providerDetection',
    'connectionStrategy',
    'authentication',
    'modelDiscovery',
    'modelSelection',
    'chat',
    'streaming'
  ];

  const corePassed = coreStages.filter(s => stages[s].status === 'PASSED').length;

  if (corePassed === coreStages.length) {
    return 'VERIFIED';
  }

  if (corePassed > 0 || stageValues.some(s => s.status === 'RUNNING')) {
    return 'PARTIALLY_VERIFIED';
  }

  return 'NOT_VERIFIED';
}
