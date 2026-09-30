import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Plus,
  Trash2,
  Flame,
  ArrowRight,
  RotateCcw,
  Copy,
  Check,
  Printer,
  Compass,
  Zap,
  Target,
  ShieldAlert,
  GraduationCap,
  ChevronRight,
  Sliders,
  CheckSquare,
  BarChart3,
  Lightbulb,
  Layers,
  ArrowUpRight,
  X
} from 'lucide-react';
import type { PlannerFormData, SubjectInput, DifficultyLevel, StudyStyle, StudyPlanResponse } from './types';
import { fetchStudyPlan } from './api';

const getLocalDateString = (daysOffset: number = 0) => {
  const d = new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const DEFAULT_SAMPLE_SUBJECTS: SubjectInput[] = [
  {
    id: 's1',
    name: 'Advanced Calculus',
    examDate: getLocalDateString(5),
    difficulty: 'Hard',
    topics: 'Multivariable limits, Partial derivatives, Green & Stokes theorems'
  },
  {
    id: 's2',
    name: 'Operating Systems',
    examDate: getLocalDateString(8),
    difficulty: 'Medium',
    topics: 'Process scheduling, Virtual memory paging, Deadlocks & Semaphores'
  },
  {
    id: 's3',
    name: 'Technical Writing',
    examDate: getLocalDateString(12),
    difficulty: 'Easy',
    topics: 'White papers, Citation formatting, Executive summaries'
  }
];

export default function App() {
  const todayStr = getLocalDateString(0);

  const [formData, setFormData] = useState<PlannerFormData>({
    subjects: [
      {
        id: '1',
        name: 'Data Structures & Algorithms',
        examDate: getLocalDateString(6),
        difficulty: 'Hard',
        topics: 'Dynamic programming, Graph traversals (Dijkstra/BFS), Binary Trees'
      },
      {
        id: '2',
        name: 'Computer Networks',
        examDate: getLocalDateString(10),
        difficulty: 'Medium',
        topics: 'TCP/IP 3-way handshake, Subnetting & CIDR, DNS & HTTP/3'
      }
    ],
    dailyAvailableHours: 4,
    startDate: todayStr,
    studyStyle: 'Balanced'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<StudyPlanResponse | null>(null);
  const [completedBlocks, setCompletedBlocks] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  // Subject management
  const addSubject = () => {
    const newSubject: SubjectInput = {
      id: Date.now().toString(),
      name: '',
      examDate: getLocalDateString(7),
      difficulty: 'Medium',
      topics: ''
    };
    setFormData((prev) => ({
      ...prev,
      subjects: [...prev.subjects, newSubject]
    }));
  };

  const updateSubject = (id: string, updates: Partial<SubjectInput>) => {
    setError(null);
    setFormData((prev) => ({
      ...prev,
      subjects: prev.subjects.map((s) => (s.id === id ? { ...s, ...updates } : s))
    }));
  };

  const removeSubject = (id: string) => {
    if (formData.subjects.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((s) => s.id !== id)
    }));
  };

  const loadSampleData = () => {
    setFormData({
      subjects: DEFAULT_SAMPLE_SUBJECTS,
      dailyAvailableHours: 4,
      startDate: todayStr,
      studyStyle: 'Balanced'
    });
    setError(null);
  };

  // Helper to compute remaining days until exam with exact UTC date calculation
  const getDaysUntilExam = (examDateStr: string) => {
    if (!examDateStr) return null;
    const [sy, sm, sd] = (formData.startDate || todayStr).split('-').map(Number);
    const [ey, em, ed] = examDateStr.split('-').map(Number);
    if (!sy || !ey) return null;
    const startUtc = Date.UTC(sy, sm - 1, sd);
    const examUtc = Date.UTC(ey, em - 1, ed);
    return Math.round((examUtc - startUtc) / (1000 * 60 * 60 * 24));
  };

  // Generate Plan Handler
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Check start date
    if (!formData.startDate) {
      setError('Please provide a valid plan start date.');
      return;
    }

    // 2. Check subjects existence
    if (!formData.subjects || formData.subjects.length === 0) {
      setError('Please add at least one subject to generate your study plan.');
      return;
    }

    // 3. Check subject names and dates
    for (let i = 0; i < formData.subjects.length; i++) {
      const s = formData.subjects[i];
      if (!s.name || !s.name.trim()) {
        setError(`Subject #${i + 1} is missing a course name. Please fill in all subject names.`);
        return;
      }
      if (!s.examDate) {
        setError(`Subject "${s.name.trim()}" is missing an exam date. Please select a target date.`);
        return;
      }
      if (s.examDate < formData.startDate) {
        setError(
          `Exam date for "${s.name.trim()}" (${s.examDate}) cannot be in the past or earlier than your plan start date (${formData.startDate}).`
        );
        return;
      }
    }

    // 4. Check daily hours
    const hours = Number(formData.dailyAvailableHours);
    if (isNaN(hours) || hours <= 0) {
      setError('Daily available study hours must be a positive number greater than 0.');
      return;
    }
    if (hours > 16) {
      setError('Daily study hours cannot exceed 16 hours/day to prevent severe cognitive burnout.');
      return;
    }

    setIsLoading(true);

    try {
      const generatedPlan = await fetchStudyPlan(formData);
      setPlan(generatedPlan);
      setCompletedBlocks({});
      // Scroll to results smoothly
      setTimeout(() => {
        document.getElementById('plan-results')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate plan. Please verify connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle study block completion
  const toggleBlock = (blockId: string) => {
    setCompletedBlocks((prev) => ({
      ...prev,
      [blockId]: !prev[blockId]
    }));
  };

  // Copy Plan as Markdown
  const copyPlanMarkdown = async () => {
    if (!plan) return;
    let md = `# StudyMatrix AI - Personalized Study Plan\n\n`;
    md += `**Status:** ${plan.feasibility.status}\n`;
    md += `**Hours Needed vs Available:** ${plan.feasibility.totalStudyHoursNeeded}h / ${plan.feasibility.totalAvailableHours}h\n`;
    md += `**Advice:** ${plan.feasibility.advice}\n\n`;

    md += `## Subject Effort Allocation\n`;
    (plan.subjectsBreakdown || []).forEach((s) => {
      md += `- **${s.subject}:** ${s.allocatedHours} hours (${s.percentage}%) - ${s.primaryStrategy}\n`;
    });

    if (plan.priorityDailySchedule && plan.priorityDailySchedule.length > 0) {
      md += `\n## Priority-Based Daily Study Schedule\n`;
      plan.priorityDailySchedule.forEach((p) => {
        md += `- **${p.subject}:** [${p.priorityLevel}] ${p.recommendedDailyDuration} - Activity: ${p.suggestedActivity}\n`;
      });
    }

    md += `\n## Daily Schedule\n`;
    (plan.dailyPlan || []).forEach((d) => {
      md += `\n### Day ${d.dayNumber} (${d.date}) - ${d.dayTheme}\n`;
      (d.blocks || []).forEach((b) => {
        md += `- [ ] **${b.subject}** (${b.durationMinutes}m): ${b.topic} *[${b.technique}]*\n`;
      });
    });

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(md);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = md;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Copy to clipboard failed:', err);
    }
  };

  // Calculations for progress
  const totalBlocksCount = (plan?.dailyPlan || []).reduce((acc, d) => acc + (d.blocks?.length || 0), 0);
  const completedBlocksCount = Object.values(completedBlocks).filter(Boolean).length;
  const progressPercent = totalBlocksCount > 0 ? Math.round((completedBlocksCount / totalBlocksCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] selection:bg-indigo-500 selection:text-white antialiased">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/30 ring-1 ring-white/20">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">StudyMatrix AI</span>
                <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">
                  · Exam Triage &amp; Revision
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={loadSampleData}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Preload sample university courses for demonstration"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Load Demo Data</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Hero Section */}
        <section className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-6 sm:p-8">
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
              <Target className="w-4 h-4" />
              <span>Algorithmic Exam Preparation</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight text-balance">
              Turn exam deadlines into an optimized, low-stress revision schedule.
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed text-balance">
              Input your courses, exam dates, and daily study capacity. StudyMatrix triages your highest-risk subjects, schedules spaced active recall, and generates an actionable day-by-day plan.
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Spaced interval recall
              </span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Urgency × Difficulty triage
              </span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Cognitive burnout limits
              </span>
            </div>
          </div>
        </section>

        {/* Input Configuration Form */}
        <form onSubmit={handleGenerate} className="space-y-6">
          {/* Step 1: Courses */}
          <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-7 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-slate-800 text-indigo-400 flex items-center justify-center font-mono font-bold text-xs">
                  01
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Course Load &amp; Exam Dates</h2>
                  <p className="text-xs text-slate-400">Add the subjects you need to prepare for</p>
                </div>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {formData.subjects.length} {formData.subjects.length === 1 ? 'subject' : 'subjects'}
              </span>
            </div>

            {/* Subject Cards */}
            <div className="space-y-3.5">
              {formData.subjects.map((subject, index) => {
                const daysRemaining = getDaysUntilExam(subject.examDate);
                return (
                  <div
                    key={subject.id}
                    className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-4 sm:p-5 space-y-4 transition-all hover:border-slate-700/80"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-slate-800 text-slate-300 text-[11px] font-mono font-bold flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="text-xs font-semibold text-slate-300">Course #{index + 1}</span>
                      </div>

                      {formData.subjects.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSubject(subject.id)}
                          className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Remove subject"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                      {/* Course Name */}
                      <div className="md:col-span-5 space-y-1.5">
                        <label className="text-xs font-medium text-slate-300">Course or Subject Name</label>
                        <input
                          type="text"
                          required
                          value={subject.name}
                          onChange={(e) => updateSubject(subject.id, { name: e.target.value })}
                          placeholder="e.g. Linear Algebra, Data Structures"
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
                        />
                      </div>

                      {/* Exam Date */}
                      <div className="md:col-span-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-slate-300 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                            Exam Date
                          </label>
                          {daysRemaining !== null && (
                            <span
                              className={`text-[10px] font-mono font-semibold ${
                                daysRemaining <= 3
                                  ? 'text-rose-400'
                                  : daysRemaining <= 7
                                  ? 'text-amber-400'
                                  : 'text-slate-400'
                              }`}
                            >
                              {daysRemaining <= 0
                                ? 'Today'
                                : daysRemaining === 1
                                ? 'Tomorrow'
                                : `in ${daysRemaining} days`}
                            </span>
                          )}
                        </div>
                        <input
                          type="date"
                          required
                          value={subject.examDate}
                          onChange={(e) => updateSubject(subject.id, { examDate: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
                        />
                      </div>

                      {/* Difficulty Level Segmented Toggle */}
                      <div className="md:col-span-4 space-y-1.5">
                        <label className="text-xs font-medium text-slate-300 flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-amber-400" />
                          Difficulty Level
                        </label>
                        <div className="grid grid-cols-3 gap-1 bg-slate-900 border border-slate-700/80 rounded-lg p-1">
                          {(['Easy', 'Medium', 'Hard'] as DifficultyLevel[]).map((level) => {
                            const isSelected = subject.difficulty === level;
                            return (
                              <button
                                key={level}
                                type="button"
                                onClick={() => updateSubject(subject.id, { difficulty: level })}
                                className={`py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                                  isSelected
                                    ? level === 'Hard'
                                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                                      : level === 'Medium'
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                {level}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Topics / Weak areas */}
                    <div className="space-y-1 pt-1">
                      <label className="text-xs text-slate-400 flex items-center gap-1">
                        <span>Challenging Chapters / Focus Topics</span>
                        <span className="text-slate-500 text-[11px]">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={subject.topics || ''}
                        onChange={(e) => updateSubject(subject.id, { topics: e.target.value })}
                        placeholder="e.g. Dynamic Programming, Dijkstra, Recursion trees"
                        className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/60 transition-colors"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Subject Action */}
            <button
              type="button"
              onClick={addSubject}
              className="w-full py-2.5 px-4 rounded-xl border border-dashed border-slate-700 hover:border-indigo-500/50 bg-slate-950/40 hover:bg-slate-900/80 text-slate-300 hover:text-white transition-all text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-indigo-400" />
              <span>Add Another Subject</span>
            </button>
          </section>

          {/* Step 2: Capacity & Strategy */}
          <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-7 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-slate-800 text-indigo-400 flex items-center justify-center font-mono font-bold text-xs">
                  02
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Daily Study Capacity &amp; Strategy</h2>
                  <p className="text-xs text-slate-400">Set your realistic study window and revision mode</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Daily Hours Slider & Presets */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    Daily Study Time
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0.5"
                      max="16"
                      step="0.5"
                      value={formData.dailyAvailableHours || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setFormData({ ...formData, dailyAvailableHours: isNaN(val) ? 0 : val });
                      }}
                      className="w-14 bg-slate-900 border border-slate-700/80 rounded px-1.5 py-0.5 text-right font-mono text-xs font-bold text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-400 font-mono">hrs</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="0.5"
                  max="16"
                  step="0.5"
                  value={Math.min(Math.max(formData.dailyAvailableHours || 0.5, 0.5), 16)}
                  onChange={(e) => setFormData({ ...formData, dailyAvailableHours: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />

                {/* Quick Presets */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[2, 4, 8, 12].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setFormData({ ...formData, dailyAvailableHours: preset })}
                      className={`py-1 text-[11px] font-mono rounded-md border transition-colors cursor-pointer ${
                        formData.dailyAvailableHours === preset
                          ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {preset}h
                    </button>
                  ))}
                </div>

                {formData.dailyAvailableHours >= 9 && (
                  <p className="text-[11px] text-amber-400 leading-tight">
                    High load: AI will schedule frequent restorative rest blocks.
                  </p>
                )}
              </div>

              {/* Plan Start Date */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  Plan Start Date
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                <p className="text-[11px] text-slate-400">
                  {formData.startDate === todayStr ? 'Starting today' : `Starting on ${formData.startDate}`}
                </p>
              </div>

              {/* Study Style */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                  Revision Style
                </label>
                <div className="space-y-1.5">
                  {[
                    { id: 'Balanced', label: 'Balanced Pacing', hint: 'Even distribution' },
                    { id: 'Intense Cram', label: 'Intense Cram', hint: 'High-yield sprints' },
                    { id: 'Deep Spaced Review', label: 'Deep Spaced Review', hint: 'Mastery & recall' }
                  ].map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, studyStyle: style.id as StudyStyle })}
                      className={`w-full px-2.5 py-1.5 rounded-lg border text-left text-xs transition-colors flex items-center justify-between cursor-pointer ${
                        formData.studyStyle === style.id
                          ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50 font-semibold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>{style.label}</span>
                      <span className="text-[10px] text-slate-500 font-normal">{style.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Validation Notice */}
          {error && (
            <div className="bg-rose-950/50 border border-rose-800/80 text-rose-300 rounded-xl p-4 text-xs sm:text-sm flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-rose-200">Unable to generate plan</p>
                  <p className="text-rose-300/90 mt-0.5">{error}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                aria-label="Dismiss error notice"
                className="text-rose-400 hover:text-rose-200 p-1 rounded-lg hover:bg-rose-900/50 transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Primary Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Computing Optimal Revision Schedule...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Generate AI Study Plan</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Study Plan Results Section */}
        {plan && (
          <section id="plan-results" className="space-y-6 pt-4 border-t border-slate-800/80">
            {/* Results Title & Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
              <div>
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">Personalized Study Roadmap</h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Triage schedule tailored to exam dates and subject difficulty
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyPlanMarkdown}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                  <span>{copied ? 'Copied!' : 'Copy Markdown'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      window.print();
                    } catch (e) {
                      console.warn('Print not supported in this frame', e);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-400" />
                  <span>Print / PDF</span>
                </button>
              </div>
            </div>

            {/* Feasibility Alert Card */}
            <div
              className={`rounded-2xl p-5 sm:p-6 border ${
                plan.feasibility.status === 'Healthy'
                  ? 'bg-emerald-950/20 border-emerald-800/60 text-emerald-200'
                  : plan.feasibility.status === 'Tight'
                  ? 'bg-amber-950/20 border-amber-800/60 text-amber-200'
                  : 'bg-rose-950/20 border-rose-800/60 text-rose-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  {plan.feasibility.status === 'Healthy' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                  )}
                  <div>
                    <h4 className="text-base font-bold text-white">{plan.feasibility.status} Schedule Pacing</h4>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                  <div className="bg-slate-900/70 px-3 py-1.5 rounded-lg border border-white/10">
                    <span className="text-slate-400">Needed: </span>
                    <span className="font-bold text-white">{plan.feasibility.totalStudyHoursNeeded} hrs</span>
                  </div>
                  <div className="bg-slate-900/70 px-3 py-1.5 rounded-lg border border-white/10">
                    <span className="text-slate-400">Available: </span>
                    <span className="font-bold text-white">{plan.feasibility.totalAvailableHours} hrs</span>
                  </div>
                </div>
              </div>

              <p className="text-xs sm:text-sm mt-3 leading-relaxed text-slate-200">
                {plan.feasibility.advice}
              </p>
            </div>

            {/* 2x2 Exam Priority Triage Matrix */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Compass className="w-5 h-5 text-indigo-400" />
                  <h4 className="text-base font-bold text-white">2×2 Exam Priority Triage Matrix</h4>
                </div>
                <span className="text-xs text-slate-400 font-mono">Urgency × Difficulty</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Quadrant 1: Critical Triage */}
                <div className="bg-rose-950/20 border border-rose-800/40 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-300 tracking-wide flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      Critical Triage
                    </span>
                    <span className="text-[10px] text-rose-300 font-mono">
                      High Difficulty · Imminent
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {(plan.triageMatrix?.criticalTriage || []).length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No courses in this quadrant.</p>
                    ) : (
                      (plan.triageMatrix?.criticalTriage || []).map((item, idx) => (
                        <div key={idx} className="bg-slate-950/70 border border-rose-900/30 rounded-lg p-2.5 text-xs">
                          <p className="font-bold text-rose-200">{item.subject}</p>
                          <p className="text-slate-300 text-[11px] mt-0.5">{item.reason}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Quadrant 2: Steady Progression */}
                <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 tracking-wide flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      Steady Progression
                    </span>
                    <span className="text-[10px] text-amber-300 font-mono">
                      High Difficulty · Later
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {(plan.triageMatrix?.steadyProgression || []).length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No courses in this quadrant.</p>
                    ) : (
                      (plan.triageMatrix?.steadyProgression || []).map((item, idx) => (
                        <div key={idx} className="bg-slate-950/70 border border-amber-900/30 rounded-lg p-2.5 text-xs">
                          <p className="font-bold text-amber-200">{item.subject}</p>
                          <p className="text-slate-300 text-[11px] mt-0.5">{item.reason}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Quadrant 3: Quick Polish */}
                <div className="bg-sky-950/20 border border-sky-800/40 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-300 tracking-wide flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-sky-400" />
                      Quick Polish
                    </span>
                    <span className="text-[10px] text-sky-300 font-mono">
                      Moderate/Easy · Imminent
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {(plan.triageMatrix?.quickPolish || []).length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No courses in this quadrant.</p>
                    ) : (
                      (plan.triageMatrix?.quickPolish || []).map((item, idx) => (
                        <div key={idx} className="bg-slate-950/70 border border-sky-900/30 rounded-lg p-2.5 text-xs">
                          <p className="font-bold text-sky-200">{item.subject}</p>
                          <p className="text-slate-300 text-[11px] mt-0.5">{item.reason}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Quadrant 4: Maintenance */}
                <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300 tracking-wide flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Spaced Maintenance
                    </span>
                    <span className="text-[10px] text-emerald-300 font-mono">
                      Moderate/Easy · Later
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {(plan.triageMatrix?.maintenance || []).length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No courses in this quadrant.</p>
                    ) : (
                      (plan.triageMatrix?.maintenance || []).map((item, idx) => (
                        <div key={idx} className="bg-slate-950/70 border border-emerald-900/30 rounded-lg p-2.5 text-xs">
                          <p className="font-bold text-emerald-200">{item.subject}</p>
                          <p className="text-slate-300 text-[11px] mt-0.5">{item.reason}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* AI-Generated Daily Study Schedule Based on Priority Matrix */}
            {plan.priorityDailySchedule && plan.priorityDailySchedule.length > 0 && (
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-3 border-b border-slate-800">
                  <div>
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      <Target className="w-5 h-5 text-indigo-400" />
                      Today's Study Schedule (Priority Matrix Recommendations)
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Recommended daily study duration, priority level, and suggested activity for each subject
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    {plan.priorityDailySchedule.length} {plan.priorityDailySchedule.length === 1 ? 'Subject' : 'Subjects'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {plan.priorityDailySchedule.map((item, idx) => {
                    const isCritical =
                      item.priorityLevel.toLowerCase().includes('critical') || item.priorityLevel.includes('P1');
                    const isHigh =
                      item.priorityLevel.toLowerCase().includes('high') || item.priorityLevel.includes('P2');
                    const isModerate =
                      item.priorityLevel.toLowerCase().includes('moderate') ||
                      item.priorityLevel.includes('quick') ||
                      item.priorityLevel.includes('P3');

                    const badgeClass = isCritical
                      ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                      : isHigh
                      ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                      : isModerate
                      ? 'bg-sky-950/60 text-sky-300 border-sky-800/60'
                      : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60';

                    return (
                      <div
                        key={idx}
                        className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-4 space-y-3 transition-colors hover:border-slate-700/80 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-sm text-white leading-snug">{item.subject}</span>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border shrink-0 ${badgeClass}`}>
                              {item.priorityLevel}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-slate-300">
                            <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span className="text-slate-400">Recommended Duration:</span>
                            <span className="font-mono font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              {item.recommendedDailyDuration}
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-800/60 space-y-1">
                          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            Suggested Study Activity:
                          </span>
                          <p className="text-xs text-slate-200 bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5 leading-relaxed">
                            {item.suggestedActivity}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Subject Time Allocation */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-400" />
                  Subject Effort &amp; Cognitive Strategy
                </h4>
              </div>

              {/* Visual percentage distribution bar */}
              <div className="w-full bg-slate-950 rounded-lg h-3 overflow-hidden flex border border-slate-800">
                {(plan.subjectsBreakdown || []).map((s, idx) => {
                  const colors = [
                    'bg-indigo-500',
                    'bg-cyan-500',
                    'bg-emerald-500',
                    'bg-amber-500',
                    'bg-rose-500'
                  ];
                  return (
                    <div
                      key={idx}
                      className={`${colors[idx % colors.length]} h-full transition-all`}
                      style={{ width: `${s.percentage}%` }}
                      title={`${s.subject}: ${s.percentage}% (${s.allocatedHours}h)`}
                    />
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(plan.subjectsBreakdown || []).map((s, idx) => (
                  <div key={idx} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white">{s.subject}</span>
                      <span className="text-xs font-mono font-bold text-indigo-300">
                        {s.percentage}%
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      <span className="text-slate-200 font-semibold">{s.allocatedHours} hours</span> allocated
                    </div>
                    <div className="pt-1 text-[11px] text-slate-300 bg-slate-900/80 border border-slate-800 rounded-md p-2">
                      <span className="font-semibold text-indigo-300">Recommended Method:</span> {s.primaryStrategy}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Checklist Progress */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                    Daily Revision Execution Checklist
                  </h4>
                  <p className="text-xs text-slate-400">Mark study blocks complete as you progress</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-mono font-bold text-indigo-300">{progressPercent}% Completed</span>
                  <p className="text-[11px] text-slate-400 font-mono">{completedBlocksCount} of {totalBlocksCount} blocks</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-indigo-500 h-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Day-by-Day Timeline Schedule */}
            <div className="space-y-4">
              {(plan.dailyPlan || []).map((day) => (
                <div
                  key={day.dayNumber}
                  className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-3.5 transition-all hover:border-slate-700/80"
                >
                  {/* Day Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                    <div className="flex items-center gap-3">
                      <div className="px-2.5 py-1 rounded-md bg-slate-800 text-indigo-300 border border-slate-700 text-xs font-mono font-bold flex items-center gap-1.5">
                        <span>Day {day.dayNumber}</span>
                        {day.dayNumber === 1 && (
                          <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-1 rounded border border-emerald-800/60 font-sans font-semibold">
                            Today
                          </span>
                        )}
                      </div>
                      <div>
                        <h5 className="font-bold text-white text-sm sm:text-base">{day.dayTheme}</h5>
                        <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {day.date}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs font-mono text-slate-400 bg-slate-950/60 px-2.5 py-1 rounded-md border border-slate-800 w-fit">
                      {Math.round(((day.totalMinutes || 0) / 60) * 10) / 10} hours scheduled
                    </div>
                  </div>

                  {/* Study Blocks for this day */}
                  <div className="space-y-2.5">
                    {(day.blocks || []).map((block) => {
                      const isDone = !!completedBlocks[block.id];
                      return (
                        <div
                          key={block.id}
                          onClick={() => toggleBlock(block.id)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                            isDone
                              ? 'bg-slate-950/30 border-emerald-900/30 opacity-60'
                              : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isDone}
                            readOnly
                            className="mt-1 w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 accent-indigo-500 cursor-pointer"
                          />

                          <div className="flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                  isDone
                                    ? 'bg-slate-800 text-slate-400'
                                    : 'bg-indigo-950/70 text-indigo-300 border border-indigo-800/40'
                                }`}
                              >
                                {block.subject}
                              </span>
                              <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                {block.durationMinutes} mins
                              </span>
                              <span className="text-[11px] px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                                {block.technique}
                              </span>
                            </div>

                            <p
                              className={`text-sm leading-snug ${
                                isDone ? 'line-through text-slate-500' : 'text-slate-200'
                              }`}
                            >
                              {block.topic}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Back to top / Reset Button */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-xs font-semibold px-4 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Back to Configuration
              </button>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-600 mt-12">
        <p>StudyMatrix AI · Built for College Hackathon</p>
      </footer>
    </div>
  );
}
