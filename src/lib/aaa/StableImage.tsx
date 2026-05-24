import { useState } from 'react';
import { cn } from '@/lib/utils';

interface StableImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  /** Aspect ratio reservation, e.g. "16 / 9", "1 / 1". Prevents layout shift. */
  aspect?: string;
  className?: string;
  wrapperClassName?: string;
}

/**
 * AAA Spatial Consistency primitive.
 *
 * Reserves space before paint, shows a shimmer skeleton, and fades the
 * image in once decoded. Never causes a layout shift.
 */
export function StableImage({
  src,
  alt,
  aspect = '1 / 1',
  className,
  wrapperClassName,
  ...rest
}: StableImageProps) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg bg-muted',
        wrapperClassName,
      )}
      style={{ aspectRatio: aspect }}
    >
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-foreground/5 to-transparent" />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={cn(
          'h-full w-full object-cover transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
          className,
        )}
        {...rest}
      />
    </div>
  );
}
