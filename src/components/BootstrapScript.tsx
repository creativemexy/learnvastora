"use client";

import { useEffect } from 'react';

export default function BootstrapScript() {
  useEffect(() => {
    // Load Bootstrap JS only on client side
    import('bootstrap/dist/js/bootstrap.bundle.min.js');
  }, []);

  return null;
} 