import React from 'react';

interface SettingsViewProps {
  weeklyRestDays: number[];
  setWeeklyRestDays: React.Dispatch<React.SetStateAction<number[]>>;
  maxBooksPerDay: number;
  setMaxBooksPerDay: React.Dispatch<React.SetStateAction<number>>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  weeklyRestDays,
  setWeeklyRestDays,
  maxBooksPerDay,
  setMaxBooksPerDay,
}) => {
  
  // 🌟 修復核心：徹底阻斷點擊穿透，恢復點擊功能
  const toggleRestDay = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation(); // 阻斷冒泡
    setWeeklyRestDays((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]
    );
  };

  return (
    <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>⚙️ 智能排程參數設定中樞</h3>
        
        <div style={{ marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
          <strong style={{ display: 'block', fontSize: '13px', marginBottom: '8px' }}>1. 每週固定修整隔離日（配額自動延後平攤）</strong>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['日', '一', '二', '三', '四', '五', '六'].map((day, idx) => {
              const isRest = weeklyRestDays.includes(idx);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => toggleRestDay(idx, e)}
                  style={{
                    padding: '6px 10px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    cursor: 'pointer',
                    backgroundColor: isRest ? '#ef4444' : '#fff',
                    color: isRest ? 'white' : '#1e293b',
                    fontWeight: 'bold',
                  }}
                >
                  {day}{isRest ? ' 🔒' : ''}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <strong style={{ display: 'block', fontSize: '13px', marginBottom: '8px' }}>2. 每日心智切換書籍本數上限</strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px' }}>每天最多排：</span>
            <input
              type="number"
              min="1"
              max="5"
              value={maxBooksPerDay}
              onChange={(e) => setMaxBooksPerDay(Number(e.target.value))}
              style={{ width: '60px', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '6px', textAlign: 'center', fontWeight: 'bold' }}
            />
            <span style={{ fontSize: '13px' }}>本教材</span>
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #fee2e2', paddingTop: '16px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#dc2626' }}>⚠️ 數據危險管理</h4>
        <button
          onClick={() => {
            if (confirm('確定要清空所有進度重新開始嗎？')) {
              localStorage.clear();
              location.reload();
            }
          }}
          style={{ width: '100%', padding: '10px', backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
        >
          重置清空大腦所有數據
        </button>
      </div>
    </div>
  );
};