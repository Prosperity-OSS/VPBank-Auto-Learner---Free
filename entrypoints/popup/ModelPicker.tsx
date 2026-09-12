import { useEffect, useMemo, useRef, useState } from 'react';
import { Popover } from 'radix-ui';
import { Check, ChevronsUpDown, Loader2, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { GeminiModel } from '@/lib/gemini';
import { sendMessage } from '@/lib/messaging';
import { modelCacheItem } from '@/lib/storage';

type Props = {
  apiKey: string;
  value: string;
  onChange: (model: string) => void;
};

/**
 * Ô chọn model: nút bấm trông như <select>, mở ra panel có ô tìm kiếm.
 *
 * Panel đi qua Popover.Portal của Radix vì Card có `overflow-hidden` — một thẻ
 * position: absolute bên trong sẽ bị cắt ở viền Card, z-index không cứu được.
 * Portal cũng cho Radix tự lật panel lên trên khi popup không còn chỗ bên dưới.
 *
 * Vẫn dùng được model chưa có trong danh sách: gõ tên rồi chọn dòng "Dùng ... làm tên model".
 */
export default function ModelPicker({ apiKey, value, onChange }: Props) {
  const [models, setModels] = useState<GeminiModel[]>([]);
  const [updatedAt, setUpdatedAt] = useState('');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Danh sách đã tải lần trước; hiện ngay để không phải bấm làm mới mỗi lần mở popup.
  useEffect(() => {
    modelCacheItem.getValue().then((cache) => {
      if (!cache) return;
      setModels(cache.models);
      setUpdatedAt(cache.updatedAt);
    });
  }, []);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return models;
    return models.filter(
      ({ id, label, detail }) =>
        id.toLowerCase().includes(needle) ||
        label.toLowerCase().includes(needle) ||
        detail.toLowerCase().includes(needle),
    );
  }, [models, query]);

  // Tên đẹp của model đang chọn; model tự nhập thì hiện đúng chuỗi đã nhập.
  const selectedLabel = models.find((model) => model.id === value)?.label ?? value;
  const typed = query.trim();
  // Chỉ mời dùng tên vừa gõ khi không còn model nào khớp. Nếu vừa có model khớp
  // vừa có dòng này thì mũi tên xuống dễ rơi vào nó và Enter lưu mất chuỗi đang
  // gõ (ví dụ "2.0") thay vì model thật.
  const useTyped = typed !== '' && matches.length === 0;

  // Giữ mục đang trỏ tới trong tầm nhìn khi di chuyển bằng bàn phím.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) return;
    // Mở ra thì hiện cả danh sách và trỏ sẵn vào model đang dùng.
    setQuery('');
    setActive(
      Math.max(
        0,
        models.findIndex((model) => model.id === value),
      ),
    );
  };

  const refresh = () => {
    if (!apiKey.trim()) {
      toast.error('Nhập Gemini API key trước', {
        description: 'Danh sách model lấy theo key của bạn.',
      });
      return;
    }

    setLoading(true);
    sendMessage('listGeminiModels', apiKey.trim())
      .then((list) => {
        const now = new Date().toISOString();
        setModels(list);
        setUpdatedAt(now);
        return modelCacheItem
          .setValue({ models: list, updatedAt: now })
          .then(() => toast.success(`Đã tải ${list.length} model`));
      })
      .catch((error: Error) =>
        toast.error('Không tải được danh sách model', {
          description: error.message,
        }),
      )
      .finally(() => setLoading(false));
  };

  const pick = (model: string) => {
    onChange(model);
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // Panel hiện HOẶC danh sách model, HOẶC đúng một dòng "dùng tên vừa gõ",
    // nên chỉ có một dải chỉ số để di chuyển.
    const last = (useTyped ? 1 : matches.length) - 1;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) => (event.key === 'ArrowDown' ? Math.min(current + 1, last) : Math.max(current - 1, 0)));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (useTyped) pick(typed);
      else if (matches[active]) pick(matches[active].id);
    }
    // Escape để Radix tự đóng panel.
  };

  return (
    <div className="grid gap-1.5">
      <Label htmlFor="model">Model</Label>

      <Popover.Root open={open} onOpenChange={onOpenChange}>
        {/* Anchor là cả hàng, nên panel rộng bằng hàng và không để lọt nút phía sau ra bên cạnh. */}
        <Popover.Anchor asChild>
          <div className="flex gap-2">
            <Popover.Trigger asChild>
              <button
                id="model"
                type="button"
                role="combobox"
                aria-expanded={open}
                className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 flex-1 items-center justify-between gap-2 rounded-md border px-3 py-1 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <span className={`truncate ${value ? '' : 'text-muted-foreground'}`}>
                  {value ? selectedLabel : 'Chọn model'}
                </span>
                <ChevronsUpDown className="text-muted-foreground size-4 shrink-0 opacity-60" />
              </button>
            </Popover.Trigger>

            <Button size="sm" variant="secondary" disabled={loading} onClick={refresh} title="Tải lại danh sách model">
              {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            </Button>
          </div>
        </Popover.Anchor>

        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={4}
            className="bg-popover text-popover-foreground z-50 w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-md border shadow-md"
          >
            <div className="flex items-center gap-2 border-b px-2.5">
              <Search className="text-muted-foreground size-3.5 shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
                placeholder="Tìm hoặc nhập tên model"
                spellCheck={false}
                autoComplete="off"
                className="placeholder:text-muted-foreground h-9 w-full bg-transparent text-xs outline-none"
              />
            </div>

            <div ref={listRef} role="listbox" className="max-h-52 overflow-y-auto p-1">
              {matches.map((model, index) => (
                <div
                  key={model.id}
                  role="option"
                  aria-selected={model.id === value}
                  data-active={index === active}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => pick(model.id)}
                  className="data-[active=true]:bg-accent data-[active=true]:text-accent-foreground flex cursor-pointer items-start gap-2 rounded-sm px-2 py-1.5 text-xs"
                >
                  <Check className={`mt-0.5 size-3.5 shrink-0 ${model.id === value ? 'opacity-100' : 'opacity-0'}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{model.label}</span>
                    <span className="text-muted-foreground block truncate">{model.detail}</span>
                  </span>
                </div>
              ))}

              {useTyped && (
                <div
                  role="option"
                  aria-selected={false}
                  data-active
                  onClick={() => pick(typed)}
                  className="data-[active=true]:bg-accent data-[active=true]:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs"
                >
                  {/* Tên model dài thì chỉ nó bị cắt, phần chữ giải thích vẫn còn đủ nghĩa. */}
                  <span className="flex min-w-0 items-baseline gap-1">
                    <span className="text-muted-foreground shrink-0">Dùng</span>
                    <span className="min-w-0 truncate font-medium">“{typed}”</span>
                    <span className="text-muted-foreground shrink-0">làm tên model</span>
                  </span>
                </div>
              )}

              {matches.length === 0 && !useTyped && (
                <p className="text-muted-foreground px-2 py-6 text-center text-xs">
                  Chưa có danh sách model. Bấm nút làm mới bên cạnh.
                </p>
              )}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <p className="text-muted-foreground text-xs">
        {models.length
          ? `${models.length} model · cập nhật ${new Date(updatedAt).toLocaleDateString('vi-VN')}`
          : 'Bấm nút làm mới để tải danh sách model theo API key của bạn.'}
      </p>
    </div>
  );
}
