import React, { useState, useEffect } from 'react';

interface AuthScreenProps {
  onLogin: (isAdmin: boolean) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [shouldRender, setShouldRender] = useState(true);

  const handleLogin = () => {
    if (password === '666') {
      finishAnimation(false);
    } else if (password === '1335465359') {
      finishAnimation(true);
    } else {
      alert('密码错误 (Tip: 666)');
    }
  };

  const finishAnimation = (admin: boolean) => {
    setIsVisible(false);
    setTimeout(() => {
      onLogin(admin);
      setShouldRender(false);
    }, 500);
  };

  if (!shouldRender) return null;

  return (
    <div 
      className={`fixed top-0 left-0 w-full h-full z-[9999] bg-[#050714] flex flex-col items-center justify-center transition-opacity duration-500 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      style={{ backgroundColor: 'var(--bg-color, #050714)' }}
    >
      <div className="bg-white/5 border border-white/10 p-10 rounded-3xl text-center w-80 backdrop-blur-md">
        <h2 className="text-white text-2xl font-bold mb-2">Indie Nav</h2>
        <p className="text-white/60 text-sm mb-6">共创社区 · 内部访问</p>
        <input 
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="输入访问密钥" 
          className="w-full p-3 rounded-xl border border-white/20 bg-black/40 text-white text-center text-lg mb-6 focus:border-[var(--accent)] outline-none transition-colors"
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
        />
        <button 
          onClick={handleLogin}
          className="w-full p-3 rounded-xl border-none bg-[var(--accent)] text-black font-extrabold cursor-pointer hover:opacity-90 transition-opacity"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          进入
        </button>
      </div>
    </div>
  );
};

export default AuthScreen;