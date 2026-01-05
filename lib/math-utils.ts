import React, { useState, useCallback, useRef } from 'react';

export const evaluateExpression = (expression: string): number | null => {
  try {
    // Remove any non-numeric and non-operator characters except digits, dots, +, -, *, /, spaces
    const sanitized = expression.replace(/[^0-9+\-*/.\\s]/g, '');
    // Use Function constructor for safer evaluation (avoids eval)
    const result = new Function('return ' + sanitized)();
    return typeof result === 'number' && !isNaN(result) ? result : null;
  } catch {
    return null;
  }
};

export const useMathInput = (amountValue: string, setAmountValue: (value: string) => void) => {
  const [rawInput, setRawInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedEvaluate = useCallback((expression: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (expression.trim() === '') {
        // If expression is empty, clear the amount value
        setAmountValue('');
        setRawInput('');
        setIsEditing(false);
      } else {
        const result = evaluateExpression(expression);
        if (result !== null) {
          setAmountValue(Math.round(result).toString());
          setRawInput('');
          setIsEditing(false); // Switch back to display mode after successful calculation
        }
      }
    }, 1000); // Wait 1 second after user stops typing
  }, [setAmountValue]);

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;

    // If not editing and user is making a change, switch to editing mode
    if (!isEditing) {
      setIsEditing(true);
      // When starting to edit, strip any formatting (dots) from the input
      inputValue = inputValue.replace(/\./g, '');
    }

    // Allow digits, operators (+, -, *, /), and spaces
    if (/^[0-9+\-*/\s]*$/.test(inputValue)) {
      setRawInput(inputValue);
      debouncedEvaluate(inputValue);
    }
  }, [debouncedEvaluate, isEditing]);

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Determine display value
  const displayValue = isEditing
    ? rawInput  // Show what user is typing, even if empty
    : (amountValue ? new Intl.NumberFormat('id-ID').format(Number(amountValue)) : '');

  return {
    displayValue,
    handleAmountChange,
  };
};
