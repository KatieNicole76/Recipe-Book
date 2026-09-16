import * as Select from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';

function CustomSelect({ value, onChange, options, labelFor, placeholder = 'Select...', size = 'default', maxHeight = '256px', ariaLabel }) {
  const getLabel = (opt) => {
    if (labelFor) return labelFor(opt);
    if (typeof opt === 'object') return opt.label;
    return opt || 'N/A';
  };
  const getValue = (opt) => (typeof opt === 'object' ? opt.value : opt);

  const triggerPadding = size === 'compact' ? 'py-1 px-2' : 'p-2';
  const triggerText = size === 'compact' ? 'text-body-2' : 'text-body-1';
  const itemPadding = size === 'compact' ? 'px-2 py-1' : 'px-3 py-2';

  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger
        aria-label={ariaLabel}
        className={`w-full ${triggerPadding} rounded-lg bg-white flex items-center justify-between cursor-pointer ${triggerText}`}
      >
        <Select.Value placeholder={placeholder} />
        <Select.Icon>
          <ChevronDown size={size === 'compact' ? 14 : 16} className="text-dark-green" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          className="bg-white rounded-lg shadow-lg overflow-hidden z-50 w-[var(--radix-select-trigger-width)]"
          position="popper"
          sideOffset={4}
        >
          <Select.Viewport
            className="p-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            style={{ maxHeight }}
          >
            {options.map((opt) => (
              <Select.Item
                key={getValue(opt)}
                value={getValue(opt)}
                className={`${itemPadding} rounded-md ${triggerText} text-dark-green cursor-pointer outline-none flex items-center justify-between data-[highlighted]:bg-beige`}
              >
                <Select.ItemText>{getLabel(opt)}</Select.ItemText>
                <Select.ItemIndicator>
                  <Check size={14} className="text-blue" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

export default CustomSelect;