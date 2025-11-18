import React, { useState, useEffect, useMemo } from 'react';
import { getTeacherPassword, verifyTeacherPassword, changeTeacherPassword, getAllUsers, resetStudentPassword, getAllConversations } from '../services/dataService';
import { getMoodMeterQuadrant } from '../services/geminiService';
import type { User, StudentMood, MoodMeterQuadrant } from '../types';

const MOOD_METER_CONFIG: Record<MoodMeterQuadrant, { color: string, label: string }> = {
    YELLOW: { color: 'bg-yellow-300', label: '높은 에너지, 유쾌' },
    RED: { color: 'bg-red-400', label: '높은 에너지, 불쾌' },
    BLUE: { color: 'bg-blue-400', label: '낮은 에너지, 불쾌' },
    GREEN: { color: 'bg-green-400', label: '낮은 에너지, 유쾌' },
};

// --- Auth Component ---

const TeacherLogin: React.FC<{ onLoginSuccess: () => void }> = ({ onLoginSuccess }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (verifyTeacherPassword(password)) {
            onLoginSuccess();
        } else {
            setError('비밀번호가 올바르지 않습니다.');
        }
    };

    return (
        <div className="w-full max-w-sm p-8 bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg">
            <h1 className="text-2xl font-bold text-center text-indigo-800 mb-6">선생님 로그인</h1>
            <form onSubmit={handleLogin} className="space-y-4">
                <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="비밀번호"
                    className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 transition"
                />
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button type="submit" className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 transition-all">
                    로그인
                </button>
            </form>
        </div>
    );
};


