/**
 * Research Submission Port Interface (Phase 6.2)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Decouples control-plane from execution-plane.
 * - Enforces default-deny boundary: only accepts typed ResearchSubmissionRequest.
 * - Zero real provider or network execution.
 */

import {
  ResearchSubmissionRequest,
  ResearchSubmissionResult,
} from "./executionSubmissionContract.js";

export interface ResearchSubmissionPort {
  submit(
    request: ResearchSubmissionRequest
  ): Promise<ResearchSubmissionResult>;
}
