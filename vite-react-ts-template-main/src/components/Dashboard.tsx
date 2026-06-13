import React, { useState } from 'react';
import { useScheduler } from '../context/SchedulerContext';

export const Dashboard: React.FC = () => {
  const { plans = [], addPlan, addBookToPlan, submitProgress } = useScheduler();

  // 狀態維持不變
  const [planName, setPlanName] = useState('');
  const [reportUnits, setReportUnits] = useState(10);

  return (
    <div style={{ padding: '20px', border: '5px solid #2563eb' }}>
      <h1>開發模式：介面順序強制重構</h1>
      
      {/* 使用 Flex column 確保由上而下的固定順序 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        
        {/* 第一順位：建立計畫 */}
        <section style={{ padding: '20px', backgroundColor: '#f0f9ff', borderRadius: '8px' }}>
          <h2 style={{ color: '#0369a1' }}>第一步：建立計畫</h2>
          <input value={planName} onChange={e => setPlanName(e.target.value)} placeholder="考試名稱" />
          <button onClick={() => addPlan(planName, '#2563eb')}>建立</button>
        </section>

        {/* 第二順位：綁定教材 */}
        <section style={{ padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
          <h2 style={{ color: '#15803d' }}>第二步：綁定教材</h2>
          <p>這裡放置你的綁定教材表單內容...</p>
        </section>

        {/* 第三順位：進度回報 (原本在最上面的藍色格子) */}
        <section style={{ padding: '20px', backgroundColor: '#fef2f2', borderRadius: '8px' }}>
          <h2 style={{ color: '#b91c1c' }}>第三步：進度實質回報</h2>
          <input type="number" value={reportUnits} onChange={e => setReportUnits(Number(e.target.value))} />
          <button onClick={() => console.log('送出進度')}>確認送出進度</button>
        </section>

      </div>
    </div>
  );
};