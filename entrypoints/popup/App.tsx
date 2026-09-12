import { useEffect, useState } from 'react';
import { ExternalLink, KeyRound, Loader2, PlugZap, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { CONFIG } from '@/lib/config';
import { sendMessage } from '@/lib/messaging';
import { dispatchItem, enabledItem, geminiKeyItem, lastRunItem, triesItem } from '@/lib/storage';
import type { LastRun } from '@/lib/storage';

const ACADEMY_URL = `${CONFIG.BASE_URL}/`;

const activeTab = () => browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => tab);

// Bật tự động học: xóa bộ đếm lần thử của lượt trước rồi tải lại tab Academy (hoặc mở mới) để content script chạy ngay.
const startRun = () => Promise.all([triesItem.removeValue(), dispatchItem.setValue(null), lastRunItem.removeValue()])
  .then(activeTab)
  .then((tab) => (tab?.url?.startsWith(CONFIG.BASE_URL) && tab.id !== undefined
    ? browser.tabs.reload(tab.id)
    : browser.tabs.create({ url: ACADEMY_URL }).then(() => undefined)));

const formatTime = (iso: string) => new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

export default function App() {
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState('');
  const [testing, setTesting] = useState(false);
  const [lastRun, setLastRun] = useState<LastRun>(null);

  useEffect(() => {
    Promise.all([enabledItem.getValue(), geminiKeyItem.getValue(), lastRunItem.getValue()])
      .then(([on, key, run]) => {
        setEnabled(on);
        setApiKey(key);
        setSaved(key);
        setLastRun(run);
      })
      .finally(() => setReady(true));
  }, []);

  const toggle = (next: boolean) => {
    setEnabled(next);
    enabledItem
      .setValue(next)
      .then(() => (next ? startRun().then(() => window.close()) : undefined))
      .catch((error: Error) => toast.error('Không bật được tự động học', { description: error.message }));
  };

  const saveKey = () => {
    const key = apiKey.trim();
    geminiKeyItem.setValue(key).then(() => {
      setSaved(key);
      toast.success(key ? 'Đã lưu API key' : 'Đã xóa API key');
    });
  };

  const testKey = () => {
    setTesting(true);
    sendMessage('testGeminiKey', apiKey.trim())
      .then(({ ok, message }) => (ok ? toast.success('Kết nối thành công', { description: message }) : toast.error('Kết nối thất bại', { description: message })))
      .catch((error: Error) => toast.error('Kết nối thất bại', { description: error.message }))
      .finally(() => setTesting(false));
  };

  return (
    <div className="bg-background text-foreground w-[360px] p-4">
      <header className="mb-4 flex items-center gap-2.5">
        <img src="/icon/48.png" alt="" className="size-8" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm leading-tight font-semibold">VPBank Auto Learner</h1>
          <p className="text-muted-foreground text-xs">Tự động học trên VPBank Academy</p>
        </div>
        <Badge variant="secondary">Free v{browser.runtime.getManifest().version}</Badge>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tự động học</CardTitle>
          <CardDescription>Mở lần lượt các bài chưa hoàn thành trong khóa học đang xem.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <Label htmlFor="enabled" className="text-sm font-normal">
            {enabled ? 'Đang chạy' : 'Đang tắt'}
          </Label>
          <Switch id="enabled" checked={enabled} disabled={!ready} onCheckedChange={toggle} />
        </CardContent>
      </Card>

      <Card className="mt-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <KeyRound className="size-3.5" /> Bài kiểm tra bằng AI
          </CardTitle>
          <CardDescription>
            {saved ? `Dùng ${CONFIG.GEMINI_MODEL} để chọn đáp án.` : 'Chưa có API key — các bài kiểm tra sẽ được bỏ qua.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Input
            type="password"
            value={apiKey}
            placeholder="Gemini API key"
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => setApiKey(event.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" disabled={apiKey.trim() === saved} onClick={saveKey}>
              <Save /> Lưu
            </Button>
            <Button size="sm" variant="secondary" disabled={testing || !apiKey.trim()} onClick={testKey}>
              {testing ? <Loader2 className="animate-spin" /> : <PlugZap />} Kiểm tra
            </Button>
          </div>
        </CardContent>
      </Card>

      {lastRun && (
        <>
          <Separator className="my-4" />
          <section className="grid gap-1.5">
            <h2 className="text-xs font-medium">Lượt chạy lúc {formatTime(lastRun.finishedAt)}</h2>
            {lastRun.skipped.length ? (
              <ul className="text-muted-foreground grid list-disc gap-1 pl-4 text-xs">
                {lastRun.skipped.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-xs">Khóa học đã hoàn thành.</p>
            )}
          </section>
        </>
      )}

      <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => browser.tabs.create({ url: ACADEMY_URL })}>
        <ExternalLink /> Mở VPBank Academy
      </Button>

      <Toaster position="bottom-center" richColors />
    </div>
  );
}
