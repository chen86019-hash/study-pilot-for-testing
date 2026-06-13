import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Book {
  id: string;
  title: string;
  unitType: 'pages' | 'chapters';
  totalUnits: number;
  completedUnits: number;
  deadline: string;
}

export interface StudyPlan {
  id: string;
  name: string;
  color: string;
  books: Book[];
}

export interface DailyLog {
  id: string;
  date: string;
  planId: string;
  planName: string;
  bookId: string;
  bookTitle: string;
  units: number;
  notes: string;
}

interface SchedulerContextType {
  plans: StudyPlan[];
  dailyLogs: DailyLog[];
  weeklyRestDays: number[];
  maxBooksPerDay: number;
  addPlan: (name: string, color: string) => void;
  addBookToPlan: (planId: string, book: Omit<Book, 'id' | 'completedUnits'>) => void;
  submitProgress: (date: string, planId: string, bookId: string, units: number, notes: string) => void;
  setWeeklyRestDays: (days: number[]) => void;
  setMaxBooksPerDay: (num: number) => void;
  clearAllData: () => void;
}

const SchedulerContext = createContext<SchedulerContextType | undefined>(undefined);

export const SchedulerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [plans, setPlans] = useState<StudyPlan[]>(() => {
    const saved = localStorage.getItem('sp_plans_v5');
    return saved ? JSON.parse(saved) : [];
  });

  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>(() => {
    const saved = localStorage.getItem('sp_logs_v5');
    return saved ? JSON.parse(saved) : [];
  });

  const [weeklyRestDays, setWeeklyRestDaysState] = useState<number[]>(() => {
    const saved = localStorage.getItem('sp_rest_v5');
    return saved ? JSON.parse(saved) : [0, 6]; // 預設週六、週日休息
  });

  const [maxBooksPerDay, setMaxBooksPerDayState] = useState<number>(() => {
    const saved = localStorage.getItem('sp_max_books_v5');
    return saved ? Number(saved) : 2; // 預設每日最多讀 2 本書
  });

  useEffect(() => {
    localStorage.setItem('sp_plans_v5', JSON.stringify(plans));
  }, [plans]);

  useEffect(() => {
    localStorage.setItem('sp_logs_v5', JSON.stringify(dailyLogs));
  }, [dailyLogs]);

  const setWeeklyRestDays = (days: number[]) => {
    setWeeklyRestDaysState(days);
    localStorage.setItem('sp_rest_v5', JSON.stringify(days));
  };

  const setMaxBooksPerDay = (num: number) => {
    setMaxBooksPerDayState(num);
    localStorage.setItem('sp_max_books_v5', num.toString());
  };

  const clearAllData = () => {
    localStorage.removeItem('sp_plans_v5');
    localStorage.removeItem('sp_logs_v5');
    localStorage.removeItem('sp_rest_v5');
    localStorage.removeItem('sp_max_books_v5');
    setPlans([]);
    setDailyLogs([]);
    setWeeklyRestDaysState([0, 6]);
    setMaxBooksPerDayState(2);
  };

  const addPlan = (name: string, color: string) => {
    const newPlan: StudyPlan = { id: Date.now().toString(), name, color, books: [] };
    setPlans([...plans, newPlan]);
  };

  const addBookToPlan = (planId: string, book: Omit<Book, 'id' | 'completedUnits'>) => {
    setPlans(prev => prev.map(p => {
      if (p.id !== planId) return p;
      const newBook: Book = { ...book, id: Date.now().toString(), completedUnits: 0 };
      return { ...p, books: [...(p.books || []), newBook] };
    }));
  };

  const submitProgress = (date: string, planId: string, bookId: string, units: number, notes: string) => {
    const targetPlan = plans.find(p => p.id === planId);
    const targetBook = targetPlan?.books?.find(b => b.id === bookId);
    if (!targetPlan || !targetBook) return;

    const newLog: DailyLog = {
      id: Date.now().toString(),
      date,
      planId,
      planName: targetPlan.name,
      bookId,
      bookTitle: targetBook.title,
      units,
      notes
    };

    setDailyLogs(prev => [...prev, newLog]);

    setPlans(prev => prev.map(p => {
      if (p.id !== planId) return p;
      return {
        ...p,
        books: (p.books || []).map(b => b.id === bookId ? { ...b, completedUnits: Math.min(b.totalUnits, b.completedUnits + units) } : b)
      };
    }));
  };

  return (
    <SchedulerContext.Provider value={{ plans, dailyLogs, weeklyRestDays, maxBooksPerDay, addPlan, addBookToPlan, submitProgress, setWeeklyRestDays, setMaxBooksPerDay, clearAllData }}>
      {children}
    </SchedulerContext.Provider>
  );
};

export const useScheduler = () => {
  const context = useContext(SchedulerContext);
  if (!context) throw new Error('useScheduler Context 異常');
  return context;
};