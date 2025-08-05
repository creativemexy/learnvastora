import React from 'react';
import Image from 'next/image';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallbackClassName?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl'
};

const fallbackSizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg'
};

export function Avatar({ 
  src, 
  alt = '', 
  name = '', 
  size = 'md', 
  className = '',
  fallbackClassName = ''
}: AvatarProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getFallbackColor = (name: string) => {
    const colors = [
      'bg-gradient-to-br from-blue-400 to-blue-600',
      'bg-gradient-to-br from-green-400 to-green-600',
      'bg-gradient-to-br from-purple-400 to-purple-600',
      'bg-gradient-to-br from-pink-400 to-pink-600',
      'bg-gradient-to-br from-yellow-400 to-yellow-600',
      'bg-gradient-to-br from-red-400 to-red-600',
      'bg-gradient-to-br from-indigo-400 to-indigo-600',
      'bg-gradient-to-br from-teal-400 to-teal-600'
    ];
    
    const hash = name.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  if (src) {
    return (
      <div className={`relative rounded-full overflow-hidden ${sizeClasses[size]} ${className}`}>
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes={`(max-width: 768px) 100vw, ${size === 'xl' ? '64px' : size === 'lg' ? '48px' : size === 'md' ? '40px' : '32px'}`}
        />
      </div>
    );
  }

  return (
    <div 
      className={`
        relative rounded-full flex items-center justify-center text-white font-semibold
        ${fallbackSizeClasses[size]} 
        ${getFallbackColor(name)}
        ${fallbackClassName}
        ${className}
      `}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
} 