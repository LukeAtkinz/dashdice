# 🔒 DashDice Security & Code Quality Guide

## Table of Contents
1. [Security Assessment](#security-assessment)
2. [Authentication & Authorization](#authentication--authorization)
3. [Data Protection](#data-protection)
4. [Infrastructure Security](#infrastructure-security)
5. [Code Quality & Architecture](#code-quality--architecture)
6. [Performance Security](#performance-security)
7. [Vulnerability Prevention](#vulnerability-prevention)
8. [Monitoring & Incident Response](#monitoring--incident-response)
9. [Implementation Roadmap](#implementation-roadmap)
10. [Security Checklist](#security-checklist)

---

## Security Assessment

### Current Security Posture

The DashDice application has a solid foundation but requires several security enhancements to protect against modern threats and ensure production-grade security.

#### Strengths ✅
- Firebase Authentication with proper session management
- Firestore security rules implementation
- TypeScript for type safety
- Environment variable configuration
- HTTPS deployment via Vercel

#### Critical Vulnerabilities ⚠️
- **Service Account Key Exposure**: `serviceAccountKey.json` in repository
- **Environment Variable Leaks**: Potential exposure in client-side code
- **Insufficient Input Validation**: Limited sanitization of user inputs
- **Missing Rate Limiting**: No protection against brute force attacks
- **Weak Error Handling**: Detailed error messages exposing system info
- **No CSRF Protection**: Missing cross-site request forgery protection
- **Inadequate Logging**: Insufficient security event monitoring

#### Medium Risk Issues 🔶
- Code duplication across components
- Inconsistent error handling patterns
- Missing security headers
- No content security policy (CSP)
- Unoptimized Firebase queries
- Missing input length limits
- No real-time threat detection

---

## Authentication & Authorization

### Current Implementation Issues

#### Firebase Security Vulnerabilities
```typescript
// SECURITY ISSUE: Exposed service account in repository
// File: serviceAccountKey.json (should never be in repo)

// CURRENT VULNERABLE CODE
const serviceAccount = require('../../serviceAccountKey.json');

// SECURE SOLUTION
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};
```

### Enhanced Authentication System

#### Multi-Factor Authentication (MFA)
```typescript
// Enhanced Auth Service
export class SecureAuthService {
  // Enable MFA for sensitive operations
  static async enableMFA(user: User): Promise<void> {
    try {
      const multiFactorSession = await multiFactor(user).getSession();
      const phoneAuthCredential = PhoneAuthProvider.credential(
        process.env.MFA_VERIFICATION_ID!,
        process.env.MFA_CODE!
      );
      
      const multiFactorAssertion = PhoneMultiFactorGenerator
        .assertion(phoneAuthCredential);
      
      await multiFactor(user).enroll(multiFactorAssertion, multiFactorSession);
    } catch (error) {
      this.logSecurityEvent('MFA_ENROLLMENT_FAILED', { userId: user.uid, error });
      throw new SecureError('MFA enrollment failed', 'AUTH_ERROR');
    }
  }

  // Secure session management
  static async createSecureSession(user: User): Promise<SecureSession> {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + (30 * 60 * 1000)); // 30 minutes
    
    const session: SecureSession = {
      id: sessionId,
      userId: user.uid,
      createdAt: new Date(),
      expiresAt,
      lastActivity: new Date(),
      ipAddress: await this.getClientIP(),
      userAgent: navigator.userAgent,
      isActive: true
    };

    await this.storeSession(session);
    return session;
  }

  // Rate limiting for auth attempts
  static async checkRateLimit(identifier: string, action: string): Promise<boolean> {
    const key = `${action}:${identifier}`;
    const attempts = await this.getAttempts(key);
    
    if (attempts >= this.getRateLimit(action)) {
      this.logSecurityEvent('RATE_LIMIT_EXCEEDED', { identifier, action });
      throw new SecureError('Too many attempts', 'RATE_LIMITED');
    }
    
    await this.incrementAttempts(key);
    return true;
  }

  private static getRateLimit(action: string): number {
    const limits = {
      login: 5,
      register: 3,
      password_reset: 3,
      mfa_verify: 3
    };
    return limits[action] || 5;
  }
}
```

#### Enhanced Security Rules
```javascript
// Enhanced Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Enhanced user data protection
    match /users/{userId} {
      allow read: if request.auth != null && 
        (request.auth.uid == userId || 
         request.auth.token.admin == true);
      
      allow write: if request.auth != null && 
        request.auth.uid == userId &&
        validateUserData(request.resource.data) &&
        !hasSecurityViolation(request.resource.data);
    }
    
    // Protected admin operations
    match /admin/{document=**} {
      allow read, write: if request.auth != null && 
        request.auth.token.admin == true &&
        request.auth.token.email_verified == true;
    }
    
    // Enhanced match security
    match /activeMatches/{matchId} {
      allow read: if request.auth != null && 
        (request.auth.uid in resource.data.players ||
         request.auth.token.admin == true);
      
      allow write: if request.auth != null && 
        request.auth.uid in resource.data.players &&
        validateGameAction(request.resource.data) &&
        !isGameCheating(request.resource.data, resource.data);
    }
  }
  
  // Security validation functions
  function validateUserData(data) {
    return data.keys().hasAll(['uid', 'email']) &&
           data.uid is string &&
           data.email is string &&
           data.email.matches('.*@.*\\..*') &&
           (!('displayName' in data) || 
            (data.displayName is string && data.displayName.size() <= 50));
  }
  
  function hasSecurityViolation(data) {
    // Check for XSS patterns
    return ('displayName' in data && 
            (data.displayName.matches('.*<script.*') ||
             data.displayName.matches('.*javascript:.*') ||
             data.displayName.matches('.*onclick.*')));
  }
  
  function validateGameAction(newData) {
    return newData.keys().hasAll(['gameData', 'updatedAt']) &&
           newData.gameData.currentPlayer is string &&
           newData.gameData.gamePhase in ['rolling', 'banking', 'ended'];
  }
  
  function isGameCheating(newData, oldData) {
    // Detect impossible game state changes
    let newScore = newData.gameData.roundScore;
    let oldScore = oldData.gameData.roundScore;
    
    // Score should not increase by more than 6000 (6 dice * 1000 max)
    return newScore > oldScore + 6000 ||
           newScore < 0 ||
           newData.gameData.diceValues.size() > 6;
  }
}
```

---

## Data Protection

### Input Validation & Sanitization

#### Comprehensive Input Validation
```typescript
// Enhanced Input Validation Service
export class InputValidationService {
  private static readonly XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /vbscript:/gi,
    /data:text\/html/gi
  ];

  private static readonly SQL_INJECTION_PATTERNS = [
    /(\b(ALTER|CREATE|DELETE|DROP|EXEC|EXECUTE|INSERT|SELECT|UNION|UPDATE)\b)/gi,
    /(INFORMATION_SCHEMA|sysobjects|syscolumns)/gi,
    /(\bOR\b.*=.*|;\s*--|\/\*|\*\/)/gi
  ];

  static sanitizeUserInput(input: string, maxLength: number = 255): string {
    if (!input || typeof input !== 'string') {
      throw new ValidationError('Invalid input type');
    }

    // Length validation
    if (input.length > maxLength) {
      throw new ValidationError(`Input exceeds maximum length of ${maxLength}`);
    }

    // XSS prevention
    let sanitized = input
      .trim()
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    // Additional XSS pattern detection
    for (const pattern of this.XSS_PATTERNS) {
      if (pattern.test(sanitized)) {
        this.logSecurityEvent('XSS_ATTEMPT_DETECTED', { input, pattern: pattern.source });
        throw new SecurityError('Potential XSS attack detected');
      }
    }

    return sanitized;
  }

  static validateDisplayName(displayName: string): ValidationResult {
    const errors: string[] = [];

    if (!displayName || displayName.trim().length === 0) {
      errors.push('Display name is required');
    }

    if (displayName.length > 50) {
      errors.push('Display name must be 50 characters or less');
    }

    if (displayName.length < 3) {
      errors.push('Display name must be at least 3 characters');
    }

    // Profanity filter (basic implementation)
    const profanityWords = ['badword1', 'badword2']; // Implement comprehensive filter
    const lowerName = displayName.toLowerCase();
    for (const word of profanityWords) {
      if (lowerName.includes(word)) {
        errors.push('Display name contains inappropriate content');
        break;
      }
    }

    // Special character validation
    if (!/^[a-zA-Z0-9_\-\s]+$/.test(displayName)) {
      errors.push('Display name can only contain letters, numbers, spaces, hyphens, and underscores');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: this.sanitizeUserInput(displayName, 50)
    };
  }

  static validateGameInput(gameData: any): ValidationResult {
    const errors: string[] = [];

    // Validate dice values
    if (gameData.diceValues && Array.isArray(gameData.diceValues)) {
      if (gameData.diceValues.length > 6) {
        errors.push('Invalid number of dice');
      }

      for (const value of gameData.diceValues) {
        if (!Number.isInteger(value) || value < 1 || value > 6) {
          errors.push('Invalid dice value detected');
        }
      }
    }

    // Validate score
    if (gameData.roundScore !== undefined) {
      if (!Number.isInteger(gameData.roundScore) || gameData.roundScore < 0) {
        errors.push('Invalid score value');
      }

      // Check for impossible scores
      if (gameData.roundScore > 6000) {
        errors.push('Score exceeds maximum possible value');
        this.logSecurityEvent('CHEATING_ATTEMPT', { gameData });
      }
    }

    // Validate game phase
    const validPhases = ['rolling', 'banking', 'ended', 'waiting'];
    if (gameData.gamePhase && !validPhases.includes(gameData.gamePhase)) {
      errors.push('Invalid game phase');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private static logSecurityEvent(event: string, data: any): void {
    // Implement security logging
    console.error(`SECURITY EVENT: ${event}`, {
      timestamp: new Date().toISOString(),
      data,
      stack: new Error().stack
    });
  }
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedValue?: string;
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}
```

### Data Encryption

#### Client-Side Encryption for Sensitive Data
```typescript
// Encryption Service for sensitive data
export class EncryptionService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;

  static async generateKey(): Promise<CryptoKey> {
    return await window.crypto.subtle.generateKey(
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  static async encryptSensitiveData(
    data: string, 
    key: CryptoKey
  ): Promise<EncryptedData> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: this.ALGORITHM,
        iv: iv,
      },
      key,
      dataBuffer
    );

    return {
      encryptedData: Array.from(new Uint8Array(encryptedBuffer)),
      iv: Array.from(iv),
      algorithm: this.ALGORITHM
    };
  }

  static async decryptSensitiveData(
    encryptedData: EncryptedData,
    key: CryptoKey
  ): Promise<string> {
    const encryptedBuffer = new Uint8Array(encryptedData.encryptedData);
    const iv = new Uint8Array(encryptedData.iv);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: this.ALGORITHM,
        iv: iv,
      },
      key,
      encryptedBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  }

  // Hash passwords and sensitive data
  static async hashData(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

interface EncryptedData {
  encryptedData: number[];
  iv: number[];
  algorithm: string;
}
```

---

## Infrastructure Security

### Environment Configuration

#### Secure Environment Setup
```typescript
// Secure configuration management
export class ConfigService {
  private static config: SecureConfig | null = null;

  static getConfig(): SecureConfig {
    if (!this.config) {
      this.config = this.loadSecureConfig();
    }
    return this.config;
  }

  private static loadSecureConfig(): SecureConfig {
    // Validate all required environment variables
    const requiredVars = [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'FIREBASE_PRIVATE_KEY',
      'FIREBASE_CLIENT_EMAIL',
      'ENCRYPTION_KEY',
      'SESSION_SECRET'
    ];

    const missing = requiredVars.filter(key => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    return {
      firebase: {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      },
      security: {
        encryptionKey: process.env.ENCRYPTION_KEY!,
        sessionSecret: process.env.SESSION_SECRET!,
        rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
        maxAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
      },
      app: {
        environment: process.env.NODE_ENV || 'development',
        logLevel: process.env.LOG_LEVEL || 'info',
        corsOrigin: process.env.CORS_ORIGIN || 'https://dashdice.com',
      }
    };
  }
}

interface SecureConfig {
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    privateKey: string;
    clientEmail: string;
  };
  security: {
    encryptionKey: string;
    sessionSecret: string;
    rateLimitWindow: number;
    maxAttempts: number;
  };
  app: {
    environment: string;
    logLevel: string;
    corsOrigin: string;
  };
}
```

#### Security Headers Implementation
```typescript
// Next.js Security Headers Configuration
// next.config.ts
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https://firebasestorage.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://*.googleapis.com https://*.firebase.com wss://*.firebase.com",
      "media-src 'self' https://firebasestorage.googleapis.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ].join('; ')
  }
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  
  // Additional security configurations
  poweredByHeader: false,
  generateEtags: false,
  
  experimental: {
    serverComponentsExternalPackages: ['firebase-admin'],
  },
};
```

---

## Code Quality & Architecture

### Eliminating Code Duplication

#### Centralized Component System
```typescript
// src/components/common/BaseComponents.tsx
// Consolidated base components to eliminate duplication

interface BaseButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export const BaseButton: React.FC<BaseButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  className = ''
}) => {
  const baseClasses = 'font-bold rounded-xl transition-all transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
  };
  
  const sizeClasses = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl'
  };

  const disabledClasses = disabled || loading ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <button
      type={type}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      aria-disabled={disabled || loading}
    >
      {loading ? (
        <div className="flex items-center justify-center">
          <LoadingSpinner size="sm" />
          <span className="ml-2">{children}</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
};

// Centralized loading spinner
interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div
      className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

// Centralized error boundary
interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => {
  useEffect(() => {
    // Log error to monitoring service
    console.error('Error boundary caught error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div className="mt-3 text-center">
          <h3 className="text-lg font-medium text-gray-900">Something went wrong</h3>
          <div className="mt-2 text-sm text-gray-500">
            <p>We apologize for the inconvenience. Please try again.</p>
          </div>
          <div className="mt-4">
            <BaseButton onClick={resetError} variant="primary">
              Try again
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  );
};
```

#### Unified Service Layer Architecture
```typescript
// src/services/base/BaseService.ts
// Consolidated service patterns to eliminate duplication

export abstract class BaseService {
  protected static async handleServiceCall<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.logError(error, context);
      throw this.transformError(error, context);
    }
  }

  protected static logError(error: any, context: string): void {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      context,
      message: error.message,
      stack: error.stack,
      userId: this.getCurrentUserId(),
    };

    console.error('Service Error:', errorInfo);
    
    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(errorInfo);
    }
  }

  protected static transformError(error: any, context: string): ServiceError {
    if (error.code === 'permission-denied') {
      return new ServiceError('Access denied', 'PERMISSION_DENIED', context);
    }
    
    if (error.code === 'not-found') {
      return new ServiceError('Resource not found', 'NOT_FOUND', context);
    }
    
    if (error.code === 'network-request-failed') {
      return new ServiceError('Network error', 'NETWORK_ERROR', context);
    }
    
    return new ServiceError('Service error', 'UNKNOWN_ERROR', context);
  }

  protected static getCurrentUserId(): string | null {
    // Get current user ID from auth context
    return null; // Implementation depends on auth context
  }

  protected static async sendToMonitoring(errorInfo: any): Promise<void> {
    // Implement monitoring service integration
  }

  protected static async validateInput<T>(
    input: T,
    validator: (input: T) => ValidationResult
  ): Promise<T> {
    const result = validator(input);
    if (!result.isValid) {
      throw new ServiceError(
        `Validation failed: ${result.errors.join(', ')}`,
        'VALIDATION_ERROR',
        'input_validation'
      );
    }
    return input;
  }

  protected static async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
    
    throw lastError!;
  }
}

class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public context: string
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

// Enhanced UserService using base patterns
export class UserService extends BaseService {
  static async getUserProfile(uid: string): Promise<UserProfile | null> {
    return this.handleServiceCall(async () => {
      await this.validateInput(uid, (id) => ({
        isValid: typeof id === 'string' && id.length > 0,
        errors: typeof id !== 'string' || id.length === 0 ? ['Invalid user ID'] : []
      }));

      return this.retryOperation(async () => {
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          return { uid, ...docSnap.data() } as UserProfile;
        }
        return null;
      });
    }, 'getUserProfile');
  }

  static async updateUserProfile(
    uid: string, 
    data: Partial<UserProfile>
  ): Promise<void> {
    return this.handleServiceCall(async () => {
      await this.validateInput(data, this.validateProfileData);
      
      const sanitizedData = this.sanitizeProfileData(data);
      
      const docRef = doc(db, 'users', uid);
      await updateDoc(docRef, {
        ...sanitizedData,
        updatedAt: serverTimestamp()
      });
    }, 'updateUserProfile');
  }

  private static validateProfileData(data: Partial<UserProfile>): ValidationResult {
    const errors: string[] = [];
    
    if (data.displayName !== undefined) {
      const nameValidation = InputValidationService.validateDisplayName(data.displayName);
      if (!nameValidation.isValid) {
        errors.push(...nameValidation.errors);
      }
    }
    
    if (data.email !== undefined) {
      if (!this.isValidEmail(data.email)) {
        errors.push('Invalid email format');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  private static sanitizeProfileData(data: Partial<UserProfile>): Partial<UserProfile> {
    const sanitized = { ...data };
    
    if (sanitized.displayName) {
      sanitized.displayName = InputValidationService.sanitizeUserInput(sanitized.displayName, 50);
    }
    
    // Remove any potentially dangerous fields
    delete (sanitized as any).isAdmin;
    delete (sanitized as any).permissions;
    
    return sanitized;
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
```

### Clean Architecture Implementation

#### Feature-Based Organization
```typescript
// src/features/auth/index.ts
// Organize code by features rather than technical layers

export { AuthProvider, useAuth } from './context/AuthContext';
export { LoginForm, RegisterForm } from './components';
export { AuthService } from './services/AuthService';
export { useAuthValidation } from './hooks/useAuthValidation';
export type { AuthUser, AuthState } from './types';

// src/features/game/index.ts
export { GameProvider, useGame } from './context/GameContext';
export { GameBoard, DiceInterface } from './components';
export { GameService } from './services/GameService';
export { useGameLogic } from './hooks/useGameLogic';
export type { GameState, GameAction } from './types';

// src/features/inventory/index.ts
export { InventoryProvider, useInventory } from './context/InventoryContext';
export { InventoryGrid, BackgroundSelector } from './components';
export { InventoryService } from './services/InventoryService';
export { useInventoryManagement } from './hooks/useInventoryManagement';
export type { InventoryItem, InventoryState } from './types';
```

---

## Performance Security

### Query Optimization & Rate Limiting

#### Optimized Firebase Queries with Security
```typescript
// src/services/optimized/OptimizedFirebaseService.ts
export class OptimizedFirebaseService extends BaseService {
  private static queryCache = new Map<string, CachedQuery>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  static async getOptimizedUserData(uid: string): Promise<UserProfile | null> {
    const cacheKey = `user:${uid}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached.data;
    }

    return this.handleServiceCall(async () => {
      // Use the most efficient query possible
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        return null;
      }

      const userData = { uid, ...userSnap.data() } as UserProfile;
      
      // Cache the result
      this.setCache(cacheKey, userData);
      
      return userData;
    }, 'getOptimizedUserData');
  }

  static async getActiveMatchesOptimized(userId: string): Promise<Match[]> {
    return this.handleServiceCall(async () => {
      // Optimized query with proper indexing
      const q = query(
        collection(db, 'activeMatches'),
        where(`players.${userId}`, '!=', null),
        orderBy('createdAt', 'desc'),
        limit(10) // Limit results to prevent large data transfers
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
    }, 'getActiveMatchesOptimized');
  }

  static async batchUserOperations(operations: BatchOperation[]): Promise<void> {
    return this.handleServiceCall(async () => {
      // Use batch operations for better performance
      const batch = writeBatch(db);
      
      for (const operation of operations) {
        switch (operation.type) {
          case 'update':
            batch.update(operation.ref, operation.data);
            break;
          case 'set':
            batch.set(operation.ref, operation.data);
            break;
          case 'delete':
            batch.delete(operation.ref);
            break;
        }
      }
      
      await batch.commit();
    }, 'batchUserOperations');
  }

  private static getFromCache(key: string): CachedQuery | null {
    const cached = this.queryCache.get(key);
    if (!cached || Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.queryCache.delete(key);
      return null;
    }
    return cached;
  }

  private static setCache(key: string, data: any): void {
    this.queryCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}

interface CachedQuery {
  data: any;
  timestamp: number;
}

interface BatchOperation {
  type: 'update' | 'set' | 'delete';
  ref: DocumentReference;
  data?: any;
}
```

#### Rate Limiting Middleware
```typescript
// src/middleware/rateLimiting.ts
export class RateLimitingService {
  private static attempts = new Map<string, AttemptRecord>();
  private static readonly CLEANUP_INTERVAL = 60000; // 1 minute

  static {
    // Periodic cleanup of expired records
    setInterval(() => {
      this.cleanupExpiredAttempts();
    }, this.CLEANUP_INTERVAL);
  }

  static async checkRateLimit(
    identifier: string,
    action: string,
    maxAttempts: number = 5,
    windowMs: number = 900000 // 15 minutes
  ): Promise<RateLimitResult> {
    const key = `${action}:${identifier}`;
    const now = Date.now();
    const window = now - windowMs;

    let record = this.attempts.get(key);
    
    if (!record) {
      record = { attempts: [], firstAttempt: now };
      this.attempts.set(key, record);
    }

    // Remove attempts outside the window
    record.attempts = record.attempts.filter(timestamp => timestamp > window);

    if (record.attempts.length >= maxAttempts) {
      const oldestAttempt = Math.min(...record.attempts);
      const resetTime = oldestAttempt + windowMs;
      
      this.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
        identifier,
        action,
        attempts: record.attempts.length,
        resetTime: new Date(resetTime).toISOString()
      });

      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter: resetTime - now
      };
    }

    // Add current attempt
    record.attempts.push(now);

    return {
      allowed: true,
      remaining: maxAttempts - record.attempts.length,
      resetTime: record.firstAttempt + windowMs,
      retryAfter: 0
    };
  }

  private static cleanupExpiredAttempts(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, record] of this.attempts.entries()) {
      // Clean up records older than 1 hour
      if (now - record.firstAttempt > 3600000) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.attempts.delete(key));
  }

  private static logSecurityEvent(event: string, data: any): void {
    console.warn(`SECURITY: ${event}`, {
      timestamp: new Date().toISOString(),
      ...data
    });
  }
}

interface AttemptRecord {
  attempts: number[];
  firstAttempt: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter: number;
}
```

---

## Vulnerability Prevention

### Common Attack Vectors

#### CSRF Protection
```typescript
// src/middleware/csrfProtection.ts
export class CSRFProtectionService {
  private static readonly TOKEN_HEADER = 'X-CSRF-Token';
  private static readonly TOKEN_COOKIE = 'csrf-token';
  private static tokens = new Set<string>();

  static generateCSRFToken(): string {
    const token = crypto.randomUUID();
    this.tokens.add(token);
    
    // Token expires after 1 hour
    setTimeout(() => {
      this.tokens.delete(token);
    }, 3600000);
    
    return token;
  }

  static validateCSRFToken(token: string): boolean {
    if (!token || !this.tokens.has(token)) {
      this.logSecurityEvent('CSRF_VALIDATION_FAILED', { token });
      return false;
    }
    
    // One-time use token
    this.tokens.delete(token);
    return true;
  }

  static getCSRFMiddleware() {
    return (req: any, res: any, next: any) => {
      if (req.method === 'GET') {
        // Generate and set CSRF token for GET requests
        const token = this.generateCSRFToken();
        res.cookie(this.TOKEN_COOKIE, token, {
          httpOnly: false, // Needs to be accessible to JavaScript
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        });
        next();
        return;
      }

      // Validate CSRF token for state-changing requests
      const token = req.headers[this.TOKEN_HEADER.toLowerCase()] || 
                   req.body.csrfToken;
      
      if (!this.validateCSRFToken(token)) {
        res.status(403).json({ error: 'Invalid CSRF token' });
        return;
      }
      
      next();
    };
  }

  private static logSecurityEvent(event: string, data: any): void {
    console.warn(`CSRF: ${event}`, {
      timestamp: new Date().toISOString(),
      ...data
    });
  }
}
```

#### Session Security
```typescript
// src/services/sessionSecurity.ts
export class SessionSecurityService {
  private static sessions = new Map<string, SecureSession>();
  private static readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private static readonly MAX_SESSIONS_PER_USER = 5;

  static async createSecureSession(user: User): Promise<string> {
    const sessionId = crypto.randomUUID();
    const now = new Date();
    
    const session: SecureSession = {
      id: sessionId,
      userId: user.uid,
      createdAt: now,
      lastActivity: now,
      expiresAt: new Date(now.getTime() + this.SESSION_TIMEOUT),
      ipAddress: await this.getClientIP(),
      userAgent: this.sanitizeUserAgent(navigator.userAgent),
      isActive: true
    };

    // Enforce session limits per user
    await this.enforceSessionLimits(user.uid);
    
    this.sessions.set(sessionId, session);
    
    // Auto-cleanup expired session
    setTimeout(() => {
      this.cleanupSession(sessionId);
    }, this.SESSION_TIMEOUT);

    this.logSecurityEvent('SESSION_CREATED', {
      userId: user.uid,
      sessionId,
      ipAddress: session.ipAddress
    });

    return sessionId;
  }

  static async validateSession(sessionId: string): Promise<SecureSession | null> {
    const session = this.sessions.get(sessionId);
    
    if (!session || !session.isActive) {
      return null;
    }

    const now = new Date();
    
    if (now > session.expiresAt) {
      this.cleanupSession(sessionId);
      return null;
    }

    // Update last activity
    session.lastActivity = now;
    session.expiresAt = new Date(now.getTime() + this.SESSION_TIMEOUT);

    return session;
  }

  static async invalidateSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (session) {
      session.isActive = false;
      this.logSecurityEvent('SESSION_INVALIDATED', {
        userId: session.userId,
        sessionId
      });
    }
    
    this.sessions.delete(sessionId);
  }

  static async invalidateAllUserSessions(userId: string): Promise<void> {
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        await this.invalidateSession(sessionId);
      }
    }
  }

  private static async enforceSessionLimits(userId: string): Promise<void> {
    const userSessions = Array.from(this.sessions.entries())
      .filter(([_, session]) => session.userId === userId && session.isActive)
      .sort(([_, a], [__, b]) => a.lastActivity.getTime() - b.lastActivity.getTime());

    // Remove oldest sessions if limit exceeded
    if (userSessions.length >= this.MAX_SESSIONS_PER_USER) {
      const sessionsToRemove = userSessions.slice(0, userSessions.length - this.MAX_SESSIONS_PER_USER + 1);
      
      for (const [sessionId] of sessionsToRemove) {
        await this.invalidateSession(sessionId);
      }
    }
  }

  private static cleanupSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  private static async getClientIP(): Promise<string> {
    // In production, this would get the real client IP
    return '127.0.0.1';
  }

  private static sanitizeUserAgent(userAgent: string): string {
    return userAgent.substring(0, 200); // Limit length
  }

  private static logSecurityEvent(event: string, data: any): void {
    console.info(`SESSION: ${event}`, {
      timestamp: new Date().toISOString(),
      ...data
    });
  }
}

