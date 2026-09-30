export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';
export type StudyStyle = 'Balanced' | 'Intense Cram' | 'Deep Spaced Review';

export interface SubjectInput {
  id: string;
  name: string;
  examDate: string;
  difficulty: DifficultyLevel;
  topics?: string;
}

export interface PlannerFormData {
  subjects: SubjectInput[];
  dailyAvailableHours: number;
  startDate: string;
  studyStyle: StudyStyle;
}

export interface TriageMatrixCategory {
  subject: string;
  reason: string;
}

export interface TriageMatrix {
  criticalTriage: TriageMatrixCategory[];    // High Difficulty, Imminent Exam (< 7 days)
  steadyProgression: TriageMatrixCategory[]; // High Difficulty, Exam > 7 days
  quickPolish: TriageMatrixCategory[];       // Low/Medium Difficulty, Imminent Exam
  maintenance: TriageMatrixCategory[];       // Low Difficulty, Exam > 7 days
}

export interface SubjectAllocation {
  subject: string;
  allocatedHours: number;
  percentage: number;
  primaryStrategy: string;
}

export interface StudyBlock {
  id: string;
  subject: string;
  durationMinutes: number;
  topic: string;
  technique: string;
  isCompleted?: boolean;
}

export interface DailySchedule {
  dayNumber: number;
  date: string;
  dayTheme: string;
  totalMinutes: number;
  blocks: StudyBlock[];
}

export interface PriorityDailySubject {
  subject: string;
  priorityLevel: string;
  recommendedDailyDuration: string;
  suggestedActivity: string;
}

export interface StudyPlanResponse {
  feasibility: {
    status: 'Healthy' | 'Tight' | 'Critical Cram Alert';
    totalStudyHoursNeeded: number;
    totalAvailableHours: number;
    advice: string;
  };
  triageMatrix: TriageMatrix;
  subjectsBreakdown: SubjectAllocation[];
  priorityDailySchedule?: PriorityDailySubject[];
  dailyPlan: DailySchedule[];
}
