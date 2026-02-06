import React from 'react';
import { cn } from '../lib/utils';

interface AvatarProps {
  seed: string;
  className?: string;
  size?: number;
}

export const Avatar: React.FC<AvatarProps> = ({ seed, className, size = 64 }) => {
  const url = `https://api.dicebear.com/9.x/notionists/svg?seed=${seed}&backgroundColor=transparent`;

  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-full border-2 border-ink bg-paper",
        "grayscale contrast-125 hover:grayscale-0 hover:contrast-100 transition-all duration-300",
        className
      )}
      style={{ width: size, height: size }}
    >
      <img 
        src={url} 
        alt={seed} 
        className="w-full h-full object-cover" 
      />
    </div>
  );
};