interface SecureSession {
  id: string;
  userId: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
}
```

---

## Monitoring & Incident Response

### Security Monitoring System

#### Real-time Threat Detection
```typescript
// src/services/securityMonitoring.ts
export class SecurityMonitoringService {
  private static anomalyDetector = new AnomalyDetector();
  private static alertThresholds = {
    failedLogins: 10,
    suspiciousActivity: 5,
    dataAccess: 100,
    rateLimit: 3
  };

  static async logSecurityEvent(event: SecurityEvent): Promise<void> {
    const enrichedEvent = await this.enrichEvent(event);
    
    // Store in security log
    await this.storeSecurityEvent(enrichedEvent);
    
    // Real-time threat detection
    await this.analyzeForThreats(enrichedEvent);
    
    // Alert if critical
    if (this.isCriticalEvent(enrichedEvent)) {
      await this.sendSecurityAlert(enrichedEvent);
    }
  }

  private static async enrichEvent(event: SecurityEvent): Promise<EnrichedSecurityEvent> {
    return {
      ...event,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      ipAddress: await this.getClientIP(),
      sessionId: this.getCurrentSessionId(),
      eventId: crypto.randomUUID(),
      severity: this.calculateSeverity(event),
      context: await this.getEventContext(event)
    };
  }

  private static async analyzeForThreats(event: EnrichedSecurityEvent): Promise<void> {
    // Check for patterns indicating attacks
    const recentEvents = await this.getRecentEvents(event.userId, 300000); // 5 minutes
    
    // Brute force detection
    if (event.type === 'AUTHENTICATION_FAILED') {
      const failedAttempts = recentEvents.filter(e => e.type === 'AUTHENTICATION_FAILED').length;
      if (failedAttempts >= this.alertThresholds.failedLogins) {
        await this.triggerAlert('BRUTE_FORCE_ATTACK', event);
      }
    }

    // Suspicious activity detection
    if (this.anomalyDetector.isAnomalous(event, recentEvents)) {
      await this.triggerAlert('SUSPICIOUS_ACTIVITY', event);
    }

    // Data access pattern analysis
    if (event.type === 'DATA_ACCESS') {
      const dataAccessCount = recentEvents.filter(e => e.type === 'DATA_ACCESS').length;
      if (dataAccessCount >= this.alertThresholds.dataAccess) {
        await this.triggerAlert('EXCESSIVE_DATA_ACCESS', event);
      }
    }
  }

