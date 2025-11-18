import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getChatResponse, getFinalSummary, getFinalChatResponse } from '../services/geminiService';
import { getCurrentUser, loginUser, signupUser, logoutUser, getConversations, saveConversation } from '../services/dataService';
import type { Message, FinalSummary, User, Conversation } from '../types';

const MAX_TURNS = 5;

// --- Child Components ---

const LoadingSpinner: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const ChatMessage: React.FC<{ message: Message }> = ({ message }) => {
    const isUser = message.sender === 'user';
    return (
        <div className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-sm md:max-w-md lg:max-w-lg rounded-2xl px-4 py-2.5 whitespace-pre-wrap ${isUser ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                {message.text}
            </div>
        </div>
    );
};

const AITypingIndicator: React.FC = () => (
    <div className="flex items-end gap-2 justify-start">
        <div className="bg-gray-200 text-gray-500 rounded-2xl rounded-bl-none px-4 py-2.5">
            <div className="flex items-center justify-center gap-1.5">
                <span className="h-2 w-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="h-2 w-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="h-2 w-2 bg-current rounded-full animate-bounce"></span>
            </div>
        </div>
    </div>
);

const FinalSummaryCard: React.FC<{ summary: FinalSummary }> = ({ summary }) => (
    <div className="mt-4 p-5 bg-gradient-to-br from-indigo-100 to-purple-100 border border-indigo-200 rounded-lg shadow-sm text-center animate-fade-in">
        <h3 className="text-lg font-bold text-indigo-800">오늘의 대화 요약</h3>
        <div className="mt-4 space-y-2">
            <p className="text-base"><strong className="font-semibold text-gray-700">오늘의 마음:</strong> <span className="text-indigo-700 font-medium">{summary.mood}</span></p>
            <p className="text-base italic text-gray-600 mt-2">"{summary.message}"</p>
        </div>
    </div>
);


// --- Auth Component ---

const AuthForm: React.FC<{
    onAuthSuccess: (user: User) => void;
}> = ({ onAuthSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const validatePassword = (pw: string) => /^\d{4}$/.test(pw);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!name.trim()) {
            setError('이름을 입력해주세요.');
            return;
        }
        if (!validatePassword(password)) {
            setError('비밀번호는 숫자 4자리로 입력해주세요.');
            return;
        }

        try {
            const user = isLogin ? loginUser(name, password) : signupUser(name, password);
            onAuthSuccess(user);
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="w-full max-w-sm mx-auto">
             <div className="mb-4 border-b border-gray-200">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => { setIsLogin(true); setError(''); }} className={`${isLogin ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                        로그인
                    </button>
                    <button onClick={() => { setIsLogin(false); setError(''); }} className={`${!isLogin ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                        회원가입
                    </button>
                </nav>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="이름"
                    className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 transition"
                />
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호 (숫자 4자리)"
                    maxLength={4}
                    className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 transition"
                />
                 {error && <p className="text-red-500 text-sm">{error}</p>}
                <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-all">
                    {isLogin ? '로그인' : '회원가입'}
                </button>
            </form>
        </div>
    );
};

// --- Chat Component ---
const ChatView: React.FC<{ user: User, onConversationEnd: () => void }> = ({ user, onConversationEnd }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isAITyping, setIsAITyping] = useState(false);
    const [turnCount, setTurnCount] = useState(0);
    const [isConversationOver, setIsConversationOver] = useState(false);
    const [finalSummary, setFinalSummary] = useState<FinalSummary | null>(null);
    const [error, setError] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    useEffect(scrollToBottom, [messages, isAITyping]);

    useEffect(() => {
        setMessages([{
            sender: 'ai',
            text: `안녕하세요, ${user.name}님! 저는 따뜻한 마음 코치예요.\n오늘 어떤 일이 있었나요? 편하게 이야기해주세요.`
        }]);
    }, [user.name]);

    const handleSendMessage = async () => {
        if (!userInput.trim() || isAITyping || isConversationOver) return;
        setError('');
        const newUserMessage: Message = { sender: 'user', text: userInput };
        const newHistory = [...messages, newUserMessage];
        setMessages(newHistory);
        setUserInput('');
        setIsAITyping(true);
        
        try {
            const newTurnCount = turnCount + 1;
            const aiResponseText = (newTurnCount === MAX_TURNS)
                ? await getFinalChatResponse(newHistory)
                : await getChatResponse(newHistory);
            
            const newAiMessage: Message = { sender: 'ai', text: aiResponseText };
            const finalHistory = [...newHistory, newAiMessage];
            setMessages(finalHistory);
            setTurnCount(newTurnCount);

            if (newTurnCount >= MAX_TURNS) {
                setIsConversationOver(true);
                setIsAITyping(true);
                const summary = await getFinalSummary(finalHistory);
                setFinalSummary(summary);
                saveConversation(user.name, {
                    id: `conv_${Date.now()}`,
                    timestamp: Date.now(),
                    messages: finalHistory,
                    summary: summary
                });
            }
        } catch (err: any) {
            setError(err.message || '오류가 발생했습니다.');
        } finally {
            setIsAITyping(false);
        }
    };
    
    return (
        <div className="h-full w-full max-w-2xl mx-auto flex flex-col">
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg p-4 md:p-6 flex flex-col flex-1 min-h-0">
                <header className="text-center mb-4 flex-shrink-0">
                    <h1 className="text-2xl font-bold text-indigo-800">따뜻한 마음 코치</h1>
                    {!isConversationOver && <p className="text-indigo-600 font-bold mt-2">{`대화 ${turnCount + 1} / ${MAX_TURNS}`}</p>}
                </header>

                <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                    {messages.map((msg, index) => <ChatMessage key={index} message={msg} />)}
                    {isAITyping && <AITypingIndicator />}
                    <div ref={chatEndRef} />
                </div>
                
                {finalSummary && <FinalSummaryCard summary={finalSummary} />}
                {error && <div className="mt-4 bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded-md text-sm" role="alert"><p>{error}</p></div>}
                
                <div className="mt-4 pt-4 border-t border-gray-200 flex-shrink-0">
                   {finalSummary ? (
                        <button onClick={onConversationEnd} className="w-full bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 transition-all">
                            대화 목록으로 돌아가기
                        </button>
                   ) : (
                     <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="메시지를 입력하세요..."
                            className="w-full p-3 bg-white text-gray-800 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400"
                            disabled={isAITyping || isConversationOver}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={isAITyping || !userInput.trim() || isConversationOver}
                            className="bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 transition-all disabled:bg-indigo-300"
                            aria-label="메시지 전송"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
                        </button>
                     </div>
                   )}
                </div>
            </div>
        </div>
    );
};

// --- History Component ---
const HistoryView: React.FC<{ user: User, onBack: () => void }> = ({ user, onBack }) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);

    useEffect(() => {
        setConversations(getConversations(user.name).sort((a, b) => b.timestamp - a.timestamp));
    }, [user.name]);

    if (selectedConv) {
        return (
            <div className="h-full w-full max-w-2xl mx-auto flex flex-col bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg p-4 md:p-6">
                <div className="flex-shrink-0 mb-4">
                     <button onClick={() => setSelectedConv(null)} className="text-indigo-600 hover:text-indigo-800 font-semibold">&larr; 뒤로가기</button>
                </div>
                <h2 className="text-xl font-bold text-center mb-2 text-indigo-800">{new Date(selectedConv.timestamp).toLocaleString()}의 대화</h2>
                <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-4">
                    {selectedConv.messages.map((msg, index) => <ChatMessage key={index} message={msg} />)}
                </div>
                 <FinalSummaryCard summary={selectedConv.summary} />
            </div>
        );
    }

    return (
        <div className="w-full max-w-2xl mx-auto">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-indigo-800">대화 기록</h2>
                <button onClick={onBack} className="text-indigo-600 hover:text-indigo-800 font-semibold">대시보드로</button>
            </div>
            <div className="space-y-3">
                {conversations.length > 0 ? conversations.map(conv => (
                     <button key={conv.id} onClick={() => setSelectedConv(conv)} className="w-full text-left p-4 bg-white rounded-lg shadow hover:shadow-md transition">
                        <p className="font-semibold text-gray-800">{new Date(conv.timestamp).toLocaleString()}</p>
                        <p className="text-sm text-gray-600 mt-1"><strong>마음:</strong> {conv.summary.mood}</p>
                    </button>
                )) : <p className="text-center text-gray-500 py-8">아직 대화 기록이 없어요.</p>}
            </div>
        </div>
    );
};


