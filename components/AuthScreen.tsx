import React, { useState } from 'react';

interface AuthScreenProps {
  onLogin: (username: string, rememberMe: boolean) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError("请输入用户名和密码");
      return;
    }

    const usersStr = localStorage.getItem('mindflow_users');
    const users = usersStr ? JSON.parse(usersStr) : [];

    if (isRegistering) {
      if (users.find((u: any) => u.username === username)) {
        setError("该用户名已被注册");
        return;
      }
      const newUser = { username, password, createdAt: Date.now() };
      localStorage.setItem('mindflow_users', JSON.stringify([...users, newUser]));
      onLogin(username, rememberMe);
    } else {
      const user = users.find((u: any) => u.username === username && u.password === password);
      if (user) {
        onLogin(username, rememberMe);
      } else {
        setError("用户名或密码错误");
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header Graphic */}
        <div className="h-40 bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="text-center z-10">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border border-white/30">
               <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth={3}/></svg>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">Mind Flow</h1>
            <p className="text-indigo-100 text-xs font-bold tracking-widest uppercase mt-1">AI Insight Hub</p>
          </div>
        </div>

        {/* Form */}
        <div className="p-10">
          <h2 className="text-xl font-black text-slate-900 mb-6 text-center">
            {isRegistering ? '创建新账户' : '欢迎回来'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">用户名</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">密码</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                placeholder="Enter password"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <div className="w-5 h-5 bg-slate-100 border-2 border-slate-200 rounded-md peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-all flex items-center justify-center">
                    <svg className={`w-3 h-3 text-white transition-opacity ${rememberMe ? 'opacity-100' : 'opacity-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7"/></svg>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-500 group-hover:text-indigo-600 transition-colors">记住我</span>
              </label>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-500 text-xs font-bold rounded-xl flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {error}
              </div>
            )}

            <button 
              type="submit"
              className="w-full py-4 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl font-black text-sm uppercase tracking-wider shadow-lg shadow-slate-200 transition-all active:scale-[0.98] mt-4"
            >
              {isRegistering ? '注册并登录' : '登 录'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => { setIsRegistering(!isRegistering); setError(null); }}
              className="text-slate-400 hover:text-indigo-600 text-xs font-bold transition-colors"
            >
              {isRegistering ? '已有账号？点击登录' : '没有账号？创建新账号'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