  private static isCriticalEvent(event: EnrichedSecurityEvent): boolean {
    const criticalTypes = [
      'PRIVILEGE_ESCALATION',
      'DATA_BREACH',
      'SYSTEM_COMPROMISE',
      'MALWARE_DETECTED',
      'UNAUTHORIZED_ACCESS'
    ];
    
    return criticalTypes.includes(event.type) || event.severity === 'CRITICAL';
  }

  private static async sendSecurityAlert(event: EnrichedSecurityEvent): Promise<void> {
    const alert: SecurityAlert = {
      id: crypto.randomUUID(),
      eventId: event.eventId,
      type: event.type,
      severity: event.severity,
      timestamp: event.timestamp,
      message: this.generateAlertMessage(event),
      userId: event.userId,
      ipAddress: event.ipAddress,
      requiredActions: this.getRequiredActions(event)
    };

    // Send to monitoring dashboard
    await this.notifySecurityTeam(alert);
    
    // Auto-response for critical threats
    if (event.severity === 'CRITICAL') {
      await this.executeEmergencyResponse(event);
    }
  }

  private static async executeEmergencyResponse(event: EnrichedSecurityEvent): Promise<void> {
    switch (event.type) {
      case 'BRUTE_FORCE_ATTACK':
        await this.blockIP(event.ipAddress);
        await SessionSecurityService.invalidateAllUserSessions(event.userId);
        break;
        
      case 'SUSPICIOUS_ACTIVITY':
        await this.flagUserForReview(event.userId);
        break;
        
      case 'DATA_BREACH':
        await this.enableSecurityLockdown();
        await this.notifyUsersOfBreach();
        break;
    }
  }

