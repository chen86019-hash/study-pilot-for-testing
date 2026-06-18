import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

type IntensityMode = 'easy' | 'normal' | 'sprint';
type ProgressQuality = 'solid' | 'rough' | 'distracted';

interface Book {
  id: string;
  title: string;
  unitType: 'pages' | 'chapters'; 
  totalUnits: number;
  completedUnits: number; 
  startDate: string;       
  deadline: string;        
  targetRounds: number;    
}

interface StudyPlan {
  id: string;
  name: string;
  startDate: string;       
  deadline: string;
  books: Book[];
  color: string;
}

interface DailyLog {
  id: string;
  date: string; 
  bookId: string;       
  bookTitle: string;
  unitType: 'pages' | 'chapters';
  units: number;
  quality?: ProgressQuality;
  note?: string;
}

interface StrategyCLog {
  bookId: string;
  sourceDate: string;  
  targetDate: string;  
  units: number;       
}

interface FreezeRange {
  id: string;
  start: string;
  end: string;
}

const KEY_INTENSITY = 'studypilot_intensity';
const KEY_PLANS = 'studypilot_plans';
const KEY_LOGS = 'studypilot_logs';
const KEY_REST = 'studypilot_rest';
const KEY_CHECKED = 'studypilot_checked_tasks';
const KEY_STRATEGYC = 'studypilot_strategy_c';
const KEY_FREEZE = 'studypilot_freeze_ranges';
const KEY_REPLAN_DATE = 'studypilot_replan_start_date';

const bridgeLoad = (key: string, defaultValue: any) => {
  try {
    const current = localStorage.getItem(key);
    if (current) return JSON.parse(current);
    return defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

const INTENSITY_CONFIGS = {
  easy: {
    label: '☕ 輕鬆念 (以 65% 速度慢跑，適合調整狀態)',
    ceilings: { pages: 30, chapters: 2 }
  },
  normal: {
    label: '⚖️ 正常念 (100% 基準配速，觸發大腦斷路器安全機制上限)',
    ceilings: { pages: 60, chapters: 3 } 
  },
  sprint: {
    label: '🔥 衝刺念 (全速全力開航！全面解除大腦防護上限，不觸發任何爆量攔截)',
    ceilings: { pages: 9999, chapters: 999 } 
  }
};

const formatDateStr = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const parseLocalDate = (dateStr: string) => {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 0, 0, 0, 0);
  }
  return new Date(dateStr);
};

