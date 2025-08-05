"use client";

export const dynamic = 'force-dynamic';

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams?.get("error");

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "Configuration":
        return "There is a problem with the server configuration.";
      case "AccessDenied":
        return "You do not have permission to sign in.";
      case "Verification":
        return "The verification link has expired or has already been used.";
      default:
        return "An error occurred during authentication.";
    }
  };

  return (
    <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-4">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center p-5">
                <div className="mb-4">
                  <i className="bi bi-exclamation-triangle text-warning" style={{fontSize: '3rem'}}></i>
                </div>
                <h2 className="h3 fw-bold text-danger mb-3">Authentication Error</h2>
                <p className="text-muted mb-4">
                  {getErrorMessage(error ?? null)}
                </p>
                <div className="d-grid gap-2">
                  <Link href="/auth/signin" className="btn btn-primary">
                    <i className="bi bi-arrow-left me-2"></i>
                    Back to Sign In
                  </Link>
                  <Link href="/" className="btn btn-outline-secondary">
                    <i className="bi bi-house me-2"></i>
                    Go Home
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <h4>Loading...</h4>
        </div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
} 