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
    setReportUnits(10);
    setReportNotes('');
    alert('🎉 進度更新成功！智能演算法已完成自動動態配額調校！');
  };

  const currentSelectedPlan = plans.find(p => p.id === reportPlanId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 智能重分配提示 */}
      <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, color: '#991b1b', fontWeight: 'bold', fontSize: '15px' }}>🚨 備考狀態有大變動（大幅超前或稍微落後）？</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#7f1d1d' }}>不論你今天多讀了還是漏讀了，點擊右側，系統會將剩餘分量，重新平攤到未來的所有非休息日中。</p>
        </div>
        <button onClick={triggerRebalance} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>一鍵重新動態配置排程</button>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {/* 左側三步操作區 */}
        <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* 第一步 */}
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 12px 0' }}>第一步：建立備考計畫大項</h3>
            <form onSubmit={handleCreatePlan} style={{ display: 'flex', gap: '12px' }}>
              <input type="text" value={planName} onChange={e => setPlanName(e.target.value)} placeholder="例如：115年食品檢驗分析高考" style={{ flex: 1, padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              <input type="color" value={planColor} onChange={e => setPlanColor(e.target.value)} style={{ width: '40px', height: '40px', border: 'none', cursor: 'pointer', padding: 0 }} />
              <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '0 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>建立計畫</button>
            </form>
          </div>

          {/* 第二步 */}
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 12px 0' }}>第二步：新增該計畫對應的教材 / 書籍</h3>
            <form onSubmit={handleAddBook} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '13px', color: '#4a5568', display: 'block', marginBottom: '4px' }}>選擇所屬大計畫</label>
                <select value={selectedPlanId} onChange={e => setSelectedPlanId(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <option value="">-- 請選擇計畫 --</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 2 }}>
                  <label style={{ fontSize: '13px', display: 'block', marginBottom: '4px' }}>書名 / 教材名稱</label>
                  <input type="text" value={bookTitle} onChange={e => setBookTitle(e.target.value)} placeholder="例如：食品加工學精要" style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '13px', display: 'block', marginBottom: '4px' }}>進度單位</label>
                  <select value={unitType} onChange={e => setUnitType(e.target.value as 'pages' | 'chapters')} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <option value="pages">頁數</option>
                    <option value="chapters">章節</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '13px', display: 'block', marginBottom: '4px' }}>總分量(頁/章)</label>
                  <input type="number" min="1" value={totalUnits} onChange={e => setTotalUnits(Number(e.target.value))} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '13px', display: 'block', marginBottom: '4px' }}>該書獨立截止日</label>
                  <input type="date" value={bookDeadline} onChange={e => setBookDeadline(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
              </div>
              <button type="submit" style={{ backgroundColor: '#1e293b', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>加入排程防彈計算</button>
            </form>
          </div>

          {/* 第三步 */}
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 12px 0' }}>第三步：回報今日啃完的實體分量</h3>
            <form onSubmit={handleReport} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '13px', display: 'block', marginBottom: '4px' }}>回報日期</label>
                  <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '13px', display: 'block', marginBottom: '4px' }}>選擇大計畫</label>
                  <select value={reportPlanId} onChange={e => { setReportPlanId(e.target.value); setReportBookId(''); }} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <option value="">-- 請選擇 --</option>
                    {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              {reportPlanId && currentSelectedPlan && (
                <div>
                  <label style={{ fontSize: '13px', display: 'block', marginBottom: '4px' }}>選擇特定書籍</label>
                  <select value={reportBookId} onChange={e => setReportBookId(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <option value="">-- 請選擇書籍 --</option>
                    {currentSelectedPlan.books?.map(b => (
                      <option key={b.id} value={b.id}>{b.title} (賸餘 {b.totalUnits - b.completedUnits} {b.unitType === 'pages' ? '頁' : '章'})</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '13px', display: 'block', marginBottom: '4px' }}>今日吞下分量</label>
                  <input type="number" min="1" value={reportUnits} onChange={e => setReportUnits(Number(e.target.value))} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 2 }}>
                  <label style={{ fontSize: '13px', display: 'block', marginBottom: '4px' }}>備考隨筆、核心錯題</label>
                  <input type="text" value={reportNotes} onChange={e => setReportNotes(e.target.value)} placeholder="例如: 膠體性質與梅納反應錯題" style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
              </div>
              <button type="submit" style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>送出進度（啟動自適應重組）</button>
            </form>
          </div>

        </div>

        {/* 右側戰情總覽 */}
        <div style={{ flex: '1 1 450px', backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px 0' }}>📊 備考進度條戰情總覽</h2>
          {plans.length === 0 ? (
            <div style={{ color: '#94a3b8', textAlign: 'center', padding: '40px 0' }}>目前尚無計畫，請利用左側表單建立。</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {plans.map(p => (
                <div key={p.id} style={{ border: '1px solid #f1f5f9', padding: '16px', borderRadius: '10px', backgroundColor: '#f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: p.color }}></span>
                    <strong style={{ fontSize: '16px' }}>{p.name}</strong>
                  </div>
                  
                  {(!p.books || p.books.length === 0) ? (
                    <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>該計畫內尚未加入書籍教材。</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {p.books.map(b => {
                        const pct = Math.min(100, Math.round((b.completedUnits / b.totalUnits) * 100));
                        const diffDays = Math.max(1, Math.ceil((new Date(b.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
                        return (
                          <div key={b.id} style={{ backgroundColor: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' }}>
                              <span>📖 <strong>{b.title}</strong></span>
                              <span style={{ fontSize: '12px', backgroundColor: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: '4px' }}>剩餘 {diffDays} 天</span>
                            </div>
                            <div style={{ width: '100%', backgroundColor: '#e2e8f0', height: '10px', borderRadius: '5px', overflow: 'hidden', margin: '8px 0' }}>
                              <div style={{ width: `${pct}%`, backgroundColor: p.color, height: '100%' }}></div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                              <span>進度率：{pct}%</span>
                              <span>已完成 {b.completedUnits} / {b.totalUnits} {b.unitType === 'pages' ? '頁' : '章'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};