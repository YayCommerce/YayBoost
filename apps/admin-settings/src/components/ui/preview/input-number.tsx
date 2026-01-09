import {
  ComponentProps,
  createContext,
  forwardRef,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { CaretDownIcon, CaretUpIcon } from '@phosphor-icons/react';
import { NumericFormat, NumericFormatProps } from 'react-number-format';

import { cn } from '@/lib/utils';

import { Input } from '../input';

interface InputNumberContextValue
  extends Omit<NumericFormatProps, 'value' | 'onValueChange' | 'className' | 'step'> {
  defaultValue?: number;
  value?: number; // Controlled value
  onValueChange?: (value: number | undefined) => void; // Controlled change.

  step: number;
  min: number;
  max: number;

  internalValue: number | undefined;
  setInternalValue: (value: SetStateAction<number | undefined>) => void;
  handleIncrement: () => void;
  handleDecrement: () => void;
}
const InputNumberContext = createContext<InputNumberContextValue | null>(null);
const useInputNumberContext = () => {
  const ctx = useContext(InputNumberContext);
  if (!ctx) throw new Error('InputNumber components must be used within InputNumber.Root');
  return ctx;
};

type InputNumberCaretsProps = ComponentProps<'div'> & {
  rounded?: boolean;
};
type InputNumberCaretProps = ComponentProps<'span'> & {
  rounded?: boolean;
};

interface InputNumberRootProps
  extends Omit<NumericFormatProps, 'value' | 'onValueChange' | 'step'> {
  defaultValue?: number;
  value?: number; // Controlled value
  onValueChange?: (value: number | undefined) => void; // Controlled change.

  step?: number;
  min?: number;
  max?: number;
  children?: React.ReactNode;
}
function InputNumberRoot({
  className,
  children,
  ...contextProps
}: InputNumberRootProps & { children?: React.ReactNode }) {
  const {
    defaultValue,
    value: controlledValue,
    onValueChange,

    step = 1,
    min = -Infinity,
    max = Infinity,
    fixedDecimalScale = false,
    decimalScale = 0,

    ...restContextProps
  } = contextProps;

  const [internalValue, setInternalValue] = useState<number | undefined>(
    controlledValue ?? defaultValue,
  );

  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue);
    }
  }, [controlledValue]);

  const handleIncrement = useCallback(() => {
    setInternalValue((prev) => (prev === undefined ? step : Math.min(prev + step, max)));
  }, [step, max]);

  const handleDecrement = useCallback(() => {
    setInternalValue((prev) => (prev === undefined ? 0 - step : Math.max(prev - step, min)));
  }, [step, min]);

  return (
    <InputNumberContext.Provider
      value={{
        defaultValue,
        value: controlledValue,
        onValueChange,

        step,
        min,
        max,
        fixedDecimalScale,
        decimalScale,

        internalValue,
        setInternalValue,
        handleIncrement,
        handleDecrement,

        ...restContextProps,
      }}
    >
      <div
        data-slot="input-number"
        className={cn('group/input-number relative inline-flex', className)}
      >
        {children}
      </div>
    </InputNumberContext.Provider>
  );
}

type InputNumberInputProps = Omit<
  ComponentProps<'input'>,
  'value' | 'onValueChange' | 'defaultValue' | 'type' | 'min' | 'max'
>;
const InputNumberInput = forwardRef<HTMLInputElement, InputNumberInputProps>(
  ({ className, ...inputProps }, ref) => {
    const {
      internalValue,
      setInternalValue,
      value: controlledValue,
      onValueChange,
      min,
      max,
      handleIncrement,
      handleDecrement,
      ...contextProps
    } = useInputNumberContext();

    const handleChange = (values: { value: string; floatValue: number | undefined }) => {
      const newValue = values.floatValue === undefined ? undefined : values.floatValue;
      setInternalValue(newValue);
      if (onValueChange) {
        onValueChange(newValue);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowUp') {
        handleIncrement();
      } else if (e.key === 'ArrowDown') {
        handleDecrement();
      }
    };

    const handleBlur = () => {
      if (internalValue !== undefined) {
        if (internalValue < min) {
          setInternalValue(min);
          (ref as React.RefObject<HTMLInputElement>).current!.value = String(min);
        } else if (internalValue > max) {
          setInternalValue(max);
          (ref as React.RefObject<HTMLInputElement>).current!.value = String(max);
        }
      }
    };

    return (
      <NumericFormat
        data-slot="input-number-input"
        className={cn(
          'peer/input-number-input [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
          className,
        )}
        min={min}
        max={max}
        value={internalValue}
        onValueChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        customInput={Input}
        getInputRef={ref}
        {...contextProps}
        {...inputProps}
      />
    );
  },
);

function InputNumberCarets({
  className,
  children,
  rounded = true,
  ...props
}: InputNumberCaretsProps) {
  return (
    <div
      data-slot="input-number-carets"
      className={cn(
        'divide-border bg-background absolute inset-y-px end-px flex w-6 flex-col divide-y rounded-r-sm border-s opacity-0 transition-opacity duration-500 group-hover/input-number:opacity-100 peer-focus/input-number-input:opacity-100',
        className,
      )}
      {...props}
    >
      {children ?? (
        <>
          <InputNumberCaretUp rounded={rounded} />
          <InputNumberCaretDown rounded={rounded} />
        </>
      )}
    </div>
  );
}

function InputNumberCaretUp({ className, children, rounded, ...props }: InputNumberCaretProps) {
  const { handleIncrement } = useInputNumberContext();

  return (
    <span
      data-slot="input-number-caret-up"
      onClick={handleIncrement}
      className={cn(
        'text-muted-foreground hover:text-accent-foreground hover:bg-accent inline-flex flex-1 cursor-pointer items-center justify-center transition-all select-none',
        rounded && 'rounded-tr-sm',
        className,
      )}
      {...props}
    >
      {children ?? <CaretUpIcon weight="bold" className="size-3" />}
    </span>
  );
}

function InputNumberCaretDown({ className, children, rounded, ...props }: InputNumberCaretProps) {
  const { handleDecrement } = useInputNumberContext();

  return (
    <span
      data-slot="input-number-caret-down"
      onClick={handleDecrement}
      className={cn(
        'text-muted-foreground hover:text-accent-foreground hover:bg-accent inline-flex flex-1 cursor-pointer items-center justify-center transition-all select-none',
        rounded && 'rounded-br-sm',
        className,
      )}
      {...props}
    >
      {children ?? <CaretDownIcon weight="bold" className="size-3" />}
    </span>
  );
}

interface InputNumberProps extends InputNumberRootProps {
  placeholder?: string;
}
const InputNumber = forwardRef<HTMLInputElement, InputNumberProps>(
  ({ placeholder, className, ...rootProps }, ref) => {
    return (
      <InputNumberRoot {...rootProps}>
        <InputNumberInput placeholder={placeholder} className={className} ref={ref} />
        <InputNumberCarets />
      </InputNumberRoot>
    );
  },
);

export {
  InputNumber,
  InputNumberRoot,
  InputNumberInput,
  InputNumberCarets,
  InputNumberCaretUp,
  InputNumberCaretDown,
};
