import { useState } from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  disabled?: boolean;
}

interface EmojiData {
  native: string;
  id: string;
  name: string;
}

export function EmojiPicker({ value, onChange, disabled }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (emoji: EmojiData) => {
    onChange(emoji.native);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-10 w-14 text-xl"
          disabled={disabled}
          type="button"
        >
          {value || '?'}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-auto max-w-none p-0 gap-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Select Emoji</DialogTitle>
        </DialogHeader>
        <Picker
          data={data}
          onEmojiSelect={handleSelect}
          theme="light"
          previewPosition="none"
          skinTonePosition="none"
          maxFrequentRows={2}
          perLine={9}
        />
      </DialogContent>
    </Dialog>
  );
}