  private static calculateSeverity(event: SecurityEvent): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const severityMap = {
      'AUTHENTICATION_FAILED': 'LOW',
      'RATE_LIMIT_EXCEEDED': 'MEDIUM',
      'XSS_ATTEMPT_DETECTED': 'HIGH',
      'BRUTE_FORCE_ATTACK': 'CRITICAL',
      'DATA_BREACH': 'CRITICAL',
      'PRIVILEGE_ESCALATION': 'CRITICAL'
    };
    
    return severityMap[event.type] || 'MEDIUM';
  }

  private static generateAlertMessage(event: EnrichedSecurityEvent): string {
    const templates = {
      'BRUTE_FORCE_ATTACK': `Brute force attack detected from IP ${event.ipAddress} targeting user ${event.userId}`,
      'XSS_ATTEMPT_DETECTED': `XSS attack attempt detected from user ${event.userId}`,
      'SUSPICIOUS_ACTIVITY': `Suspicious activity pattern detected for user ${event.userId}`,
      'DATA_BREACH': `Potential data breach detected involving user ${event.userId}`
    };
    
    return templates[event.type] || `Security event: ${event.type}`;
  }

  private static getRequiredActions(event: EnrichedSecurityEvent): string[] {
    const actionMap = {
      'BRUTE_FORCE_ATTACK': ['Block IP address', 'Reset user password', 'Notify user'],
      'XSS_ATTEMPT_DETECTED': ['Review user input', 'Update input validation', 'Monitor user activity'],
      'SUSPICIOUS_ACTIVITY': ['Flag user for review', 'Monitor closely', 'Possible account compromise'],
      'DATA_BREACH': ['Enable lockdown mode', 'Notify all users', 'Contact security team']
    };
    
    return actionMap[event.type] || ['Review event', 'Monitor situation'];
  }

  private static async getRecentEvents(userId: string, timeWindowMs: number): Promise<EnrichedSecurityEvent[]> {
    // Implementation would fetch from security log storage
    return [];
  }

  private static async storeSecurityEvent(event: EnrichedSecurityEvent): Promise<void> {
    // Store in dedicated security log collection
    console.log('Security Event Logged:', event);
  }

  private static async notifySecurityTeam(alert: SecurityAlert): Promise<void> {
    // Implementation would send to monitoring system
    console.error('SECURITY ALERT:', alert);
  }

  private static async triggerAlert(alertType: string, event: EnrichedSecurityEvent): Promise<void> {
    console.warn(`SECURITY TRIGGER: ${alertType}`, event);
  }

  private static async blockIP(ipAddress: string): Promise<void> {
    console.warn(`BLOCKING IP: ${ipAddress}`);
  }

  private static async flagUserForReview(userId: string): Promise<void> {
    console.warn(`FLAGGING USER FOR REVIEW: ${userId}`);
  }

  private static async enableSecurityLockdown(): Promise<void> {
    console.error('ENABLING SECURITY LOCKDOWN');
  }

  private static async notifyUsersOfBreach(): Promise<void> {
    console.error('NOTIFYING USERS OF SECURITY BREACH');
  }

  private static async getClientIP(): Promise<string> {
    return '127.0.0.1'; // Implementation would get real IP
  }

  private static getCurrentSessionId(): string | null {
    return null; // Implementation would get current session
  }

  private static async getEventContext(event: SecurityEvent): Promise<any> {
    return {}; // Implementation would gather contextual data
  }
}

