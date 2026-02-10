/**
 * Quill Rich Text Editor Component
 *
 * Wrapper around react-quill for email content and other rich text use cases.
 * Integrates with react-hook-form via value/onChange/onBlur props.
 */

import React from 'react';
import ReactQuill from 'react-quill';

import { cn } from '@/lib/utils';

import 'react-quill/dist/quill.snow.css';

const modules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
  ],
};

export interface QuillEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function QuillEditor({
  value = '',
  onChange,
  onBlur,
  placeholder,
  disabled,
  className,
}: QuillEditorProps) {
  return (
    <div className={cn('quill-editor-wrapper', className)}>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        onBlur={onBlur ? () => onBlur() : undefined}
        placeholder={placeholder}
        readOnly={disabled}
        modules={modules}
        className={cn('min-h-32', disabled && 'opacity-50 pointer-events-none')}
      />
    </div>
  );
}

export { QuillEditor };
