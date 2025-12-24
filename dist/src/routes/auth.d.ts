import { Request, Response, NextFunction } from 'express';
export declare const authRoutes: import("express-serve-static-core").Router;
export interface AuthenticatedRequest extends Request {
    authUser?: {
        uid: string;
        email?: string;
        provider: 'firebase' | 'local';
        claims?: Record<string, unknown>;
    };
}
export declare const requireAuth: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const optionalAuth: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auth.d.ts.map