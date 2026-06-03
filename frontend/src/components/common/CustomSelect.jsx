import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export default function CustomSelect({
  id,
  label,
  options = [],
  value,
  onChange,
  className = '',
  disabled = false,
}) {
  const selectId = useId();
  const triggerId = id || selectId;
  const wrapperRef = useRef(null);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedOption = options[selectedIndex] || options[0];
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(selectedIndex >= 0 ? selectedIndex : 0);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsidePointer = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsidePointer);
    return () => document.removeEventListener('mousedown', handleOutsidePointer);
  }, [isOpen]);

  const moveActiveIndex = (direction) => {
    if (!options.length) return;

    setActiveIndex((currentIndex) => {
      const startIndex = currentIndex >= 0 ? currentIndex : 0;
      let nextIndex = startIndex;

      for (let step = 0; step < options.length; step += 1) {
        nextIndex = (nextIndex + direction + options.length) % options.length;
        if (!options[nextIndex].disabled) {
          return nextIndex;
        }
      }

      return startIndex;
    });
  };

  const selectOption = (option) => {
    if (!option || option.disabled) return;

    onChange(option.value);
    setIsOpen(false);
  };

  const openSelect = () => {
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setIsOpen(true);
  };

  const handleKeyDown = (event) => {
    if (disabled) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isOpen) {
        openSelect();
        return;
      }
      moveActiveIndex(1);
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) {
        openSelect();
        return;
      }
      moveActiveIndex(-1);
    }

    if (event.key === 'Home' && isOpen) {
      event.preventDefault();
      setActiveIndex(options.findIndex((option) => !option.disabled));
    }

    if (event.key === 'End' && isOpen) {
      event.preventDefault();
      for (let index = options.length - 1; index >= 0; index -= 1) {
        if (!options[index].disabled) {
          setActiveIndex(index);
          break;
        }
      }
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (isOpen) {
        selectOption(options[activeIndex]);
        return;
      }
      openSelect();
    }

    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div
      className={`custom-select ${isOpen ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''} ${className}`}
      ref={wrapperRef}
    >
      <button
        id={triggerId}
        type="button"
        className="custom-select-trigger"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${triggerId}-listbox`}
        aria-activedescendant={isOpen ? `${triggerId}-option-${activeIndex}` : undefined}
        disabled={disabled}
        onClick={() => (isOpen ? setIsOpen(false) : openSelect())}
        onKeyDown={handleKeyDown}
      >
        <span>{selectedOption?.label || label}</span>
        <ChevronDown className="custom-select-icon" size={17} />
      </button>

      {isOpen && (
        <div className="custom-select-menu" id={`${triggerId}-listbox`} role="listbox" aria-label={label}>
          {options.map((option, index) => (
            <button
              type="button"
              id={`${triggerId}-option-${index}`}
              className={`custom-select-option ${index === activeIndex ? 'is-active' : ''} ${
                option.value === value ? 'is-selected' : ''
              }`}
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              disabled={option.disabled}
              onClick={() => selectOption(option)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <span>{option.label}</span>
              <Check className="custom-select-check" size={15} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