// Anomaly detection using simple statistical methods
class AnomalyDetector {
  isAnomalous(event: EnrichedSecurityEvent, recentEvents: EnrichedSecurityEvent[]): boolean {
    // Simple implementation - could be enhanced with ML
    const eventCounts = this.getEventTypeCounts(recentEvents);
    const currentTypeCount = eventCounts[event.type] || 0;
    
    // Flag as anomalous if event type is occurring much more frequently than usual
    const threshold = this.getAnomalyThreshold(event.type);
    return currentTypeCount > threshold;
  }

  private getEventTypeCounts(events: EnrichedSecurityEvent[]): Record<string, number> {
    return events.reduce((counts, event) => {
      counts[event.type] = (counts[event.type] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  }

  private getAnomalyThreshold(eventType: string): number {
    const thresholds = {
      'DATA_ACCESS': 10,
      'AUTHENTICATION_FAILED': 3,
      'RATE_LIMIT_EXCEEDED': 2
    };
    
    return thresholds[eventType] || 5;
  }
}

interface SecurityEvent {
  type: string;
  userId: string;
  data?: any;
}

interface EnrichedSecurityEvent extends SecurityEvent {
  timestamp: string;
  userAgent: string;
  ipAddress: string;
  sessionId: string | null;
  eventId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  context: any;
}

interface SecurityAlert {
  id: string;
  eventId: string;
  type: string;
  severity: string;
  timestamp: string;
  message: string;
  userId: string;
  ipAddress: string;
  requiredActions: string[];
}
```

---

## Implementation Roadmap

### Phase 1: Critical Security Fixes (Week 1-2)

#### Immediate Actions Required 🔴
1. **Remove Service Account Key from Repository**
   ```bash
   # Remove from repository
   git rm serviceAccountKey.json
   git commit -m "Remove service account key from repository"
   
   # Add to .gitignore
   echo "serviceAccountKey.json" >> .gitignore
   ```

2. **Secure Environment Variables**
   ```bash
   # Set up secure environment variables in Vercel
   vercel env add FIREBASE_PRIVATE_KEY
   vercel env add FIREBASE_CLIENT_EMAIL
   vercel env add ENCRYPTION_KEY
   vercel env add SESSION_SECRET
   ```

3. **Implement Input Validation**
   - Deploy `InputValidationService` across all user inputs
   - Add XSS protection to all form submissions
   - Implement SQL injection prevention

4. **Enable Security Headers**
   - Deploy CSP headers
   - Add HSTS and security headers
   - Configure CORS properly

### Phase 2: Authentication Hardening (Week 3-4)

#### Enhanced Auth Security 🟡
1. **Multi-Factor Authentication**
   - Implement phone/email MFA
   - Add backup codes
   - Secure MFA enrollment flow

2. **Session Security**
   - Deploy secure session management
   - Implement session limits
   - Add suspicious login detection

3. **Rate Limiting**
   - Add rate limiting to all endpoints
   - Implement progressive delays
   - Deploy IP-based blocking

### Phase 3: Code Quality & Architecture (Week 5-8)

#### Refactoring & Optimization 🟢
1. **Eliminate Code Duplication**
   - Consolidate base components
   - Unify service patterns
   - Create shared utilities

2. **Performance Optimization**
   - Optimize Firebase queries
   - Implement caching layers
   - Add code splitting

3. **Clean Architecture**
   - Feature-based organization
   - Dependency injection
   - Clear separation of concerns

### Phase 4: Monitoring & Response (Week 9-10)

#### Security Monitoring 🔵
1. **Real-time Threat Detection**
   - Deploy security monitoring
   - Implement anomaly detection
   - Add automated responses

2. **Incident Response**
   - Create incident playbooks
   - Set up alerting systems
   - Implement emergency procedures

---

## Security Checklist

### Pre-Deployment Security Audit ✅

#### Authentication & Authorization
- [ ] Service account key removed from repository
- [ ] Environment variables properly secured
- [ ] Multi-factor authentication implemented
- [ ] Session management secured
- [ ] Rate limiting deployed
- [ ] Password policies enforced
- [ ] Account lockout mechanisms active

#### Data Protection
- [ ] Input validation implemented everywhere
- [ ] XSS protection deployed
- [ ] SQL injection prevention active
- [ ] Data encryption for sensitive fields
- [ ] Secure data transmission (HTTPS)
- [ ] Proper error handling (no information leakage)

#### Infrastructure Security
- [ ] Security headers configured
- [ ] Content Security Policy active
- [ ] CORS properly configured
- [ ] HTTPS enforced
- [ ] Secure cookie settings
- [ ] File upload restrictions

#### Code Quality
- [ ] No hardcoded secrets
- [ ] Code duplication eliminated
- [ ] Security linting rules active
- [ ] Dependency vulnerability scan passed
- [ ] Code review completed
- [ ] Security testing performed

#### Monitoring & Response
- [ ] Security logging implemented
- [ ] Anomaly detection active
- [ ] Incident response plan ready
- [ ] Security metrics monitored
- [ ] Alerting systems configured
- [ ] Backup and recovery tested

### Monthly Security Review

#### Review Items
1. **Dependency Updates**: Check for security updates
2. **Access Review**: Audit user permissions and access
3. **Security Logs**: Review security events and anomalies
4. **Performance**: Monitor for security-related performance impacts
5. **Threat Intelligence**: Update threat detection based on new attacks
6. **Compliance**: Ensure continued compliance with security standards

---

## Conclusion

This comprehensive security guide addresses the critical vulnerabilities and code quality issues in the DashDice application. The implementation of these security measures and architectural improvements will significantly enhance the application's security posture while creating a more maintainable and performant codebase.

### Key Security Improvements:
- 🔐 **Authentication hardening** with MFA and session security
- 🛡️ **Input validation** and XSS/injection prevention
- 📊 **Real-time monitoring** and threat detection
- 🏗️ **Clean architecture** with reduced code duplication
- ⚡ **Performance optimization** with security considerations
- 🚨 **Incident response** and automated security measures

### Immediate Priority Actions:
1. Remove service account key from repository
2. Implement comprehensive input validation
3. Deploy security headers and CSP
4. Add rate limiting and brute force protection
5. Set up security monitoring and alerting

Following this roadmap will transform DashDice into a secure, maintainable, and high-performance gaming platform that can withstand modern security threats while providing an excellent user experience.
