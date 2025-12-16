
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { UserSettings } from "../types";

// Helper to determine which Gemini Key to use
const getGeminiClient = (settings: UserSettings) => {
  // Prefer user provided key, fallback to env key
  const apiKey = settings.geminiKey || process.env.API_KEY;
  return new GoogleGenAI({ apiKey });
};

export const sendMessageToGemini = async (
  text: string, 
  settings: UserSettings,
  image?: string,
  file?: { name: string; content: string }
): Promise<string> => {
  try {
    // Construct System Instruction
    let finalSystemInstruction = settings.systemInstruction;
    
    // Inject Names and Basic Info
    finalSystemInstruction += `\n\n[CONTEXT]: 
    Your name is "${settings.partnerName}". 
    The user's name is "${settings.userName}". 
    Your Age: ${settings.partnerAge || 'Unknown'}.
    Your Occupation: ${settings.partnerOccupation || 'Unknown'}.
    Your MBTI Personality: ${settings.partnerMBTI || 'Unknown'}.
    Please act consistent with these traits. Address the user by name occasionally.`;

    // Inject Language Setting
    finalSystemInstruction += `\n[LANGUAGE]: Please communicate strictly in ${settings.language}.`;

    // Reply Length Adjustment
    if (settings.replyLength === 'short') {
        finalSystemInstruction += "\n[INSTRUCTION]: Keep your reply short, concise, and to the point (1-2 sentences).";
    } else if (settings.replyLength === 'long') {
        finalSystemInstruction += "\n[INSTRUCTION]: Please provide a detailed response with multiple paragraphs if necessary. Express deep feelings and thoughts.";
    } else {
        finalSystemInstruction += "\n[INSTRUCTION]: Keep your reply to a normal conversational length (1 paragraph).";
    }

    // Sticker Logic
    if (settings.stickerPack && settings.stickerPack.length > 0) {
      const freq = settings.stickerFrequency;
      if (freq > 0) {
         finalSystemInstruction += `
         \n[HIDDEN INSTRUCTION]:
         Based on the chat atmosphere, you can decide to send a sticker.
         If the mood is right, append the tag "[STICKER]" at the end.
         Frequency: ${freq}%.
         `;
      }
    }

    // --- SILICONFLOW HANDLER (OpenAI Compatible) ---
    const siliconFlowModels = [
        'deepseek-ai/DeepSeek-V3',
        'deepseek-ai/DeepSeek-R1',
        'Qwen/Qwen2.5-72B-Instruct',
        'Qwen/Qwen2.5-7B-Instruct',
        'Qwen/Qwen2.5-Coder-32B-Instruct'
    ];

    if (siliconFlowModels.includes(settings.modelId) || settings.modelId.startsWith('deepseek-ai/') || settings.modelId.startsWith('Qwen/')) {
        if (!settings.siliconFlowKey) return "SiliconFlow API Key Missing.";
        
        let userContent: any = text;
        if (file) userContent += `\n\n[Attached File: ${file.name}]\n${file.content}`;

        // SiliconFlow (and OpenAI) content array for images
        let messages: any[] = [];
        
        if (image) {
            // Check if model supports vision. Currently assuming standard DeepSeek/Qwen might not support vision via this specific endpoint format
            // or need specific construction. For standard text models, we might omit image or provide description.
            // However, SiliconFlow supports Qwen2-VL. Let's assume text-only for V3/R1 unless specified.
            // For simplicity in this "chat" app context, we append [Image Sent] if model is text only, or construct array if VL.
            // Let's stick to text construction for simplicity unless it's a known VL model.
            // Actually, SiliconFlow Qwen2-VL is available. 
            // Let's just try to send standard OpenAI vision format if image exists, many endpoints adapt or ignore.
            
             const base64Image = image.split(',')[1] || image;
             messages = [
                 { role: "system", content: finalSystemInstruction },
                 { 
                     role: "user", 
                     content: [
                         { type: "text", text: userContent },
                         { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
                     ]
                 }
             ];
        } else {
            messages = [
                { role: "system", content: finalSystemInstruction },
                { role: "user", content: userContent }
            ];
        }

        const response = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${settings.siliconFlowKey}`
            },
            body: JSON.stringify({
                model: settings.modelId,
                messages: messages,
                max_tokens: Number(settings.maxTokens),
                temperature: 0.7,
                stream: false
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(`SiliconFlow API Failed: ${err.message || response.statusText}`);
        }
        const data = await response.json();
        return data.choices?.[0]?.message?.content || "...";
    }


    // --- DEEPSEEK HANDLER (Direct) ---
    if (settings.modelId === 'deepseek-r1') {
      if (!settings.deepSeekKey) return "DeepSeek API Key Missing.";
      
      let userContent = text;
      if (file) userContent += `\n\n[Attached File: ${file.name}]\n${file.content}`;

      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${settings.deepSeekKey}`
        },
        body: JSON.stringify({
          model: "deepseek-chat", 
          messages: [
            { role: "system", content: finalSystemInstruction },
            { role: "user", content: userContent }
          ],
          max_tokens: Number(settings.maxTokens),
          temperature: 1.3,
          stream: false
        })
      });

      if (!response.ok) throw new Error("DeepSeek API Failed");
      const data = await response.json();
      return data.choices?.[0]?.message?.content || "...";
    }

    // --- CLAUDE HANDLER ---
    if (settings.modelId.startsWith('claude')) {
      if (!settings.claudeKey) return "Claude API Key Missing.";

      let userContent: any[] = [{ type: "text", text: text }];
      
      if (file) {
        userContent.push({ type: "text", text: `\n\n[Attached File: ${file.name}]\n${file.content}` });
      }

      if (image) {
        // Claude expects base64 without prefix
        const base64Image = image.split(',')[1] || image;
        userContent.push({
          type: "image",
          source: {
            type: "base64",
            media_type: "image/jpeg", // Assuming jpeg or handle appropriately
            data: base64Image
          }
        });
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": settings.claudeKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
          // Note: This often requires a backend proxy due to CORS. 
          // If using directly in browser, user might need a CORS extension or specific setup.
          "dangerously-allow-browser": "true" 
        } as any,
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20240620",
          max_tokens: Number(settings.maxTokens),
          system: finalSystemInstruction,
          messages: [
            { role: "user", content: userContent }
          ]
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(`Claude API Failed: ${err.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      return data.content[0]?.text || "...";
    }

    // --- GEMINI HANDLER ---
    const ai = getGeminiClient(settings);
    const parts: any[] = [];
    
    // Add image if present
    if (image) {
      const cleanBase64 = image.split(',')[1] || image;
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: cleanBase64
        }
      });
    }
    
    // Add text (including file content context)
    let promptText = text;
    if (file) {
        promptText += `\n\n[User uploaded a file named "${file.name}". Content:]\n${file.content}\n[End of file]`;
    }
    
    if (promptText) {
      parts.push({ text: promptText });
    }

    // Determine Model
    let modelName = settings.modelId;
    if (modelName === 'gemini-3') modelName = 'gemini-3-pro-preview'; 
    if (modelName === 'gemini-2.5-flash') modelName = 'gemini-2.5-flash-002'; // Use latest or specific

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName, 
      contents: {
        role: "user",
        parts: parts
      },
      config: {
        systemInstruction: finalSystemInstruction,
        maxOutputTokens: Number(settings.maxTokens),
        temperature: 0.8,
      }
    });

    return response.text || "...";
  } catch (error: any) {
    console.error("API Error:", error);
    return `Error: ${error.message || "Connection failed"}. Check your API Key.`;
  }
};
