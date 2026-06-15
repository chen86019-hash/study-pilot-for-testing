import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

type IntensityMode = 'easy' | 'normal' | 'sprint';

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
}

interface StrategyCLog {
  bookId: string;
  sourceDate: string;  
  targetDate: string;  
  units: number;       
}

interface UndoSnapshot {
  strategyCLogs: StrategyCLog[];
  timestamp: number;
}

// 🌟 修正：多段突發狀況無法閱讀日的資料結構
interface FreezeRange {
  id: string;
  start: string;
  end: string;
}

const safeLoad = (key: string, defaultValue: any) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (e) {
    console.error(`Load error for ${key}`, e);
    return defaultValue;
  }
};

const INTENSITY_CEILINGS = {
  easy: { pages: 12, chapters: 1 },
  normal: { pages: 25, chapters: 2 },
  sprint: { pages: 999, chapters: 99 } 
};

const formatDateStr = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

function App() {
  const todayFormatted = formatDateStr(new Date());

  const [intensity, setIntensity] = useState<IntensityMode>(() => {
    return (localStorage.getItem('pilot_intensity_v10') as IntensityMode) || 'normal';
  });

  const [plans, setPlans] = useState<StudyPlan[]>(() => safeLoad('pilot_plans_v10', []));
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>(() => safeLoad('pilot_logs_v10', []));
  const [weeklyRestDays, setWeeklyRestDays] = useState<number[]>(() => safeLoad('pilot_rest_v10', [0, 6]));
  const [checkedTasks, setCheckedTasks] = useState<{ [key: string]: boolean }>(() => safeLoad('pilot_checked_tasks_v10', {}));
  const [strategyCLogs, setStrategyCLogs] = useState<StrategyCLog[]>(() => safeLoad('pilot_strategy_c_v10', []));
  const [undoSnapshot, setUndoSnapshot] = useState<UndoSnapshot | null>(() => safeLoad('pilot_undo_snapshot_v10', null));
  
  // 🌟 升級：支援多段突發狀況無法閱讀日清單
  const [freezeRanges, setFreezeRanges] = useState<FreezeRange[]>(() => safeLoad('pilot_freeze_ranges_v10', []));

  // 暫存輸入用的新單組區間
  const [tmpFreezeStart, setTmpFreezeStart] = useState<string>('');
  const [tmpFreezeEnd, setTmpFreezeEnd] = useState<string>('');

  const [showUndoBar, setShowUndoBar] = useState<boolean>(() => {
    return localStorage.getItem('pilot_show_undobar_v10') === 'true';
  });

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(() => new Date().getMonth());
  const [activeDialog, setActiveDialog] = useState<any | null>(null);
  const [reportDateStr, setReportDateStr] = useState<string>(todayFormatted);

  // 科目框架大標籤控管
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanStartDate, setNewPlanStartDate] = useState(todayFormatted); 
  const [newPlanDeadline, setNewPlanDeadline] = useState('');
  
  // 教材庫控管
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookUnitType, setNewBookUnitType] = useState<'pages' | 'chapters'>('pages');
  const [newBookTotal, setNewBookTotal] = useState<number | ''>('');
  const [newBookStartDate, setNewBookStartDate] = useState(todayFormatted); 
  const [newBookDeadline, setNewBookDeadline] = useState(''); 
  const [newBookRounds, setNewBookRounds] = useState<number | ''>(1); 
  
  const [reportBookId, setReportBookId] = useState('');
  const [reportUnits, setReportUnits] = useState<number | ''>('');

  const [dateOptions, setDateOptions] = useState<string[]>([]);
  
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
    localStorage.setItem('pilot_intensity_v10', intensity);
    localStorage.setItem('pilot_plans_v10', JSON.stringify(plans));
    localStorage.setItem('pilot_logs_v10', JSON.stringify(dailyLogs));
    localStorage.setItem('pilot_rest_v10', JSON.stringify(weeklyRestDays));
    localStorage.setItem('pilot_checked_tasks_v10', JSON.stringify(checkedTasks));
    localStorage.setItem('pilot_strategy_c_v10', JSON.stringify(strategyCLogs));
    localStorage.setItem('pilot_undo_snapshot_v10', JSON.stringify(undoSnapshot));
    localStorage.setItem('pilot_show_undobar_v10', String(showUndoBar));
    localStorage.setItem('pilot_freeze_ranges_v10', JSON.stringify(freezeRanges));
  }, [intensity, plans, dailyLogs, weeklyRestDays, checkedTasks, strategyCLogs, undoSnapshot, showUndoBar, freezeRanges]);

  useEffect(() => {
    if (showUndoBar) {
      const timer = setTimeout(() => {
        setShowUndoBar(false);
        setUndoSnapshot(null);
      }, 8000); 
      return () => clearTimeout(timer);
    }
  }, [showUndoBar]);

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

  // 🌟 新增一組突發狀況無法閱讀日區間
  const handleAddFreezeRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tmpFreezeStart || !tmpFreezeEnd) return;
    if (tmpFreezeEnd < tmpFreezeStart) {
      alert("⚠️ 結束日期不能早於開始日期！");
      return;
    }
    const newRange: FreezeRange = {
      id: Date.now().toString(),
      start: tmpFreezeStart,
      end: tmpFreezeEnd
    };
    setFreezeRanges([...freezeRanges, newRange]);
    setTmpFreezeStart('');
    setTmpFreezeEnd('');
  };

  // 🗑️ 刪除一組突發狀況區間
  const handleRemoveFreezeRange = (id: string) => {
    setFreezeRanges(freezeRanges.filter(r => r.id !== id));
  };

  // 🌟 判定特定日期是否命中「任何一段」無法閱讀區間
  const isDateInFreezeRanges = (dateStr: string) => {
    return freezeRanges.some(r => dateStr >= r.start && dateStr <= r.end);
  };

  // 💡 【核心演算法修正】：全自動多段排除讀書日計算
  const getRemainingWorkDays = (startStr: string, endStr: string) => {
    let count = 0;
    let curr = new Date(startStr); curr.setHours(0,0,0,0);
    const end = new Date(endStr); end.setHours(0,0,0,0);
    let guard = 0;
    
    while (curr <= end) {
      guard++;
      if (guard > 2000) break; 
      
      const currStr = formatDateStr(curr);
      const isWeekRest = weeklyRestDays.includes(curr.getDay());
      const isFrozen = isDateInFreezeRanges(currStr);

      // 必須既非每週固定休息，也未命中任何突發不讀書區間，才是實質工作日
      if (!isWeekRest && !isFrozen) {
        count++;
      }
      curr.setDate(curr.getDate() + 1);
    }
    return count;
  };

  const findNextStudyDayStr = (baseDateStr: string) => {
    let curr = new Date(baseDateStr); curr.setHours(0,0,0,0);
    let guard = 0;

    while (guard < 365) {
      guard++;
      curr.setDate(curr.getDate() + 1);
      const currStr = formatDateStr(curr);
      const isWeekRest = weeklyRestDays.includes(curr.getDay());
      const isFrozen = isDateInFreezeRanges(currStr);

      if (!isWeekRest && !isFrozen) {
        return currStr;
      }
    }
    const fallback = new Date(baseDateStr); fallback.setDate(fallback.getDate() + 1);
    return formatDateStr(fallback);
  };

  const findNextRestDayStr = (baseDateStr: string) => {
    let curr = new Date(baseDateStr); curr.setHours(0,0,0,0);
    let guard = 0;
    while (guard < 365) {
      guard++;
      curr.setDate(curr.getDate() + 1);
      if (weeklyRestDays.includes(curr.getDay())) {
        return formatDateStr(curr);
      }
    }
    const fallback = new Date(baseDateStr); fallback.setDate(fallback.getDate() + 1);
    return formatDateStr(fallback);
  };

  const executeStrategyC = (bookId: string, units: number, mode: 'next_study' | 'next_rest', currentDayStr: string) => {
    const targetDate = mode === 'next_study' ? findNextStudyDayStr(currentDayStr) : findNextRestDayStr(currentDayStr);
    
    if (targetDate === currentDayStr) {
      const altDate = new Date(currentDayStr); altDate.setDate(altDate.getDate() + 1);
      const safeTarget = formatDateStr(altDate);
      setUndoSnapshot({ strategyCLogs: [...strategyCLogs], timestamp: Date.now() });
      setShowUndoBar(true);
      setStrategyCLogs([...strategyCLogs, { bookId, sourceDate: currentDayStr, targetDate: safeTarget, units }]);
      return;
    }

    setUndoSnapshot({ strategyCLogs: [...strategyCLogs], timestamp: Date.now() });
    setShowUndoBar(true);
    const newLog: StrategyCLog = { bookId, sourceDate: currentDayStr, targetDate, units };
    setStrategyCLogs([...strategyCLogs, newLog]);
  };

  const triggerUndo = () => {
    if (undoSnapshot) {
      setStrategyCLogs(undoSnapshot.strategyCLogs);
      setUndoSnapshot(null);
      setShowUndoBar(false);
      alert('↩️ 已成功回復調度！大盤進度與指針已安全復原。');
    }
  };

  const clearStrategyCLog = (index: number) => {
    setStrategyCLogs(prev => prev.filter((_, i) => i !== index));
  };

  const getDayPlanDetails = (gridDate: Date) => {
    const target = new Date(gridDate); target.setHours(0, 0, 0, 0);
    const dateStr = formatDateStr(target);
    const today = new Date(); today.setHours(0,0,0,0);

    const isWeekRest = weeklyRestDays.includes(target.getDay());
    const isFrozenDay = isDateInFreezeRanges(dateStr);
    const isRest = isWeekRest || isFrozenDay;

    const dayLogs = dailyLogs.filter(l => l.date === dateStr);

    let finalRecs: any[] = [];
    let isOverloaded = false; 
    let hasFutureOverload = false; 
    let firstOverloadDateStr = '';  
    let overloadReason = '';
    let truncatedBooks: any[] = [];
    let isExtremeRisk = false; 

    if (!plans || plans.length === 0) {
      return { isRest, isFrozenDay, dayLogs, recommendations: [], dateStr, isOverloaded, hasFutureOverload, firstOverloadDateStr, overloadReason, truncatedBooks, isExtremeRisk };
    }

    let simulatedProgress: { [bookId: string]: number } = {};
    plans.forEach(p => {
      if (p.books) {
        p.books.forEach(b => { simulatedProgress[b.id] = 0; });
      }
    });

    let earliestStart = new Date(today);
    let absoluteLatestDeadline = new Date(today);
    plans.forEach(p => {
      const pStart = new Date(p.startDate || formatDateStr(today));
      if (pStart < earliestStart) earliestStart = pStart;
      if (p.books) {
        p.books.forEach(b => {
          const bStart = new Date(b.startDate || formatDateStr(today));
          const bEnd = new Date(b.deadline);
          if (bStart < earliestStart) earliestStart = bStart;
          if (bEnd > absoluteLatestDeadline) absoluteLatestDeadline = bEnd;
        });
      }
    });
    earliestStart.setDate(earliestStart.getDate() - 2);
    absoluteLatestDeadline.setDate(absoluteLatestDeadline.getDate() + 30);

    let scanDate = new Date(earliestStart);
    let mainLoopGuard = 0;
    
    while (scanDate <= absoluteLatestDeadline) {
      mainLoopGuard++;
      if (mainLoopGuard > 1500) break; 
      
      const scanDateStr = formatDateStr(scanDate);
      const scanIsWeekRest = weeklyRestDays.includes(scanDate.getDay());
      const scanIsFrozen = isDateInFreezeRanges(scanDateStr);
      const scanIsRest = scanIsWeekRest || scanIsFrozen;

      let currentDayRecsList: any[] = [];
      let scanDayTruncatedBooks: any[] = [];
      const realLogsThisScanDay = dailyLogs.filter(l => l.date === scanDateStr);

      plans.forEach(p => {
        if (!p.books) return;
        p.books.forEach(b => {
          const bStart = new Date(b.startDate); bStart.setHours(0,0,0,0);
          const bDeadline = new Date(b.deadline); bDeadline.setHours(0,0,0,0);
          
          if (scanDate < bStart || scanDate > bDeadline) return;

          const totalTargetUnits = b.totalUnits * (b.targetRounds || 1);
          let currentPointer = simulatedProgress[b.id] || 0; 

          if (currentPointer >= totalTargetUnits) return;

          let finalDayUnits = 0;
          let displayDetailStr = '';

          if (!scanIsRest) {
            const remainWorkDays = getRemainingWorkDays(scanDateStr, b.deadline);
            if (remainWorkDays <= 0) {
              isExtremeRisk = true;
              finalDayUnits = Math.max(0, totalTargetUnits - currentPointer); 
            } else {
              let rawRec = (totalTargetUnits - currentPointer) / remainWorkDays;
              if (rawRec <= 0) rawRec = 0;

              let calculatedRec = rawRec;
              if (intensity === 'easy') calculatedRec = rawRec * 0.65;
              else if (intensity === 'sprint') calculatedRec = rawRec * 1.40;

              if (b.unitType === 'pages') {
                finalDayUnits = Math.ceil(calculatedRec);
              } else {
                if (calculatedRec < 1) {
                  finalDayUnits = 1; 
                  const daysNeededForOneChapter = Math.ceil(1 / calculatedRec);
                  const currentChapterProgressDays = Math.floor((currentPointer % 1) * daysNeededForOneChapter);
                  const currentDayNum = (currentChapterProgressDays % daysNeededForOneChapter) + 1;
                  
                  displayDetailStr = `(第 ${currentDayNum} 天 / 共 ${daysNeededForOneChapter} 天)`;
                  finalDayUnits = 1 / daysNeededForOneChapter;
                } else {
                  finalDayUnits = Math.round(calculatedRec);
                  if (finalDayUnits < 1) finalDayUnits = 1;
                }
              }
            }
          }

          const incomingCValue = strategyCLogs
            .filter(cl => cl.bookId === b.id && cl.targetDate === scanDateStr)
            .reduce((sum, cl) => sum + cl.units, 0);
          
          if (incomingCValue > 0) finalDayUnits += incomingCValue;

          const ceiling = INTENSITY_CEILINGS[intensity];
          let maxAllowed = b.unitType === 'pages' ? ceiling.pages : ceiling.chapters;
          let isDayTruncated = false;
          let excessUnits = 0;

          const checkCompareValue = b.unitType === 'pages' ? finalDayUnits : Math.ceil(finalDayUnits);
          if (checkCompareValue > maxAllowed && intensity !== 'sprint') {
            excessUnits = checkCompareValue - maxAllowed;
            finalDayUnits = maxAllowed;
            isDayTruncated = true;
            displayDetailStr = ''; 
          }

          const outboundCValue = strategyCLogs
            .filter(cl => cl.bookId === b.id && cl.sourceDate === scanDateStr)
            .reduce((sum, cl) => sum + cl.units, 0);
          
          if (outboundCValue > 0) {
            finalDayUnits = Math.max(0, finalDayUnits - outboundCValue);
            isDayTruncated = false; 
          }

          if (scanDate < today) {
            const matchedLog = realLogsThisScanDay.filter(l => l.bookId === b.id);
            if (matchedLog.length > 0) {
              finalDayUnits = matchedLog.reduce((s, c) => s + c.units, 0);
            }
          }

          let startUnit = Math.floor(currentPointer % b.totalUnits) + 1;
          let endUnit = Math.floor((currentPointer + finalDayUnits) % b.totalUnits);
          if (endUnit === 0 && finalDayUnits > 0) endUnit = b.totalUnits;
          if (endUnit < startUnit) endUnit = startUnit; 

          if (isDayTruncated && excessUnits > 0) {
            scanDayTruncatedBooks.push({ bookId: b.id, title: b.title, excess: Math.ceil(excessUnits), unitType: b.unitType });
          }

          if (scanDateStr === dateStr) {
            if (!scanIsRest || finalDayUnits > 0) {
              let rangeText = '';
              if (b.unitType === 'pages') {
                rangeText = startUnit === endUnit ? `第 ${startUnit} 頁` : `第 ${startUnit} ～ ${endUnit} 頁`;
              } else {
                if (displayDetailStr) rangeText = `第 ${startUnit} 章 ${displayDetailStr}`;
                else rangeText = startUnit === endUnit ? `第 ${startUnit} 章` : `第 ${startUnit} ～ ${endUnit} 章`;
              }

              if (outboundCValue > 0 && finalDayUnits <= 0) rangeText = '今日進度已完全移編至未來';

              currentDayRecsList.push({
                id: b.id, title: b.title, planName: p.name, color: p.color,
                rec: b.unitType === 'pages' ? finalDayUnits : Math.ceil(finalDayUnits), 
                rawRec: finalDayUnits, unitType: b.unitType, rangeText: rangeText,
                currentRound: Math.floor(currentPointer / b.totalUnits) + 1,
                totalRounds: b.targetRounds || 1, startDate: b.startDate, deadline: b.deadline
              });
            }
          }

          simulatedProgress[b.id] = (simulatedProgress[b.id] || 0) + finalDayUnits;
        });
      });

      if (scanDateStr === dateStr) {
        finalRecs = currentDayRecsList;
        truncatedBooks = scanDayTruncatedBooks;
        if (scanDayTruncatedBooks.length > 0) {
          isOverloaded = true;
          overloadReason = `🧠【大腦負荷管理攔截】因多段無法閱讀日扣除，致今日平攤量觸上限。殘值已放至下方【策略 C 調度中心】。`;
        }
      }

      if (scanDate > target && scanDayTruncatedBooks.length > 0 && !hasFutureOverload) {
        hasFutureOverload = true;
        firstOverloadDateStr = scanDateStr;
      }

      scanDate.setDate(scanDate.getDate() + 1);
    }

    return {
      isRest, isFrozenDay, dayLogs, recommendations: finalRecs, dateStr,
      isOverloaded, hasFutureOverload, firstOverloadDateStr, overloadReason, truncatedBooks, isExtremeRisk
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
    if (!checkDateNotPast(newBookDeadline, "教材研讀截止日")) return;
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
        if (p) targetPlanId = p.id;
        return true;
      }
      return false;
    });

    if (!foundBook) return;

    setDailyLogs([{ 
      id: Date.now().toString(), date: reportDateStr, bookId: reportBookId,
      bookTitle: foundBook.title, unitType: foundBook.unitType, units: Number(reportUnits) 
    }, ...dailyLogs]);

    setPlans(prev => prev.map(p => {
      if (p.id !== targetPlanId) return p;
      return {
        ...p,
        books: (p.books || []).map(b => b.id === reportBookId ? { ...b, completedUnits: (b.completedUnits || 0) + Number(reportUnits) } : b)
      };
    }));
    setReportUnits('');
  };

  const handleDeleteLog = (logId: string, bookId: string, units: number) => {
    if (!confirm(`確定要刪除這筆進度嗎？`)) return;
    setDailyLogs(prev => prev.filter(l => l.id !== logId));
    setPlans(prev => prev.map(p => ({
      ...p,
      books: (p.books || []).map(b => b.id === bookId ? { ...b, completedUnits: Math.max(0, (b.completedUnits || 0) - units) } : b)
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
        ...p,
        books: (p.books || []).map(b => b.id === bookId ? {
          ...b, title: newTitle, totalUnits: Number(newTotal), targetRounds: Number(newRounds), startDate: newStart, deadline: newDate
        } : b)
      } : p));
    }
  };

  const { 
    isRest: activeIsRest, isFrozenDay: activeIsFrozen, recommendations: activeRecs = [], 
    isOverloaded: activeIsOverloaded, hasFutureOverload: activeHasFutureOverload, 
    firstOverloadDateStr: activeFirstOverloadDateStr, overloadReason: activeOverloadReason, 
    truncatedBooks: activeTruncated = [], isExtremeRisk: activeExtremeRisk 
  } = getDayPlanDetails(new Date(reportDateStr));

  const checkGlobalExtremeRisk = () => {
    if (plans.length === 0) return false;
    return plans.some(p => (p.books || []).some(b => getRemainingWorkDays(todayFormatted, b.deadline) <= 1));
  };
  const globalExtremeWarning = checkGlobalExtremeRisk() || activeExtremeRisk;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: 'system-ui, sans-serif', color: '#0f172a', fontSize: '16px' }}>
      
      <header style={{ backgroundColor: '#fff', borderBottom: '2px solid #cbd5e1', padding: '20px 24px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#1e293b' }}>🎯 StudyPilot V10 複數排除航線控制儀</h1>
              <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px', fontWeight: 'bold' }}>
                📅 今日絕對時間座標：<span style={{ color: '#2563eb' }}>{todayFormatted}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '6px', borderRadius: '10px', border: '2px solid #cbd5e1' }}>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#475569', padding: '0 10px' }}>🧠 讀書節奏實質介入：</span>
              <button onClick={() => setIntensity('easy')} style={{ padding: '8px 16px', fontSize: '14px', cursor: 'pointer', border: 'none', borderRadius: '8px', fontWeight: 'bold', backgroundColor: intensity === 'easy' ? '#fff' : 'transparent', color: intensity === 'easy' ? '#1e40af' : '#64748b' }}>☕ 輕鬆念 <span style={{ fontSize: '11px', color: '#3b82f6' }}>(65折)</span></button>
              <button onClick={() => setIntensity('normal')} style={{ padding: '8px 16px', fontSize: '14px', cursor: 'pointer', border: 'none', borderRadius: '8px', fontWeight: 'bold', backgroundColor: intensity === 'normal' ? '#fff' : 'transparent', color: intensity === 'normal' ? '#166534' : '#64748b' }}>⚖️ 正常念 <span style={{ fontSize: '11px', color: '#10b981' }}>(常態)</span></button>
              <button onClick={() => setIntensity('sprint')} style={{ padding: '8px 16px', fontSize: '14px', cursor: 'pointer', border: 'none', borderRadius: '8px', fontWeight: 'bold', backgroundColor: intensity === 'sprint' ? '#fff' : 'transparent', color: intensity === 'sprint' ? '#991b1b' : '#64748b' }}>🔥 衝刺念 <span style={{ fontSize: '11px', color: '#ef4444' }}>(無上限)</span></button>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setCurrentTab('dashboard')} style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', backgroundColor: currentTab === 'dashboard' ? '#eff6ff' : '#fff', color: currentTab === 'dashboard' ? '#2563eb' : '#475569', border: '2px solid #cbd5e1', borderRadius: '8px' }}>📊 作戰導航板</button>
              <button onClick={() => setCurrentTab('calendar')} style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', backgroundColor: currentTab === 'calendar' ? '#eff6ff' : '#fff', color: currentTab === 'calendar' ? '#2563eb' : '#475569', border: '2px solid #cbd5e1', borderRadius: '8px' }}>🗓️ 量化接續行事曆</button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {/* 每週固定隔離休息日 */}
            <div style={{ flex: '1 1 400px', display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#475569' }}>🔒 每週固定隔離休息日：</span>
              {['日', '一', '二', '三', '四', '五', '六'].map((name, index) => {
                const isRest = weeklyRestDays.includes(index);
                return (
                  <label key={index} style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', backgroundColor: isRest ? '#fee2e2' : '#fff', padding: '4px 10px', borderRadius: '6px', border: isRest ? '2px solid #fca5a5' : '1px solid #cbd5e1', color: isRest ? '#991b1b' : '#475569', fontWeight: isRest ? 'bold' : 'normal' }}>
                    <input type="checkbox" checked={isRest} onChange={() => toggleRestDay(index)} style={{ cursor: 'pointer' }} />
                    週{name}
                  </label>
                );
              })}
            </div>

            {/* 🌟 升級：多段突發狀況無法閱讀日管理中樞 */}
            <div style={{ flex: '1 1 700px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#fff7ed', padding: '14px 18px', borderRadius: '10px', border: '2px solid #ffedd5' }}>
              <div style={{ fontSize: '14px', color: '#7c2d12', fontWeight: 'bold', lineHeight: '1.4' }}>
                💡 <strong>功能說明：</strong> 輸入您未來確定無法閱讀的複數個區間（例如7月某週、8月某幾天），系統會以輸入當下為基準，<strong>立刻將這些區間的閱讀總量提早平攤到今天之後的所有研讀日</strong>，自動避開每週固定休息日，確保計畫不吃緊。
              </div>

              {/* 輸入控制列 */}
              <form onSubmit={handleAddFreezeRange} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', borderBottom: '1px dashed #fed7aa', paddingBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#c2410c' }}>➕ 新增無法閱讀日：</span>
                <input type="date" value={tmpFreezeStart} onChange={e => setTmpFreezeStart(e.target.value)} style={{ padding: '4px 8px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px' }} required />
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#9a3412' }}>至</span>
                <input type="date" value={tmpFreezeEnd} onChange={e => setTmpFreezeEnd(e.target.value)} style={{ padding: '4px 8px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px' }} required />
                <button type="submit" style={{ padding: '4px 12px', fontSize: '12px', cursor: 'pointer', backgroundColor: '#ea580c', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>納入排除清單</button>
              </form>

              {/* 已排扣例外清單展示 */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', contentVisibility: 'auto' }}>
                {freezeRanges.length === 0 ? (
                  <span style={{ fontSize: '12px', color: '#9a3412', fontStyle: 'italic' }}>📌 目前無登記特殊排除日期（大盤全線全速運轉中）</span>
                ) : freezeRanges.map(r => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#fffff0', border: '1px solid #fcd34d', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', fontWeight: 'bold', color: '#92400e' }}>
                    <span>⏳ {r.start.replace(/-/g, '/')} ~ {r.end.replace(/-/g, '/')}</span>
                    <button type="button" onClick={() => handleRemoveFreezeRange(r.id)} style={{ border: 'none', backgroundColor: 'transparent', color: '#dc2626', cursor: 'pointer', fontWeight: '900', padding: '0 2px' }}>×</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </header>

      <main style={{ maxWidth: '1240px', margin: '0 auto', padding: '24px 20px' }}>

        {globalExtremeWarning && (
          <div style={{ backgroundColor: '#fef2f2', border: '3px solid #ef4444', padding: '18px 22px', borderRadius: '12px', marginBottom: '24px', color: '#991b1b' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '900' }}>⚠️ 核心防呆阻攔：大盤備考工作日已進入極端短缺狀態！</h3>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', lineHeight: '1.6' }}>
              偵測到排扣的突發狀況無法閱讀天數過長，導致剩餘有效研讀天數嚴重缺血！<br/>
              <strong>🛠️ 建議對策：</strong> 請調整排除清單，或點選下方教材庫的「修正生命期」拉長截止日期。
            </p>
          </div>
        )}

        {currentTab === 'dashboard' && activeHasFutureOverload && !activeIsOverloaded && (
          <div style={{ backgroundColor: '#fffbeb', border: '3px solid #d97706', padding: '18px 22px', borderRadius: '12px', marginBottom: '24px', color: '#92400e' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '900' }}>⚠️ 預演警報：大盤航線在「未來」即將遭遇遞延超載風暴！</h3>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', lineHeight: '1.6' }}>
              雖然當下進度符合大腦上限，但由於多段非讀書日的提前扣除，後續進度已向後擠壓。
              首波超載將在 <strong style={{ color: '#dc2626', fontSize: '16px' }}>{activeFirstOverloadDateStr}</strong> 爆發！
            </p>
          </div>
        )}

        {currentTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <div style={{ backgroundColor: activeIsOverloaded ? '#fff1f2' : activeIsFrozen ? '#fff7ed' : activeIsRest ? '#f8fafc' : '#f0fdf4', border: activeIsOverloaded ? '2px solid #ef4444' : activeIsFrozen ? '2px solid #fed7aa' : activeIsRest ? '2px solid #cbd5e1' : '2px solid #bbf7d0', padding: '24px', borderRadius: '14px' }}>
              <h3 style={{ margin: 0, color: activeIsOverloaded ? '#991b1b' : activeIsFrozen ? '#c2410c' : activeIsRest ? '#475569' : '#166534', fontSize: '18px', fontWeight: '800' }}>
                🚀 航線作戰進度分配建議 (觀測日期: <span style={{ color: '#2563eb' }}>{reportDateStr}</span>)
              </h3>

              {activeIsOverloaded && (
                <div style={{ padding: '16px', backgroundColor: '#fff', border: '2px solid #ef4444', borderRadius: '10px', marginTop: '14px', fontSize: '14px', color: '#b91c1c', fontWeight: 'bold' }}>
                  {activeOverloadReason}
                </div>
              )}

              {activeTruncated.length > 0 && reportDateStr === todayFormatted && (
                <div style={{ marginTop: '16px', backgroundColor: '#fff', border: '2px solid #3b82f6', borderRadius: '10px', padding: '16px' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#1d4ed8', fontSize: '15px', fontWeight: 'bold' }}>🧭 策略 C 殘值實質移轉器：</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {activeTruncated.map((tb, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0f9ff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                        <span style={{ fontSize: '15px', fontWeight: 'bold' }}>📖 {tb.title} 超載溢出：<strong style={{ color: '#ef4444' }}>{tb.excess} {tb.unitType === 'pages' ? '頁' : '章'}</strong></span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => executeStrategyC(tb.bookId, tb.excess, 'next_study', reportDateStr)} style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>⏩ 移編至下一個讀書日</button>
                          <button onClick={() => executeStrategyC(tb.bookId, tb.excess, 'next_rest', reportDateStr)} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>🏖️ 填入下一個休息日</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '16px' }}>
                {activeIsFrozen ? (
                  <div style={{ padding: '12px 0', fontWeight: 'bold', color: '#ea580c', fontSize: '15px' }}>
                    ⏳ 系統提示：目前觀測日正處於已登記的【突發狀況無法閱讀日】中。大盤進度已提早平攤至其他可用研讀日！
                  </div>
                ) : activeIsRest && activeRecs.length === 0 ? (
                  <div style={{ padding: '12px 0', fontWeight: 'bold', color: '#475569', fontSize: '15px' }}>
                    🔒 本日為每週固定隔離休息日。基本航線零配給，指針凍結。請徹底放鬆！
                  </div>
                ) : activeRecs.length === 0 ? (
                  <p style={{ margin: 0, color: '#64748b', fontStyle: 'italic', fontSize: '15px' }}>☕ 本日無常態任務（尚未到計畫起始日、進度超前，或今日進度已移出）。</p>
                ) : (
                  activeRecs.map((r: any, i: number) => {
                    const unitName = r.unitType === 'pages' ? '頁' : '章';
                    return (
                      <div key={i} style={{ backgroundColor: '#fff', padding: '16px 20px', borderRadius: '10px', borderLeft: `6px solid ${r.color}`, border: '1px solid #cbd5e1', minWidth: '280px', flex: '1' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>
                          <span>🗂 "主框架" {r.planName}</span>
                          <span style={{ color: '#b45309' }}>🔄 輪次：{r.currentRound} / {r.totalRounds}</span>
                        </div>
                        <div style={{ fontWeight: '900', fontSize: '18px', marginTop: '6px', color: '#0f172a' }}>
                          {r.title}：<span style={{ color: '#2563eb', fontSize: '22px' }}>{r.rec} {unitName}</span>
                        </div>
                        <div style={{ fontSize: '14px', color: '#059669', backgroundColor: '#ecfdf5', padding: '8px 10px', borderRadius: '6px', marginTop: '10px', fontWeight: 'bold', border: '1px solid #a7f3d0' }}>
                          <span>📍 研讀定位點：</span>
                          <span>{r.rangeText}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px', fontWeight: 'bold' }}>
                          📅 框架生命區間：{((r.startDate || '').replace(/-/g, '/'))} ～ {(r.deadline || '').replace(/-/g, '/')}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                  <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', fontWeight: 'bold' }}>🆕 建立新主考科目大框架</h3>
                  <form onSubmit={handleCreatePlan} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input type="text" placeholder="例如：食品檢驗分析乙級" value={newPlanName} onChange={e => setNewPlanName(e.target.value)} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }} required />
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>📅 科目框架起始日：</label>
                      <input type="date" value={newPlanStartDate} onChange={e => setNewPlanStartDate(e.target.value)} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }} required />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>🏁 科目框架截止日：</label>
                      <input type="date" value={newPlanDeadline} onChange={e => setNewPlanDeadline(e.target.value)} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }} required />
                    </div>

                    <button type="submit" style={{ backgroundColor: '#0f172a', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>確認建立科目框架</button>
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
                      <label style={{ cursor: 'pointer' }}><input type="radio" checked={newBookUnitType === 'pages'} onChange={() => setNewBookUnitType('pages')} /> 📄 頁數計算制</label>
                      <label style={{ cursor: 'pointer' }}><input type="radio" checked={newBookUnitType === 'chapters'} onChange={() => setNewBookUnitType('chapters')} /> 🔖 章節計算制</label>
                    </div>

                    <input type="number" min="1" placeholder={newBookUnitType === 'pages' ? "請輸入單輪總頁數" : "請輸入單輪總章節數"} value={newBookTotal} onChange={e => setNewBookTotal(e.target.value === '' ? '' : Number(e.target.value))} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }} required />
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>🔄 預計精讀幾輪？</label>
                      <input type="number" min="1" max="5" value={newBookRounds} onChange={e => setNewBookRounds(e.target.value === '' ? '' : Number(e.target.value))} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }} required />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>📅 教材研讀起始日：</label>
                      <input type="date" value={newBookStartDate} onChange={e => setNewBookStartDate(e.target.value)} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }} required />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>🏁 該教材研讀截止死線：</label>
                      <input type="date" value={newBookDeadline} onChange={e => setNewBookDeadline(e.target.value)} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }} required />
                    </div>
                    <button type="submit" style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>確認綁定教材</button>
                  </form>
                </div>

                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '2px', border: '2px solid #2563eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#1e3a8a', fontWeight: 'bold' }}>✍️ 研讀進度實質回報</h3>
                    <select value={reportDateStr} onChange={e => setReportDateStr(e.target.value)} style={{ padding: '6px 10px', borderRadius: '8px', border: '2px solid #2563eb', fontSize: '13px', fontWeight: 'bold', color: '#2563eb', backgroundColor: '#f0f9ff', cursor: 'pointer' }}>
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
                    <input type="number" step="0.1" min="0.1" placeholder="輸入實質完工的研讀量" value={reportUnits} onChange={e => setReportUnits(e.target.value === '' ? '' : Number(e.target.value))} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }} required />
                    <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>確認送出實質進度</button>
                  </form>
                </div>

              </div>

              <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold' }}>📊 備考大盤教材總庫</h3>
                  {plans.length === 0 ? <p style={{ fontSize: '14px', color: '#64748b', fontStyle: 'italic' }}>目前大盤清空狀態。</p> : plans.map(p => (
                    <div key={p.id} style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: `6px solid ${p.color}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontWeight: '900', fontSize: '16px', color: '#1e293b' }}>🗂️ {p.name}</span>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                            📅 框架生命期：{(p.startDate || '').replace(/-/g, '/')} ～ {(p.deadline || '').replace(/-/g, '/')}
                          </div>
                        </div>
                        <button onClick={() => handleDeletePlan(p.id)} style={{ padding: '4px 10px', fontSize: '12px', color: '#ef4444', border: '1px solid #fca5a5', backgroundColor: '#fef2f2', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>🗑️ 刪除主框架</button>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' }}>
                        {(p.books || []).map(b => {
                          const totalComp = b.completedUnits || 0;
                          const bookRounds = b.targetRounds || 1;
                          const globalMaxUnits = b.totalUnits * bookRounds;
                          const globalPct = Math.min(100, Math.round((totalComp / globalMaxUnits) * 100));
                          const remainWorkDays = getRemainingWorkDays(formatDateStr(new Date()), b.deadline);
                          const currentUnitLabel = b.unitType === 'pages' ? '頁' : '章';

                          return (
                            <div key={b.id} style={{ backgroundColor: '#fff', padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong style={{ fontSize: '15px', color: '#0f172a' }}>📖 {b.title}</strong>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button onClick={() => handleEditBook(p.id, b.id)} style={{ padding: '4px 8px', fontSize: '12px', color: '#2563eb', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✏️ 修正生命期</button>
                                  <button onClick={() => handleDeleteBook(p.id, b.id)} style={{ padding: '4px 8px', fontSize: '12px', color: '#ef4444', border: '1px solid #fca5a5', backgroundColor: '#fef2f2', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>🗑️ 移除</button>
                                </div>
                              </div>

                              <div style={{ width: '100%', backgroundColor: '#e2e8f0', height: '10px', borderRadius: '5px', margin: '4px 0', overflow: 'hidden' }}>
                                <div style={{ width: `${globalPct}%`, backgroundColor: p.color, height: '100%' }}></div>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', marginTop: '6px', fontWeight: 'bold' }}>
                                <span>📈 總進度：{totalComp} / {globalMaxUnits} {currentUnitLabel} ({globalPct}%)</span>
                                <span style={{ color: remainWorkDays <= 5 ? '#dc2626' : '#2563eb' }}>⏳ 剩餘有效讀書日：{remainWorkDays} 天</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {strategyCLogs.length > 0 && (
                  <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #3b82f6' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#1d4ed8', fontWeight: 'bold' }}>🧭 策略 C 歷史調度流水帳</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {strategyCLogs.map((cl, idx) => {
                        const bk = plans.flatMap(p => p.books || []).find(b => b.id === cl.bookId);
                        const label = bk?.unitType === 'pages' ? '頁' : '章';
                        return (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px' }}>
                            <span>🎯 從 {cl.sourceDate} 移出 📖 <strong>{bk?.title || '未知'}</strong> {cl.units} {label} ➡️ 疊加至 <strong>{cl.targetDate}</strong></span>
                            <button onClick={() => clearStrategyCLog(idx)} style={{ backgroundColor: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}>撤銷</button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#334155', fontWeight: 'bold' }}>🛠️ 研讀回報歷史流水帳</h3>
                  <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {dailyLogs.length === 0 ? (
                      <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>暫無紀錄。</p>
                    ) : dailyLogs.map(log => (
                      <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }}>
                        <div>
                          <span style={{ color: '#64748b', marginRight: '6px', fontWeight: 'bold' }}>[{log.date}]</span>
                          <strong>{log.bookTitle}</strong> 
                          <span style={{ marginLeft: '8px', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                            +{log.units} {log.unitType === 'pages' ? '頁' : '章'}
                          </span>
                        </div>
                        <button onClick={() => handleDeleteLog(log.id, log.bookId, log.units)} style={{ border: 'none', backgroundColor: 'transparent', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}>🗑️ 撤銷</button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {currentTab === 'calendar' && (
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '14px', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', backgroundColor: '#f8fafc', padding: '14px 20px', borderRadius: '10px' }}>
              <button onClick={() => currentMonth === 0 ? (setCurrentMonth(11), setCurrentYear(y => y - 1)) : setCurrentMonth(m => m - 1)} style={{ padding: '8px 16px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>◀ 上個月</button>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '900' }}>🗓️ {currentYear} 年 {currentMonth + 1} 月 智慧配速行事曆</h2>
                <button onClick={handleGoToToday} style={{ padding: '6px 14px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>🏠 回到今天</button>
              </div>

              <button onClick={() => currentMonth === 11 ? (setCurrentMonth(0), setCurrentYear(y => y + 1)) : setCurrentMonth(m => m + 1)} style={{ padding: '8px 16px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>下個月 ▶</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: '900', paddingBottom: '12px', borderBottom: '3px solid #e2e8f0', marginBottom: '12px', fontSize: '15px' }}>
              {['日', '一', '二', '三', '四', '五', '六'].map((w, i) => <div key={w} style={{ color: weeklyRestDays.includes(i) ? '#ef4444' : '#475569' }}>週{w}</div>)}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
              {getMonthGrid().map((grid, idx) => {
                const { isRest, isFrozenDay, recommendations = [], dateStr, isOverloaded, dayLogs } = getDayPlanDetails(grid.date);
                const isToday = todayFormatted === dateStr;

                return (
                  <div
                    key={idx}
                    onClick={() => setActiveDialog({ dateStr, isRest, isFrozenDay, recommendations, isOverloaded, dayLogs })}
                    style={{
                      border: isToday ? '3px solid #2563eb' : isOverloaded ? '2px solid #ef4444' : '1px solid #cbd5e1',
                      borderRadius: '10px', padding: '8px', minHeight: '130px',
                      backgroundColor: isFrozenDay ? '#fff7ed' : isRest ? '#f1f5f9' : isOverloaded ? '#fff1f2' : grid.isCurrent ? '#fff' : '#f8fafc',
                      opacity: grid.isCurrent ? 1 : 0.4, cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box'
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: isFrozenDay ? '#c2410c' : isRest ? '#94a3b8' : isToday ? '#2563eb' : '#1e293b', fontSize: '14px', fontWeight: '900' }}>{grid.date.getDate()}</span>
                      {isFrozenDay ? (
                        <span style={{ color: '#c2410c', backgroundColor: '#ffedd5', borderRadius: '4px', padding: '0 4px', fontSize: '11px', fontWeight: 'bold' }}>⏳不能讀</span>
                      ) : isRest ? (
                        <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}>🔒休息</span>
                      ) : null}
                      {isOverloaded && !isRest && <span style={{ color: '#dc2626', backgroundColor: '#fee2e2', borderRadius: '4px', padding: '0 4px', fontSize: '11px', fontWeight: 'bold' }}>⚠️超載</span>}
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', margin: '6px 0', overflow: 'hidden' }}>
                      {recommendations.map((r, i) => {
                        const taskKey = `${dateStr}_${r.id}`;
                        const isTaskChecked = !!checkedTasks[taskKey];

                        return (
                          <div 
                            key={i} 
                            onClick={(e) => e.stopPropagation()} 
                            style={{ 
                              backgroundColor: isTaskChecked ? '#cbd5e1' : r.color, 
                              color: isTaskChecked ? '#475569' : 'white', 
                              fontSize: '11px', padding: '3px 5px', borderRadius: '5px', 
                              whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', fontWeight: 'bold',
                              textDecoration: isTaskChecked ? 'line-through' : 'none',
                              display: 'flex', alignItems: 'center', gap: '3px'
                            }}
                          >
                            <input type="checkbox" checked={isTaskChecked} onChange={() => toggleTaskCheck(dateStr, r.id)} style={{ transform: 'scale(0.85)', cursor: 'pointer', margin: 0 }} />
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {r.title}: {(r.rangeText || '').replace('章 (第', ' (').replace('天 / 共', '/').replace('天)', '')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ height: '1px' }}></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>

      {showUndoBar && undoSnapshot && (
        <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#1e293b', color: 'white', padding: '14px 24px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)', display: 'flex', alignItems: 'center', gap: '20px', zIndex: 9999, border: '1px solid #475569' }}>
          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>🧭 策略 C 殘值已移編！全域持久暫存保護中...</span>
          <button onClick={triggerUndo} style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '900', cursor: 'pointer' }}>↩️ 立即復原調度 (Undo)</button>
        </div>
      )}

      {activeDialog && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setActiveDialog(null)}>
          <div style={{ backgroundColor: 'white', padding: '28px', borderRadius: '16px', maxWidth: '500px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', fontSize: '18px', fontWeight: 'bold' }}>📅 任務清單詳細觀測 ({activeDialog.dateStr})</h3>
            
            {activeDialog.isFrozenDay ? (
              <p style={{ color: '#c2410c', fontWeight: 'bold', fontSize: '15px', backgroundColor: '#fff7ed', padding: '10px', borderRadius: '6px', border: '1px solid #fed7aa' }}>⏳ 系統提示：本日命中登記的【突發狀況無法閱讀日】。大盤進度已提前挪移至其他工作日平攤完畢！</p>
            ) : activeDialog.isRest && (activeDialog.recommendations || []).length === 0 ? (
              <p style={{ color: '#475569', fontWeight: 'bold', fontSize: '15px', backgroundColor: '#f1f5f9', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>🔒 本日為每週固定隔離休息日。大盤進度零配給，指針與身心安全靠岸。</p>
            ) : (activeDialog.recommendations || []).length === 0 ? (
              <p style={{ color: '#64748b', fontStyle: 'italic', fontSize: '15px' }}>本日無常態指派任務。</p>
            ) : (
              <div>
                {(activeDialog.recommendations || []).map((r: any, i: number) => {
                  const name = r.unitType === 'pages' ? '頁' : '章';
                  const taskKey = `${activeDialog.dateStr}_${r.id}`;
                  const isTaskChecked = !!checkedTasks[taskKey];
                  const actualUnitsSpent = (activeDialog.dayLogs || []).filter((l: any) => l.bookId === r.id).reduce((sum: number, current: any) => sum + current.units, 0);

                  return (
                    <div key={i} style={{ fontSize: '15px', margin: '16px 0', borderLeft: `5px solid ${r.color}`, paddingLeft: '12px', opacity: isTaskChecked ? 0.5 : 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input type="checkbox" checked={isTaskChecked} onChange={() => toggleTaskCheck(activeDialog.dateStr, r.id)} style={{ transform: 'scale(1.1)', cursor: 'pointer' }} />
                          <span style={{ textDecoration: isTaskChecked ? 'line-through' : 'none', fontSize: '16px' }}>{r.title}</span>
                        </div>
                        <span style={{ color: r.color, fontSize: '16px', fontWeight: '900' }}>共 {r.rec} {name}</span>
                      </div>
                      <div style={{ fontSize: '14px', color: '#059669', marginTop: '6px', backgroundColor: '#f0fdf4', padding: '6px 10px', borderRadius: '6px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', border: '1px solid #a7f3d0' }}>
                        <span>📍 定位範圍：{r.rangeText}</span>
                        {actualUnitsSpent > 0 && <span style={{ color: '#2563eb' }}>已報: {actualUnitsSpent} {name}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <button onClick={() => setActiveDialog(null)} style={{ marginTop: '20px', width: '100%', padding: '12px', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>關閉視窗</button>
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