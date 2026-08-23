import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
      timestamp: new Date().toISOString(),
    });
  });

  // Antigravity & Gemini Research Scholar Endpoint
  app.post('/api/gemini/research', async (req, res) => {
    try {
      const { prompt, topicTitle, category, contextNotes, mode = 'scholar_analysis' } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const ai = getGenAI();
      if (!ai) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY chưa được cấu hình. Vui lòng cấu hình API Key trong Settings > Secrets để kích hoạt Trợ lý Khảo cứu Antigravity AI.',
          fallback: true,
        });
      }

      let systemInstruction = `Bạn là một Học Giả Trí Tuệ Nhân Tạo Cao Cấp (Antigravity Research Scholar & Engine) chuyên sâu về hai hệ thống tri thức bác học:
1. PHẬT HỌC HỌC THUẬT: Tam Tạng Pali (Tipiṭaka), Luận Tạng Vi Diệu Pháp (Abhidhamma Piṭaka - 89/121 Tâm, 52 Tâm Sở, 28 Sắc Pháp, 24 Duyên Paṭṭhāna), Duy Thức Học (Yogācāra), Thiền Định (Samatha - Vipassanā, 16 Tuệ Minh Sát).
2. HUYỀN HỌC & DỊCH HỌC PHƯƠNG ĐÔNG: Chu Dịch (Kinh Dịch 64 Quẻ, Thập Dực), Kỳ Môn Độn Giáp (Tam Kỳ, Lục Nghi, Cửu Tinh, Bát Môn, Bát Thần), Thái Ất Thần Số, Tử Vi Đẩu Số, Phong Thủy Loan Đầu & Lý Khí, Bát Tự Hà Lạc.

Phong cách phản hồi:
- Chuẩn mực học thuật, sâu sắc, sáng tỏ, sử dụng thuật ngữ gốc chính xác (kèm nguyên ngữ Pali/Sanskrit dạng IAST hoặc Hán Cổ).
- Đối chiếu liên ngành tinh tế (so sánh tâm lý học Phật giáo với cơ chế vận hành của Dịch Lý và Vũ Trụ quan Huyền học).
- Trình bày định dạng Markdown rõ ràng, có phân mục, bảng so sánh hoặc trích dẫn khi cần thiết.`;

      if (mode === 'pali_sanskrit_exegesis') {
        systemInstruction += `\nNhiệm vụ trọng tâm hiện tại: Giải nghĩa chiết tự từ gốc ngữ Pali/Sanskrit/Hán Cổ, tra cứu nghĩa gốc văn bản cổ và các dị bản dịch nghĩa học thuật.`;
      } else if (mode === 'cross_domain_link') {
        systemInstruction += `\nNhiệm vụ trọng tâm hiện tại: Khảo cứu và phân tích mối liên hệ nhân quả, triết học và tâm thức giữa Vi Diệu Pháp (Abhidharma) và Dịch Học/Kỳ Môn/Huyền Học.`;
      }

      const promptContext = `Chủ đề khảo cứu: "${topicTitle || 'Nghiên cứu Tổng Quát'}" (Lĩnh vực: ${category || 'Phật học & Huyền học'})\n` +
        (contextNotes ? `Ghi chú ngữ cảnh: ${contextNotes}\n\n` : '') +
        `Yêu cầu nghiên cứu: ${prompt}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: promptContext,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      res.json({
        result: response.text || 'Không có phản hồi từ mô hình AI.',
        model: 'gemini-3.7-flash',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Gemini Research API Error:', error);
      res.status(500).json({
        error: error.message || 'Lỗi xử lý yêu cầu nghiên cứu từ Gemini API.',
      });
    }
  });

  // Semantic Link Discovery between Topics
  app.post('/api/gemini/semantic-links', async (req, res) => {
    try {
      const { currentTopic, availableTopics } = req.body;
      const ai = getGenAI();

      if (!ai) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY chưa được cấu hình.',
        });
      }

      const prompt = `Phân tích chủ đề hiện tại:
- Tiêu đề: ${currentTopic.title}
- Thể loại: ${currentTopic.type}
- Mô tả: ${currentTopic.description}

Dưới đây là danh sách các chủ đề khác trong hệ thống:
${JSON.stringify(
  availableTopics.map((t: any) => ({
    id: t.id,
    title: t.title,
    type: t.type,
    category: t.categoryName,
  }))
)}

Hãy phát hiện từ 2 đến 5 liên kết tri thức sâu sắc và có căn cứ nhất giữa chủ đề hiện tại và các chủ đề trong danh sách (đặc biệt ưu tiên các mối liên hệ giao thoa giữa Phật Học và Huyền Học).
Trả về kết quả ở dạng JSON thuần túy theo cấu trúc:
[
  {
    "targetId": "string",
    "targetTitle": "string",
    "linkType": "related" | "prerequisite" | "advanced" | "contradicts",
    "strength": number (1-5),
    "explanation": "string giải thích ngắn gọn 1-2 câu về mối tương quan học thuật"
  }
]`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          systemInstruction: 'Bạn là chuyên gia khai phá biểu đồ tri thức (Knowledge Graph AI) cho Phật học và Huyền học Đông phương.',
        },
      });

      let parsedLinks = [];
      try {
        parsedLinks = JSON.parse(response.text || '[]');
      } catch (e) {
        console.error('Error parsing links JSON:', e);
      }

      res.json({ links: parsedLinks });
    } catch (error: any) {
      console.error('Semantic Link Error:', error);
      res.status(500).json({ error: error.message || 'Lỗi phân tích liên kết tri thức.' });
    }
  });

  // Generate Spaced Repetition Cards (Flashcards & Quiz)
  app.post('/api/gemini/generate-cards', async (req, res) => {
    try {
      const { topicTitle, content, noteContent } = req.body;
      const ai = getGenAI();

      if (!ai) {
        return res.status(503).json({ error: 'GEMINI_API_KEY chưa được cấu hình.' });
      }

      const prompt = `Tạo 3 câu hỏi ôn tập chuyên sâu theo phương pháp Spaced Repetition (SM-2) cho chủ đề: "${topicTitle}".
Nội dung tài liệu:
${content}
${noteContent ? `Ghi chú đi kèm: ${noteContent}` : ''}

Yêu cầu định dạng JSON:
[
  {
    "question": "Câu hỏi khảo cứu hoặc phân định khái niệm",
    "answer": "Câu trả lời cô đọng, chính xác, có thuật ngữ gốc",
    "difficulty": "easy" | "medium" | "hard",
    "tags": ["tag1", "tag2"]
  }
]`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          systemInstruction: 'Bạn là giảng sư Phật học và dịch học tạo giáo trình ôn tập trí nhớ cao cấp.',
        },
      });

      let cards = [];
      try {
        cards = JSON.parse(response.text || '[]');
      } catch (e) {
        console.error('Error parsing cards JSON:', e);
      }

      res.json({ cards });
    } catch (error: any) {
      console.error('Generate Cards Error:', error);
      res.status(500).json({ error: error.message || 'Lỗi sinh thẻ ôn tập.' });
    }
  });

  // Vite middleware for development or Static Serving in Production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Knowledge OS Server running on http://localhost:${PORT}`);
  });
}

startServer();
