import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// ==========================================
// 1. 資料結構與參數定義
// ==========================================
type IntensityMode = 'easy' | 'normal' | 'sprint';

interface Book {
  id: string;
  title: string;
  unitType: 'pages' | 'chapters'; 
  totalUnits: number;
  completedUnits: number; 
  deadline: string;        
  targetRounds: number; 
}

interface StudyPlan {
  id: string;
  name: string;
  deadline: string;        
  books: Book[];
  color: string;
}

interface DailyLog {
  id: string;
  date: string; 
  bookTitle: string;
  unitType: 'pages' | 'chapters';
  units: number;
}

const INTENSITY_CEILINGS = {
  easy: { pages: 12, chapters: 1 },
  normal: { pages: 25, chapters: 2 },
  sprint: { pages: 45, chapters: 3 }
};

const formatDateStr = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

function App() {
  // ==========================================
  // 2. 狀態管理
  // ==========================================
  const [intensity, setIntensity] = useState<IntensityMode>(() => {
    return (localStorage.getItem('pilot_intensity_v22') as IntensityMode) || 'normal';
  });

  const [plans, setPlans] = useState<StudyPlan[]>(() => {
    const saved = localStorage.getItem('pilot_plans_v22');
    return saved ? JSON.parse(saved) : [];
  });

  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>(() => {
    const saved = localStorage.getItem('pilot_logs_v22');
    return saved ? JSON.parse(saved) : [];
  });

  const [weeklyRestDays, setWeeklyRestDays] = useState<number[]>(() => {
    const saved = localStorage.getItem('pilot_rest_v22');
    return saved ? JSON.parse(saved) : [0, 6]; 
  });

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(() => new Date().getMonth());
  const [activeDialog, setActiveDialog] = useState<any | null>(null);
  const [reportDateStr, setReportDateStr] = useState<string>(formatDateStr(new Date()));
  const [showGuide, setShowGuide] = useState<boolean>(true);

  // 表單狀態
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanDeadline, setNewPlanDeadline] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookUnitType, setNewBookUnitType] = useState<'pages' | 'chapters'>('pages');
  const [newBookTotal, setNewBookTotal] = useState<number | ''>('');
  const [newBookDeadline, setNewBookDeadline] = useState(''); 
  const [newBookRounds, setNewBookRounds] = useState<number>(1); 
  const [reportBookId, setReportBookId] = useState('');
  const [reportUnits, setReportUnits] = useState<number | ''>('');

  const [dateOptions, setDateOptions] = useState<string[]>([]);
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
      if (p) setNewBookDeadline(p.deadline);
    }
  }, [selectedPlanId, plans]);

  useEffect(() => {
    localStorage.setItem('pilot_intensity_v22', intensity);
    localStorage.setItem('pilot_plans_v22', JSON.stringify(plans));
    localStorage.setItem('pilot_logs_v22', JSON.stringify(dailyLogs));
    localStorage.setItem('pilot_rest_v22', JSON.stringify(weeklyRestDays));
  }, [intensity, plans, dailyLogs, weeklyRestDays]);

  const toggleRestDay = (day: number) => {
    if (weeklyRestDays.length === 6 && !weeklyRestDays.includes(day)) {
      alert('⚠️ 不能把七天全部勾選為休息日！至少要留一天開航念書。');
      return;
    }
    let updated = weeklyRestDays.includes(day)
      ? weeklyRestDays.filter(d => d !== day)
      : [...weeklyRestDays, day].sort();
    setWeeklyRestDays(updated);
  };

  const getRemainingWorkDays = (startDate: Date, endDate: Date) => {
    let count = 0;
    let curr = new Date(startDate); curr.setHours(0,0,0,0);
    const end = new Date(endDate); end.setHours(0,0,0,0);
    while (curr <= end) {
      if (!weeklyRestDays.includes(curr.getDay())) count++;
      curr.setDate(curr.getDate() + 1);
    }
    return count;
  };

  const getDayPlanDetails = (gridDate: Date) => {
    const target = new Date(gridDate); target.setHours(0, 0, 0, 0);
    const dateStr = formatDateStr(target);
    const today = new Date(); today.setHours(0,0,0,0);
    
    const isRest = weeklyRestDays.includes(target.getDay());
    const dayLogs = dailyLogs.filter((l) => l.date === dateStr);

    if (target < today) {
      return { isRest, dayLogs, recommendations: [], dateStr, isOverloaded: false, overloadReason: '' };
    }

    let simulatedBooksProgress: { [bookId: string]: number } = {};
    plans.forEach(p => {
      p.books.forEach(b => {
        simulatedBooksProgress[b.id] = Number(b.completedUnits) || 0; 
      });
    });

    let scanDate = new Date(today);
    let finalRecsForTargetDay: any[] = [];
    let isOverloadedForTargetDay = false;
    let overloadReasonForTargetDay = '';

    const userCeiling = INTENSITY_CEILINGS[intensity];

    while (scanDate <= target) {
      const scanDateStr = formatDateStr(scanDate);
      const scanIsRest = weeklyRestDays.includes(scanDate.getDay());
      
      let daySelectedRecommendations: any[] = [];
      let overLimitBookNames: string[] = [];

      if (!scanIsRest) {
        plans.forEach((p) => {
          (p.books || []).forEach((b) => {
            const deadline = new Date(b.deadline); deadline.setHours(0,0,0,0);
            if (scanDate > deadline) return; 

            const totalRemainingDays = getRemainingWorkDays(scanDate, deadline);
            const compUnits = simulatedBooksProgress[b.id];

            const bookRounds = b.targetRounds || 1;
            const totalTargetUnits = b.totalUnits * bookRounds;
            const remainingTotalUnits = totalTargetUnits - compUnits;

            if (remainingTotalUnits <= 0) return; 

            let dailyRec = totalRemainingDays > 0 
              ? (remainingTotalUnits / totalRemainingDays) 
              : remainingTotalUnits;

            let currentRound = Math.floor(compUnits / b.totalUnits) + 1;
            let currentRoundCompleted = compUnits % b.totalUnits;
            if (compUnits > 0 && currentRoundCompleted === 0) {
              currentRound = Math.floor((compUnits - 1) / b.totalUnits) + 1;
              currentRoundCompleted = b.totalUnits;
            }

            const roomInCurrentRound = b.totalUnits - (compUnits % b.totalUnits === 0 ? 0 : currentRoundCompleted);
            if (roomInCurrentRound > 0) {
              dailyRec = Math.min(dailyRec, roomInCurrentRound);
            }

            if (b.unitType === 'pages') {
              dailyRec = Math.ceil(dailyRec);
            } else {
              dailyRec = Math.round(dailyRec * 2) / 2 || 0.5; 
            }

            if (b.unitType === 'pages' && dailyRec > userCeiling.pages) {
              overLimitBookNames.push(`${b.title}(需${dailyRec}頁/上限${userCeiling.pages}頁)`);
            } else if (b.unitType === 'chapters' && dailyRec > userCeiling.chapters) {
              overLimitBookNames.push(`${b.title}(需${dailyRec}章/上限${userCeiling.chapters}章)`);
            }

            daySelectedRecommendations.push({
              id: b.id,
              title: b.title,
              planName: p.name,
              color: p.color,
              rec: dailyRec,
              unitType: b.unitType,
              currentRound,
              totalRounds: bookRounds,
              currentRoundCompleted: compUnits % b.totalUnits === 0 && compUnits > 0 ? b.totalUnits : (compUnits % b.totalUnits),
              remainingDays: totalRemainingDays,
              totalUnits: b.totalUnits
            });

            simulatedBooksProgress[b.id] += dailyRec;
          });
        });

        if (scanDateStr === dateStr) {
          finalRecsForTargetDay = daySelectedRecommendations;
          if (overLimitBookNames.length > 0) {
            isOverloadedForTargetDay = true;
            overloadReasonForTargetDay = `⚠️【行程衝突超載預警】目前算出的每日任務，已超出您設定的「${intensity === 'easy' ? '輕鬆念' : intensity === 'normal' ? '正常念' : '衝刺念'}」上限：[${overLimitBookNames.join(', ')}]。這通常是因為「死線太趕」或「休息日勾太多（例如一週只讀一天）」導致時間不夠分。系統已自動幫您解除限制、平攤正確量，並強烈建議您：調整死線或多勾選幾天讀書日！`;
          }
        }
      } else {
        if (scanDateStr === dateStr) finalRecsForTargetDay = [];
      }
      scanDate.setDate(scanDate.getDate() + 1);
    }

    return { 
      isRest, 
      dayLogs, 
      recommendations: finalRecsForTargetDay, 
      dateStr, 
      isOverloaded: isOverloadedForTargetDay, 
      overloadReason: overloadReasonForTargetDay
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

  // ==========================================
  // 4. CRUD 操作事件
  // ==========================================
  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName.trim() || !newPlanDeadline) return;
    const colors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    setPlans([...plans, {
      id: Date.now().toString(),
      name: newPlanName,
      deadline: newPlanDeadline,
      color: colors[plans.length % colors.length],
      books: []
    }]);
    setNewPlanName(''); setNewPlanDeadline('');
  };

  const handleAddBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId || !newBookTitle.trim() || !newBookTotal || !newBookDeadline) return;
    setPlans(prev => prev.map(p => {
      if (p.id !== selectedPlanId) return p;
      return {
        ...p,
        books: [...(p.books || []), {
          id: Date.now().toString(),
          title: newBookTitle,
          unitType: newBookUnitType,
          totalUnits: Number(newBookTotal),
          completedUnits: 0,
          deadline: newBookDeadline,
          targetRounds: Number(newBookRounds) || 1
        }]
      };
    }));
    setNewBookTitle(''); setNewBookTotal(''); setNewBookRounds(1);
  };

  const handleReportProgress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportBookId || !reportUnits || Number(reportUnits) <= 0) return;

    let targetPlanId = '';
    let foundBook = plans.flatMap(p => p.books).find(b => {
      if (b.id === reportBookId) {
        const p = plans.find(pl => pl.books.some(bk => bk.id === b.id));
        if (p) targetPlanId = p.id;
        return true;
      }
      return false;
    });

    if (!foundBook) return;

    setDailyLogs([{ 
      id: Date.now().toString(), 
      date: reportDateStr, 
      bookTitle: foundBook.title, 
      unitType: foundBook.unitType, 
      units: Number(reportUnits) 
    }, ...dailyLogs]);

    setPlans(prev => prev.map(p => {
      if (p.id !== targetPlanId) return p;
      return {
        ...p,
        books: p.books.map(b => b.id === reportBookId ? { ...b, completedUnits: (Number(b.completedUnits) || 0) + Number(reportUnits) } : b)
      };
    }));
    setReportUnits('');
  };

  const handleDeletePlan = (planId: string) => {
    if (confirm('⚠️ 確定要刪除此大考科目框架嗎？')) {
      setPlans(plans.filter(p => p.id !== planId));
    }
  };

  const handleDeleteBook = (planId: string, bookId: string) => {
    if (confirm('確定要移除此教材嗎？')) {
      setPlans(plans.map(p => {
        if (p.id !== planId) return p;
        return { ...p, books: p.books.filter(b => b.id !== bookId) };
      }));
    }
  };

  const handleEditBook = (planId: string, bookId: string) => {
    const plan = plans.find(p => p.id === planId);
    const book = plan?.books.find(b => b.id === bookId);
    if (!book) return;

    const newTitle = prompt(`修改書名：`, book.title);
    const newTotal = prompt(`修改單輪總量：`, String(book.totalUnits));
    const newRounds = prompt(`修改預計複習圈數：`, String(book.targetRounds || 1));
    const newDate = prompt(`修改截止日 (YYYY-MM-DD)：`, book.deadline);

    if (newTitle && newTotal && newRounds && newDate) {
      setPlans(plans.map(p => {
        if (p.id !== planId) return p;
        return {
          ...p,
          books: p.books.map(b => b.id === bookId ? {
            ...b,
            title: newTitle,
            totalUnits: Number(newTotal),
            targetRounds: Number(newRounds),
            deadline: newDate
          } : b)
        };
      }));
    }
  };

  const { isRest: activeIsRest, recommendations: activeRecs, isOverloaded: activeIsOverloaded, overloadReason: activeOverloadReason } = getDayPlanDetails(new Date(reportDateStr));
  const todayFormatted = formatDateStr(new Date());

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: 'system-ui, sans-serif', color: '#0f172a' }}>
      
      {/* 頂部控制面板 */}
      <header style={{ backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', padding: '16px 20px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#1e293b' }}>🎯 StudyPilot V10 智慧無死角導航儀</h1>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', fontWeight: 'bold' }}>
                📅 今天是：<span style={{ color: '#2563eb' }}>{todayFormatted}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', padding: '0 8px' }}>🧠 大腦期望承載上限：</span>
              <button 
                onClick={() => setIntensity('easy')} 
                style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer', border: 'none', borderRadius: '6px', fontWeight: 'bold', backgroundColor: intensity === 'easy' ? '#fff' : 'transparent', color: intensity === 'easy' ? '#1e40af' : '#64748b' }}
              >
                ☕ 輕鬆念 <span style={{ fontSize: '11px', color: '#3b82f6', marginLeft: '2px' }}>(上限: 1章/12頁)</span>
              </button>
              <button 
                onClick={() => setIntensity('normal')} 
                style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer', border: 'none', borderRadius: '6px', fontWeight: 'bold', backgroundColor: intensity === 'normal' ? '#fff' : 'transparent', color: intensity === 'normal' ? '#166534' : '#64748b' }}
              >
                ⚖️ 正常念 <span style={{ fontSize: '11px', color: '#10b981', marginLeft: '2px' }}>(上限: 2章/25頁)</span>
              </button>
              <button 
                onClick={() => setIntensity('sprint')} 
                style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer', border: 'none', borderRadius: '6px', fontWeight: 'bold', backgroundColor: intensity === 'sprint' ? '#fff' : 'transparent', color: intensity === 'sprint' ? '#991b1b' : '#64748b' }}
              >
                🔥 衝刺念 <span style={{ fontSize: '11px', color: '#ef4444', marginLeft: '2px' }}>(上限: 3章/45頁)</span>
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setCurrentTab('dashboard')} style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', backgroundColor: currentTab === 'dashboard' ? '#eff6ff' : '#fff', color: currentTab === 'dashboard' ? '#2563eb' : '#475569', border: '1px solid #cbd5e1', borderRadius: '6px' }}>📊 今日作戰</button>
              <button onClick={() => setCurrentTab('calendar')} style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', backgroundColor: currentTab === 'calendar' ? '#eff6ff' : '#fff', color: currentTab === 'calendar' ? '#2563eb' : '#475569', border: '1px solid #cbd5e1', borderRadius: '6px' }}>🗓️ 智慧量化行事曆</button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>🔒 勾選每週「隔離休息日」（不讀書的日子）：</span>
            {['日', '一', '二', '三', '四', '五', '六'].map((name, index) => {
              const isRest = weeklyRestDays.includes(index);
              return (
                <label key={index} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', backgroundColor: isRest ? '#fee2e2' : '#fff', padding: '3px 8px', borderRadius: '4px', border: isRest ? '1px solid #fca5a5' : '1px solid #cbd5e1', color: isRest ? '#991b1b' : '#475569', fontWeight: isRest ? 'bold' : 'normal' }}>
                  <input type="checkbox" checked={isRest} onChange={() => toggleRestDay(index)} style={{ cursor: 'pointer' }} />
                  週{name}
                </label>
              );
            })}
          </div>

        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px' }}>
        
        {/* 🌟 需求3：全新改版 - 網頁使用指南 (SOP 實操教學流程) */}
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '2px solid #cbd5e1', padding: '16px', marginBottom: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setShowGuide(!showGuide)}>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🧭 第一次使用就上手？網頁功能操作指南 {showGuide ? '🔽' : '▶️'}
            </h3>
            <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: 'bold' }}>{showGuide ? '[收合指南]' : '[點擊展開指南]'}</span>
          </div>
          
          {showGuide && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '14px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
              <div style={{ fontSize: '12px', lineHeight: '1.6', color: '#475569', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                <strong style={{ color: '#2563eb', fontSize: '13px' }}>第一步：🧱 建立大考與綁定書籍</strong>
                <p style={{ margin: '4px 0 0 0' }}>先到左下角填寫<strong>「建立新考試主大框架」</strong>（例：高普考、證照檢定與其總死線）。接著到下方<strong>「綁定教材」</strong>，把要念的書名、總頁數（或章節數）填入，並可自由設定這本書你想<b>複習滾動幾輪</b>。</p>
              </div>
              <div style={{ fontSize: '12px', lineHeight: '1.6', color: '#475569', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                <strong style={{ color: '#10b981', fontSize: '13px' }}>第二步：🧘 設定生活節奏與偏好</strong>
                <p style={{ margin: '4px 0 0 0' }}>在頁面最頂端，勾選你<b>每週哪幾天要休息不碰書</b>（例：固定週六日放假）。接著選取你的<b>大腦承載極限</b>（輕鬆/正常/衝刺）。中央的「進度看板」與右側「大盤」便會立刻為你生成量身打造的每日精確計畫。</p>
              </div>
              <div style={{ fontSize: '12px', lineHeight: '1.6', color: '#475569', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                <strong style={{ color: '#f59e0b', fontSize: '13px' }}>第三步：✍️ 每日讀完實質回報</strong>
                <p style={{ margin: '4px 0 0 0' }}>每天讀完書後，請至左上角<strong>「進度實質回報」</strong>選取書籍、填寫今天「實質讀完的數量」。系統收到回報後，右側進度條會往前推進，大盤也會即時扣除，自動為你減輕明天以後的研讀壓力！</p>
              </div>
            </div>
          )}
        </div>

        {currentTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* 今日導航看板 */}
            <div style={{ backgroundColor: activeIsOverloaded ? '#fef2f2' : '#f0fdf4', border: activeIsOverloaded ? '2px solid #ef4444' : '1px solid #bbf7d0', padding: '20px', borderRadius: '12px' }}>
              <h3 style={{ margin: 0, color: activeIsOverloaded ? '#991b1b' : '#166534', fontSize: '16px' }}>
                🚀 航線作戰進度看板 (觀察日期: <span style={{ color: '#2563eb' }}>{reportDateStr}</span>)
              </h3>

              {activeIsOverloaded && (
                <div style={{ padding: '14px', backgroundColor: '#fff', border: '2px solid #ef4444', borderRadius: '8px', marginTop: '12px', fontSize: '12px', color: '#991b1b', fontWeight: 'bold', lineHeight: '1.6' }}>
                  {activeOverloadReason}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '14px' }}>
                {activeIsRest ? (
                  <p style={{ margin: 0, fontWeight: 'bold', color: '#ef4444', fontSize: '13px' }}>🔒 本日為大腦隔離休息日。系統不派發任務，請放鬆沉澱！</p>
                ) : activeRecs.length === 0 ? (
                  <p style={{ margin: 0, color: '#64748b', fontStyle: 'italic', fontSize: '13px' }}>☕ 本日無任務，大盤科目都在安全航線內、或已完美達標！</p>
                ) : (
                  activeRecs.map((r: any, i: number) => {
                    const currentProgress = r.currentRoundCompleted;
                    let startUnit = Math.floor(currentProgress) + 1;
                    let endUnit = Math.ceil(currentProgress + r.rec);
                    
                    if (currentProgress === r.totalUnits) {
                      startUnit = 1;
                      endUnit = Math.ceil(r.rec);
                    }
                    const unitName = r.unitType === 'pages' ? '頁' : '章';

                    return (
                      <div key={i} style={{ backgroundColor: '#fff', padding: '12px 16px', borderRadius: '8px', borderLeft: `4px solid ${r.color}`, border: '1px solid #e2e8f0', minWidth: '250px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                          <span>{r.planName}</span>
                          <span style={{ color: '#b45309', fontWeight: 'bold' }}>🔄 輪次：{r.currentRound} / {r.totalRounds} 輪</span>
                        </div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px', marginTop: '4px' }}>
                          {r.title}：<span style={{ color: '#2563eb', fontSize: '16px' }}>{r.rec} {unitName}</span>
                        </div>
                        
                        <div style={{ fontSize: '12px', color: '#059669', backgroundColor: '#ecfdf5', padding: '6px', borderRadius: '4px', marginTop: '8px', fontWeight: 'bold', border: '1px solid #a7f3d0' }}>
                          📍 當日進度目標：精念【第 {startUnit} ~ {endUnit} {unitName}】
                          {r.rec % 1 !== 0 && <span style={{ color: '#b45309', marginLeft: '4px' }}>({r.rec} {unitName})</span>}
                        </div>
                        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '6px' }}>⏰ 剩餘讀書日：{r.remainingDays} 天</div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 雙欄操作介面 */}
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              
              {/* 左欄表單 */}
              <div style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* 回報 */}
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #2563eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', color: '#1e3a8a' }}>✍️ 進度實質回報 / 歷史補登</h3>
                    <select value={reportDateStr} onChange={e => setReportDateStr(e.target.value)} style={{ padding: '4px 8px', borderRadius: '6px', border: '2px solid #2563eb', fontSize: '12px', fontWeight: 'bold', color: '#2563eb', backgroundColor: '#f0f9ff', cursor: 'pointer' }}>
                      {dateOptions.map(d => <option key={d} value={d}>{d === todayFormatted ? `今天 (${d})` : `歷史補登：${d}`}</option>)}
                    </select>
                  </div>
                  <form onSubmit={handleReportProgress} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <select value={reportBookId} onChange={e => setReportBookId(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} required>
                      <option value="">-- 選擇研讀教材 --</option>
                      {plans.flatMap(p => (p.books || []).map(b => (
                        <option key={b.id} value={b.id}>[{p.name}] {b.title} ({b.unitType === 'pages' ? '頁' : '章'})</option>
                      )))}
                    </select>
                    <input type="number" step="0.1" min="0.1" placeholder="填入精念完的實質進度 (可填小數如 0.5)" value={reportUnits} onChange={e => setReportUnits(e.target.value === '' ? '' : Number(e.target.value))} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }} required />
                    <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>確認送出進度</button>
                  </form>
                </div>

                {/* 建立大考 */}
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '15px' }}>🆕 建立新考試主大框架</h3>
                  <form onSubmit={handleCreatePlan} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input type="text" placeholder="大考/檢定名稱" value={newPlanName} onChange={e => setNewPlanName(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }} required />
                    <input type="date" value={newPlanDeadline} onChange={e => setNewPlanDeadline(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }} required />
                    <button type="submit" style={{ backgroundColor: '#0f172a', color: 'white', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>確認建立大框架</button>
                  </form>
                </div>

                {/* 綁定書籍 */}
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '15px' }}>📚 綁定教材 (支援自訂複習圈數)</h3>
                  <form onSubmit={handleAddBook} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <select value={selectedPlanId} onChange={e => setSelectedPlanId(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} required>
                      <option value="">-- 選擇所屬主大框架 --</option>
                      {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input type="text" placeholder="書名 / 講義名稱" value={newBookTitle} onChange={e => setNewBookTitle(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }} required />
                    <div style={{ display: 'flex', gap: '12px', fontSize: '13px' }}>
                      <label><input type="radio" checked={newBookUnitType === 'pages'} onChange={() => setNewBookUnitType('pages')} /> 📄 頁數</label>
                      <label><input type="radio" checked={newBookUnitType === 'chapters'} onChange={() => setNewBookUnitType('chapters')} /> 🔖 章節</label>
                    </div>
                    <input type="number" min="1" placeholder="單輪總量 (頁數或章節數)" value={newBookTotal} onChange={e => setNewBookTotal(e.target.value === '' ? '' : Number(e.target.value))} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }} required />
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>🔄 預計滾動精念幾輪？(預設 1 輪)</label>
                      <input type="number" min="1" max="5" value={newBookRounds} onChange={e => setNewBookRounds(Number(e.target.value) || 1)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }} required />
                    </div>

                    <input type="date" value={newBookDeadline} onChange={e => setNewBookDeadline(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }} required />
                    <button type="submit" style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>開啟客製化多輪精念航線</button>
                  </form>
                </div>
              </div>

              {/* 右欄：大盤 */}
              <div style={{ flex: '1 1 450px', backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>📊 備考大盤教材庫</h3>
                {plans.length === 0 ? <p style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>大盤空空如也。</p> : plans.map(p => (
                  <div key={p.id} style={{ marginBottom: '24px', padding: '14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', borderLeft: `5px solid ${p.color}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#1e293b' }}>🗂️ {p.name}</span>
                      <button onClick={() => handleDeletePlan(p.id)} style={{ padding: '2px 8px', fontSize: '11px', color: '#ef4444', border: '1px solid #fca5a5', backgroundColor: '#fef2f2', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>🗑️ 刪除科目</button>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                      {(p.books || []).map(b => {
                        const totalComp = Number(b.completedUnits) || 0;
                        const bookRounds = b.targetRounds || 1;

                        let currentRound = Math.floor(totalComp / b.totalUnits) + 1;
                        let currentRoundCompleted = totalComp % b.totalUnits;

                        if (totalComp > 0 && currentRoundCompleted === 0) {
                          currentRound = Math.floor((totalComp - 1) / b.totalUnits) + 1;
                          currentRoundCompleted = b.totalUnits;
                        }

                        const singleRoundPct = currentRoundCompleted === b.totalUnits 
                          ? 100 
                          : Math.min(99, Math.floor((currentRoundCompleted / b.totalUnits) * 100));

                        const globalMaxUnits = b.totalUnits * bookRounds;
                        const globalPct = Math.min(100, Math.round((totalComp / globalMaxUnits) * 100));

                        return (
                          <div key={b.id} style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ fontSize: '13px' }}>📖 {b.title}</strong>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button onClick={() => handleEditBook(p.id, b.id)} style={{ padding: '2px 6px', fontSize: '11px', color: '#2563eb', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff', borderRadius: '4px', cursor: 'pointer' }}>✏️ 修正</button>
                                <button onClick={() => handleDeleteBook(p.id, b.id)} style={{ padding: '2px 6px', fontSize: '11px', color: '#ef4444', border: '1px solid #fca5a5', backgroundColor: '#fef2f2', borderRadius: '4px', cursor: 'pointer' }}>🗑️ 移除</button>
                              </div>
                            </div>

                            <div style={{ fontSize: '11px', color: '#475569', margin: '6px 0', backgroundColor: '#f0fdf4', padding: '6px', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
                              🏁 死線：<strong>{b.deadline}</strong> ｜ 🔄 指定複習目標：<strong>精念 {bookRounds} 輪</strong>
                            </div>

                            <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                              <span>第 {currentRound} 輪當前進度：{currentRoundCompleted} / {b.totalUnits}</span>
                              <span style={{ fontWeight: 'bold' }}>{singleRoundPct}%</span>
                            </div>
                            <div style={{ width: '100%', backgroundColor: '#e2e8f0', height: '6px', borderRadius: '3px', margin: '4px 0', overflow: 'hidden' }}>
                              <div style={{ width: `${singleRoundPct}%`, backgroundColor: '#3b82f6', height: '100%' }}></div>
                            </div>

                            <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                              <span>跨輪總大局達標率：</span>
                              <span style={{ fontWeight: 'bold', color: p.color }}>{globalPct}%</span>
                            </div>
                            <div style={{ width: '100%', backgroundColor: '#e2e8f0', height: '8px', borderRadius: '4px', margin: '4px 0', overflow: 'hidden' }}>
                              <div style={{ width: `${globalPct}%`, backgroundColor: p.color, height: '100%' }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        )}

        {/* 智慧量化行事曆 */}
        {currentTab === 'calendar' && (
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '8px' }}>
              <button onClick={() => currentMonth === 0 ? (setCurrentMonth(11), setCurrentYear(y => y - 1)) : setCurrentMonth(m => m - 1)} style={{ padding: '6px 12px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>◀ 上個月</button>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '800' }}>🗓️ {currentYear} 年 {currentMonth + 1} 月 智慧預警排班行事曆</h2>
              <button onClick={() => currentMonth === 11 ? (setCurrentMonth(0), setCurrentYear(y => y + 1)) : setCurrentMonth(m => m + 1)} style={{ padding: '6px 12px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>下個月 ▶</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: 'bold', paddingBottom: '8px', borderBottom: '2px solid #e2e8f0', marginBottom: '8px', fontSize: '13px' }}>
              {['日', '一', '二', '三', '四', '五', '六'].map((w, i) => <div key={w} style={{ color: weeklyRestDays.includes(i) ? '#ef4444' : '#475569' }}>{w}</div>)}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
              {getMonthGrid().map((grid, idx) => {
                const { isRest, recommendations, dateStr, isOverloaded } = getDayPlanDetails(grid.date);
                const isToday = todayFormatted === dateStr;

                return (
                  <div
                    key={idx}
                    onClick={() => setActiveDialog({ dateStr, isRest, recommendations, isOverloaded })}
                    style={{
                      border: isToday ? '2px solid #2563eb' : isOverloaded ? '2px solid #ef4444' : '1px solid #e2e8f0',
                      borderRadius: '8px', padding: '6px', minHeight: '110px',
                      backgroundColor: isRest ? '#fff5f5' : isOverloaded ? '#fff1f2' : grid.isCurrent ? '#fff' : '#f8fafc',
                      opacity: grid.isCurrent ? 1 : 0.4, cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box'
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: isToday ? '#2563eb' : '#1e293b' }}>{grid.date.getDate()}</span>
                      {isOverloaded && <span style={{ color: '#ef4444', backgroundColor: '#fee2e2', borderRadius: '4px', padding: '0 2px' }}>⚠️超載</span>}
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', margin: '4px 0', overflow: 'hidden' }}>
                      {!isRest && recommendations.map((r, i) => {
                        const currentProgress = r.currentRoundCompleted;
                        let startUnit = Math.floor(currentProgress) + 1;
                        let endUnit = Math.ceil(currentProgress + r.rec);
                        const unitLabel = r.unitType === 'pages' ? 'p' : '章';
                        return (
                          <div key={i} style={{ backgroundColor: r.color, color: 'white', fontSize: '9px', padding: '2px 4px', borderRadius: '4px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', fontWeight: 'bold' }}>
                            {r.title}: {startUnit}~{endUnit}{unitLabel}
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

      {/* 詳細對話框 */}
      {activeDialog && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setActiveDialog(null)}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', maxWidth: '450px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', fontSize: '15px' }}>📅 任務詳情 ({activeDialog.dateStr})</h3>
            {activeDialog.isRest ? (
              <p style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '13px' }}>🔒 本日為隔離休息日，暫無航線指派。</p>
            ) : (
              <div>
                {activeDialog.recommendations.map((r: any, i: number) => {
                  const currentProgress = r.currentRoundCompleted;
                  let startUnit = Math.floor(currentProgress) + 1;
                  let endUnit = Math.ceil(currentProgress + r.rec);
                  const name = r.unitType === 'pages' ? '頁' : '章';
                  return (
                    <div key={i} style={{ fontSize: '13px', margin: '12px 0', borderLeft: `4px solid ${r.color}`, paddingLeft: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                        <span>[{r.planName}] {r.title}</span>
                        <span style={{ color: r.color }}>共 {r.rec} {name}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#059669', marginTop: '4px', backgroundColor: '#f0fdf4', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                        📍 精念範圍：第 {startUnit} ~ {endUnit} {name} (第 {r.currentRound}/{r.totalRounds} 輪)
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <button onClick={() => setActiveDialog(null)} style={{ marginTop: '16px', width: '100%', padding: '8px', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>關閉</button>
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