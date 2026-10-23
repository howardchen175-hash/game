import { useEffect, useState } from 'react';
import { api, authClient, type Game } from './api';
import { AuthScreen } from './AuthScreen';
import { AccountScreen } from './AccountScreen';
import { Dashboard } from './Dashboard';
export default function App() {
  const {
    data: session,
    isPending,
    error: sessionError,
  } = authClient.useSession();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function enter(id: string) {
    setLoading(true);
    setError('');
    try {
      const result = await api<Game>(`/saves/${id}/world`);
      setGame(result);
      localStorage.setItem('colony-active-save', id);
    } catch (e) {
      localStorage.removeItem('colony-active-save');
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (session?.user) {
      const id = localStorage.getItem('colony-active-save');
      if (id) void enter(id);
    } else {
      setGame(null);
    }
  }, [session?.user.id]);
  if (isPending || loading)
    return (
      <div className="loading-screen star-field" role="status">
        <span className="loading-orbit" />
        <h2>{loading ? '正在读取你的宇宙' : '正在连接指挥中心'}</h2>
        <p>每一段旅程，都值得被记住。</p>
      </div>
    );
  if (sessionError && !session)
    return (
      <div className="loading-screen">
        <p role="alert">无法读取登录状态，请检查连接。</p>
        <button className="primary" onClick={() => location.reload()}>
          重新连接
        </button>
      </div>
    );
  if (!session) return <AuthScreen />;
  if (game)
    return (
      <Dashboard
        key={game.save.id}
        game={game}
        name={session.user.name}
        onBack={() => {
          setGame(null);
          localStorage.removeItem('colony-active-save');
        }}
      />
    );
  return (
    <>
      {error && (
        <div role="alert" className="global-error">
          {error}
          <button onClick={() => setError('')} aria-label="关闭错误">
            ×
          </button>
        </div>
      )}
      <AccountScreen
        name={session.user.name}
        email={session.user.email}
        onEnter={(id) => void enter(id)}
      />
    </>
  );
}
