import { GoogleGenAI, Type } from '@google/genai';
import type { PlannerFormData, StudyPlanResponse } from '../src/types.ts';

export async function generateStudyPlan(data: PlannerFormData): Promise<StudyPlanResponse> {
  // Input Validation
  if (!data || !Array.isArray(data.subjects) || data.subjects.length === 0) {
    throw new Error('Please provide at least one subject to generate a study plan.');
  }

  const validSubjects = data.subjects.filter((s) => s && s.name && s.name.trim().length > 0);
  if (validSubjects.length === 0) {
    throw new Error('All subjects must have a valid course or subject name.');
  }

  // Validate start date
  const startDate = data.startDate?.trim() || new Date().toISOString().split('T')[0];

  // Validate exam dates
  for (const s of validSubjects) {
    if (!s.examDate) {
      throw new Error(`Subject "${s.name}" is missing an exam date.`);
    }
    if (s.examDate < startDate) {
      throw new Error(
        `Exam date for "${s.name}" (${s.examDate}) cannot be earlier than your plan start date (${startDate}).`
      );
    }
  }

  // Validate study hours
  const hours = Number(data.dailyAvailableHours);
  if (isNaN(hours) || hours <= 0) {
    throw new Error('Daily available study hours must be a positive number greater than 0.');
  }
  if (hours > 16) {
    throw new Error('Daily study hours cannot exceed 16 hours per day to prevent cognitive burnout and ensure health.');
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server. Please check your environment variables in AI Studio.');
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const prompt = `
You are an expert academic strategist and learning scientist building a personalized exam triage and spaced revision study plan for a college student.

Student Plan Input:
- Start Date: ${startDate}
- Daily Available Study Hours: ${hours} hours/day
- Preferred Style: ${data.studyStyle || 'Balanced'}
- Total Subjects: ${validSubjects.length}
- Subjects List:
${validSubjects
  .map(
    (s, idx) =>
      `  ${idx + 1}. ${s.name.trim()} (Exam Date: ${s.examDate}, Difficulty: ${s.difficulty || 'Medium'}${
        s.topics?.trim() ? `, Key Topics: ${s.topics.trim()}` : ''
      })`
  )
  .join('\n')}

INSTRUCTIONS:
1. Categorize EVERY subject into the 2x2 Triage Matrix:
   - criticalTriage: High difficulty with imminent exams (within 7 days). Highest cognitive priority.
   - steadyProgression: High difficulty with > 7 days until exam. Foundation building & spaced concept mastery.
   - quickPolish: Low or Medium difficulty with imminent exams. Rapid formula review and timed past papers.
   - maintenance: Low difficulty with > 7 days until exam. Light periodic recall drills to maintain memory retention.
   (Every provided subject must appear in exactly one of these four categories).

2. Assess Feasibility:
   - Calculate total required study hours across all subjects until exams vs total available hours based on daily hours.
   - Status: "Healthy", "Tight", or "Critical Cram Alert".
   - If available daily hours are very high (e.g. >= 10 hrs), include advice on taking scheduled breaks and avoiding burnout.
   - Provide concrete, encouraging, realistic pedagogical advice for this student.

3. Allocate Proportional Hours:
   - Assign percentage and hours to each subject based on its difficulty weight and exam urgency. Percentages must sum to 100.
   - List a primary active learning strategy for each (e.g. "Feynman Technique & Practice Sets", "Spaced Recall Flashcards", "Timed Mock Exams").

4. Generate Today's Study Schedule Based on Priority Matrix:
   - For EACH subject, provide a clear daily study recommendation based directly on its triage matrix placement:
     - "subject": Subject name.
     - "priorityLevel": "Critical Priority (P1)", "High Priority (P2)", "Moderate Priority (P3)", or "Maintenance (P4)".
     - "recommendedDailyDuration": Recommended study time per day for this subject (e.g. "90 mins/day", "2 hrs/day", "45 mins/day") calibrated to the student's daily available study time (${hours} hrs/day).
     - "suggestedActivity": Specific, high-yield study activity tailored to the priority level (e.g., "Timed past paper drills on challenging problem types", "Active recall testing with flashcards & summary notes").

5. Generate Day-by-Day Schedule:
   - From Start Date (${startDate}) up to 5 to 7 days of realistic schedule.
   - Divide each day into realistic 30 to 60-minute actionable study blocks matching the student's daily available hours (${hours} hours total per day).
   - Give each block a specific, bite-sized topic (e.g., "Calculus: Integration by Parts - 6 Core Drill Problems", not just "Study Math").
   - Assign an active study technique for each block (e.g., "Active Recall", "Problem Set Sprint", "Formula Sheet Synthesis", "Past Paper Exam Simulation").

Return STRICT JSON complying with the requested schema.
`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      feasibility: {
        type: Type.OBJECT,
        properties: {
          status: {
            type: Type.STRING,
            description: 'Healthy, Tight, or Critical Cram Alert',
          },
          totalStudyHoursNeeded: { type: Type.NUMBER },
          totalAvailableHours: { type: Type.NUMBER },
          advice: { type: Type.STRING },
        },
        required: ['status', 'totalStudyHoursNeeded', 'totalAvailableHours', 'advice'],
      },
      triageMatrix: {
        type: Type.OBJECT,
        properties: {
          criticalTriage: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                subject: { type: Type.STRING },
                reason: { type: Type.STRING },
              },
              required: ['subject', 'reason'],
            },
          },
          steadyProgression: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                subject: { type: Type.STRING },
                reason: { type: Type.STRING },
              },
              required: ['subject', 'reason'],
            },
          },
          quickPolish: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                subject: { type: Type.STRING },
                reason: { type: Type.STRING },
              },
              required: ['subject', 'reason'],
            },
          },
          maintenance: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                subject: { type: Type.STRING },
                reason: { type: Type.STRING },
              },
              required: ['subject', 'reason'],
            },
          },
        },
        required: ['criticalTriage', 'steadyProgression', 'quickPolish', 'maintenance'],
      },
      subjectsBreakdown: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            allocatedHours: { type: Type.NUMBER },
            percentage: { type: Type.NUMBER },
            primaryStrategy: { type: Type.STRING },
          },
          required: ['subject', 'allocatedHours', 'percentage', 'primaryStrategy'],
        },
      },
      priorityDailySchedule: {
        type: Type.ARRAY,
        description: 'AI-generated daily study schedule based on the priority matrix for each subject',
        items: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            priorityLevel: {
              type: Type.STRING,
              description: 'Critical Priority (P1), High Priority (P2), Moderate Priority (P3), or Maintenance (P4)'
            },
            recommendedDailyDuration: {
              type: Type.STRING,
              description: 'Recommended study duration per day (e.g. 90 mins/day, 2 hrs/day)'
            },
            suggestedActivity: {
              type: Type.STRING,
              description: 'Specific suggested high-yield study activity based on priority'
            },
          },
          required: ['subject', 'priorityLevel', 'recommendedDailyDuration', 'suggestedActivity'],
        },
      },
      dailyPlan: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            dayNumber: { type: Type.INTEGER },
            date: { type: Type.STRING },
            dayTheme: { type: Type.STRING },
            totalMinutes: { type: Type.NUMBER },
            blocks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  subject: { type: Type.STRING },
                  durationMinutes: { type: Type.NUMBER },
                  topic: { type: Type.STRING },
                  technique: { type: Type.STRING },
                },
                required: ['id', 'subject', 'durationMinutes', 'topic', 'technique'],
              },
            },
          },
          required: ['dayNumber', 'date', 'dayTheme', 'totalMinutes', 'blocks'],
        },
      },
    },
    required: ['feasibility', 'triageMatrix', 'subjectsBreakdown', 'priorityDailySchedule', 'dailyPlan'],
  };

  // Model configuration: gemini-3.1-flash-lite (primary available model) -> gemini-flash-latest -> gemini-3.8-flash
  const candidateModels = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
  let lastError: any = null;

  for (const modelName of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error('Empty response received from AI model');
      }

      const parsed = JSON.parse(text) as StudyPlanResponse;

      // Normalize unique block IDs across days to prevent cross-day toggle bugs
      if (Array.isArray(parsed.dailyPlan)) {
        parsed.dailyPlan.forEach((day, dIdx) => {
          if (Array.isArray(day.blocks)) {
            day.blocks.forEach((block, bIdx) => {
              block.id = `d${day.dayNumber || dIdx + 1}-b${bIdx + 1}-${block.id || 'blk'}`;
            });
          }
        });
      }

      // Ensure fallback arrays exist
      parsed.triageMatrix = parsed.triageMatrix || {
        criticalTriage: [],
        steadyProgression: [],
        quickPolish: [],
        maintenance: [],
      };
      parsed.triageMatrix.criticalTriage = parsed.triageMatrix.criticalTriage || [];
      parsed.triageMatrix.steadyProgression = parsed.triageMatrix.steadyProgression || [];
      parsed.triageMatrix.quickPolish = parsed.triageMatrix.quickPolish || [];
      parsed.triageMatrix.maintenance = parsed.triageMatrix.maintenance || [];
      parsed.subjectsBreakdown = parsed.subjectsBreakdown || [];
      parsed.dailyPlan = parsed.dailyPlan || [];

      // Ensure priorityDailySchedule is populated based on triage matrix
      if (!Array.isArray(parsed.priorityDailySchedule) || parsed.priorityDailySchedule.length === 0) {
        parsed.priorityDailySchedule = validSubjects.map((s) => {
          const name = s.name.trim();
          let priority = 'Moderate Priority (P3)';

          if (parsed.triageMatrix.criticalTriage.some((c) => c.subject.toLowerCase() === name.toLowerCase())) {
            priority = 'Critical Priority (P1)';
          } else if (parsed.triageMatrix.steadyProgression.some((c) => c.subject.toLowerCase() === name.toLowerCase())) {
            priority = 'High Priority (P2)';
          } else if (parsed.triageMatrix.maintenance.some((c) => c.subject.toLowerCase() === name.toLowerCase())) {
            priority = 'Maintenance (P4)';
          }

          const alloc = parsed.subjectsBreakdown.find((b) => b.subject.toLowerCase() === name.toLowerCase());
          const dailyMins = alloc ? Math.round((alloc.percentage / 100) * hours * 60) : Math.round((hours / validSubjects.length) * 60);

          return {
            subject: name,
            priorityLevel: priority,
            recommendedDailyDuration: dailyMins >= 60 ? `${(dailyMins / 60).toFixed(1)} hrs/day` : `${dailyMins} mins/day`,
            suggestedActivity: alloc?.primaryStrategy || 'Targeted active recall drills and timed problem sprints',
          };
        });
      }

      return parsed;
    } catch (err: any) {
      lastError = err;
      console.warn(`Model ${modelName} failed or busy, trying next candidate if available...`, err.message);
      // Transient 503 backoff delay before switching model
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Format clean user-friendly message
  let errMsg = lastError?.message || 'Unable to generate study plan at this moment. Please check your connection and try again.';
  try {
    const parsedErr = JSON.parse(errMsg);
    if (parsedErr?.error?.message) {
      errMsg = parsedErr.error.message;
    }
  } catch {
    // not json, keep original string
  }

  throw new Error(errMsg);
}
