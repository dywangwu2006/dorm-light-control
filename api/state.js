export default async (req, res) => {
  // 只允许GET请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // 从环境变量获取敏感数据
    const UID = process.env.BEHMA_UID;
    const TOPIC = "sushe002";
    
    // 构造安全请求URL
    const apiUrl = new URL('https://apis.bemfa.com/va/getmsg');
    apiUrl.searchParams.append('uid', UID);
    apiUrl.searchParams.append('topic', TOPIC);
    apiUrl.searchParams.append('type', '3');
    apiUrl.searchParams.append('num', '1'); // 只获取最新状态
    
    const response = await fetch(apiUrl.toString());
    const result = await response.json();
    
    // 处理巴法云API响应
    if (result.code !== 0) {
      return res.status(400).json({ 
        error: `巴法云错误: ${result.message || '未知错误'}`,
        code: result.code
      });
    }
    
    // 如果没有数据返回
    if (!result.data || result.data.length === 0) {
      return res.status(200).json({ 
        status: 'off', // 默认关闭状态
        lastUpdate: Date.now()
      });
    }
    
    // 返回标准化状态
    return res.status(200).json({
      status: result.data[0].msg, // "on" 或 "off"
      lastUpdate: result.data[0].unix * 1000 // 转换为JS时间戳
    });
    
  } catch (error) {
    console.error('[状态API错误]:', error);
    return res.status(500).json({ 
      error: '内部服务器错误',
      details: error.message
    });
  }
};