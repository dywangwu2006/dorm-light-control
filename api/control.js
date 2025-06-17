import { rateLimit } from '@vercel/rate-limit';

// 配置速率限制（10秒内最多5次请求）
const limiter = rateLimit({
  window: '10s',
  limit: 5
});

export default async (req, res) => {
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // 应用速率限制
  const { isRateLimited } = await limiter.check(req);
  if (isRateLimited) {
    return res.status(429).json({ error: '操作过于频繁，请稍后再试' });
  }
  
  const { command } = req.body;
  
  // 验证合法命令
  if (!['on', 'off'].includes(command)) {
    return res.status(400).json({ error: '无效指令' });
  }
  
  try {
    // 从环境变量获取敏感数据
    const UID = process.env.BEHMA_UID;
    const TOPIC = "sushe002";
    
    // 转发到巴法云API
    const response = await fetch('https://apis.bemfa.com/va/postmsg', {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams({
        uid: UID,
        topic: TOPIC,
        type: '3',
        msg: command
      })
    });
    
    const data = await response.text();
    
    // 检查巴法云响应
    if (!response.ok) {
      throw new Error(`巴法云API错误: ${response.status}`);
    }
    
    return res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('[控制API错误]:', error);
    return res.status(500).json({ 
      error: '控制指令发送失败',
      details: error.message
    });
  }
};