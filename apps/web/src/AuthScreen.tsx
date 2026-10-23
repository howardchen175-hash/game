import { useState, type FormEvent } from 'react';
import {
  ArrowUpRight,
  Orbit,
  ShieldCheck,
  Layers3,
  Sparkles,
} from 'lucide-react';
import { authClient } from './api';
export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <Orbit size={24} />
      </span>
      <span>
        宇宙殖民<small>COSMIC COLONY</small>
      </span>
    </div>
  );
}
export function AuthScreen() {
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const email = String(form.get('email'));
      const password = String(form.get('password'));
      const result = register
        ? await authClient.signUp.email({
            email,
            password,
            name: String(form.get('name')).trim(),
          })
        : await authClient.signIn.email({ email, password });
      if (result.error)
        setError(
          result.error.status === 429
            ? '请求过于频繁，请稍后重试。'
            : register
              ? '创建失败。请检查邮箱、密码长度，或尝试登录已有账户。'
              : '登录失败，请检查邮箱和密码后重试。',
        );
    } catch {
      setError('暂时无法连接指挥中心，请稍后重试。');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page star-field">
      <header>
        <Brand />
        <span className="version-label">
          先行探索版 <span>0.2</span>
        </span>
      </header>
      <main className="auth-layout">
        <section className="auth-intro">
          <p className="eyebrow">
            <span className="live-dot" /> THE NEXT FRONTIER
          </p>
          <h1>
            在群星之间，
            <br />
            建立你的<span>新世界。</span>
          </h1>
          <p className="intro-copy">
            从一颗星球开始，绘制属于你的宇宙。
            <br />
            每一条航线，都是下一次远征的起点。
          </p>
          <div className="auth-features">
            <span>
              <Sparkles size={17} />
              九大星域
            </span>
            <span>
              <Layers3 size={17} />
              独立宇宙
            </span>
            <span>
              <ShieldCheck size={17} />
              持续存档
            </span>
          </div>
          <div className="hero-orbit">
            <div className="hero-planet" />
            <span className="orbit-marker" />
            <span className="orbit-caption">
              R1 · 新曙光
              <br />
              <b>你的旅程，即将开始</b>
            </span>
          </div>
        </section>
        <section className="auth-card">
          <p className="eyebrow">COMMANDER ACCESS</p>
          <h2>{register ? '欢迎加入，指挥官' : '欢迎回来，指挥官'}</h2>
          <p className="muted">
            {register
              ? '创建账户，开始你的第一段星际旅程。'
              : '登录账户，继续探索你的宇宙。'}
          </p>
          <form onSubmit={submit}>
            {register && (
              <label>
                指挥官名称
                <input
                  name="name"
                  autoComplete="nickname"
                  required
                  minLength={1}
                  maxLength={32}
                  placeholder="如何称呼你"
                />
              </label>
            )}
            <label>
              邮箱地址
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="commander@example.com"
                maxLength={254}
              />
            </label>
            <label>
              密码
              <input
                name="password"
                type="password"
                autoComplete={register ? 'new-password' : 'current-password'}
                required
                minLength={10}
                maxLength={128}
                placeholder={register ? '至少 10 个字符' : '输入你的密码'}
              />
            </label>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <button className="primary" disabled={busy}>
              {busy
                ? '正在连接…'
                : register
                  ? '创建指挥官账户'
                  : '进入指挥中心'}
              <ArrowUpRight size={18} />
            </button>
          </form>
          <p className="switch-auth">
            {register ? '已经拥有账户？' : '第一次来到这里？'}
            <button
              className="text-button"
              onClick={() => {
                setRegister(!register);
                setError('');
              }}
            >
              {register ? '登录账户' : '创建账户'}
            </button>
          </p>
          <div className="secure-note">
            <ShieldCheck size={14} />
            你的宇宙与你的账户独立保存
          </div>
        </section>
      </main>
      <footer className="auth-footer">
        <span>人类的下一站，不止于此。</span>
        <span>BUILD 0.2.0-ALPHA.1 · 中文</span>
      </footer>
    </div>
  );
}
