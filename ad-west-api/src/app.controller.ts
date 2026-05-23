import { Controller, Get } from '@nestjs/common';

interface ApiResponse {
  success: boolean;
  name: string;
  description: string;
  version: string;
}

@Controller()
export class AppController {
  @Get('api')
  getApi(): ApiResponse {
    return {
      success: true,
      name: 'AD West API',
      description: 'REST API for AD West Application',
      version: '1.0.0',
    };
  }
}