function App() {
  const todayFormatted = formatDateStr(new Date());

  const [intensity, setIntensity] = useState<IntensityMode>(() => {
    return (localStorage.getItem(KEY_INTENSITY) as IntensityMode) || 'normal';
  });

  const [plans, setPlans] = useState<StudyPlan[]>(() => bridgeLoad(KEY_PLANS, []));
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>(() => bridgeLoad(KEY_LOGS, []));
  const [weeklyRestDays, setWeeklyRestDays] = useState<number[]>(() => bridgeLoad(KEY_REST, [0, 6]));
  const [checkedTasks, setCheckedTasks] = useState<{ [key: string]: boolean }>(() => bridgeLoad(KEY_CHECKED, {}));
  const [strategyCLogs, setStrategyCLogs] = useState<StrategyCLog[]>(() => bridgeLoad(KEY_STRATEGYC, []));
  const [freezeRanges, setFreezeRanges] = useState<FreezeRange[]>(() => bridgeLoad(KEY_FREEZE, []));
  const [replanStartDate, setReplanStartDate] = useState<string>(() => {
    return localStorage.getItem(KEY_REPLAN_DATE) || todayFormatted;
  });

  const [tmpFreezeStart, setTmpFreezeStart] = useState<string>('');
  const [tmpFreezeEnd, setTmpFreezeEnd] = useState<string>('');
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(() => new Date().getMonth());
  const [activeDialog, setActiveDialog] = useState<any | null>(null);
  const [reportDateStr, setReportDateStr] = useState<string>(todayFormatted);

  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanStartDate, setNewPlanStartDate] = useState(todayFormatted); 
  const [newPlanDeadline, setNewPlanDeadline] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookUnitType, setNewBookUnitType] = useState<'pages' | 'chapters'>('pages');
  const [newBookTotal, setNewBookTotal] = useState<number | ''>('');
  const [newBookStartDate, setNewBookStartDate] = useState(todayFormatted); 
  const [newBookDeadline, setNewBookDeadline] = useState(''); 
  const [newBookRounds, setNewBookRounds] = useState<number | ''>(1); 
  const [reportBookId, setReportBookId] = useState('');
  const [reportUnits, setReportUnits] = useState<string>(''); 
  const [reportQuality, setReportQuality] = useState<ProgressQuality>('solid');
  const [reportNote, setReportNote] = useState<string>('');
  const [showReplanModal, setShowReplanModal] = useState<boolean>(false);
  const [modalReplanDate, setModalReplanDate] = useState<string>(todayFormatted);
  const [dateOptions, setDateOptions] = useState<string[]>([]);

  const getSelectedBookUnitLabel = () => {
    if (!reportBookId) return '';
    const allBooks = plans.flatMap(p => p.books || []);
    const target = allBooks.find(b => b.id === reportBookId);
    return target ? (target.unitType === 'pages' ? '📄 頁' : '🔖 章') : '';
  };

  const checkDateNotPast = (dateStr: string, label: string) => {
    if (dateStr < todayFormatted) {
      alert(`⚠️ 防呆阻攔：【${label}】不能早於今天！`);
      return false;
    }
    return true;
  };

  useEffect(() => {
    const options = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      options.push(formatDateStr(d));
    }
    setDateOptions(options);
  }, []);

  useEffect(() => {
    if (selectedPlanId) {
      const p = plans.find(pl => pl.id === selectedPlanId);
      if (p) {
        setNewBookStartDate(p.startDate || todayFormatted);
        setNewBookDeadline(p.deadline);
      }
    }
  }, [selectedPlanId, plans]);

  useEffect(() => {
    localStorage.setItem(KEY_INTENSITY, intensity);
    localStorage.setItem(KEY_PLANS, JSON.stringify(plans));
    localStorage.setItem(KEY_LOGS, JSON.stringify(dailyLogs));
    localStorage.setItem(KEY_REST, JSON.stringify(weeklyRestDays));
    localStorage.setItem(KEY_CHECKED, JSON.stringify(checkedTasks));
    localStorage.setItem(KEY_STRATEGYC, JSON.stringify(strategyCLogs));
    localStorage.setItem(KEY_FREEZE, JSON.stringify(freezeRanges));
    localStorage.setItem(KEY_REPLAN_DATE, replanStartDate);
  }, [intensity, plans, dailyLogs, weeklyRestDays, checkedTasks, strategyCLogs, freezeRanges, replanStartDate]);

  const toggleRestDay = (day: number) => {
    if (weeklyRestDays.length === 6 && !weeklyRestDays.includes(day)) {
      alert('⚠️ 不能把七天全設為休息日，至少要留一天備考開航！');
      return;
    }
    let updated = weeklyRestDays.includes(day)
      ? weeklyRestDays.filter(d => d !== day)
      : [...weeklyRestDays, day].sort();
    setWeeklyRestDays(updated);
  };

  const toggleTaskCheck = (dateStr: string, bookId: string) => {
    const key = `${dateStr}_${bookId}`;
    setCheckedTasks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGoToToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setReportDateStr(formatDateStr(today));
  };

  const handleAddFreezeRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tmpFreezeStart || !tmpFreezeEnd) return;
    if (tmpFreezeEnd < tmpFreezeStart) {
      alert("⚠️ 結束日期不能早於開始日期！");
      return;
    }
    const newRange: FreezeRange = { id: Date.now().toString(), start: tmpFreezeStart, end: tmpFreezeEnd };
    setFreezeRanges([...freezeRanges, newRange]);
    setTmpFreezeStart(''); setTmpFreezeEnd('');
  };

  const handleRemoveFreezeRange = (id: string) => {
    setFreezeRanges(freezeRanges.filter(r => r.id !== id));
  };

  const isDateInFreezeRanges = (dateStr: string) => {
    return freezeRanges.some(r => dateStr >= r.start && dateStr <= r.end);
  };

  const getRemainingWorkDays = (startStr: string, endStr: string) => {
    let count = 0;
    let curr = parseLocalDate(startStr);
    const end = parseLocalDate(endStr);
    let guard = 0;
    while (curr <= end) {
      guard++; if (guard > 2000) break; 
      const currStr = formatDateStr(curr);
      const isWeekRest = weeklyRestDays.includes(curr.getDay());
      const isFrozen = isDateInFreezeRanges(currStr);
      if (!isWeekRest && !isFrozen) count++;
      curr.setDate(curr.getDate() + 1);
    }
    return count;
  };

  // 純物理日曆天數計算 (不扣除休息日)
  const getCalendarDaysRemaining = (endStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = parseLocalDate(endStr);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays < 0 ? 0 : diffDays;
  };

  const handleExecuteReplan = () => {
    setReplanStartDate(modalReplanDate);
    setStrategyCLogs([]); 
    setShowReplanModal(false);
    alert(`🎯 配速校準成功！已將 ${modalReplanDate} 設定為全新配速重新計算基準日。`);
  };

  const getDayPlanDetails = (gridDate: Date) => {
    const target = new Date(gridDate.getFullYear(), gridDate.getMonth(), gridDate.getDate(), 0, 0, 0, 0);
    const dateStr = formatDateStr(target);
    const today = new Date(); today.setHours(0,0,0,0);
    const todayStr = formatDateStr(today);

    const isWeekRest = weeklyRestDays.includes(target.getDay());
    const isFrozenDay = isDateInFreezeRanges(dateStr);
    const isRest = isWeekRest || isFrozenDay;
    const dayLogs = dailyLogs.filter(l => l.date === dateStr);

    let finalRecs: any[] = [];
    let isOverloaded = false; 
    let globalFutureOverload = false; // 全域未來爆量偵測
    let globalFirstOverloadDateStr = '';  
    let truncatedBooks: any[] = [];

    if (!plans || plans.length === 0) {
      return { isRest, isFrozenDay, dayLogs, recommendations: [], dateStr, isOverloaded, globalFutureOverload, globalFirstOverloadDateStr, overloadReason: '', truncatedBooks };
    }

    let simulatedProgress: { [bookId: string]: number } = {};
    let advanceSurplusPool: { [bookId: string]: number } = {};

    plans.forEach(p => {
      if (p.books) {
        p.books.forEach(b => { simulatedProgress[b.id] = 0; advanceSurplusPool[b.id] = 0; });
      }
    });

    let earliestStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5);
    let absoluteLatestDeadline = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 45);
    
    plans.forEach(p => {
      const pStart = parseLocalDate(p.startDate || todayStr);
      if (pStart < earliestStart) earliestStart = pStart;
      if (p.books) {
        p.books.forEach(b => {
          const bStart = parseLocalDate(b.startDate || todayStr);
          const bEnd = parseLocalDate(b.deadline);
          if (bStart < earliestStart) earliestStart = bStart;
          if (bEnd > absoluteLatestDeadline) absoluteLatestDeadline = bEnd;
        });
      }
    });

    let scanDate = new Date(earliestStart.getFullYear(), earliestStart.getMonth(), earliestStart.getDate(), 0, 0, 0, 0);
    let mainLoopGuard = 0;
    let dynamicStrategyCLogs: StrategyCLog[] = [];

    while (scanDate <= absoluteLatestDeadline) {
      mainLoopGuard++; if (mainLoopGuard > 2000) break; 
      
      const scanDateStr = formatDateStr(scanDate);
      const scanIsWeekRest = weeklyRestDays.includes(scanDate.getDay());
      const scanIsFrozen = isDateInFreezeRanges(scanDateStr);
      const scanIsRest = scanIsWeekRest || scanIsFrozen;

      plans.forEach(p => {
        if (!p.books) return;
        p.books.forEach(b => {
          const bStart = parseLocalDate(b.startDate);
          const bDeadline = parseLocalDate(b.deadline);
          
          if (scanDate < bStart || scanDate > bDeadline) return;

          const totalTargetUnits = b.totalUnits * (b.targetRounds || 1);
          let currentPointer = simulatedProgress[b.id] || 0; 
          if (currentPointer >= totalTargetUnits) return;

          let finalDayUnits = 0;
          let displayDetailStr = '';

          if (!scanIsRest) {
            let calculationStartDateStr = scanDateStr;
            if (scanDateStr >= replanStartDate) {
              calculationStartDateStr = scanDateStr;
            }

            const remainWorkDays = getRemainingWorkDays(calculationStartDateStr, b.deadline);
            if (remainWorkDays <= 0) {
              finalDayUnits = Math.max(0, totalTargetUnits - currentPointer); 
            } else {
              let rawRec = (totalTargetUnits - currentPointer) / remainWorkDays;
              if (rawRec <= 0) rawRec = 0;

              let calculatedRec = rawRec;
              const activeMode = scanDateStr < todayStr ? 'normal' : intensity;

              if (activeMode === 'easy') calculatedRec = rawRec * 0.65;
              else if (activeMode === 'sprint') calculatedRec = rawRec * 1.40;

              if (b.unitType === 'pages') {
                finalDayUnits = Math.ceil(calculatedRec);
              } else {
                if (calculatedRec < 1) {
                  finalDayUnits = 1; 
                  const daysByCh = Math.ceil(1 / calculatedRec);
                  const curDays = Math.floor((currentPointer % 1) * daysByCh);
                  const curNum = (curDays % daysByCh) + 1;
                  displayDetailStr = `(第 ${curNum}/${daysByCh} 天)`;
                  finalDayUnits = 1 / daysByCh;
                } else {
                  finalDayUnits = Math.round(calculatedRec);
                  if (finalDayUnits < 1) finalDayUnits = 1;
                }
              }
            }
          }

          if (scanDateStr >= todayStr && advanceSurplusPool[b.id] > 0 && finalDayUnits > 0) {
            if (advanceSurplusPool[b.id] >= finalDayUnits) {
              advanceSurplusPool[b.id] -= finalDayUnits; finalDayUnits = 0;
            } else {
              finalDayUnits -= advanceSurplusPool[b.id]; advanceSurplusPool[b.id] = 0;
            }
          }

          const incomingCValue = dynamicStrategyCLogs.filter(cl => cl.bookId === b.id && cl.targetDate === scanDateStr).reduce((sum, cl) => sum + cl.units, 0);
          if (incomingCValue > 0) finalDayUnits += incomingCValue;

          const activeCeilingMode = scanDateStr < todayStr ? 'normal' : intensity;
          const ceiling = INTENSITY_CONFIGS[activeCeilingMode].ceilings;
          
          let isDayBookOverloaded = false;
          let oriUnitsBeforeTruncate = finalDayUnits;

          if (activeCeilingMode !== 'sprint') {
            if (b.unitType === 'pages' && finalDayUnits > ceiling.pages) {
              isDayBookOverloaded = true; finalDayUnits = ceiling.pages;
            } else if (b.unitType === 'chapters' && finalDayUnits > ceiling.chapters) {
              isDayBookOverloaded = true; finalDayUnits = ceiling.chapters;
            }
          }

          // 全域超前部署預警偵測：只要今天之後有任何一天碰到天花板，立刻觸發警告
          if (isDayBookOverloaded && scanDateStr >= todayStr) {
            if (!globalFutureOverload) {
              globalFutureOverload = true;
              globalFirstOverloadDateStr = scanDateStr;
            }

            const diff = oriUnitsBeforeTruncate - finalDayUnits;
            let nextValidDate = new Date(scanDate.getFullYear(), scanDate.getMonth(), scanDate.getDate() + 1, 0,0,0,0);
            let nextGuard = 0;
            while (nextGuard < 100) {
              nextGuard++;
              const nvStr = formatDateStr(nextValidDate);
              const nvWeekRest = weeklyRestDays.includes(nextValidDate.getDay());
              const nvFrozen = isDateInFreezeRanges(nvStr);
              if (!nvWeekRest && !nvFrozen && nvStr <= b.deadline) {
                dynamicStrategyCLogs.push({ bookId: b.id, sourceDate: scanDateStr, targetDate: nvStr, units: diff });
                break;
              }
              nextValidDate.setDate(nextValidDate.getDate() + 1);
            }
          }

          const outboundCValue = dynamicStrategyCLogs.filter(cl => cl.bookId === b.id && cl.sourceDate === scanDateStr).reduce((sum, cl) => sum + cl.units, 0);
          if (outboundCValue > 0) {
            finalDayUnits = Math.max(0, oriUnitsBeforeTruncate - outboundCValue);
          }

          if (scanDate <= today) {
            const matchedLogs = dailyLogs.filter(l => l.date === scanDateStr && l.bookId === b.id);
            if (matchedLogs.length > 0) {
              const actualDone = matchedLogs.reduce((s, c) => s + c.units, 0);
              if (actualDone > finalDayUnits && scanDateStr === todayStr) {
                advanceSurplusPool[b.id] += (actualDone - finalDayUnits);
              }
              finalDayUnits = actualDone;
            }
          }

          let startUnit = Math.floor(currentPointer % b.totalUnits) + 1;
          let endUnit = Math.floor((currentPointer + finalDayUnits) % b.totalUnits);
          if (endUnit === 0 && finalDayUnits > 0) endUnit = b.totalUnits;
          if (endUnit < startUnit) endUnit = startUnit; 

          let rangeText = '';
          if (b.unitType === 'pages') {
            rangeText = startUnit === endUnit ? `第 ${startUnit} 頁` : `第 ${startUnit} ～ ${endUnit} 頁`;
          } else {
            if (displayDetailStr) rangeText = `第 ${startUnit} 章 ${displayDetailStr}`;
            else rangeText = startUnit === endUnit ? `第 ${startUnit} 章` : `第 ${startUnit} ～ ${endUnit} 章`;
          }
          if (outboundCValue > 0 && finalDayUnits <= 0) rangeText = '今日超載進度已移編至未來';
          if (finalDayUnits === 0 && scanDateStr >= todayStr) rangeText = '🎉 昨日超前研讀，今日配額已被完美抵銷！';

          const itemPayload = {
            id: b.id, title: b.title, planName: p.name, color: p.color,
            rec: b.unitType === 'pages' ? Math.ceil(finalDayUnits * 10) / 10 : Math.ceil(finalDayUnits * 100) / 100, 
            rawRec: finalDayUnits, unitType: b.unitType, rangeText: rangeText,
            currentRound: Math.floor(currentPointer / b.totalUnits) + 1,
            totalRounds: b.targetRounds || 1, startDate: b.startDate, deadline: b.deadline
          };

          if (scanDateStr === dateStr) {
            if (!scanIsRest || finalDayUnits > 0 || dayLogs.length > 0) {
              finalRecs.push(itemPayload);
              if (isDayBookOverloaded && intensity !== 'sprint') {
                isOverloaded = true;
                truncatedBooks.push({ title: b.title, excess: Math.ceil((oriUnitsBeforeTruncate - finalDayUnits) * 10) / 10, unitType: b.unitType });
              }
            }
          }
          simulatedProgress[b.id] = (simulatedProgress[b.id] || 0) + finalDayUnits;
        });
      });

      scanDate.setDate(scanDate.getDate() + 1);
    }

    return {
      isRest, isFrozenDay, dayLogs, recommendations: finalRecs, dateStr,
      isOverloaded, globalFutureOverload, globalFirstOverloadDateStr, 
      overloadReason: '🧠【備考大腦防護斷路器】偵測到今日部分教材量能觸頂！系統已自動平攤超出部分。', 
      truncatedBooks
    };
  };

  const getMonthGrid = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const grid = [];
    const startOffset = firstDay.getDay();
    for (let i = startOffset - 1; i >= 0; i--) { grid.push({ date: new Date(currentYear, currentMonth, -i), isCurrent: false }); }
    for (let i = 1; i <= lastDay.getDate(); i++) { grid.push({ date: new Date(currentYear, currentMonth, i), isCurrent: true }); }
    return grid;
  };

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName.trim() || !newPlanStartDate || !newPlanDeadline) return;
    if (!checkDateNotPast(newPlanStartDate, "科目框架起始日")) return;
    if (!checkDateNotPast(newPlanDeadline, "科目框架截止日")) return;
    if (newPlanDeadline < newPlanStartDate) { alert("⚠️ 截止日不能早於起始日！"); return; }
    const colors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    setPlans([...plans, {
      id: Date.now().toString(), name: newPlanName, startDate: newPlanStartDate, deadline: newPlanDeadline,
      color: colors[plans.length % colors.length], books: []
    }]);
    setNewPlanName(''); setNewPlanStartDate(todayFormatted); setNewPlanDeadline('');
  };

  const handleAddBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId || !newBookTitle.trim() || !newBookTotal || !newBookStartDate || !newBookDeadline) return;
    if (!checkDateNotPast(newBookStartDate, "教材研讀起始日")) return;
    if (!checkDateNotPast(newBookDeadline, "教材研修截止日")) return;
    if (newBookDeadline < newBookStartDate) { alert("⚠️ 教材截止日不能早於起始日！"); return; }

    setPlans(prev => prev.map(p => {
      if (p.id !== selectedPlanId) return p;
      return {
        ...p,
        books: [...(p.books || []), {
          id: Date.now().toString(), title: newBookTitle, unitType: newBookUnitType,
          totalUnits: Number(newBookTotal), completedUnits: 0, startDate: newBookStartDate,
          deadline: newBookDeadline, targetRounds: newBookRounds === '' ? 1 : Number(newBookRounds) 
        }]
      };
    }));
    setNewBookTitle(''); setNewBookTotal(''); setNewBookRounds(1);
  };

  const handleReportProgress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportBookId || !reportUnits || Number(reportUnits) <= 0) return;
    let targetPlanId = '';
    let foundBook = plans.flatMap(p => p.books || []).find(b => {
      if (b.id === reportBookId) {
        const p = plans.find(pl => (pl.books || []).some(bk => bk.id === b.id));
        if (p) targetPlanId = p.id; return true;
      }
      return false;
    });
    if (!foundBook) return;

    setDailyLogs([{ 
      id: Date.now().toString(), date: reportDateStr, bookId: reportBookId,
      bookTitle: foundBook.title, unitType: foundBook.unitType, units: Number(reportUnits),
      quality: reportQuality, note: reportNote.trim() || undefined
    }, ...dailyLogs]);

    setPlans(prev => prev.map(p => {
      if (p.id !== targetPlanId) return p;
      return { ...p, books: (p.books || []).map(b => b.id === reportBookId ? { ...b, completedUnits: (b.completedUnits || 0) + Number(reportUnits) } : b) };
    }));
    
    setReportUnits(''); setReportQuality('solid'); setReportNote('');
  };

  const handleDeleteLog = (logId: string, bookId: string, units: number) => {
    if (!confirm(`確定要刪除這筆進度嗎？`)) return;
    setDailyLogs(prev => prev.filter(l => l.id !== logId));
    setPlans(prev => prev.map(p => ({
      ...p, books: (p.books || []).map(b => b.id === bookId ? { ...b, completedUnits: Math.max(0, (b.completedUnits || 0) - units) } : b)
    })));
  };

  const handleDeletePlan = (planId: string) => {
    if (confirm('⚠️ 確定要刪除此主考框架嗎？')) setPlans(plans.filter(p => p.id !== planId));
  };

  const handleDeleteBook = (planId: string, bookId: string) => {
    if (confirm('確定要移除此教材嗎？')) {
      setPlans(plans.map(p => p.id === planId ? { ...p, books: (p.books || []).filter(b => b.id !== bookId) } : p));
    }
  };

  const handleEditBook = (planId: string, bookId: string) => {
    const plan = plans.find(p => p.id === planId);
    const book = plan?.books?.find(b => b.id === bookId);
    if (!book) return;
    const unitLabel = book.unitType === 'pages' ? '頁數' : '章節數';
    const newTitle = prompt(`修改名稱：`, book.title);
    const newTotal = prompt(`修改單輪總量 (${unitLabel})：`, String(book.totalUnits));
    const newRounds = prompt(`修改預計複習圈數：`, String(book.targetRounds || 1));
    const newStart = prompt(`修正計畫起始日 (YYYY-MM-DD)：`, book.startDate || formatDateStr(new Date()));
    const newDate = prompt(`修正死線日 (YYYY-MM-DD)：`, book.deadline);

    if (newTitle && newTotal && newRounds && newStart && newDate) {
      setPlans(plans.map(p => p.id === planId ? {
        ...p, books: (p.books || []).map(b => b.id === bookId ? {
          ...b, title: newTitle, totalUnits: Number(newTotal), targetRounds: Number(newRounds), startDate: newStart, deadline: newDate
        } : b)
      } : p));
    }
  };

  const parsedTargetDate = parseLocalDate(reportDateStr);
  const { 
    isRest: activeIsRest, 
    isFrozenDay: activeIsFrozen, 
    recommendations: activeRecs = [], 
    isOverloaded: activeIsOverloaded, 
    dayLogs: activeDayLogs = [], 
    overloadReason: activeOverloadReason, 
    truncatedBooks: activeTruncatedBooks = [],
    globalFutureOverload: activeGlobalFutureOverload,
    globalFirstOverloadDateStr: activeGlobalFirstOverloadDate
  } = getDayPlanDetails(parsedTargetDate);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: 'system-ui, sans-serif', color: '#0f172a', fontSize: '16px' }}>
      <header style={{ backgroundColor: '#fff', borderBottom: '2px solid #cbd5e1', padding: '20px 24px' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#1e293b' }}>🎯 StudyPilot 每日備考領航員</h1>
              <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px', fontWeight: 'bold' }}>
                📅 今日時間座標：<span style={{ color: '#2563eb' }}>{todayFormatted}</span>
                {replanStartDate !== todayFormatted && <span style={{ marginLeft: '12px', color: '#b45309' }}>🔄 已於 {replanStartDate} 執行重新安排</span>}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button 
                onClick={() => { setModalReplanDate(todayFormatted); setShowReplanModal(true); }} 
                style={{ padding: '10px 20px', fontSize: '14px', cursor: 'pointer', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(220,38,38,0.2)' }}
              >
                🔄 一鍵重新安排
              </button>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '6px', borderRadius: '10px', border: '2px solid #cbd5e1' }}>
                  <button onClick={() => setIntensity('easy')} style={{ padding: '8px 16px', fontSize: '14px', cursor: 'pointer', border: 'none', borderRadius: '8px', fontWeight: 'bold', backgroundColor: intensity === 'easy' ? '#fff' : 'transparent', color: intensity === 'easy' ? '#1e40af' : '#64748b' }}>☕ 輕鬆念</button>
                  <button onClick={() => setIntensity('normal')} style={{ padding: '8px 16px', fontSize: '14px', cursor: 'pointer', border: 'none', borderRadius: '8px', fontWeight: 'bold', backgroundColor: intensity === 'normal' ? '#fff' : 'transparent', color: intensity === 'normal' ? '#166534' : '#64748b' }}>⚖️ 正常念</button>
                  <button onClick={() => setIntensity('sprint')} style={{ padding: '8px 16px', fontSize: '14px', cursor: 'pointer', border: 'none', borderRadius: '8px', fontWeight: 'bold', backgroundColor: intensity === 'sprint' ? '#fff' : 'transparent', color: intensity === 'sprint' ? '#991b1b' : '#64748b' }}>🔥 衝刺念</button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setCurrentTab('dashboard')} style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', backgroundColor: currentTab === 'dashboard' ? '#eff6ff' : '#fff', color: currentTab === 'dashboard' ? '#2563eb' : '#475569', border: '2px solid #cbd5e1', borderRadius: '8px' }}>📊 作戰導航板</button>
                <button onClick={() => setCurrentTab('calendar')} style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', backgroundColor: currentTab === 'calendar' ? '#eff6ff' : '#fff', color: currentTab === 'calendar' ? '#2563eb' : '#475569', border: '2px solid #cbd5e1', borderRadius: '8px' }}>🗓️ 智慧配速行事曆</button>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '10px 16px', borderRadius: '8px', borderLeft: '4px solid #6366f1', fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>
            💡 當前配速模式說明：<span style={{ color: intensity === 'sprint' ? '#dc2626' : intensity === 'normal' ? '#166534' : '#2563eb' }}>{INTENSITY_CONFIGS[intensity].label}</span>
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 400px', display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#475569' }}>🔒 每週固定隔離休息日：</span>
              {['日', '一', '二', '三', '四', '五', '六'].map((name, index) => {
                const isRest = weeklyRestDays.includes(index);
                return (
                  <label key={index} style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', backgroundColor: isRest ? '#fee2e2' : '#fff', padding: '4px 10px', borderRadius: '6px', border: isRest ? '2px solid #fca5a5' : '1px solid #cbd5e1', color: isRest ? '#991b1b' : '#475569', fontWeight: isRest ? 'bold' : 'normal' }}>
                    <input type="checkbox" checked={isRest} onChange={() => toggleRestDay(index)} />
                    週{name}
                  </label>
                );
              })}
            </div>

            <div style={{ flex: '1 1 700px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#fff7ed', padding: '14px 18px', borderRadius: '10px', border: '2px solid #ffedd5' }}>
              <form onSubmit={handleAddFreezeRange} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', borderBottom: '1px dashed #fed7aa', paddingBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#c2410c' }}>➕ 新增特殊無法閱讀日：</span>
                <input type="date" value={tmpFreezeStart} onChange={e => setTmpFreezeStart(e.target.value)} style={{ padding: '4px 8px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px' }} required />
                <span style={{ fontSize: '13px', color: '#9a3412' }}>至</span>
                <input type="date" value={tmpFreezeEnd} onChange={e => setTmpFreezeEnd(e.target.value)} style={{ padding: '4px 8px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px' }} required />
                <button type="submit" style={{ padding: '4px 12px', fontSize: '12px', cursor: 'pointer', backgroundColor: '#ea580c', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>納入排除清單</button>
              </form>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {freezeRanges.length === 0 ? (
                  <span style={{ fontSize: '12px', color: '#9a3412', fontStyle: 'italic' }}>📌 目前無登記特殊排除日期</span>
                ) : freezeRanges.map(r => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#fffff0', border: '1px solid #fcd34d', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', fontWeight: 'bold', color: '#92400e' }}>
                    <span>⏳ {r.start.replace(/-/g, '/')} ~ {r.end.replace(/-/g, '/')}</span>
                    <button type="button" onClick={() => handleRemoveFreezeRange(r.id)} style={{ border: 'none', backgroundColor: 'transparent', color: '#dc2626', cursor: 'pointer', fontWeight: '900' }}>×</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1240px', margin: '0 auto', padding: '24px 20px' }}>
        {currentTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* 新增：全域超前部署預警橫幅 */}
            {activeGlobalFutureOverload && intensity !== 'sprint' && (
              <div style={{ backgroundColor: '#fee2e2', border: '2px solid #ef4444', padding: '16px 20px', borderRadius: '12px' }}>
                <h3 style={{ margin: 0, color: '#b91c1c', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ⚠️ 系統超前預警：計畫期間內出現爆量風險！
                </h3>
                <p style={{ margin: '8px 0 0 0', color: '#991b1b', fontSize: '14px', fontWeight: 'bold' }}>
                  系統偵測到未來排程（預計於 <strong style={{ textDecoration: 'underline' }}>{activeGlobalFirstOverloadDate}</strong>）將發生產能溢出。請提早調整休息日或縮減計畫，避免當日負載過重。
                </p>
              </div>
            )}

            <div style={{ 
              backgroundColor: (activeIsOverloaded && intensity !== 'sprint') ? '#fff1f2' : activeIsFrozen ? '#fff7ed' : (activeIsRest && activeRecs.length === 0) ? '#f8fafc' : '#f0fdf4', 
              border: (activeIsOverloaded && intensity !== 'sprint') ? '3px solid #ef4444' : activeIsFrozen ? '2px solid #fed7aa' : (activeIsRest && activeRecs.length === 0) ? '2px solid #cbd5e1' : '2px solid #bbf7d0', 
              padding: '24px', 
              borderRadius: '14px' 
            }}>
              <h3 style={{ margin: 0, color: (activeIsOverloaded && intensity !== 'sprint') ? '#991b1b' : activeIsFrozen ? '#c2410c' : (activeIsRest && activeRecs.length === 0) ? '#475569' : '#166534', fontSize: '18px', fontWeight: '800' }}>
                🚀 航線作戰進度分配建議 (觀測日期: <span style={{ color: '#2563eb' }}>{reportDateStr}</span>)
              </h3>

              {activeIsOverloaded && intensity !== 'sprint' && (
                <div style={{ marginTop: '12px', padding: '14px 18px', backgroundColor: '#fee2e2', border: '2px solid #fca5a5', borderRadius: '10px', color: '#9f1239', fontSize: '14px', fontWeight: 'bold', lineHeight: '1.6' }}>
                  🛑 {activeOverloadReason}
                  <div style={{ marginTop: '8px', fontSize: '14px', fontWeight: '900', color: '#be123c', backgroundColor: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ffe4e6' }}>
                    🔍 今日遭到安全機制分流的教材：
                    {activeTruncatedBooks.map((tb: any, tbx: number) => (
                      <span key={tbx} style={{ marginLeft: '6px', backgroundColor: '#ffe4e6', padding: '2px 6px', borderRadius: '4px' }}>
                        {tb.title} (平攤移編: {tb.excess} {tb.unitType === 'pages' ? '頁' : '章'})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '16px' }}>
                {activeIsFrozen ? (
                  <div style={{ padding: '12px 0', fontWeight: 'bold', color: '#ea580c', fontSize: '15px' }}>⏳ 系統提示：目前觀測日正處於已登記的無法閱讀日中。</div>
                ) : (activeIsRest && activeRecs.length === 0 && activeDayLogs.length === 0) ? (
                  <div style={{ padding: '12px 0', fontWeight: 'bold', color: '#475569', fontSize: '15px' }}>🔒 本日為基本隔離休息日。若有研讀，可直接於下方回報進度或追補小記。</div>
                ) : activeRecs.length === 0 && activeDayLogs.length === 0 ? (
                  <p style={{ margin: 0, color: '#64748b', fontStyle: 'italic', fontSize: '15px' }}>☕ 本日無常態任務（進度超前，今日配額已被先前完美抵銷！）</p>
                ) : (
                  activeRecs.map((r: any, i: number) => {
                    const unitName = r.unitType === 'pages' ? '頁' : '章';
                    return (
                      <div key={i} style={{ backgroundColor: '#fff', padding: '16px 20px', borderRadius: '10px', borderLeft: `6px solid ${r.color}`, border: '1px solid #cbd5e1', minWidth: '280px', flex: '1' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>
                          <span>🗂 {r.planName}</span>
                          <span style={{ color: '#b45309' }}>🔄 輪次：{r.currentRound} / {r.totalRounds}</span>
                        </div>
                        <div style={{ fontWeight: '900', fontSize: '18px', marginTop: '6px', color: '#0f172a' }}>
                          {r.title}：<span style={{ color: '#2563eb', fontSize: '22px' }}>{r.rec} {unitName}</span>
                        </div>
                        <div style={{ fontSize: '14px', color: '#059669', backgroundColor: '#ecfdf5', padding: '8px 10px', borderRadius: '6px', marginTop: '10px', fontWeight: 'bold', border: '1px solid #a7f3d0' }}>
                          <span>📍 研讀定位點：{r.rangeText}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '2px solid #2563eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#1e3a8a', fontWeight: 'bold' }}>✍️ 研讀進度實質回報</h3>
                    <select value={reportDateStr} onChange={e => setReportDateStr(e.target.value)} style={{ padding: '6px 10px', borderRadius: '8px', border: '2px solid #2563eb', fontSize: '13px', fontWeight: 'bold', color: '#2563eb', backgroundColor: '#f0f9ff' }}>
                      {dateOptions.map(d => <option key={d} value={d}>{d === todayFormatted ? `今天 (${d})` : `歷史補登：${d}`}</option>)}
                    </select>
                  </div>
                  <form onSubmit={handleReportProgress} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <select value={reportBookId} onChange={e => setReportBookId(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} required>
                      <option value="">-- 選擇研讀教材 --</option>
                      {plans.flatMap(p => (p.books || []).map(b => (
                        <option key={b.id} value={b.id}>[{p.name}] {b.title}</option>
                      )))}
                    </select>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="number" step="any" placeholder="請輸入完成量" value={reportUnits} onChange={e => setReportUnits(e.target.value)} style={{ flex: 1, padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }} required />
                      {reportBookId && (
                        <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e40af', backgroundColor: '#dbeafe', padding: '10px 14px', borderRadius: '8px' }}>
                          {getSelectedBookUnitLabel()}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>🧠 評估本次研讀吸收品質：</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="button" onClick={() => setReportQuality('solid')} style={{ flex: 1, padding: '8px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer', border: reportQuality === 'solid' ? '2px solid #166534' : '1px solid #cbd5e1', backgroundColor: reportQuality === 'solid' ? '#dcfce7' : '#fff', color: '#14532d', fontWeight: 'bold' }}>✨ 扎實理解</button>
                        <button type="button" onClick={() => setReportQuality('rough')} style={{ flex: 1, padding: '8px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer', border: reportQuality === 'rough' ? '2px solid #b45309' : '1px solid #cbd5e1', backgroundColor: reportQuality === 'rough' ? '#fef3c7' : '#fff', color: '#78350f', fontWeight: 'bold' }}>⚠️ 讀很粗略</button>
                        <button type="button" onClick={() => setReportQuality('distracted')} style={{ flex: 1, padding: '8px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer', border: reportQuality === 'distracted' ? '2px solid #991b1b' : '1px solid #cbd5e1', backgroundColor: reportQuality === 'distracted' ? '#fee2e2' : '#fff', color: '#7f1d1d', fontWeight: 'bold' }}>💤 精神渙散</button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>📝 每日小記 / 補強提醒備忘錄（可留空）：</label>
                      <input type="text" placeholder="例如：後半段化學式不懂，明天需回頭複習" value={reportNote} onChange={e => setReportNote(e.target.value)} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }} />
                    </div>
                    <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', marginTop: '4px' }}>確認送出實質進度</button>
                  </form>
                </div>

                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                  <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', fontWeight: 'bold' }}>🆕 建立新主考科目大框架</h3>
                  <form onSubmit={handleCreatePlan} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input type="text" placeholder="例如：食品檢驗分析乙級" value={newPlanName} onChange={e => setNewPlanName(e.target.value)} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }} required />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 'bold' }}>📅 起始日：</label>
                      <input type="date" value={newPlanStartDate} onChange={e => setNewPlanStartDate(e.target.value)} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }} required />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 'bold' }}>🏁 截止日：</label>
                      <input type="date" value={newPlanDeadline} onChange={e => setNewPlanDeadline(e.target.value)} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }} required />
                    </div>
                    <button type="submit" style={{ backgroundColor: '#0f172a', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px' }}>確認建立科目框架</button>
                  </form>
                </div>

                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                  <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', fontWeight: 'bold' }}>📚 綁定教材進入排程</h3>
                  <form onSubmit={handleAddBook} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <select value={selectedPlanId} onChange={e => setSelectedPlanId(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} required>
                      <option value="">-- 選擇所屬主框架 --</option>
                      {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input type="text" placeholder="教材 / 書籍講義全名" value={newBookTitle} onChange={e => setNewBookTitle(e.target.value)} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }} required />
                    <div style={{ display: 'flex', gap: '16px', fontSize: '14px', fontWeight: 'bold' }}>
                      <label><input type="radio" checked={newBookUnitType === 'pages'} onChange={() => setNewBookUnitType('pages')} /> 📄 頁數計算</label>
                      <label><input type="radio" checked={newBookUnitType === 'chapters'} onChange={() => setNewBookUnitType('chapters')} /> 🔖 章節計算</label>
                    </div>
                    <input type="number" min="1" placeholder="單輪總量" value={newBookTotal} onChange={e => setNewBookTotal(e.target.value === '' ? '' : Number(e.target.value))} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }} required />
                    <input type="number" min="1" max="5" placeholder="預計精讀幾輪？" value={newBookRounds} onChange={e => setNewBookRounds(e.target.value === '' ? '' : Number(e.target.value))} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }} required />
                    <input type="date" value={newBookStartDate} onChange={e => setNewBookStartDate(e.target.value)} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }} required />
                    <input type="date" value={newBookDeadline} onChange={e => setNewBookDeadline(e.target.value)} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }} required />
                    <button type="submit" style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px' }}>確認綁定教材</button>
                  </form>
                </div>
              </div>

              <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold' }}>📊 備考大盤教材總庫</h3>
                  {plans.length === 0 ? <p style={{ fontSize: '14px', color: '#64748b', fontStyle: 'italic' }}>目前大盤清空狀態。</p> : plans.map(p => (
                    <div key={p.id} style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: `6px solid ${p.color}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div><span style={{ fontWeight: '900', fontSize: '16px' }}>🗂️ {p.name}</span></div>
                        <button onClick={() => handleDeletePlan(p.id)} style={{ padding: '4px 10px', fontSize: '12px', color: '#ef4444', border: '1px solid #fca5a5', backgroundColor: '#fef2f2', borderRadius: '6px' }}>🗑️ 刪除</button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' }}>
                        {(p.books || []).map(b => {
                          const totalComp = b.completedUnits || 0;
                          const globalMaxUnits = b.totalUnits * (b.targetRounds || 1);
                          const globalPct = Math.min(100, Math.round((totalComp / globalMaxUnits) * 100));
                          
                          // 修正：純日曆剩餘天數計算
                          const calendarRemainDays = getCalendarDaysRemaining(b.deadline);

                          return (
                            <div key={b.id} style={{ backgroundColor: '#fff', padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong style={{ fontSize: '15px' }}>📖 {b.title}</strong>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button onClick={() => handleEditBook(p.id, b.id)} style={{ padding: '4px 8px', fontSize: '12px', color: '#2563eb', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff', borderRadius: '6px' }}>✏️ 修正</button>
                                  <button onClick={() => handleDeleteBook(p.id, b.id)} style={{ padding: '4px 8px', fontSize: '12px', color: '#ef4444', border: '1px solid #fca5a5', backgroundColor: '#fef2f2', borderRadius: '6px' }}>🗑️ 移除</button>
                                </div>
                              </div>
                              <div style={{ width: '100%', backgroundColor: '#e2e8f0', height: '10px', borderRadius: '5px', margin: '4px 0', overflow: 'hidden' }}>
                                <div style={{ width: `${globalPct}%`, backgroundColor: p.color, height: '100%' }}></div>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', marginTop: '6px', fontWeight: 'bold' }}>
                                <span>📈 總進度：{totalComp} / {globalMaxUnits} ({globalPct}%)</span>
                                <span style={{ color: calendarRemainDays <= 5 ? '#dc2626' : '#2563eb' }}>⏳ 剩餘天數：{calendarRemainDays} 天</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#334155', fontWeight: 'bold' }}>🛠️ 研讀回報歷史與補強便利貼</h3>
                  <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {dailyLogs.length === 0 ? (
                      <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>暫無紀錄。</p>
                    ) : dailyLogs.map(log => {
                      const isRough = log.quality === 'rough' || log.quality === 'distracted';
                      return (
                        <div key={log.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: isRough ? '#fffbeb' : '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: isRough ? '1px solid #fcd34d' : '1px solid #e2e8f0', fontSize: '14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span style={{ color: '#64748b', marginRight: '6px', fontWeight: 'bold' }}>[{log.date}]</span>
                              <strong>{log.bookTitle}</strong> 
                              <span style={{ marginLeft: '8px', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                                +{log.units} {log.unitType === 'pages' ? '頁' : '章'}
                              </span>
                              {log.quality === 'rough' && <span style={{ marginLeft: '6px', backgroundColor: '#fef3c7', color: '#d97706', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>⚠️ 讀很粗略</span>}
                              {log.quality === 'distracted' && <span style={{ marginLeft: '6px', backgroundColor: '#fee2e2', color: '#dc2626', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>💤 精神渙散</span>}
                            </div>
                            <button onClick={() => handleDeleteLog(log.id, log.bookId, log.units)} style={{ border: 'none', backgroundColor: 'transparent', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}>🗑️ 撤銷</button>
                          </div>
                          {log.note && (
                            <div style={{ fontSize: '12px', color: '#b45309', backgroundColor: '#fff', borderLeft: '3px solid #f59e0b', padding: '4px 8px', borderRadius: '4px', marginTop: '2px', fontStyle: 'italic' }}>
                              📌 小記提醒：{log.note}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentTab === 'calendar' && (
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '14px', border: '1px solid #cbd5e1', maxWidth: '100%', overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', backgroundColor: '#f8fafc', padding: '14px 20px', borderRadius: '10px', minWidth: '700px' }}>
              <button onClick={() => currentMonth === 0 ? (setCurrentMonth(11), setCurrentYear(y => y - 1)) : setCurrentMonth(m => m - 1)} style={{ padding: '8px 16px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 'bold' }}>◀ 上個月</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '900' }}>🗓️ {currentYear} 年 {currentMonth + 1} 月 智慧配速行事曆</h2>
                <button onClick={handleGoToToday} style={{ padding: '6px 14px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold' }}>🏠 今天</button>
              </div>
              <button onClick={() => currentMonth === 11 ? (setCurrentMonth(0), setCurrentYear(y => y + 1)) : setCurrentMonth(m => m + 1)} style={{ padding: '8px 16px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 'bold' }}>下個月 ▶</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(100px, 1fr))', minWidth: '700px', textAlign: 'center', fontWeight: '900', paddingBottom: '12px', borderBottom: '3px solid #e2e8f0', marginBottom: '12px', fontSize: '15px' }}>
              {['日', '一', '二', '三', '四', '五', '六'].map((w, i) => <div key={w} style={{ color: weeklyRestDays.includes(i) ? '#ef4444' : '#475569' }}>週{w}</div>)}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(100px, 1fr))', minWidth: '700px', gap: '8px' }}>
              {getMonthGrid().map((grid, idx) => {
                const { isRest, isFrozenDay, recommendations = [], dateStr, dayLogs = [], isOverloaded } = getDayPlanDetails(grid.date);
                const isToday = todayFormatted === dateStr;
                const roughLogsWithNotes = dayLogs.filter(l => (l.quality === 'rough' || l.quality === 'distracted') && l.note);
                const shouldShowGridOverload = isOverloaded && intensity !== 'sprint';

                return (
                  <div
                    key={idx}
                    onClick={() => setActiveDialog({ dateStr, isRest, isFrozenDay, recommendations, dayLogs, isOverloaded: shouldShowGridOverload })}
                    style={{
                      border: isToday ? '3px solid #2563eb' : shouldShowGridOverload ? '2px solid #ef4444' : '1px solid #cbd5e1',
                      borderRadius: '10px', padding: '6px', height: '160px',
                      backgroundColor: shouldShowGridOverload ? '#fff1f2' : isFrozenDay ? '#fff7ed' : isRest ? '#f1f5f9' : grid.isCurrent ? '#fff' : '#f8fafc',
                      opacity: grid.isCurrent ? 1 : 0.4, cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', boxSizing: 'border-box', minWidth: '0'
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ color: shouldShowGridOverload ? '#b91c1c' : isToday ? '#2563eb' : '#1e293b', fontWeight: '900' }}>{grid.date.getDate()}</span>
                      {shouldShowGridOverload ? (
                        <span style={{ color: '#dc2626', fontSize: '11px', backgroundColor: '#fee2e2', padding: '1px 4px', borderRadius: '4px', fontWeight: '900' }}>⚠️ 爆量</span>
                      ) : isFrozenDay ? (
                        <span style={{ color: '#c2410c', fontSize: '10px' }}>⏳假</span>
                      ) : isRest ? (
                        <span style={{ color: '#94a3b8', fontSize: '10px' }}>🔒休</span>
                      ) : null}
                    </div>
                    
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '0' }}>
                      {roughLogsWithNotes.map((rl, ri) => (
                        <div key={`note-${ri}`} style={{ backgroundColor: '#fef3c7', color: '#92400e', fontSize: '10px', padding: '2px 4px', borderRadius: '4px', fontWeight: '900', border: '1px dashed #f59e0b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`[補強提醒] ${rl.note}`}>
                          ⚠️ 補強: {rl.note}
                        </div>
                      ))}

                      {recommendations.map((r, i) => {
                        const taskKey = `${dateStr}_${r.id}`;
                        const isTaskChecked = !!checkedTasks[taskKey];
                        return (
                          <div 
                            key={i} 
                            onClick={(e) => e.stopPropagation()} 
                            style={{ 
                              backgroundColor: isTaskChecked ? '#cbd5e1' : r.color, color: isTaskChecked ? '#475569' : 'white', 
                              fontSize: '11px', padding: '3px 4px', borderRadius: '4px', fontWeight: 'bold', textDecoration: isTaskChecked ? 'line-through' : 'none',
                              wordBreak: 'break-all', display: 'flex', alignItems: 'flex-start', gap: '2px', lineHeight: '1.2'
                            }}
                          >
                            <input type="checkbox" checked={isTaskChecked} onChange={() => toggleTaskCheck(dateStr, r.id)} style={{ transform: 'scale(0.8)', cursor: 'pointer', margin: '1px 0 0 0' }} />
                            <span style={{ flex: 1 }} title={`${r.title}: ${r.rangeText}`}>
                              {r.title}: {r.rangeText}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* 一鍵重新安排彈窗 */}
      {showReplanModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: 'white', padding: '28px', borderRadius: '16px', maxWidth: '500px', width: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#dc2626', fontSize: '18px', fontWeight: 'bold' }}>⚠️ 重新校準備考航線確認</h3>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: '0 0 16px 0' }}>
              請確認今天以前的過往研讀量都已輸入完畢。
              系統即將以指定日期為切點，將剩餘未完成的總教材量重新均分給未來所有的備考有效天數。
            </p>
            <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', display: 'block', marginBottom: '6px' }}>請指定從哪一天開始重新計算進度：</label>
              <input 
                type="date" 
                value={modalReplanDate} 
                onChange={e => setModalReplanDate(e.target.value)} 
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowReplanModal(false)} style={{ flex: 1, padding: '10px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>❌ 取消</button>
              <button onClick={handleExecuteReplan} style={{ flex: 1, padding: '10px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>🔄 確認一鍵重新安排</button>
            </div>
          </div>
        </div>
      )}

      {/* 日曆格子任務彈窗 */}
      {activeDialog && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setActiveDialog(null)}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', maxWidth: '450px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', fontSize: '17px', fontWeight: 'bold' }}>📅 任務清單詳細觀測 ({activeDialog.dateStr})</h3>
            
            {activeDialog.isOverloaded && intensity !== 'sprint' && (
              <div style={{ marginBottom: '14px', padding: '10px 14px', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', fontWeight: 'bold' }}>
                ⚠️ 警報：大腦負荷機制偵測到此日量能超載，部分教材已被強制截斷移至後續日子。
              </div>
            )}

            {activeDialog.dayLogs && activeDialog.dayLogs.length > 0 && (
              <div style={{ marginBottom: '16px', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>📝 本日研讀品質實錄：</div>
                {activeDialog.dayLogs.map((l: any, li: number) => (
                  <div key={li} style={{ fontSize: '13px', marginBottom: '4px' }}>
                    • {l.bookTitle}: <strong>+{l.units}</strong> 
                    {l.quality === 'rough' && <span style={{ color: '#b45309', fontWeight: 'bold' }}> (⚠️ 粗略)</span>}
                    {l.quality === 'distracted' && <span style={{ color: '#dc2626', fontWeight: 'bold' }}> (💤 散漫)</span>}
                    {l.note && <div style={{ color: '#64748b', fontSize: '12px', paddingLeft: '10px', fontStyle: 'italic' }}>📌 備忘：{l.note}</div>}
                  </div>
                ))}
              </div>
            )}

            {activeDialog.isFrozenDay ? (
              <p style={{ color: '#c2410c', fontWeight: 'bold' }}>⏳ 本日任務已移編至未來（無法閱讀日）。</p>
            ) : (activeDialog.recommendations || []).length === 0 && (activeDialog.dayLogs || []).length === 0 ? (
              <p style={{ color: '#64748b', fontStyle: 'italic' }}>本日配額已被提前抵銷、或為無任務休息日。</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(activeDialog.recommendations || []).map((r: any, i: number) => {
                  const name = r.unitType === 'pages' ? '頁' : '章';
                  const taskKey = `${activeDialog.dateStr}_${r.id}`;
                  const isTaskChecked = !!checkedTasks[taskKey];
                  return (
                    <div key={i} style={{ borderLeft: `5px solid ${r.color}`, paddingLeft: '12px', opacity: isTaskChecked ? 0.5 : 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input type="checkbox" checked={isTaskChecked} onChange={() => toggleTaskCheck(activeDialog.dateStr, r.id)} />
                          <span style={{ textDecoration: isTaskChecked ? 'line-through' : 'none' }}>{r.title}</span>
                        </div>
                        <span style={{ color: r.color, fontWeight: '900' }}>{r.rec} {name}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#059669', backgroundColor: '#f0fdf4', padding: '4px 8px', borderRadius: '4px', marginTop: '4px' }}>
                        📍 {r.rangeText}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <button onClick={() => setActiveDialog(null)} style={{ marginTop: '20px', width: '100%', padding: '10px', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>關閉</button>
          </div>
        </div>
      )}
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<React.StrictMode><App /></React.StrictMode>);
}