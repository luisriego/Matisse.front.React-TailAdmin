import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string; // Add optional label prop
}

const Switch: React.FC<SwitchProps> = ({ checked, onChange, disabled, label }) => {
  const handleToggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const trackClasses = "block transition duration-150 ease-linear h-5 w-9 rounded-full";
  const thumbClasses = "absolute left-0.5 top-0.5 h-4 w-4 rounded-full shadow-theme-sm duration-150 ease-linear transform bg-white";

  let trackBgClass = '';
  let thumbPositionClass = '';

  if (disabled) {
    trackBgClass = 'bg-gray-100 pointer-events-none dark:bg-gray-800';
    thumbPositionClass = 'translate-x-0';
  } else if (checked) {
    trackBgClass = 'bg-brand-500';
    thumbPositionClass = 'translate-x-4';
  } else {
    trackBgClass = 'bg-gray-300 dark:bg-gray-600';
    thumbPositionClass = 'translate-x-0';
  }

  return (
    <label
      className={`flex items-center gap-3 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
      <div
        role="switch"
        aria-checked={checked}
        onClick={handleToggle}
        onKeyDown={(e) => e.key === ' ' || e.key === 'Enter' ? handleToggle() : null}
        tabIndex={disabled ? -1 : 0}
        className="relative focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 rounded-full">
        <div className={`${trackClasses} ${trackBgClass}`}></div>
        <div className={`${thumbClasses} ${thumbPositionClass}`}></div>
      </div>
      {label && <span className="text-sm font-medium text-gray-700 dark:text-gray-400">{label}</span>}
    </label>
  );
};

export default Switch;
