import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { HealthResponse, HealthService } from '../services/health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealth(): Promise<HealthResponse> {
    const response = await this.healthService.getHealth();
    if (!response.success) {
      throw new HttpException(response, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return response;
  }
}
