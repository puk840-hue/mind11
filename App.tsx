import React, { useState, useCallback } from 'react';
import StudentView from './views/StudentView';
import TeacherView from './views/TeacherView';

type View = 'landing' | 'student' | 'teacher';

const LandingPage: React.FC<{ setView: (view: View) => void }> = ({ setView }) => (
    <div className="h-full flex items-center justify-center">
        <div className="text-center p-8 bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg max-w-md w-full">
            <h1 className="text-4xl font-bold text-indigo-800 mb-2">마음 성장 일기</h1>
            <p className="text-gray-600 mb-8">AI 코치와 함께 매일의 마음을 돌봐요.</p>
            <div className="space-y-4">
                <button
                    onClick={() => setView('student')}
                    className="w-full bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 transition-all duration-300"
                >
                    학생 입장
                </button>
                <button
                    onClick={() => setView('teacher')}
                    className="w-full bg-purple-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-4 focus:ring-purple-300 transition-all duration-300"
                >
                    선생님 입장
                </button>
            </div>
        </div>
    </div>
);

function App() {
    const [view, setView] = useState<View>('landing');

    const goHome = useCallback(() => setView('landing'), []);

    const renderView = () => {
        switch (view) {
            case 'student':
                return <StudentView goHome={goHome} />;
            case 'teacher':
                return <TeacherView goHome={goHome} />;
            default:
                return <LandingPage setView={setView} />;
        }
    };

    return <div className="h-full p-4">{renderView()}</div>;
}

export default App;
