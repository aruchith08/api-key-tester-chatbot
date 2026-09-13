import React from 'react';

interface ARHLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ARHLogo: React.FC<ARHLogoProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-[110px] md:w-[130px]',
    md: 'w-[130px] sm:w-[150px] md:w-[170px]',
    lg: 'w-[150px] sm:w-[180px] md:w-[210px]',
  };

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Extremely subtle ambient backlight behind the metallic badge */}
      <div 
        className="absolute -inset-4 bg-white/[0.02] rounded-full blur-2xl pointer-events-none"
        aria-hidden="true"
      />
      <img
        src="/arh-logo.png"
        alt="ARH Logo"
        className={`relative object-contain transition-transform duration-500 hover:scale-[1.02] ${sizeClasses[size]}`}
        loading="eager"
        draggable={false}
      />
    </div>
  );
};
