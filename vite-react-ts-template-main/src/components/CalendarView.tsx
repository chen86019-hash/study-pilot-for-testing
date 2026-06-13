import React, { useState } from 'react';

// ... (省略 interface 定義，請保持原樣)

export const CalendarView: React.FC<CalendarViewProps> = ({
  plans,
  dailyLogs,
  weeklyRestDays,
  maxBooksPerDay,
}) => {
  // ... (省略狀態與函式邏輯，請保持原樣)

  return (
    <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <button onClick={() => {/* 上個月邏輯 */}} style={{ padding: '8px 14px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>◀ 上個月</button>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1e3a8a' }}>🗓️ {currentYear} 年 {currentMonth + 1} 月</h2>
        <button onClick={() => {/* 下個月邏輯 */}} style={{ padding: '8px 14px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>下個月 ▶</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: 'bold', paddingBottom: '8px', borderBottom: '2px solid #e2e8f0', marginBottom: '8px' }}>
        {['日', '一', '二', '三', '四', '五', '六'].map((w, i) => (
          <div key={w} style={{ color: i === 0 || i === 6 ? '#ef4444' : '#475569', fontSize: '14px' }}>{w}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
        {getMonthGrid().map((grid, idx) => {
          const { isRest, dayLogs, recommendations, dateStr } = getDayPlanDetails(grid.date);
          const isToday = new Date().toISOString().split('T')[0] === dateStr;

          return (
            <div key={idx} onClick={() => setActiveDialog({ dateStr, isRest, dayLogs, recommendations })} style={{ /* 樣式 */ }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                <span style={{ color: isToday ? '#2563eb' : '#1e293b' }}>{grid.date.getDate()}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', margin: '4px 0', overflow: 'hidden' }}>
                {!isRest && recommendations.map((r, i) => (
                  <div key={i} style={{ backgroundColor: r.color, color: 'white', fontSize: '9px', padding: '1px 4px', borderRadius: '3px' }}>
                    {r.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};