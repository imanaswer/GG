"use client";

import { useState } from "react";

export function ImageWithFallback({
  src,
  alt,
  className,
  ...props
}: any) {
  const [error, setError] = useState(false);

  return (
    <img
      src={
        error
          ? "https://via.placeholder.com/800x600?text=Image+Unavailable"
          : src
      }
      alt={alt}
      className={className}
      onError={() => setError(true)}
      {...props}
    />
  );
}