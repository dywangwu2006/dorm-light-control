// 使用 Vercel 内置的速率限制配置
export const config = {
  maxDuration: 10,
};

// 内存存储的简单速率限制器
const requestStore = new Map();

export default async (req, res) => {
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // 获取客户端IP
  const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  // 速率限制检查
  const currentTime = Date.now();
  const windowMs = 10000; // 10秒窗口
  const maxRequests = 5; // 最大请求数
  
  // 初始化或获取客户端记录
  if (!requestStore.has(clientIP)) {
    requestStore.set(clientIP, {
      count: 1,
      startTime: currentTime
    });
  } else {
    const record = requestStore.get(clientIP);
    
    // 检查是否在时间窗口内
    if (currentTime - record.startTime < windowMs) {
      // 在时间窗口内，增加计数
      record.count++;
      
      // 检查是否超过限制
      if (record.count > maxRequests) {
        return res.status(429).json({ error: '操作过于频繁，请稍后再试' });
      }
    } else {
      // 重置计数器和时间窗口
      record.count = 1;
      record.startTime = currentTime;
    }
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