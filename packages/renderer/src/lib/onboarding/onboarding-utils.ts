/**********************************************************************
 * Copyright (C) 2023 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ***********************************************************************/

import type { OnboardingInfo, OnboardingStep, OnboardingStatus } from '../../../../main/src/plugin/api/onboarding';
import type { ContextUI } from '../context/context';
import { ContextKeyExpr } from '../context/contextKey';

export const SCOPE_ONBOARDING = 'onboarding';

export const STATUS_COMPLETED = 'completed';
export const STATUS_SKIPPED = 'skipped';

export const ON_COMMAND_PREFIX = 'onCommand:';
export const ONBOARDING_CONTEXT_PREFIX = 'onboardingContext:';

export interface ActiveOnboardingStep {
  onboarding: OnboardingInfo;
  step: OnboardingStep;
}

/*
 *   it update the step status and, if it is the last step with a completed state, the onboarding status in the backend.
 */
export async function updateOnboardingStepStatus(
  onboarding: OnboardingInfo,
  step: OnboardingStep,
  status: OnboardingStatus,
) {
  step.status = status;
  await window.updateStepState(status, onboarding.extension, step.id);
  // if the completed step is the last one, we mark the onboarding as completed
  // the last step should have a completed state by default
  const lastCompletedStep = onboarding.steps.findLast(s => s.state === 'completed');
  if (lastCompletedStep?.id === step.id) {
    onboarding.status = STATUS_COMPLETED;
    await window.updateStepState(STATUS_COMPLETED, onboarding.extension);
  }
}

/**
 * it verifies if a step must be marked as completed by checking that all completion events have been satisied.
 */
export function isStepCompleted(
  activeStep: ActiveOnboardingStep,
  executedCommands: string[],
  globalContext?: ContextUI,
): boolean {
  return (
    activeStep.step?.completionEvents?.every(cmp => {
      // check if command has been executed
      if (cmp.startsWith(ON_COMMAND_PREFIX) && executedCommands.includes(cmp.replace(ON_COMMAND_PREFIX, ''))) {
        return true;
      }

      // check if cmp string is an onContext event, check the value from context
      if (cmp.startsWith(ONBOARDING_CONTEXT_PREFIX)) {
        if (!globalContext) {
          return false;
        }
        cmp = cmp.replace(ONBOARDING_CONTEXT_PREFIX, `${activeStep.onboarding.extension}.${SCOPE_ONBOARDING}.`);
        const completionEventDeserialized = ContextKeyExpr.deserialize(cmp);
        return completionEventDeserialized?.evaluate(globalContext);
      }

      return false;
    }) || false
  );
}

/*
 *   it checks if all onboardings i nthe list have been completed
 */
export function isOnboardingsSetupCompleted(onboardings: OnboardingInfo[]): boolean {
  for (const onboarding of onboardings) {
    if (!isOnboardingCompleted(onboarding)) {
      return false;
    }
  }
  return true;
}

/*
 *   it checks if the setup of the onboarding is complete
 */
export function isOnboardingCompleted(onboarding: OnboardingInfo): boolean {
  if (!onboarding.status) {
    return false;
  }
  for (const step of onboarding.steps) {
    if (!step.status) {
      return false;
    }
  }
  return true;
}

/*
 *   it normalizes the values containing the prefix "onboardingContext:". It is replaces with <extension>.onboarding
 */
export function normalizeOnboardingWhenClause(when: string, extension: string): string {
  return when.replaceAll(ONBOARDING_CONTEXT_PREFIX, `${extension}.${SCOPE_ONBOARDING}.`);
}

/*
 *   it clean the context of all onboardings in the list
 */
export async function cleanSetup(onboardings: OnboardingInfo[], globalContext: ContextUI) {
  // reset onboarding on backend
  await window.resetOnboarding(onboardings.map(onboarding => onboarding.extension));
  // clean ui context
  const contextValues = globalContext.collectAllValues();
  onboardings.forEach(onboarding => {
    // remove context key added during the onboarding
    for (const key in contextValues) {
      if (key.startsWith(`${onboarding.extension}.${SCOPE_ONBOARDING}`)) {
        globalContext.removeValue(key);
      }
    }
    onboarding.status = undefined;
    onboarding.steps.forEach(step => {
      step.status = undefined;
    });
  });
}
