import { Controller, Get } from '@nestjs/common';
import { HealthService } from '../services/health.service';

interface HealthResponse {
  success: boolean;
  message: string;
  version: string;
  timestamp: string;
}

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth(): HealthResponse {
    return this.healthService.getHealth();
  }
}