// --- Main Student View Component ---

export default function StudentView({ goHome }: { goHome: () => void; }) {
    const [currentUser, setCurrentUser] = useState<User | null>(() => getCurrentUser());
    const [studentView, setStudentView] = useState<'dashboard' | 'chat' | 'history'>('dashboard');

    const handleLogout = () => {
        logoutUser();
        setCurrentUser(null);
    };

    if (!currentUser) {
        return (
            <div className="h-full flex flex-col items-center justify-center">
                 <div className="w-full max-w-sm p-8 bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg">
                    <div className="flex justify-between items-center mb-6">
                         <h1 className="text-2xl font-bold text-indigo-800">학생 페이지</h1>
                         <button onClick={goHome} className="text-sm text-gray-600 hover:text-indigo-600">처음으로</button>
                    </div>
                    <AuthForm onAuthSuccess={(user) => setCurrentUser(user)} />
                </div>
            </div>
        );
    }
    
    return (
        <div className="h-full flex flex-col items-center justify-center">
            {studentView === 'dashboard' && (
                <div className="text-center p-8 bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg max-w-md w-full">
                    <h1 className="text-3xl font-bold text-indigo-800 mb-2">{currentUser.name}님, 환영합니다!</h1>
                    <p className="text-gray-600 mb-8">오늘의 마음을 AI 코치와 나눠보세요.</p>
                    <div className="space-y-4">
                        <button onClick={() => setStudentView('chat')} className="w-full bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 transition-all">
                            새로운 대화 시작하기
                        </button>
                        <button onClick={() => setStudentView('history')} className="w-full bg-gray-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-700 transition-all">
                            이전 대화 보기
                        </button>
                         <button onClick={handleLogout} className="mt-4 text-sm text-gray-500 hover:text-red-500">
                            로그아웃
                        </button>
                    </div>
                </div>
            )}

            {studentView === 'chat' && <ChatView user={currentUser} onConversationEnd={() => setStudentView('dashboard')} />}
            
            {studentView === 'history' && <HistoryView user={currentUser} onBack={() => setStudentView('dashboard')} />}
        </div>
    );
}
