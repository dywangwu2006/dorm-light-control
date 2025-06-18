// 使用内存存储的简单速率限制器
const rateLimitStore = new Map();

export default async (req, res) => {
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 获取客户端IP（在Vercel环境中，使用x-forwarded-for）
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  // 速率限制配置
  const WINDOW_MS = 10000; // 10秒
  const MAX_REQUESTS = 5; // 10秒内最多5次请求

  // 获取当前时间戳
  const currentTime = Date.now();

  // 初始化或获取该IP的记录
  if (!rateLimitStore.has(clientIP)) {
    rateLimitStore.set(clientIP, {
      count: 1,
      startTime: currentTime
    });
  } else {
    const record = rateLimitStore.get(clientIP);
    
    // 检查是否在时间窗口内
    if (currentTime - record.startTime < WINDOW_MS) {
      // 在时间窗口内，增加计数
      record.count++;
      
      // 如果超过最大请求数，返回错误
      if (record.count > MAX_REQUESTS) {
        return res.status(429).json({ error: '操作过于频繁，请稍后再试' });
      }
    } else {
      // 时间窗口已过，重置计数器和时间
      record.count = 1;
      record.startTime = currentTime;
    }
  }

  // 从请求体中获取命令
  const { command } = req.body;

  // 验证命令
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
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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