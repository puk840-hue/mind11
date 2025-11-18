import type { User, Conversation } from '../types';

// --- Hashing Utility (Simple simulation, use a real library like bcrypt in production) ---
const simpleHash = (s: string): string => {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString();
};

// --- API Key Management ---
export const saveApiKey = (apiKey: string) => {
    // Simple base64 encoding to obfuscate the key in local storage
    localStorage.setItem('gemini_api_key', btoa(apiKey));
};

export const getApiKey = (): string | null => {
    const encodedKey = localStorage.getItem('gemini_api_key');
    if (encodedKey) {
        try {
            return atob(encodedKey);
        } catch (e) {
            console.error("Failed to decode API key:", e);
            deleteApiKey();
            return null;
        }
    }
    return null;
};

export const deleteApiKey = () => {
    localStorage.removeItem('gemini_api_key');
};


// --- User Management ---

export const getAllUsers = (): User[] => {
    const users = localStorage.getItem('users');
    return users ? JSON.parse(users) : [];
};

const saveUsers = (users: User[]) => {
    localStorage.setItem('users', JSON.stringify(users));
};

export const signupUser = (name: string, password: string): User => {
    const users = getAllUsers();
    if (users.some(user => user.name.toLowerCase() === name.toLowerCase())) {
        throw new Error('이미 사용 중인 이름입니다.');
    }
    const newUser: User = { name, passwordHash: simpleHash(password) };
    saveUsers([...users, newUser]);
    return newUser;
};

export const loginUser = (name: string, password: string): User => {
    const users = getAllUsers();
    const user = users.find(u => u.name.toLowerCase() === name.toLowerCase());
    if (!user || user.passwordHash !== simpleHash(password)) {
        throw new Error('이름 또는 비밀번호가 올바르지 않습니다.');
    }
    sessionStorage.setItem('currentUser', JSON.stringify(user));
    return user;
};

export const resetStudentPassword = (name: string) => {
    const users = getAllUsers();
    const userIndex = users.findIndex(u => u.name === name);
    if (userIndex !== -1) {
        users[userIndex].passwordHash = simpleHash('0000');
        saveUsers(users);
    }
};

export const getCurrentUser = (): User | null => {
    const user = sessionStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
};

export const logoutUser = () => {
    sessionStorage.removeItem('currentUser');
};

// --- Teacher Management ---

export const getTeacherPassword = (): string => {
    return localStorage.getItem('teacherPassword') || simpleHash('0000');
};

export const verifyTeacherPassword = (password: string): boolean => {
    const storedPassword = getTeacherPassword();
    // Initialize if it doesn't exist
    if (!localStorage.getItem('teacherPassword')) {
        localStorage.setItem('teacherPassword', storedPassword);
    }
    return simpleHash(password) === storedPassword;
};

export const changeTeacherPassword = (oldPassword: string, newPassword: string) => {
    if (!verifyTeacherPassword(oldPassword)) {
        throw new Error('현재 비밀번호가 일치하지 않습니다.');
    }
    localStorage.setItem('teacherPassword', simpleHash(newPassword));
};


// --- Conversation Management ---

export const getAllConversations = (): Record<string, Conversation[]> => {
    const convos = localStorage.getItem('conversations');
    return convos ? JSON.parse(convos) : {};
};

const saveAllConversations = (conversations: Record<string, Conversation[]>) => {
    localStorage.setItem('conversations', JSON.stringify(conversations));
};

export const getConversations = (userName: string): Conversation[] => {
    const allConvos = getAllConversations();
    return allConvos[userName] || [];
};

export const saveConversation = (userName: string, conversation: Conversation) => {
    const allConvos = getAllConversations();
    const userConvos = allConvos[userName] || [];
    allConvos[userName] = [...userConvos, conversation];
    saveAllConversations(allConvos);
};