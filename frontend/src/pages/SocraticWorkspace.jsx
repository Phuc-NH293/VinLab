import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Activity, ArrowRight, Bot, BookOpen, CheckCircle2, ChevronLeft, Clock3, Database, ExternalLink, FileCheck, FlaskConical, LayoutDashboard, MapPin, MapPinned, MessageCircle, Minus, Network, Search, Send, ShieldCheck, Sparkles, Users } from 'lucide-react';

import { api, API, authHeaders } from '../lib/api';

import { lessonCatalog } from '../config/appConfig';

function ChatMessageContent({ message }) {
  const hasAIResponse = message.sourceType === 'general' || message.sourceType === 'mixed';

  return (
    <>
      {hasAIResponse && <div className="ai-chat-section-label">Gemini trả lời</div>}
      <div className="ai-chat-answer">{message.text}</div>
      {message.slideAnswer && (
        <div className="ai-chat-slide-section">
          <div className="ai-chat-section-label ai-chat-section-label-slide">Trong slide</div>
          <div className="ai-chat-answer">{message.slideAnswer}</div>
        </div>
      )}
      {message.citations?.length > 0 && (
        <div className="ai-chat-citations">
          {message.citations.map((citation, index) => (
            <div className="ai-chat-citation" key={`${citation.page}-${index}`}>
              <strong>Slide · Trang {citation.page}</strong>
              <span>“{citation.quote}”</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export function SocraticWorkspace() {
  const [subTab, setSubTab] = useState('home');
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [lessonResource, setLessonResource] = useState(null);
  const [lessonSlides, setLessonSlides] = useState([]);
  const [slidePdfUrl, setSlidePdfUrl] = useState('');
  const [slideLoading, setSlideLoading] = useState(false);
  const [slideError, setSlideError] = useState('');
  const [slideAssistantOpen, setSlideAssistantOpen] = useState(false);
  const slideChatEndRef = useRef(null);
  const [level, setLevel] = useState(3);
  const [xp, setXp] = useState(240);
  const [streak, setStreak] = useState(12);
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Trao đổi với AI Tutor', sub: 'Hỏi 1 câu về Prompt Design', xp: 20, completed: false, tab: 'tutor' },
    { id: 2, title: 'Luyện tập kỹ năng yếu', sub: 'Khắc phục lỗ hổng RAG', xp: 30, completed: false, tab: 'knowledge-map' },
    { id: 3, title: 'Hoàn thành bài kiểm tra thử', sub: 'Quiz: Lý thuyết AI Cơ bản', xp: 50, completed: false, tab: 'exam' }
  ]);

  // VLearn customization states
  const [selectedNode, setSelectedNode] = useState('rag');
  const [socraticMode, setSocraticMode] = useState(true);

  // Chatbot states
  const [messages, setMessages] = useState([
    { id: 1, sender: 'bot', text: 'Chào bạn! Hôm nay chúng ta sẽ tìm hiểu về Prompt Engineering (Thiết kế câu lệnh). Theo bạn, điều gì làm nên sự khác biệt giữa một câu lệnh chung chung và một câu lệnh có cấu trúc tốt?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatTopic, setChatTopic] = useState('prompt_design');
  const [chatReplying, setChatReplying] = useState(false);

  // Quiz states
  const [quizActive, setQuizActive] = useState(false);
  const [quizStep, setQuizStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [quizScore, setQuizScore] = useState(null);

  // History states
  const [studyHistory, setStudyHistory] = useState([
    { id: 1, name: 'Socratic Chat: RAG basics', score: '95% hoàn thành', date: '21/06/2026' },
    { id: 2, name: 'Quiz: Prompt Design', score: '8/10', date: '19/06/2026' },
    { id: 3, name: 'Socratic Chat: AI Agent', score: '80% hoàn thành', date: '15/06/2026' }
  ]);

  useEffect(() => {
    api('/lessons/slides').then(setLessonSlides).catch(() => setLessonSlides([]));
  }, []);

  useEffect(() => () => {
    if (slidePdfUrl) URL.revokeObjectURL(slidePdfUrl);
  }, [slidePdfUrl]);

  useEffect(() => {
    if (slideAssistantOpen) {
      slideChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, slideAssistantOpen]);

  useEffect(() => {
    if (!selectedLesson) return;
    if (selectedLesson.id === 3 || selectedLesson.id === 6) {
      setChatTopic('ai_agents');
    } else if (selectedLesson.id === 1 || selectedLesson.id === 2) {
      setChatTopic('rag_basics');
    } else {
      setChatTopic('prompt_design');
    }
  }, [selectedLesson?.id]);

  async function openLessonSlide(lessonId) {
    setLessonResource('slides');
    setSlideAssistantOpen(false);
    setSlideLoading(true);
    setSlideError('');
    try {
      const response = await fetch(`${API}/lessons/${lessonId}/slide`, {
        headers: authHeaders(),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Không thể mở slide');
      }
      setSlidePdfUrl(URL.createObjectURL(await response.blob()));
    } catch (error) {
      setSlidePdfUrl('');
      setSlideError(error.message);
    } finally {
      setSlideLoading(false);
    }
  }

  const roadmapLessons = [
    {
      id: 1,
      title: 'Nền tảng AI & LLM',
      description: 'Khái niệm về mô hình ngôn ngữ lớn, các tham số cơ bản và cách hoạt động của mạng neuron sinh học/nhân tạo.',
      status: 'completed',
      duration: '90 phút',
      slides: 24,
      labTitle: 'Khám phá tham số của LLM',
      labDescription: 'Thử nghiệm Temperature và Top-p để quan sát sự thay đổi trong câu trả lời của mô hình.',
      quizQuestions: 10,
    },
    {
      id: 2,
      title: 'Xác định bài toán AI',
      description: 'Tìm hiểu các miền ứng dụng của học máy, phân biệt phân loại, hồi quy và học không giám sát.',
      status: 'completed',
      duration: '100 phút',
      slides: 28,
      labTitle: 'Phân loại bài toán thực tế',
      labDescription: 'Phân tích các tình huống và lựa chọn đúng nhóm bài toán AI cùng chỉ số đánh giá.',
      quizQuestions: 10,
    },
    {
      id: 3,
      title: 'Chatbot & Agent',
      description: 'Từ ứng dụng hỏi đáp cơ bản đến tác nhân có thể quan sát, lập kế hoạch và gọi API công cụ ngoài.',
      status: 'completed',
      duration: '110 phút',
      slides: 32,
      labTitle: 'Thiết kế luồng chatbot',
      labDescription: 'Xây dựng một luồng hội thoại có bộ nhớ và xử lý các nhánh yêu cầu phổ biến.',
      quizQuestions: 12,
    },
    {
      id: 4,
      title: 'Thiết kế câu lệnh & Tool Calling',
      description: 'System Prompt, kỹ thuật ít mẫu (few-shot prompting) và chỉ định tham số đầu ra có cấu trúc.',
      status: 'active',
      duration: '120 phút',
      slides: 36,
      labTitle: 'Xây dựng trợ lý gọi công cụ',
      labDescription: 'Viết system prompt, định nghĩa JSON schema và xử lý kết quả từ một công cụ giả lập.',
      quizQuestions: 15,
    },
    {
      id: 5,
      title: 'Tư duy sản phẩm AI',
      description: 'Phân tích tính khả thi của tính năng AI, xác định metrics đo lường và quản trị rủi ro ảo tưởng.',
      status: 'locked',
      duration: '100 phút',
      slides: 30,
      labTitle: 'Đánh giá ý tưởng sản phẩm AI',
      labDescription: 'Lập bảng giả thuyết, chỉ số thành công và rủi ro cho một tính năng AI.',
      quizQuestions: 12,
    },
    {
      id: 6,
      title: 'Xây dựng nguyên mẫu thử nghiệm',
      description: 'Cách build nhanh giao diện mockup bằng Gradio/Streamlit và trình bày phần thử nghiệm (AI Demo).',
      status: 'locked',
      duration: '120 phút',
      slides: 34,
      labTitle: 'Tạo AI Demo đầu tiên',
      labDescription: 'Dựng một nguyên mẫu tương tác và chuẩn bị kịch bản trình diễn sản phẩm.',
      quizQuestions: 15,
    },
  ];

  const conceptNodes = {
    llm: {
      title: 'Nền tảng LLM & AI',
      mastery: 100,
      status: 'Đã thông thạo',
      statusClass: 'text-emerald-500 bg-emerald-50 border-emerald-100',
      description: 'Hiểu về cấu trúc Transformer, Tokenization, và cách hoạt động cơ bản của các mô hình ngôn ngữ lớn.',
      skills: [
        { name: 'Transformer Architecture & Attention', ok: true },
        { name: 'Tokenization & Context Window', ok: true },
        { name: 'Model Parameters (Temperature, Top-p)', ok: true }
      ],
      suggestedTask: 'Làm bài kiểm tra thử',
      actionTab: 'exam'
    },
    prompt: {
      title: 'Prompt Engineering (Thiết kế câu lệnh)',
      mastery: 65,
      status: 'Khá tốt',
      statusClass: 'text-blue-500 bg-blue-50/50 border-blue-100',
      description: 'Kỹ năng giao tiếp và tối ưu hóa phản hồi từ mô hình thông qua cấu trúc chỉ thị rõ ràng, ví dụ cụ thể và phân tách bối cảnh.',
      skills: [
        { name: 'System Prompt vs User Prompt', ok: true },
        { name: 'Few-shot & Zero-shot Prompting', ok: true },
        { name: 'Structured Outputs (JSON, Markdown)', ok: false }
      ],
      suggestedTask: 'Trao đổi về Prompt Design',
      actionTab: 'tutor'
    },
    rag: {
      title: 'Retrieval-Augmented Generation (RAG)',
      mastery: 30,
      status: 'Cần cải thiện',
      statusClass: 'text-blue-700 bg-blue-50/50 border-blue-100',
      description: 'Mô hình kết hợp truy xuất thông tin từ bên ngoài vào bối cảnh của LLM để giảm thiểu ảo tưởng và cập nhật tri thức mới.',
      skills: [
        { name: 'Semantic Chunking & Overlap', ok: false },
        { name: 'Vector Database & Retrieval (Cosine Similarity)', ok: true },
        { name: 'Re-ranking & Context Compression', ok: false }
      ],
      suggestedTask: 'Hỏi AI Tutor về RAG & Vector store',
      actionTab: 'tutor'
    },
    embeddings: {
      title: 'Embeddings & Vector Store',
      mastery: 45,
      status: 'Đang tiến bộ',
      statusClass: 'text-amber-500 bg-amber-50/50 border-amber-100',
      description: 'Hiểu bản chất của biểu diễn vector từ ngữ nghĩa và cách truy vấn hiệu quả trên không gian nhiều chiều.',
      skills: [
        { name: 'Embedding Models (text-embedding-3)', ok: true },
        { name: 'Vector Search Indexing (HNSW, IVF)', ok: false },
        { name: 'Distance Metrics (L2, Inner Product, Cosine)', ok: false }
      ],
      suggestedTask: 'Khắc phục lỗ hổng RAG',
      actionTab: 'home'
    },
    agents: {
      title: 'AI Agent & Tool Calling',
      mastery: 15,
      status: 'Mới bắt đầu',
      statusClass: 'text-purple-500 bg-purple-50/50 border-purple-100',
      description: 'Xây dựng các tác nhân tự chủ có khả năng lập kế hoạch suy luận ReAct và gọi công cụ ngoài thông qua giao thức MCP.',
      skills: [
        { name: 'ReAct Plan-and-Solve Loop', ok: false },
        { name: 'Tool Calling Schema & Argument Parsing', ok: true },
        { name: 'Model Context Protocol (MCP) Setup', ok: false }
      ],
      suggestedTask: 'Khám phá AI Agents & MCP',
      actionTab: 'tutor'
    }
  };

  const chatPills = {
    prompt_design: [
      { text: 'Thêm ngữ cảnh & vai trò', search: 'context' },
      { text: 'Viết câu lệnh thật dài', search: 'dài' }
    ],
    rag_basics: [
      { text: 'Hạn chế ảo tưởng (bịa đặt thông tin)', search: 'bịa' },
      { text: 'Để mô hình chạy nhanh hơn', search: 'nhanh' }
    ],
    ai_agents: [
      { text: 'Khả năng lập kế hoạch (Planning) & MCP', search: 'kế hoạch' },
      { text: 'Do lập trình viên gán cứng sẵn', search: 'gán cứng' }
    ]
  };

  useEffect(() => {
    let introText = '';
    if (socraticMode) {
      if (chatTopic === 'prompt_design') {
        introText = 'Chào bạn! Hôm nay chúng ta sẽ tìm hiểu về Prompt Engineering (Thiết kế câu lệnh). Theo bạn, điều gì làm nên sự khác biệt giữa một câu lệnh chung chung và một câu lệnh có cấu trúc tốt?';
      } else if (chatTopic === 'rag_basics') {
        introText = 'Chào bạn! RAG là phương pháp rất phổ biến hiện nay. Theo bạn, tại sao một mô hình ngôn ngữ lớn lại cần thêm bước truy xuất tài liệu bên ngoài thay vì tự trả lời ngay?';
      } else {
        introText = 'Chào bạn! Chúng ta cùng thảo luận về AI Agents & MCP. Một Agent thông minh cần khả năng gọi công cụ để lấy thông tin. Làm thế nào nó tự biết lúc nào cần gọi công cụ?';
      }
    } else {
      if (chatTopic === 'prompt_design') {
        introText = 'Chào bạn! Dưới đây là hướng dẫn viết Prompt tốt trực tiếp: Bạn hãy dùng cấu trúc Role, Context, Instruction, Examples, và Output Format. Bạn muốn xem chi tiết phần nào?';
      } else if (chatTopic === 'rag_basics') {
        introText = 'Chào bạn! RAG (Retrieval-Augmented Generation) giúp mở rộng tri thức LLM bằng cách lấy thông tin từ VectorDB rồi nhúng vào ngữ cảnh prompt. Bạn cần tìm hiểu bước nào cụ thể?';
      } else {
        introText = 'Chào bạn! AI Agent kết hợp LLM với Trí nhớ (Memory), Lập kế hoạch (Planning), và Công cụ (Tools). Giao thức MCP giúp kết nối mô hình với máy chủ bên ngoài để chạy mã lệnh hoặc truy vấn dữ liệu.';
      }
    }
    setMessages([
      { id: 1, sender: 'bot', text: introText }
    ]);
  }, [chatTopic, socraticMode]);

  const quizQuestions = [
    {
      q: 'LLM viết tắt của cụm từ nào dưới đây?',
      options: ['Large Language Model', 'Low Level Machine', 'Linear Logical Method'],
      correct: 0
    },
    {
      q: 'Trong mô hình RAG (Retrieval-Augmented Generation), pha nào diễn ra trước?',
      options: ['Generation (Sinh câu trả lời)', 'Retrieval (Truy xuất tài liệu)', 'Cả hai diễn ra song song'],
      correct: 1
    },
    {
      q: 'MCP viết tắt của từ gì trong hệ sinh thái AI Agents?',
      options: ['Multi Chat Protocol', 'Model Context Protocol', 'Machine Control Protocol'],
      correct: 1
    }
  ];

  async function handleSendChat(text) {
    if (!text.trim() || chatReplying) return;
    const cleanText = text.trim();
    const history = messages.slice(-8).map(message => ({
      role: message.sender === 'user' ? 'user' : 'model',
      text: message.text,
    }));
    const userMsg = { id: `${Date.now()}-user`, sender: 'user', text: cleanText };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatReplying(true);

    const topicLessonIds = {
      prompt_design: 4,
      rag_basics: 2,
      ai_agents: 3,
    };
    const lessonId = subTab === 'roadmap' && lessonResource === 'slides' && selectedLesson
      ? selectedLesson.id
      : topicLessonIds[chatTopic];

    try {
      const result = await api('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: cleanText,
          lesson_id: lessonId,
          topic: chatTopic,
          socratic_mode: socraticMode,
          history,
        }),
      });
      setMessages(prev => [...prev, {
        id: `${Date.now()}-bot`,
        sender: 'bot',
        text: result.answer,
        slideAnswer: result.slide_answer,
        sourceType: result.source_type,
        citations: result.citations,
      }]);
      setTasks(prev => prev.map(t => t.id === 1 ? { ...t, completed: true } : t));
    } catch (error) {
      setMessages(prev => [...prev, {
        id: `${Date.now()}-error`,
        sender: 'bot',
        text: `Không gọi được trợ giảng AI: ${error.message}`,
        isError: true,
      }]);
    } finally {
      setChatReplying(false);
    }
  }

  function handleSelectOption(optIdx) {
    setAnswers(prev => ({ ...prev, [quizStep]: optIdx }));
  }

  function handleNextQuiz() {
    if (quizStep < quizQuestions.length - 1) {
      setQuizStep(prev => prev + 1);
    } else {
      // Calculate score
      let correctCount = 0;
      quizQuestions.forEach((q, idx) => {
        if (answers[idx] === q.correct) correctCount++;
      });
      const finalScore = `${correctCount}/${quizQuestions.length}`;
      setQuizScore(finalScore);
      
      // Award XP
      setXp(prev => {
        const nextXp = prev + 50;
        if (nextXp >= 360) {
          setLevel(4);
          return nextXp - 360;
        }
        return nextXp;
      });

      // Add to study history
      setStudyHistory(prev => [
        { id: prev.length + 1, name: 'Quiz: Lý thuyết AI Cơ bản', score: finalScore, date: 'Hôm nay' },
        ...prev
      ]);

      // Complete task 3
      setTasks(prev => prev.map(t => t.id === 3 ? { ...t, completed: true } : t));
    }
  }

  function handleResetQuiz() {
    setQuizActive(false);
    setQuizStep(0);
    setAnswers({});
    setQuizScore(null);
  }

  return (
    <div className={`socratic-workspace space-y-6 ${subTab === 'roadmap' && selectedLesson ? 'socratic-slide-mode' : ''}`}>
      {/* Sub navigation tabs */}
      <div className="socratic-navbar">
        <button type="button" className={`socratic-nav-btn ${subTab === 'home' ? 'socratic-nav-btn-active' : ''}`} onClick={() => setSubTab('home')}>
          <LayoutDashboard size={16} /> Tổng quan
        </button>
        <button type="button" className={`socratic-nav-btn ${subTab === 'tutor' ? 'socratic-nav-btn-active' : ''}`} onClick={() => setSubTab('tutor')}>
          <Sparkles size={16} /> AI Tutor
        </button>
        <button type="button" className={`socratic-nav-btn ${subTab === 'roadmap' ? 'socratic-nav-btn-active' : ''}`} onClick={() => setSubTab('roadmap')}>
          <MapPinned size={16} /> Lộ trình học
        </button>
        <button type="button" className={`socratic-nav-btn ${subTab === 'knowledge-map' ? 'socratic-nav-btn-active' : ''}`} onClick={() => setSubTab('knowledge-map')}>
          <Network size={16} /> Bản đồ kiến thức
        </button>
        <button type="button" className={`socratic-nav-btn ${subTab === 'exam' ? 'socratic-nav-btn-active' : ''}`} onClick={() => setSubTab('exam')}>
          <FileCheck size={16} /> Kiểm tra
        </button>
        <button type="button" className={`socratic-nav-btn ${subTab === 'leaderboard' ? 'socratic-nav-btn-active' : ''}`} onClick={() => setSubTab('leaderboard')}>
          <Users size={16} /> Bảng xếp hạng
        </button>
        <button type="button" className={`socratic-nav-btn ${subTab === 'achievements' ? 'socratic-nav-btn-active' : ''}`} onClick={() => setSubTab('achievements')}>
          <ShieldCheck size={16} /> Huy chương
        </button>
        <button type="button" className={`socratic-nav-btn ${subTab === 'history' ? 'socratic-nav-btn-active' : ''}`} onClick={() => setSubTab('history')}>
          <Clock3 size={16} /> Lịch sử học
        </button>
      </div>

      {subTab === 'home' && (
        <div className="space-y-6">
          {/* Level Header Banner */}
          <div className="socratic-hero-greet">
            <div className="socratic-hero-greet-text">
              <h2>Xin chào, Người học AI!</h2>
              <p>Bạn đã hoàn thành 25% lộ trình. Tiếp tục luyện tập với AI Tutor để cải thiện các kỹ năng còn yếu.</p>
              <div className="flex items-center gap-2 mt-4 text-xs font-bold bg-white/10 px-3 py-1.5 rounded-xl w-fit">
                <span>Cấp độ {level} · {xp}/{level * level * 40} XP</span>
              </div>
              <div className="socratic-xp-bar">
                <div className="socratic-xp-progress" style={{ width: `${Math.round((xp / (level * level * 40)) * 100)}%` }} />
              </div>
            </div>
            <img src="/vinlearn/bots/main.png" alt="Mascot" className="w-24 h-24 object-contain" />
          </div>

          {/* Quick Metrics */}
          <div className="socratic-metrics-grid">
            <div className="socratic-metric-card">
              <div className="socratic-metric-icon">🔥</div>
              <div className="socratic-metric-info">
                <strong>{streak} ngày</strong>
                <span>Streak liên tiếp</span>
              </div>
            </div>
            <div className="socratic-metric-card">
              <div className="socratic-metric-icon">🎯</div>
              <div className="socratic-metric-info">
                <strong>3 khái niệm</strong>
                <span>Đã làm chủ</span>
              </div>
            </div>
            <div className="socratic-metric-card">
              <div className="socratic-metric-icon">⚡</div>
              <div className="socratic-metric-info">
                <strong>1,240 XP</strong>
                <span>Tổng điểm tích lũy</span>
              </div>
            </div>
            <div className="socratic-metric-card">
              <div className="socratic-metric-icon">🏆</div>
              <div className="socratic-metric-info">
                <strong>Hạng #4</strong>
                <span>Bảng xếp hạng</span>
              </div>
            </div>
          </div>

          <div className="socratic-card-grid">
            {/* Primary Columns */}
            <div className="socratic-card-col-2">
              <section className="card">
                <h3 className="socratic-card-title">📖 Lộ trình đang học</h3>
                <div className="flex justify-between items-center gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">Đang hoạt động</span>
                    <h4 className="text-sm font-black text-slate-800">Bài 04 · Thiết kế câu lệnh và gọi công cụ</h4>
                    <p className="text-xs text-slate-500">Tìm hiểu vai trò của System Prompt, cách cấu trúc câu lệnh và liên kết công cụ bên ngoài.</p>
                  </div>
                  <button type="button" className="btn whitespace-nowrap" onClick={() => setSubTab('tutor')}>
                    Học tiếp
                  </button>
                </div>
              </section>

              <section className="card">
                <h3 className="socratic-card-title">⚠️ Kỹ năng yếu cần khắc phục</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                      <span>RAG Workflow (Truy xuất ngữ nghĩa)</span>
                      <span className="text-blue-700">30% thông thạo</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-700 h-full rounded-full" style={{ width: '30%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                      <span>Prompt Design (Kỹ thuật câu lệnh)</span>
                      <span className="text-amber-500">45% thông thạo</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: '45%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                      <span>Embeddings & Vector Database</span>
                      <span className="text-emerald-500">55% thông thạo</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: '55%' }} />
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Daily Tasks Column */}
            <div className="space-y-6">
              <section className="card">
                <h3 className="socratic-card-title">🔥 Nhiệm vụ hàng ngày</h3>
                <div className="space-y-3 mt-4">
                  {tasks.map(task => (
                    <div key={task.id} className="socratic-task-row">
                      <div className="socratic-task-left">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          readOnly
                          className="socratic-task-check accent-emerald-500"
                        />
                        <div className="socratic-task-text" onClick={() => setSubTab(task.tab)}>
                          <strong className={task.completed ? 'line-through text-slate-400' : ''}>{task.title}</strong>
                          <small>{task.sub}</small>
                        </div>
                      </div>
                      <span className="socratic-task-xp">+{task.xp} XP</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {subTab === 'tutor' && (
        <div className="socratic-chat-layout">
          {/* Chat Sidebar */}
          <div className="socratic-chat-sidebar">
            <h4 className="socratic-chat-sidebar-title">Chủ đề học tập</h4>
            <button type="button" className={`socratic-chat-topic-btn ${chatTopic === 'prompt_design' ? 'socratic-chat-topic-btn-active' : ''}`} onClick={() => setChatTopic('prompt_design')}>
              💬 Prompt Design
            </button>
            <button type="button" className={`socratic-chat-topic-btn ${chatTopic === 'rag_basics' ? 'socratic-chat-topic-btn-active' : ''}`} onClick={() => setChatTopic('rag_basics')}>
              📚 RAG & Vector store
            </button>
            <button type="button" className={`socratic-chat-topic-btn ${chatTopic === 'ai_agents' ? 'socratic-chat-topic-btn-active' : ''}`} onClick={() => setChatTopic('ai_agents')}>
              🤖 AI Agents & MCP
            </button>
          </div>

          {/* Chat Container */}
          <div className="socratic-chat-area">
            {/* Mobile Topic Selector */}
            <div className="lg:hidden px-4 py-3 border-b border-slate-100 flex gap-2 overflow-x-auto bg-slate-50/30">
              <button
                type="button"
                className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-200 cursor-pointer ${chatTopic === 'prompt_design' ? 'bg-gradient-to-r from-blue-800 to-sky-500 text-white shadow-md shadow-blue-800/25' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                onClick={() => setChatTopic('prompt_design')}
              >
                💬 Prompt Design
              </button>
              <button
                type="button"
                className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-200 cursor-pointer ${chatTopic === 'rag_basics' ? 'bg-gradient-to-r from-blue-800 to-sky-500 text-white shadow-md shadow-blue-800/25' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                onClick={() => setChatTopic('rag_basics')}
              >
                📚 RAG & Vector
              </button>
              <button
                type="button"
                className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-200 cursor-pointer ${chatTopic === 'ai_agents' ? 'bg-gradient-to-r from-blue-800 to-sky-500 text-white shadow-md shadow-blue-800/25' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                onClick={() => setChatTopic('ai_agents')}
              >
                🤖 AI Agents & MCP
              </button>
            </div>
            <div className="socratic-chat-header flex flex-wrap items-center justify-between gap-3">
              <div className="socratic-chat-header-title">
                <h3>Socratic AI Tutor</h3>
                <p>Đang thảo luận: {chatTopic === 'prompt_design' ? 'Prompt Design' : chatTopic === 'rag_basics' ? 'RAG basics' : 'AI Agents'}</p>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-2xl">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Tư duy phản biện (Socratic)</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={socraticMode}
                  className="w-9 h-5 rounded-full relative transition-colors cursor-pointer bg-slate-300"
                  style={{ backgroundColor: socraticMode ? '#1557b0' : '#cbd5e1' }}
                  onClick={() => setSocraticMode(!socraticMode)}
                >
                  <span
                    className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all shadow-sm"
                    style={{ left: socraticMode ? '18px' : '2px' }}
                  />
                </button>
              </div>
            </div>

            <div className="socratic-chat-messages">
              {messages.map(msg => (
                <div key={msg.id} className={`socratic-chat-bubble ${msg.sender === 'bot' ? 'socratic-chat-bubble-bot' : 'socratic-chat-bubble-user'}`}>
                  <ChatMessageContent message={msg} />
                </div>
              ))}
              {chatReplying && (
                <div className="socratic-chat-bubble socratic-chat-bubble-bot slide-assistant-typing">
                  <span /><span /><span />
                </div>
              )}
            </div>

            {/* Chat Pills */}
            <div className="socratic-chat-pills">
              {chatPills[chatTopic].map((pill, idx) => (
                <button key={idx} type="button" className="socratic-chat-pill-btn" onClick={() => handleSendChat(pill.text)}>
                  {pill.text}
                </button>
              ))}
            </div>

            <div className="socratic-chat-footer">
              <input
                className="socratic-chat-input"
                type="text"
                placeholder="Nhập suy luận của bạn..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendChat(chatInput)}
              />
              <button type="button" className="btn py-2 px-4" onClick={() => handleSendChat(chatInput)}>
                <Send size={15} /> Gửi
              </button>
            </div>
          </div>
        </div>
      )}

      {subTab === 'roadmap' && (
        <div className="space-y-6">
          {!selectedLesson ? (
            <section className="card">
              <h3 className="socratic-card-title">🗺️ Lộ trình đào tạo 15 ngày</h3>
              <p className="socratic-roadmap-hint">Chọn một bài học đã mở để xem slide, bài lab và bài trắc nghiệm.</p>
              <div className="socratic-roadmap-grid mt-4">
                {roadmapLessons.map(lesson => {
                  const isLocked = lesson.status === 'locked';
                  return (
                    <button
                      type="button"
                      key={lesson.id}
                      disabled={isLocked}
                      className={`socratic-roadmap-card socratic-roadmap-card-${lesson.status}`}
                      onClick={() => {
                        setSelectedLesson(lesson);
                        setLessonResource(null);
                      }}
                    >
                      <div className="socratic-roadmap-card-top">
                        <div className="socratic-roadmap-badge">{lesson.status === 'completed' ? '✓' : lesson.id}</div>
                        <span className="socratic-roadmap-state">
                          {lesson.status === 'completed' ? 'Đã hoàn thành' : lesson.status === 'active' ? 'Đang học' : 'Chưa mở'}
                        </span>
                      </div>
                      <h3>Bài {String(lesson.id).padStart(2, '0')} · {lesson.title}</h3>
                      <p>{lesson.description}</p>
                      {!isLocked && <span className="socratic-roadmap-open">Xem nội dung <ArrowRight size={14} /></span>}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : (
            <section className={`card socratic-lesson-detail ${lessonResource ? 'socratic-lesson-detail-viewing' : ''}`}>
              <button type="button" className="socratic-lesson-back" onClick={() => {
                setSelectedLesson(null);
                setLessonResource(null);
              }}>
                <ChevronLeft size={16} /> Quay lại lộ trình
              </button>

              <div className="socratic-lesson-heading">
                <div>
                  <span className="socratic-lesson-kicker">Bài {String(selectedLesson.id).padStart(2, '0')}</span>
                  <h2>{selectedLesson.title}</h2>
                  <p>{selectedLesson.description}</p>
                </div>
                <div className="socratic-lesson-duration">
                  <Clock3 size={17} />
                  <span>{selectedLesson.duration}</span>
                </div>
              </div>

              <div className={`socratic-lesson-resources ${lessonResource ? 'socratic-lesson-resources-active' : ''}`}>
                <article className="socratic-resource-card socratic-resource-card-slide">
                  <div className="socratic-resource-icon"><BookOpen size={23} /></div>
                  <div className="socratic-resource-meta">Nội dung học</div>
                  <h3>Slide buổi học</h3>
                  <p>
                    {lessonSlides.find(item => item.lesson_id === selectedLesson.id)
                      ? `PDF: ${lessonSlides.find(item => item.lesson_id === selectedLesson.id).file_name}`
                      : 'Giảng viên chưa tải slide PDF cho bài học này.'}
                  </p>
                  <button
                    type="button"
                    className="socratic-resource-action"
                    disabled={!lessonSlides.some(item => item.lesson_id === selectedLesson.id)}
                    onClick={() => openLessonSlide(selectedLesson.id)}
                  >
                    {lessonSlides.some(item => item.lesson_id === selectedLesson.id) ? 'Mở slide PDF' : 'Chưa có slide'} <ArrowRight size={15} />
                  </button>
                </article>

                <article className="socratic-resource-card socratic-resource-card-lab">
                  <div className="socratic-resource-icon"><FlaskConical size={23} /></div>
                  <div className="socratic-resource-meta">01 bài thực hành</div>
                  <h3>{selectedLesson.labTitle}</h3>
                  <p>{selectedLesson.labDescription}</p>
                  <button type="button" className="socratic-resource-action" onClick={() => setLessonResource('lab')}>
                    Làm bài lab <ArrowRight size={15} />
                  </button>
                </article>

                <article className="socratic-resource-card socratic-resource-card-quiz">
                  <div className="socratic-resource-icon"><FileCheck size={23} /></div>
                  <div className="socratic-resource-meta">01 bài trắc nghiệm</div>
                  <h3>Kiểm tra kiến thức</h3>
                  <p>{selectedLesson.quizQuestions} câu hỏi giúp củng cố kiến thức và mở khóa bài học tiếp theo.</p>
                  <button type="button" className="socratic-resource-action" onClick={() => setSubTab('exam')}>
                    Bắt đầu làm bài <ArrowRight size={15} />
                  </button>
                </article>
              </div>

              {lessonResource === 'slides' && (
                <div className="socratic-resource-panel">
                  <div className="socratic-resource-panel-heading">
                    <div className="socratic-resource-icon"><BookOpen size={22} /></div>
                    <div>
                      <span>Slide buổi học</span>
                      <h3>Bài {String(selectedLesson.id).padStart(2, '0')} · {selectedLesson.title}</h3>
                    </div>
                    {slidePdfUrl && (
                      <a className="socratic-pdf-fullscreen" href={slidePdfUrl} target="_blank" rel="noreferrer">
                        <ExternalLink size={15} /> <span>Mở toàn màn hình</span>
                      </a>
                    )}
                  </div>
                  {slideLoading && <div className="socratic-pdf-state">Đang tải slide PDF...</div>}
                  {slideError && <div className="result-message mt-4">❌ {slideError}</div>}
                  {slidePdfUrl && !slideLoading && (
                    <iframe
                      className="socratic-pdf-viewer"
                      src={slidePdfUrl}
                      title={`Slide bài ${selectedLesson.id}`}
                    />
                  )}
                </div>
              )}

              {lessonResource === 'lab' && (
                <div className="socratic-resource-panel">
                  <div className="socratic-resource-panel-heading">
                    <div className="socratic-resource-icon socratic-resource-icon-lab"><FlaskConical size={22} /></div>
                    <div>
                      <span>Bài lab của buổi học</span>
                      <h3>{selectedLesson.labTitle}</h3>
                    </div>
                  </div>
                  <p className="socratic-lab-description">{selectedLesson.labDescription}</p>
                  <div className="socratic-lab-requirements">
                    <span><CheckCircle2 size={15} /> Đọc yêu cầu và dữ liệu mẫu</span>
                    <span><CheckCircle2 size={15} /> Hoàn thành các bước thực hành</span>
                    <span><CheckCircle2 size={15} /> Nộp kết quả để nhận phản hồi</span>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {subTab === 'knowledge-map' && (
        <div className="socratic-card-grid">
          {/* Node Graph Visualizer */}
          <div className="socratic-card-col-2">
            <section className="card min-h-[460px] flex flex-col justify-between relative overflow-hidden">
              <div>
                <h3 className="socratic-card-title">🗺️ Sơ đồ tư duy & Bản đồ kiến thức AI</h3>
                <p className="text-xs text-slate-500 mb-6">Nhấp vào từng nút chủ đề để xem mức độ thông thạo, lỗ hổng kiến thức và bài tập gợi ý.</p>
              </div>

              {/* Graphical representation container */}
              <div className="flex-1 flex items-center justify-center relative min-h-[300px] border border-slate-50 rounded-2xl bg-slate-50/20 p-4">
                {/* SVG Connections */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                  {/* Connect LLM -> Prompt */}
                  <line x1="20%" y1="50%" x2="50%" y2="20%" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="4 4" />
                  {/* Connect Prompt -> RAG */}
                  <line x1="50%" y1="20%" x2="80%" y2="50%" stroke="#fca5a5" strokeWidth="2" />
                  {/* Connect LLM -> Embeddings */}
                  <line x1="20%" y1="50%" x2="50%" y2="80%" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />
                  {/* Connect Embeddings -> RAG */}
                  <line x1="50%" y1="80%" x2="80%" y2="50%" stroke="#fcd34d" strokeWidth="2" />
                  {/* Connect RAG -> Agents */}
                  <line x1="80%" y1="50%" x2="50%" y2="50%" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="4 4" />
                </svg>

                {/* Interactive Nodes */}
                {/* Node 1: LLM */}
                <button
                  type="button"
                  className={`absolute p-3 rounded-full border flex items-center justify-center font-black transition-all cursor-pointer shadow-md ${selectedNode === 'llm' ? 'bg-emerald-500 text-white border-emerald-600 scale-110 ring-4 ring-emerald-100' : 'bg-white text-emerald-500 border-emerald-200 hover:bg-emerald-50'}`}
                  style={{ left: '15%', top: '42%', zIndex: 1 }}
                  onClick={() => setSelectedNode('llm')}
                  title="Nền tảng LLM"
                >
                  <Database size={20} />
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-black text-slate-500">Nền tảng AI</span>
                </button>

                {/* Node 2: Prompt */}
                <button
                  type="button"
                  className={`absolute p-3 rounded-full border flex items-center justify-center font-black transition-all cursor-pointer shadow-md ${selectedNode === 'prompt' ? 'bg-blue-500 text-white border-blue-600 scale-110 ring-4 ring-blue-100' : 'bg-white text-blue-500 border-blue-200 hover:bg-blue-50'}`}
                  style={{ left: '45%', top: '10%', zIndex: 1 }}
                  onClick={() => setSelectedNode('prompt')}
                  title="Prompt Design"
                >
                  <Sparkles size={20} />
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-black text-slate-500">Prompt Design</span>
                </button>

                {/* Node 3: RAG */}
                <button
                  type="button"
                  className={`absolute p-3 rounded-full border flex items-center justify-center font-black transition-all cursor-pointer shadow-md ${selectedNode === 'rag' ? 'bg-blue-700 text-white border-blue-800 scale-110 ring-4 ring-blue-100' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'}`}
                  style={{ left: '75%', top: '42%', zIndex: 1 }}
                  onClick={() => setSelectedNode('rag')}
                  title="RAG Workflow"
                >
                  <Activity size={20} />
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-black text-slate-500">RAG Workflow</span>
                </button>

                {/* Node 4: Embeddings */}
                <button
                  type="button"
                  className={`absolute p-3 rounded-full border flex items-center justify-center font-black transition-all cursor-pointer shadow-md ${selectedNode === 'embeddings' ? 'bg-amber-500 text-white border-amber-600 scale-110 ring-4 ring-amber-100' : 'bg-white text-amber-500 border-amber-200 hover:bg-amber-50'}`}
                  style={{ left: '45%', top: '74%', zIndex: 1 }}
                  onClick={() => setSelectedNode('embeddings')}
                  title="Vector Embeddings"
                >
                  <MapPin size={20} />
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-black text-slate-500">Embeddings</span>
                </button>

                {/* Node 5: Agents (Center) */}
                <button
                  type="button"
                  className={`absolute p-3 rounded-full border flex items-center justify-center font-black transition-all cursor-pointer shadow-md ${selectedNode === 'agents' ? 'bg-purple-500 text-white border-purple-600 scale-110 ring-4 ring-purple-100' : 'bg-white text-purple-500 border-purple-200 hover:bg-purple-50'}`}
                  style={{ left: '45%', top: '42%', zIndex: 1 }}
                  onClick={() => setSelectedNode('agents')}
                  title="AI Agents"
                >
                  <Network size={20} />
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-black text-slate-500">AI Agents</span>
                </button>
              </div>
            </section>
          </div>

          {/* Node Info / Sidebar Details */}
          <div className="space-y-6">
            <section className="card h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md border ${conceptNodes[selectedNode].statusClass}`}>
                    {conceptNodes[selectedNode].status}
                  </span>
                  <span className="text-xs font-bold text-slate-500">{conceptNodes[selectedNode].mastery}% nắm vững</span>
                </div>

                <h3 className="text-base font-black text-slate-800 mb-2">{conceptNodes[selectedNode].title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-6">{conceptNodes[selectedNode].description}</p>

                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Kỹ năng thành phần</h4>
                <div className="space-y-2 mb-6">
                  {conceptNodes[selectedNode].skills.map((skill, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <span className={`w-2 h-2 rounded-full ${skill.ok ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span className={skill.ok ? '' : 'text-slate-400'}>{skill.ok ? '✓' : '✗'} {skill.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button
                  type="button"
                  className="btn w-full justify-center cursor-pointer"
                  onClick={() => {
                    const node = conceptNodes[selectedNode];
                    if (node.actionTab === 'tutor') {
                      if (selectedNode === 'prompt') setChatTopic('prompt_design');
                      else if (selectedNode === 'rag') setChatTopic('rag_basics');
                      else if (selectedNode === 'agents') setChatTopic('ai_agents');
                      setSubTab('tutor');
                    } else if (node.actionTab === 'exam') {
                      setSubTab('exam');
                    } else {
                      setSubTab('home');
                    }
                  }}
                >
                  🎯 {conceptNodes[selectedNode].suggestedTask}
                </button>
              </div>
            </section>
          </div>
        </div>
      )}

      {subTab === 'exam' && (
        <div className="space-y-6">
          {!quizActive ? (
            <section className="card max-w-xl mx-auto space-y-4">
              <div className="text-center space-y-2">
                <FileCheck className="mx-auto text-blue-700" size={32} />
                <h3 className="text-lg font-black text-slate-800">Kiểm tra năng lực AI Cơ bản</h3>
                <p className="text-xs text-slate-500">Bài thi trắc nghiệm ngắn gồm 3 câu hỏi để kiểm tra kiến thức về các mô hình LLM, RAG và MCP.</p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 text-xs space-y-2 text-slate-600">
                <p>📅 Thời gian làm bài: Không giới hạn</p>
                <p>📚 Số câu hỏi: 3 câu</p>
                <p>💎 Phần thưởng: +50 XP khi vượt qua</p>
              </div>

              <button type="button" className="btn w-full justify-center" onClick={() => setQuizActive(true)}>
                Bắt đầu làm bài
              </button>
            </section>
          ) : (
            <div className="socratic-quiz-box">
              {quizScore === null ? (
                <>
                  <div className="socratic-quiz-header">
                    <span className="text-xs font-bold text-blue-700">Câu hỏi {quizStep + 1}/3</span>
                    <span className="text-xs font-bold text-slate-400">Đang thực hiện</span>
                  </div>

                  <p className="socratic-quiz-q">{quizQuestions[quizStep].q}</p>

                  <div className="socratic-quiz-options">
                    {quizQuestions[quizStep].options.map((opt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`socratic-quiz-option ${answers[quizStep] === idx ? 'socratic-quiz-option-selected' : ''}`}
                        onClick={() => handleSelectOption(idx)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="btn w-full justify-center"
                    disabled={answers[quizStep] === undefined}
                    onClick={handleNextQuiz}
                  >
                    {quizStep < quizQuestions.length - 1 ? 'Tiếp theo' : 'Nộp bài'}
                  </button>
                </>
              ) : (
                <div className="text-center space-y-4">
                  <CheckCircle2 className="mx-auto text-emerald-500" size={48} />
                  <h3 className="text-lg font-black text-slate-800">Hoàn thành bài thi!</h3>
                  <p className="text-xs text-slate-500">Chúc mừng bạn đã hoàn thành bài kiểm tra ngắn.</p>
                  
                  <div className="bg-slate-50 rounded-2xl p-4 w-fit mx-auto">
                    <span className="text-sm font-bold text-slate-700">Điểm số của bạn: {quizScore}</span>
                  </div>

                  <button type="button" className="btn-outline w-full justify-center" onClick={handleResetQuiz}>
                    Quay lại
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {subTab === 'leaderboard' && (
        <section className="card max-w-2xl mx-auto">
          <h3 className="socratic-card-title text-center mb-6">🏆 Bảng xếp hạng tuần</h3>
          
          <div className="socratic-leaderboard-podium">
            <div className="socratic-podium-item socratic-podium-item-2">
              <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200" className="socratic-podium-avatar" alt="Rank 2" />
              <div className="socratic-podium-stand">
                <span className="socratic-podium-rank">2</span>
                <span className="text-[10px] font-bold text-slate-600 truncate mt-1">Trần Thị B</span>
                <small className="text-[9px] text-slate-400">1,420 XP</small>
              </div>
            </div>

            <div className="socratic-podium-item socratic-podium-item-1">
              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200" className="socratic-podium-avatar" alt="Rank 1" />
              <div className="socratic-podium-stand">
                <span className="socratic-podium-rank">1</span>
                <span className="text-[10px] font-bold text-slate-600 truncate mt-1">Nguyễn Văn A</span>
                <small className="text-[9px] text-slate-400">1,540 XP</small>
              </div>
            </div>

            <div className="socratic-podium-item socratic-podium-item-3">
              <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200" className="socratic-podium-avatar" alt="Rank 3" />
              <div className="socratic-podium-stand">
                <span className="socratic-podium-rank">3</span>
                <span className="text-[10px] font-bold text-slate-600 truncate mt-1">Lê Hoàng C</span>
                <small className="text-[9px] text-slate-400">1,290 XP</small>
              </div>
            </div>
          </div>

          <div className="socratic-leaderboard-list">
            <div className="socratic-leaderboard-row socratic-leaderboard-row-highlight">
              <div className="socratic-leaderboard-left">
                <span className="socratic-leaderboard-num">4</span>
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-xs">U</div>
                <span className="socratic-leaderboard-name">Bạn (Sinh viên)</span>
              </div>
              <span className="socratic-leaderboard-xp">1,240 XP</span>
            </div>
            
            <div className="socratic-leaderboard-row">
              <div className="socratic-leaderboard-left">
                <span className="socratic-leaderboard-num">5</span>
                <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200" className="socratic-leaderboard-avatar" alt="User 5" />
                <span className="socratic-leaderboard-name">Phạm Minh D</span>
              </div>
              <span className="socratic-leaderboard-xp">1,050 XP</span>
            </div>
          </div>
        </section>
      )}

      {subTab === 'achievements' && (
        <section className="card">
          <h3 className="socratic-card-title mb-6">🏆 Huy chương danh hiệu</h3>
          <div className="socratic-badge-grid">
            <div className="socratic-badge-card">
              <div className="socratic-badge-icon">🎖️</div>
              <h3>AI Rookie</h3>
              <p>Hoàn thành bài thực hành đầu tiên.</p>
            </div>
            <div className="socratic-badge-card">
              <div className="socratic-badge-icon">🧭</div>
              <h3>AI Explorer</h3>
              <p>Mở khóa 3 chủ đề học.</p>
            </div>
            <div className="socratic-badge-card">
              <div className="socratic-badge-icon font-mono text-xs">🔥</div>
              <h3>Streak Master</h3>
              <p>Đạt streak 10 ngày liên tục.</p>
            </div>
            <div className="socratic-badge-card socratic-badge-card-locked">
              <div className="socratic-badge-icon">👑</div>
              <h3>AI Master</h3>
              <p>Đạt cấp độ 5 trong cổng học tập.</p>
            </div>
          </div>
        </section>
      )}

      {subTab === 'history' && (
        <section className="card">
          <h3 className="socratic-card-title mb-5">🕒 Lịch sử học tập gần đây</h3>
          <div className="space-y-2">
            {studyHistory.map(hist => (
              <div key={hist.id} className="history-row">
                <span className="attendance-status attendance-present">✓ Đã làm</span>
                <div>
                  <p>{hist.name}</p>
                  <small>{hist.date}</small>
                </div>
                <b>{hist.score}</b>
              </div>
            ))}
          </div>
        </section>
      )}

      {subTab === 'roadmap' && lessonResource === 'slides' && selectedLesson && (
        <div className={`slide-assistant ${slideAssistantOpen ? 'slide-assistant-open' : ''}`}>
          {slideAssistantOpen && (
            <section className="slide-assistant-panel" aria-label="Trợ giảng AI khi xem slide">
              <header className="slide-assistant-header">
                <div className="slide-assistant-avatar"><Bot size={20} /></div>
                <div>
                  <strong>Trợ giảng AI</strong>
                  <span>Bài {String(selectedLesson.id).padStart(2, '0')} · {selectedLesson.title}</span>
                </div>
                <button type="button" onClick={() => setSlideAssistantOpen(false)} aria-label="Thu nhỏ chatbot">
                  <Minus size={18} />
                </button>
              </header>

              <div className="slide-assistant-messages">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`slide-assistant-message ${message.sender === 'bot' ? 'slide-assistant-message-bot' : 'slide-assistant-message-user'}`}
                  >
                    <ChatMessageContent message={message} />
                  </div>
                ))}
                {chatReplying && (
                  <div className="slide-assistant-message slide-assistant-message-bot slide-assistant-typing">
                    <span /><span /><span />
                  </div>
                )}
                <div ref={slideChatEndRef} />
              </div>

              <div className="slide-assistant-suggestions">
                <button type="button" onClick={() => handleSendChat('Giải thích nội dung này theo cách dễ hiểu')}>Giải thích dễ hiểu</button>
                <button type="button" onClick={() => handleSendChat('Cho tôi một ví dụ thực tế')}>Cho ví dụ</button>
              </div>

              <div className="slide-assistant-input">
                <input
                  value={chatInput}
                  onChange={event => setChatInput(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') handleSendChat(chatInput);
                  }}
                  placeholder="Hỏi điều bạn chưa hiểu trong slide..."
                />
                <button type="button" onClick={() => handleSendChat(chatInput)} disabled={!chatInput.trim() || chatReplying} aria-label="Gửi câu hỏi">
                  <Send size={17} />
                </button>
              </div>
            </section>
          )}

          <button
            type="button"
            className="slide-assistant-toggle"
            onClick={() => setSlideAssistantOpen(current => !current)}
            aria-label={slideAssistantOpen ? 'Thu nhỏ trợ giảng AI' : 'Mở trợ giảng AI'}
          >
            {slideAssistantOpen ? <Minus size={22} /> : <MessageCircle size={23} />}
            {!slideAssistantOpen && <span>Hỏi AI</span>}
          </button>
        </div>
      )}
    </div>
  );
}
