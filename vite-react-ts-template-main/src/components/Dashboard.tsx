import React, { useState } from 'react';
import { useScheduler } from '../context/SchedulerContext';

export const Dashboard: React.FC = () => {
  const { plans = [], addPlan, addBookToPlan, submitProgress } = useScheduler();

  const [planName, setPlanName] = useState('');
  const [reportUnits, setReportUnits] = useState(10);

  // 如果你有看到這行字，代表檔案修改成功了！
  return (
    <div style={{ padding: '40px', backgroundColor: '#f9fafb' }}>
      <h1>Dashboard (已更新版)</h1>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '600px' }}>
        
        {/* 第一區塊：建立計畫 */}
        <section style={{ padding: '20px', background: '#dbeafe', borderRadius: '12px' }}>
          <h2>1. 建立新考試大框架</h2>
          <input value={planName} onChange={e => setPlanName(e.target.value)} placeholder="考試名稱" />
          <button onClick={() => addPlan(planName, '#2563eb')}>建立計畫</button>
        </section>

        {/* 第二區塊：綁定教材 */}
        <section style={{ padding: '20px', background: '#dcfce7', borderRadius: '12px' }}>
          <h2>2. 綁定教材</h2>
          <p>請在此綁定教材內容...</p>
        </section>

        {/* 第三區塊：進度回報 */}
        <section style={{ padding: '20px', background: '#fee2e2', borderRadius: '12px' }}>
          <h2>3. 進度實質回報 / 歷史補登</h2>
          <input type="number" value={reportUnits} onChange={e => setReportUnits(Number(e.target.value))} />
          <button onClick={() => console.log('送出進度')}>確認送出進度</button>
        </section>

      </div>
    </div>
  );
};