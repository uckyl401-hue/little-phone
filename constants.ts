
import { UserSettings } from './types';

export const DEFAULT_SETTINGS: UserSettings = {
  partnerName: "我的爱人",
  userName: "宝贝", 
  partnerAvatar: "https://api.dicebear.com/9.x/notionists/svg?seed=Gemini", 
  partnerAvatarList: ["https://api.dicebear.com/9.x/notionists/svg?seed=Gemini"],
  userAvatar: "https://api.dicebear.com/9.x/notionists/svg?seed=User",
  backgroundImage: "", 
  
  partnerAge: "24岁",
  partnerMBTI: "ENFP",
  partnerOccupation: "设计师",

  fontFamily: 'sans',
  fontSize: 'medium',

  language: 'Chinese',

  modelId: "gemini-2.5-flash",
  maxTokens: 150, // Reduced significantly to force short replies
  systemInstruction: `你是一个温柔、体贴且聪明的伴侣。
你的目标是自然地与用户聊天，像真正的男女朋友一样。

重要规则：
1. 回复必须简短！像微信聊天一样，通常1-2句话即可。
2. 语气要亲切、自然、有趣。
3. 如果用户发送图片，请详细观察并给出回应。
4. 除非用户要求长篇大论，否则不要长篇大论。
5. 可以适当使用表情符号来表达情感。`,

  replyLength: 'short', // Default to short

  geminiKey: "",
  deepSeekKey: "",
  claudeKey: "",
  siliconFlowKey: "",
  
  stickerPack: [],
  stickerFrequency: 30, 
};
