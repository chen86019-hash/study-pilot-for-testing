import React, { useState } from 'react';
import { useScheduler } from '../context/SchedulerContext';

export const Dashboard: React.FC = () => {
  const { plans = [], addPlan, addBookToPlan, submitProgress, triggerRebalance } = useScheduler();

  const [planName, setPlanName] = useState('');
  const [planColor, setPlanColor] = useState('#2563eb');
  
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [unitType, setUnitType] = useState<'pages' | 'chapters'>('pages');
  const [totalUnits, setTotalUnits] = useState(100);
  const [bookDeadline, setBookDeadline] = useState('');

  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportPlanId, setReportPlanId] = useState('');
  const [reportBookId, setReportBookId] = useState('');
  const [reportUnits, setReportUnits] = useState(10);
  const [reportNotes, setReportNotes] = useState('');

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planName.trim()) return;
    addPlan(planName, planColor);
    setPlanName('');
  };

  const handleAddBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId || !bookTitle.trim() || !bookDeadline) return;
    addBookToPlan(selectedPlanId, { title: bookTitle, unitType, totalUnits, deadline: bookDeadline });
    setBookTitle('');
  };

  const handleReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportPlanId || !reportBookId || reportUnits <= 0) return;
    submitProgress(reportDate, reportPlanId, reportBookId, reportUnits, reportNotes);
    alert('🎉 進度更新成功！');
  };

  const currentSelectedPlan = plans.find(p => p.id === reportPlanId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        
        {/* 左側操作區：順序已調整為 1.建立計畫 -> 2.綁定教材 -> 3.進度回報 */}
        <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* 1. 建立計畫 */}
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 12px 0' }}>建立新考試大框架</h3>
            <form onSubmit={handleCreatePlan} style={{ display: 'flex', gap: '12px' }}>
              <input type="text" value={planName} onChange={e => setPlanName(e.target.value)} placeholder="大考/檢定名稱" style={{ flex: 1, padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              <input type="color" value={planColor} onChange={e => setPlanColor(e.target.value)} style={{ width: '40px', height: '40px', border: 'none', cursor: 'pointer', padding: 0 }} />
              <button type="submit" style={{ backgroundColor: '#1e293b', color: 'white', border: 'none', padding: '0 16px', borderRadius: '6px', cursor: 'pointer' }}>確認建立大框架</button>
            </form>
          </div>

          {/* 2. 綁定教材 */}
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 12px 0' }}>綁定教材 (支援自訂複習圈數)</h3>
            <form onSubmit={handleAddBook} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <select value={selectedPlanId} onChange={e => setSelectedPlanId(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <option value="">-- 選擇所屬大框架 --</option>
                {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="text" value={bookTitle} onChange={e => setBookTitle(e.target.value)} placeholder="書名 / 講義名稱" style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <label><input type="radio" checked={unitType === 'pages'} onChange={() => setUnitType('pages')} /> 頁數</label>
                <label><input type="radio" checked={unitType === 'chapters'} onChange={() => setUnitType('chapters')} /> 章節</label>
              </div>
              <input type="number" min="1" value={totalUnits} onChange={e => setTotalUnits(Number(e.target.value))} placeholder="單輪總量" style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              <input type="date" value={bookDeadline} onChange={e => setBookDeadline(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              <button type="submit" style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>開啟客製化多輪精念航線</button>
            </form>
          </div>

          {/* 3. 進度回報 */}
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 12px 0' }}>進度實質回報 / 歷史補登</h3>
            <form onSubmit={handleReport} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              <select value={reportPlanId} onChange={e => setReportPlanId(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <option value="">-- 選擇研讀教材 --</option>
                {plans.map(p => p.books?.map(b => <option key={b.id} value={p.id}>{b.title}</option>))}
              </select>
              <input type="number" min="0.1" step="0.1" value={reportUnits} onChange={e => setReportUnits(Number(e.target.value))} placeholder="填入精念完的實質進度" style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer' }}>確認送出進度</button>
            </form>
          </div>
        </div>

        {/* 右側戰情總覽 */}
        <div style={{ flex: '1 1 450px', backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
           <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px 0' }}>📊 備考進度條戰情總覽</h2>
           {/* (此處省略後續渲染代碼，維持原邏輯) */}
        </div>
      </div>
    </div>
  );
};