// --- Dashboard Component ---
const MoodMeterDashboard: React.FC = () => {
    const [studentMoods, setStudentMoods] = useState<StudentMood[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchMoods = async () => {
            const allConversations = getAllConversations();
            const latestMoods: Record<string, { mood: string, timestamp: number }> = {};
            
            for (const studentName in allConversations) {
                const conversations = allConversations[studentName];
                if (conversations.length > 0) {
                    const latestConv = conversations.sort((a, b) => b.timestamp - a.timestamp)[0];
                    latestMoods[studentName] = { mood: latestConv.summary.mood, timestamp: latestConv.timestamp };
                }
            }

            const moodData = await Promise.all(
                Object.entries(latestMoods).map(async ([name, { mood, timestamp }]) => {
                    const quadrant = await getMoodMeterQuadrant(mood);
                    return { name, mood, quadrant, timestamp };
                })
            );
            
            setStudentMoods(moodData);
            setIsLoading(false);
        };
        fetchMoods();
    }, []);

    const moodsByQuadrant = useMemo(() => {
        const result: Record<MoodMeterQuadrant, StudentMood[]> = { YELLOW: [], RED: [], BLUE: [], GREEN: [] };
        studentMoods.forEach(mood => {
            result[mood.quadrant].push(mood);
        });
        return result;
    }, [studentMoods]);

    if (isLoading) {
        return <div className="text-center p-10">학생들의 마음 상태를 불러오는 중...</div>;
    }

    return (
        <div className="w-full">
            <h2 className="text-3xl font-bold text-center text-indigo-800 mb-6">우리반 마음 대시보드</h2>
            <div className="grid grid-cols-2 grid-rows-2 gap-4 max-w-4xl mx-auto">
                {(Object.keys(MOOD_METER_CONFIG) as MoodMeterQuadrant[]).map(quadrant => (
                    <div key={quadrant} className={`${MOOD_METER_CONFIG[quadrant].color} p-4 rounded-lg shadow-lg`}>
                        <h3 className="font-bold text-white text-lg mb-2">{MOOD_METER_CONFIG[quadrant].label}</h3>
                        <div className="space-y-2">
                            {moodsByQuadrant[quadrant].length > 0 ? moodsByQuadrant[quadrant].map(s => (
                                <div key={s.name} className="bg-white/80 p-2 rounded text-sm text-gray-800">{s.name}</div>
                            )) : <p className="text-white/70 text-sm italic">해당 학생 없음</p>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Student Management Component ---
const StudentManagement: React.FC = () => {
    const [students, setStudents] = useState<User[]>(getAllUsers);
    const [message, setMessage] = useState('');

    const handleResetPassword = (studentName: string) => {
        resetStudentPassword(studentName);
        setStudents(getAllUsers()); // Refresh list
        setMessage(`${studentName} 학생의 비밀번호가 '0000'으로 초기화되었습니다.`);
        setTimeout(() => setMessage(''), 3000);
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
             <h2 className="text-2xl font-bold text-indigo-800 mb-4">학생 관리</h2>
             {message && <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg">{message}</div>}
             <div className="bg-white p-4 rounded-lg shadow">
                 <ul className="divide-y divide-gray-200">
                    {students.map(student => (
                         <li key={student.name} className="py-3 flex items-center justify-between">
                            <span className="text-gray-700 font-medium">{student.name}</span>
                            <button onClick={() => handleResetPassword(student.name)} className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600">비밀번호 초기화</button>
                        </li>
                    ))}
                 </ul>
             </div>
        </div>
    );
};


// --- Settings Component ---
const TeacherSettings: React.FC = () => {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleChangePassword = (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (!/^\d{4,}$/.test(newPassword)) {
            setError('새 비밀번호는 4자리 이상의 숫자로 입력해주세요.');
            return;
        }

        try {
            changeTeacherPassword(oldPassword, newPassword);
            setMessage('비밀번호가 성공적으로 변경되었습니다.');
            setOldPassword('');
            setNewPassword('');
        } catch (err: any) {
            setError(err.message);
        }
    };
    
    return (
        <div className="w-full max-w-md mx-auto">
             <h2 className="text-2xl font-bold text-indigo-800 mb-4">비밀번호 변경</h2>
             <form onSubmit={handleChangePassword} className="p-6 bg-white rounded-lg shadow space-y-4">
                {message && <p className="text-green-600">{message}</p>}
                {error && <p className="text-red-600">{error}</p>}
                <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} placeholder="현재 비밀번호" className="w-full p-2 border rounded"/>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="새 비밀번호 (숫자 4자리 이상)" className="w-full p-2 border rounded"/>
                <button type="submit" className="w-full bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700">변경하기</button>
             </form>
        </div>
    )
}


// --- Main Teacher View ---
export default function TeacherView({ goHome }: { goHome: () => void; }) {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [teacherView, setTeacherView] = useState<'dashboard' | 'manage' | 'settings'>('dashboard');

    if (!isLoggedIn) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-4">
                 <div className="absolute top-4 right-4">
                     <button onClick={goHome} className="text-sm text-gray-600 hover:text-indigo-600">처음으로</button>
                 </div>
                <TeacherLogin onLoginSuccess={() => setIsLoggedIn(true)} />
            </div>
        );
    }
    
    return (
        <div className="h-full w-full flex flex-col items-center p-4">
            <header className="w-full max-w-6xl mx-auto mb-8 flex justify-between items-center">
                 <h1 className="text-3xl font-bold text-indigo-800">선생님 페이지</h1>
                <nav className="flex items-center gap-4">
                    <button onClick={() => setTeacherView('dashboard')} className={`${teacherView === 'dashboard' ? 'text-indigo-700 font-bold' : 'text-gray-600'} hover:text-indigo-600`}>대시보드</button>
                    <button onClick={() => setTeacherView('manage')} className={`${teacherView === 'manage' ? 'text-indigo-700 font-bold' : 'text-gray-600'} hover:text-indigo-600`}>학생 관리</button>
                    <button onClick={() => setTeacherView('settings')} className={`${teacherView === 'settings' ? 'text-indigo-700 font-bold' : 'text-gray-600'} hover:text-indigo-600`}>설정</button>
                    <button onClick={() => setIsLoggedIn(false)} className="text-sm text-red-500 hover:text-red-700">로그아웃</button>
                </nav>
            </header>
            <main className="w-full flex-1 flex justify-center">
                {teacherView === 'dashboard' && <MoodMeterDashboard />}
                {teacherView === 'manage' && <StudentManagement />}
                {teacherView === 'settings' && <TeacherSettings />}
            </main>
        </div>
    );
}