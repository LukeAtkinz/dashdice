import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  textColor?: string; // Add support for custom text color
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  className = '',
  textColor,
  style,
  id,
  ...props
}) => {
  const inputId = id || props.name;
  const hasError = !!error;

  const inputClasses = `
    block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
    sm:text-sm transition-colors
    ${hasError 
      ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500' 
      : 'border-gray-300 focus:border-blue-500'
    }
    ${textColor ? '' : 'text-black'}
    ${className}
  `;

  const inputStyle = textColor 
    ? { ...style, color: textColor }
    : style;

  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={inputClasses}
        style={inputStyle}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="text-sm text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  );
};
