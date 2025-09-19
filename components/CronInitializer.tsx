'use client';

import { useEffect } from 'react';

/**
 * 定时任务初始化器
 * 在客户端挂载时启动后端定时任务
 */
export default function CronInitializer() {
  useEffect(() => {
    // 只在开发环境中运行
    if (process.env.NODE_ENV !== 'development') return;
    
    // console.log('🚀 初始化本地定时任务...');
    
    // 启动定时任务
    startLocalCron();
    
    // 清理函数
    return () => {
      // console.log('🛑 组件卸载，停止定时任务');
    };
  }, []);

  return null; // 不渲染任何内容
}

/**
 * 启动本地定时任务
 */
function startLocalCron() {
  const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 小时（1天）
  // const INTERVAL_MS = 30 * 1000; // 测试用：30 秒
  
  // console.log(`⏰ 设置定时任务：每 ${INTERVAL_MS / 1000 / 60 / 60 / 24} 天执行一次`);
  
  // 立即执行一次
  executeCronTask();
  
  // 设置定时器
  const interval = setInterval(executeCronTask, INTERVAL_MS);
  
  // 将 interval 存储到 window 对象，以便其他地方可以清理
  if (typeof window !== 'undefined') {
    (window as Window & { cronInterval?: NodeJS.Timeout }).cronInterval = interval;
  }
}

/**
 * 执行定时任务
 */
async function executeCronTask() {
  const timestamp = new Date().toISOString();
  // console.log(`\n🔄 [${timestamp}] 自动执行：检查过期任务`);
  
  try {
    const response = await fetch('/api/cron/auto-drop-overdue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const result = await response.json();
    
    if (result.success) {
      if (result.tasksProcessed > 0) {
        // console.log(`✅ 自动处理了 ${result.tasksProcessed} 个过期任务`);
        
        // 可选：显示通知
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Afora 定时任务`, {
            body: `已自动处理 ${result.tasksProcessed} 个过期任务`,
            icon: '/icon.svg'
          });
        }
      } else {
        // console.log('ℹ️ 没有需要处理的过期任务');
      }
    } else {
      // console.log(`❌ 定时任务失败: ${result.error || '未知错误'}`);
    }
    
  } catch (error) {
    console.error(`💥 定时任务执行失败:`, (error as Error).message);
  }
}
