import React, { useState, useEffect, useCallback } from 'react';
import StudentView from './views/StudentView';
import TeacherView from './views/TeacherView';
import { getApiKey, saveApiKey } from './services/dataService';
import { testApiKey } from './services/geminiService';

type View = 'landing' | 'student' | 'teacher';
type ApiKeyStatus = 'idle' | 'testing' | 'valid' | 'invalid';

const ApiKeyModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onKeySaved: () => void;
}> = ({ isOpen, onClose, onKeySaved }) => {
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [status, setStatus] = useState<ApiKeyStatus>('idle');
    const [error, setError] = useState('');

    const handleTestAndSave = async () => {
        if (!apiKeyInput.trim()) {
            setError('API 키를 입력해주세요.');
            return;
        }
        setError('');
        setStatus('testing');
        const isValid = await testApiKey(apiKeyInput);
        if (isValid) {
            saveApiKey(apiKeyInput);
            setStatus('valid');
            setTimeout(() => {
                onKeySaved();
                onClose();
            }, 1000);
        } else {
            setStatus('invalid');
            setError('유효하지 않은 API 키입니다. 키를 확인하고 다시 시도해주세요.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-indigo-800 mb-4">API Key 설정</h2>
                <p className="text-gray-600 mb-4 text-sm">Gemini API를 사용하려면 API 키가 필요합니다. 키를 입력하고 저장해주세요. 키는 로컬 드라이브에만 안전하게 저장됩니다.</p>
                <div className="space-y-3">
                    <input
                        type="password"
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        placeholder="API 키를 여기에 붙여넣으세요"
                        className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 transition"
                    />
                    {status === 'invalid' && <p className="text-red-500 text-sm">{error}</p>}
                    {status === 'valid' && <p className="text-green-600 text-sm">✓ API 키가 확인되었고, 안전하게 저장되었습니다!</p>}
                </div>
                <div className="mt-6 flex gap-3">
                    <button onClick={onClose} className="w-full bg-gray-200 text-gray-800 font-bold py-2.5 px-4 rounded-lg hover:bg-gray-300 transition-all">
                        닫기
                    </button>
                    <button onClick={handleTestAndSave} disabled={status === 'testing' || status === 'valid'} className="w-full bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-indigo-700 transition-all disabled:bg-indigo-300 flex items-center justify-center">
                        {status === 'testing' ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                테스트 중...
                            </>
                        ) : '저장 및 연결 테스트'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const LandingPage: React.FC<{
    setView: (view: View) => void;
    isApiKeySet: boolean;
    openApiKeyModal: () => void;
}> = ({ setView, isApiKeySet, openApiKeyModal }) => (
    <div className="h-full flex items-center justify-center p-4">
        <div className="text-center p-8 bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg max-w-md w-full">
            <h1 className="text-4xl font-bold text-indigo-800 mb-2">마음 성장 일기</h1>
            <p className="text-gray-600 mb-8">AI 코치와 함께 매일의 마음을 돌봐요.</p>
            {!isApiKeySet && (
                <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 text-sm rounded-lg">
                    앱을 사용하려면 먼저 API 키를 설정해야 합니다.
                </div>
            )}
            <div className="space-y-4">
                <button
                    onClick={() => setView('student')}
                    disabled={!isApiKeySet}
                    className="w-full bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    학생 입장
                </button>
                <button
                    onClick={() => setView('teacher')}
                    disabled={!isApiKeySet}
                    className="w-full bg-purple-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-4 focus:ring-purple-300 transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    선생님 입장
                </button>
            </div>
             <div className="mt-6">
                <button onClick={openApiKeyModal} className="text-sm text-gray-600 hover:text-indigo-700 underline">
                    API Key 설정
                </button>
            </div>
        </div>
    </div>
);

function App() {
    const [view, setView] = useState<View>('landing');
    const [isApiKeySet, setIsApiKeySet] = useState(false);
    const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
    
    useEffect(() => {
        // Check for API key on initial load
        if (getApiKey()) {
            setIsApiKeySet(true);
        }
    }, []);

    const handleKeySaved = () => {
        setIsApiKeySet(true);
    };

    const goHome = useCallback(() => setView('landing'), []);

    const renderView = () => {
        switch (view) {
            case 'student':
                return <StudentView goHome={goHome} />;
            case 'teacher':
                return <TeacherView goHome={goHome} />;
            default:
                return <LandingPage 
                            setView={setView} 
                            isApiKeySet={isApiKeySet} 
                            openApiKeyModal={() => setIsApiKeyModalOpen(true)} 
                        />;
        }
    };

    return (
        <div className="h-full">
            {renderView()}
            <ApiKeyModal 
                isOpen={isApiKeyModalOpen}
                onClose={() => setIsApiKeyModalOpen(false)}
                onKeySaved={handleKeySaved}
            />
        </div>
    );
}

export default App;