import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/hooks/useI18n';
import { useHotelGrid, type CategoryDef } from '@/hooks/HotelGridContext';
import { Layers, DoorOpen, Hash, Users } from 'lucide-react';
import { toast } from 'sonner';

interface AddCategoryDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AddCategoryDialog({ open, onClose }: AddCategoryDialogProps) {
  const { t } = useI18n();
  const { addCategory } = useHotelGrid();
  const [name, setName] = useState('');
  const [short, setShort] = useState('');
  const [maxGuests, setMaxGuests] = useState(2);

  useEffect(() => {
    if (open) {
      setName('');
      setShort('');
      setMaxGuests(2);
    }
  }, [open]);

  const handleCreate = () => {
    if (!name.trim()) return;
    addCategory({ name: name.trim(), short: short.trim(), maxGuests });
    toast.success(t('categoryCreated'));
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px] modal-animate rounded-2xl border-2 border-primary/15 shadow-2xl p-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, filter: 'blur(2px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="overflow-hidden rounded-2xl"
        >
          <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent px-6 pt-6 pb-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-lg font-black">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-sm">
                  <Layers className="h-5 w-5" />
                </div>
                <span className="font-display">{t('addCategoryTitle')}</span>
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="px-6 pb-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold flex items-center gap-1.5">
                <Layers className="h-3 w-3 text-primary/60" />
                {t('categoryName')} <span className="text-destructive">*</span>
              </Label>
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('categoryNamePlaceholder')}
                className="h-11 rounded-xl input-focus-glow"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Hash className="h-3 w-3 text-primary/60" />
                  {t('shortCode')}
                </Label>
                <Input
                  value={short}
                  onChange={(e) => setShort(e.target.value.toUpperCase())}
                  placeholder={t('shortCodePlaceholder')}
                  className="h-11 rounded-xl input-focus-glow uppercase tracking-wider"
                  maxLength={10}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Users className="h-3 w-3 text-primary/60" />
                  {t('maxGuests')}
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={maxGuests}
                  onChange={(e) => setMaxGuests(Number(e.target.value))}
                  className="h-11 rounded-xl input-focus-glow tabular-nums"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl">
                {t('cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={!name.trim()}
                className="rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all"
              >
                {t('create')}
              </Button>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

interface AddRoomDialogProps {
  open: boolean;
  onClose: () => void;
  category: CategoryDef | null;
}

export function AddRoomDialog({ open, onClose, category }: AddRoomDialogProps) {
  const { t, lang } = useI18n();
  const { categories, addRoom } = useHotelGrid();
  const [roomNumber, setRoomNumber] = useState('');
  const [categoryId, setCategoryId] = useState(category?.id ?? '');

  useEffect(() => {
    if (open) {
      setRoomNumber('');
      setCategoryId(category?.id ?? categories[0]?.id ?? '');
    }
  }, [open, category, categories]);

  const handleCreate = () => {
    const num = parseInt(roomNumber, 10);
    if (!Number.isFinite(num) || num <= 0) {
      toast.error(t('invalidNumber'));
      return;
    }
    if (!categoryId) return;
    const result = addRoom(categoryId, num);
    if (!result.ok) {
      toast.error(result.reason === 'exists' ? t('roomExists') : t('invalidNumber'));
      return;
    }
    toast.success(t('roomCreated'));
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[460px] modal-animate rounded-2xl border-2 border-primary/15 shadow-2xl p-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, filter: 'blur(2px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="overflow-hidden rounded-2xl"
        >
          <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent px-6 pt-6 pb-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-lg font-black">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-sm">
                  <DoorOpen className="h-5 w-5" />
                </div>
                <div>
                  <span className="font-display block">{t('addRoomTitle')}</span>
                  {category && (
                    <span className="text-xs font-semibold text-muted-foreground">{category.label[lang]}</span>
                  )}
                </div>
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="px-6 pb-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold flex items-center gap-1.5">
                <Hash className="h-3 w-3 text-primary/60" />
                {t('roomNumber')} <span className="text-destructive">*</span>
              </Label>
              <Input
                autoFocus
                type="number"
                min={1}
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder={t('roomNumberPlaceholder')}
                className="h-11 rounded-xl input-focus-glow tabular-nums text-base"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold flex items-center gap-1.5">
                <Layers className="h-3 w-3 text-primary/60" />
                {t('category')}
              </Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-primary/70">
                          {c.short}
                        </span>
                        <span className="font-medium">{c.label[lang]}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl">
                {t('cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={!roomNumber || !categoryId}
                className="rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all"
              >
                {t('create')}
              </Button>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
