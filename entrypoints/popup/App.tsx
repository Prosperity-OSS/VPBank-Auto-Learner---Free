import { useEffect, useState } from 'react';
import { ExternalLink, KeyRound, Loader2, PlugZap, Save, Bot } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { BRAND } from '@/lib/branding';
import { CONFIG } from '@/lib/config';
import { sendMessage } from '@/lib/messaging';
import {
  dispatchItem,
  enabledItem,
  geminiKeyItem,
  geminiModelItem,
  lastRunItem,
  triesItem,
} from '@/lib/storage';
import type { LastRun } from '@/lib/storage';
import ModelPicker from './ModelPicker';

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
  // CONFIG khai báo `as const`, nên phải nói rõ string kẻo state bị bó vào đúng một giá trị.
  const [model, setModel] = useState<string>(CONFIG.GEMINI_MODEL_DEFAULT);
  const [savedModel, setSavedModel] = useState<string>(CONFIG.GEMINI_MODEL_DEFAULT);
  const [testing, setTesting] = useState(false);
  const [lastRun, setLastRun] = useState<LastRun>(null);

  useEffect(() => {
    Promise.all([
      enabledItem.getValue(),
      geminiKeyItem.getValue(),
      geminiModelItem.getValue(),
      lastRunItem.getValue(),
    ])
      .then(([on, key, savedGeminiModel, run]) => {
        setEnabled(on);
        setApiKey(key);
        setSaved(key);
        setModel(savedGeminiModel);
        setSavedModel(savedGeminiModel);
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

  // Key và model lưu cùng nhau: đổi model xong mà quên bấm Lưu là lượt chạy sau vẫn dùng model cũ.
  const dirty = apiKey.trim() !== saved || model.trim() !== savedModel;

  const save = () => {
    const key = apiKey.trim();
    const chosen = model.trim() || CONFIG.GEMINI_MODEL_DEFAULT;
    Promise.all([geminiKeyItem.setValue(key), geminiModelItem.setValue(chosen)]).then(() => {
      setSaved(key);
      setModel(chosen);
      setSavedModel(chosen);
      toast.success(key ? 'Đã lưu' : 'Đã xóa API key');
    });
  };

  const testKey = () => {
    setTesting(true);
    sendMessage('testGeminiKey', { apiKey: apiKey.trim(), model: model.trim() })
      .then(({ ok, message }) => (ok ? toast.success('Kết nối thành công', { description: message }) : toast.error('Kết nối thất bại', { description: message })))
      .catch((error: Error) => toast.error('Kết nối thất bại', { description: error.message }))
      .finally(() => setTesting(false));
  };

  return (
    <div className="bg-background text-foreground w-[360px] p-4">
      <header className="mb-4 flex items-center gap-2.5">
        {/* Lấy từ manifest để bản cửa hàng dùng đúng bộ icon riêng của nó. */}
        <img src={`/${browser.runtime.getManifest().icons![48]}`} alt="" className="size-8" />
        <div className="min-w-0 flex-1">
          {/* Tên lấy thẳng từ manifest để bản cửa hàng và bản tự phát hành không lệch nhau. */}
          <h1 className="truncate text-sm leading-tight font-semibold">
            {browser.runtime.getManifest().name}
          </h1>
          <p className="text-muted-foreground text-xs">{BRAND.tagline}</p>
        </div>
        <Badge variant="secondary">v{browser.runtime.getManifest().version}</Badge>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-sm">
              <Bot className="size-3.5"/>Tự động học
          </CardTitle>
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
            <KeyRound className="size-3.5" /> Làm bài tự động
          </CardTitle>
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
          <ModelPicker apiKey={apiKey} value={model} onChange={setModel} />
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" disabled={!dirty} onClick={save}>
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
        <ExternalLink /> {BRAND.openCourseSite}
      </Button>

      <p className="text-muted-foreground mt-3 text-center text-xs">
        From{' '}
        <a
          href="https://github.com/Prosperity-OSS"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Prosperity-OSS
        </a>{' '}
        with love 💖
      </p>

      <Toaster position="bottom-center" richColors />
    </div>
  );
}
