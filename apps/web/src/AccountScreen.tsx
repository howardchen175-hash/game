import { Dialog } from './Dialog';
import { useEffect, useState, useRef, type FormEvent } from 'react';
import {
  ArrowUpRight,
  Plus,
  Trash2,
  LogOut,
  ArrowLeft,
  ShieldCheck,
  Globe2,
  Clock3,
  X,
} from 'lucide-react';
import { api, authClient, type Save } from './api';
import { Brand } from './AuthScreen';
export function AccountScreen({
  name,
  email,
  onEnter,
}: {
  name: string;
  email: string;
  onEnter: (id: string) => void;
}) {
  const [saves, setSaves] = useState<Save[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const creationKey = useRef(crypto.randomUUID());
  const [creating, setCreating] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<Save | null>(null);
  const [settings, setSettings] = useState(false);
  const [message, setMessage] = useState('');
  const [audit, setAudit] = useState<{ action: string; created_at: string }[]>(
    [],
  );
  async function load() {
    setLoading(true);
    try {
      setSaves(await api<Save[]>('/saves'));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (settings)
      api<typeof audit>('/audit')
        .then(setAudit)
        .catch((e) => setError(e.message));
  }, [settings]);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await api<Save>('/saves', {
        method: 'POST',
        headers: { 'Idempotency-Key': creationKey.current },
        body: JSON.stringify({
          name: new FormData(event.currentTarget).get('name'),
        }),
      });
      onEnter(result.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deleting || busy) return;
    setBusy(true);
    setError('');
    try {
      await api(`/saves/${deleting.id}`, {
        method: 'DELETE',
        body: JSON.stringify({
          name: new FormData(event.currentTarget).get('name'),
        }),
      });
      setDeleting(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function profile(event: FormEvent<HTMLFormElement>, password = false) {
    event.preventDefault();
    const element = event.currentTarget;
    setBusy(true);
    setError('');
    setMessage('');
    const form = new FormData(element);
    try {
      const result = password
        ? await authClient.changePassword({
            currentPassword: String(form.get('current')),
            newPassword: String(form.get('new')),
            revokeOtherSessions: true,
          })
        : await authClient.updateUser({
            name: String(form.get('name')).trim(),
          });
      if (result.error)
        setError(
          password
            ? '修改失败，请检查当前密码，新密码至少 10 位。'
            : '名称修改失败，请重试。',
        );
      else {
        setMessage(
          password
            ? '密码已更新，其他设备上的会话已撤销。'
            : '指挥官名称已更新。',
        );
        if (password) element.reset();
      }
    } catch {
      setError('账户更新失败，请重试。');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="account-page star-field">
      <header className="account-header">
        <Brand />
        <div className="account-actions">
          <button
            className="quiet"
            onClick={() => {
              setSettings(!settings);
              setError('');
              setMessage('');
            }}
          >
            {settings ? '返回存档' : '账户设置'}
          </button>
          <button
            className="icon-button"
            aria-label="退出登录"
            onClick={() => {
              localStorage.removeItem('colony-active-save');
              void authClient.signOut();
            }}
          >
            <LogOut size={19} />
          </button>
        </div>
      </header>
      <main className="account-content">
        <p className="eyebrow">
          {settings ? 'COMMANDER PROFILE' : 'YOUR NEXT EXPEDITION'}
        </p>
        <h1>{settings ? '账户与安全' : `准备出发，${name}。`}</h1>
        <p className="muted">
          {settings
            ? email
            : '选择一个宇宙继续旅程，或从一片全新的星空开始。每个存档独立保存。'}
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
            <button className="text-button" onClick={() => void load()}>
              重试
            </button>
          </p>
        )}
        {message && (
          <p role="status" className="success">
            {message}
          </p>
        )}
        {settings ? (
          <div className="settings-grid">
            <section className="panel">
              <h2>指挥官信息</h2>
              <form onSubmit={(e) => void profile(e)}>
                <label>
                  显示名称
                  <input
                    name="name"
                    defaultValue={name}
                    required
                    minLength={1}
                    maxLength={32}
                  />
                </label>
                <button className="primary" disabled={busy}>
                  保存名称
                </button>
              </form>
            </section>
            <section className="panel">
              <h2>修改密码</h2>
              <form onSubmit={(e) => void profile(e, true)}>
                <label>
                  当前密码
                  <input
                    type="password"
                    name="current"
                    autoComplete="current-password"
                    required
                  />
                </label>
                <label>
                  新密码
                  <input
                    type="password"
                    name="new"
                    autoComplete="new-password"
                    required
                    minLength={10}
                    maxLength={128}
                  />
                </label>
                <button className="primary" disabled={busy}>
                  更新密码
                </button>
              </form>
            </section>
            <section className="panel audit-panel">
              <h2>最近存档活动</h2>
              {audit.length ? (
                audit.map((entry, i) => (
                  <p className="audit-row" key={i}>
                    <span>
                      {entry.action === 'save.create' ? '创建存档' : '删除存档'}
                    </span>
                    <time>
                      {new Date(entry.created_at).toLocaleString('zh-CN')}
                    </time>
                  </p>
                ))
              ) : (
                <p className="muted">还没有存档操作记录。</p>
              )}
            </section>
          </div>
        ) : (
          <>
            <div className="section-heading">
              <h2>
                我的宇宙 <span>{saves.length} / 3</span>
              </h2>
              <span className="small muted">
                <ShieldCheck size={14} />
                自动保存至账户
              </span>
            </div>
            {loading ? (
              <p role="status" className="loading">
                正在读取存档…
              </p>
            ) : (
              <div className="save-grid">
                {[1, 2, 3].map((slot) => {
                  const save = saves.find((s) => s.slot === slot);
                  return save ? (
                    <article className="save-card" key={slot}>
                      <div className="save-art">
                        <div className={`planet sphere-${slot}`} />
                        <span className="card-coordinate">
                          UNIVERSE / 0{slot}
                        </span>
                        <span className="save-badge">独立存档</span>
                      </div>
                      <div className="save-body">
                        <div className="save-name">
                          <h2>{save.name}</h2>
                          <button
                            className="icon-button"
                            aria-label={`删除 ${save.name}`}
                            onClick={() => setDeleting(save)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <p>
                          <Globe2 size={14} />
                          新曙光 <span>· LV.1</span>
                        </p>
                        <p>
                          <Clock3 size={14} />
                          {new Date(save.last_played_at).toLocaleDateString(
                            'zh-CN',
                          )}{' '}
                          上次探索
                        </p>
                        <button
                          className="primary"
                          onClick={() => onEnter(save.id)}
                        >
                          继续探索
                          <ArrowUpRight size={17} />
                        </button>
                      </div>
                    </article>
                  ) : (
                    <article className="empty-save" key={slot}>
                      <span className="slot-number">存档槽 0{slot}</span>
                      {creating === slot ? (
                        <form onSubmit={create}>
                          <h2>命名你的宇宙</h2>
                          <label>
                            存档名称
                            <input
                              name="name"
                              required
                              maxLength={24}
                              placeholder="例如：第一次远征"
                              autoFocus
                            />
                          </label>
                          <button className="primary" disabled={busy}>
                            {busy ? '正在生成宇宙…' : '启程'}
                            <ArrowUpRight size={17} />
                          </button>
                          <button
                            type="button"
                            className="text-button"
                            onClick={() => setCreating(null)}
                          >
                            取消
                          </button>
                        </form>
                      ) : (
                        <button
                          className="create-save"
                          onClick={() => {
                            creationKey.current = crypto.randomUUID();
                            setCreating(slot);
                          }}
                        >
                          <span>
                            <Plus size={24} />
                          </span>
                          <h2>开启新的远征</h2>
                          <p>一个全新的宇宙，在等你命名。</p>
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
            <div className="account-footnote">
              <span className="live-dot" />
              每个宇宙拥有独立的星系、航线与行星。探索过程中可以随时返回切换存档。
            </div>
          </>
        )}
      </main>
      <footer className="account-footer">
        <span>宇宙殖民 · 先行探索版</span>
        <span>v0.2.0-alpha.1</span>
      </footer>
      {deleting && (
        <Dialog titleId="delete-title" onClose={() => setDeleting(null)}>
          <button
            className="modal-close icon-button"
            aria-label="关闭删除窗口"
            onClick={() => setDeleting(null)}
          >
            <X size={18} />
          </button>
          <span className="danger-icon">
            <Trash2 size={24} />
          </span>
          <h2 id="delete-title">结束这段远征？</h2>
          <p className="muted">
            删除「{deleting.name}」后，你将无法再进入或恢复这个存档。
          </p>
          <form onSubmit={remove}>
            <label>
              输入存档名称「{deleting.name}」以确认
              <input name="name" autoFocus required autoComplete="off" />
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="button-row">
              <button
                type="button"
                className="quiet"
                onClick={() => setDeleting(null)}
              >
                <ArrowLeft size={15} />
                保留存档
              </button>
              <button className="danger" disabled={busy}>
                确认删除
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
