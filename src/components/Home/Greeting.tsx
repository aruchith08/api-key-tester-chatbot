import React, { useMemo } from 'react';

export const Greeting: React.FC = () => {
  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return 'Morning, how are things?';
    } else if (hour >= 12 && hour < 18) {
      return 'Afternoon, how are things?';
    } else {
      return 'Evening, how are things?';
    }
  }, []);

  return (
    <h1 className="font-editorial text-3xl sm:text-4xl md:text-5xl font-normal text-neutral-100 tracking-wide text-center select-none antialiased">
      {greetingText}
    </h1>
  );
};
