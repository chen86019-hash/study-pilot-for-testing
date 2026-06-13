import React from 'react';
import { useScheduler } from '../context/SchedulerContext';

export const PlanOverview: React.FC = () => {
  const { weeklyRestDays = [], setWeeklyRestDays, maxBooksPerDay = 2, setMaxBooksPerDay, plans = [] } = useScheduler();
  const days = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];

  const toggleDay = (idx: number) => {
    if (weeklyRestDays.includes(idx)) {
      setWeeklyRestDays(weeklyRestDays.filter(d => d !== idx));
    } else {
      setWeeklyRestDays([...weeklyRestDays, idx]);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 核心邏輯微調區 */}
      <div style={{ padding: '24px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 6px 0' }}>⚙️ 備考衝刺週期與輪班上限設定</h2>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>微調系統的演算法中樞，滿足你的高自主 loneliness 靜態研讀作息。</p>
        </div>

        {/* 休息日配置 */}
        <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '20px' }}>
          <strong style={{ display: 'block', marginBottom: '10px', fontSize: '14px', color: '#1e293b' }}>1. 自訂每週固定修整隔離日 (在此日子進度絕不溢出)</strong>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {days.map((day, idx) => {
              const isRest = weeklyRestDays.includes(idx);
              return (
                <button key={day} onClick={() => toggleDay(idx)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer', backgroundColor: isRest ? '#ef4444' : '#ffffff', color: isRest ? 'white' : '#1e2937', fontWeight: 'bold', transition: 'all 0.2s' }}>
                  {day} {isRest ? '🔒 休息' : '⚡ 衝刺'}
                </button>
              );
            })}
          </div>
        </div>

        {/* 每日考科限額控制 */}
        <div>
          <strong style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#1e293b' }}>2. 智能輪班：每日研讀考科/教材上限</strong>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 12px 0' }}>即使你規劃了 5、6 個考科，設定上限（推薦 2 本）後，演算法每天只會挑選最緊急的科目上陣，避免心智切換過度疲勞。</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px' }}>一天最多排：</span>
            <input type="number" min="1" max="10" value={maxBooksPerDay} onChange={e => setMaxBooksPerDay(Number(e.target.value))} style={{ width: '70px', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', textAlign: 'center' }} />
            <span style={{ fontSize: '14px', color: '#475569' }}>本教材 / 書籍</span>
          </div>
        </div>
      </div>

      {/* 資料現況與清空區 */}
      <div style={{ padding: '24px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 12px 0', color: '#ef4444' }}>⚠️ 數據清除危險區</h3>
        <button onClick={() => { if(confirm('確定要清空所有備考數據重來嗎？')) { localStorage.clear(); location.reload(); } }} style={{ padding: '10px 16px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
          重置並清空系統資料
        </button>
      </div>

    </div>
  );
};