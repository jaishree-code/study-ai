import type { PlannerFormData, StudyPlanResponse } from './types';

export async function fetchStudyPlan(formData: PlannerFormData): Promise<StudyPlanResponse> {
  const response = await fetch('/api/generate-plan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server responded with status ${response.status}`);
  }

  const data: StudyPlanResponse = await response.json();
  return data;
}
