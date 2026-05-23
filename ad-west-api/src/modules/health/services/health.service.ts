import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  getHealth() {
    return {
      success: true,
      message: 'API is running',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
