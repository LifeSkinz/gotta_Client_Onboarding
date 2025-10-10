import { createClient } from '@supabase/supabase-js';
import { sign, verify } from 'jsonwebtoken';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export class SecurityService {
  private readonly encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';

  constructor(
    private supabase: any,
    private jwtSecret: string,
    encryptionKey?: string
  ) {
    // Generate or use provided encryption key
    this.encryptionKey = encryptionKey 
      ? Buffer.from(encryptionKey, 'base64')
      : randomBytes(32);
  }

  async validateSession(token: string): Promise<boolean> {
    try {
      const decoded = verify(token, this.jwtSecret) as any;
      
      // Check if session exists and is valid
      const { data, error } = await this.supabase
        .from('sessions')
        .select('id, status')
        .eq('id', decoded.sessionId)
        .single();

      if (error || !data) {
        return false;
      }

      return ['scheduled', 'in_progress'].includes(data.status);
    } catch {
      return false;
    }
  }

  generateSessionToken(sessionId: string, userId: string): string {
    return sign(
      {
        sessionId,
        userId,
        timestamp: Date.now()
      },
      this.jwtSecret,
      { expiresIn: '4h' }
    );
  }

  encryptData(data: any): { encrypted: string; iv: string } {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.encryptionKey, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(data)),
      cipher.final()
    ]);

    return {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64')
    };
  }

  decryptData(encrypted: string, iv: string): any {
    const decipher = createDecipheriv(
      this.algorithm,
      this.encryptionKey,
      Buffer.from(iv, 'base64')
    );

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64')),
      decipher.final()
    ]);

    return JSON.parse(decrypted.toString());
  }

  async validateRequest(req: Request): Promise<boolean> {
    const token = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) return false;

    try {
      // Verify JWT token
      const decoded = verify(token, this.jwtSecret) as any;
      
      // Check rate limiting
      const rateLimitKey = `ratelimit:${decoded.userId}:${new Date().getMinutes()}`;
      const { count } = await this.supabase.rpc('increment_rate_limit', {
        key: rateLimitKey,
        limit: 100
      });

      return count <= 100;
    } catch {
      return false;
    }
  }

  hashSensitiveData(data: string): string {
    // Implementation using a secure hashing algorithm
    return require('crypto')
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }
}