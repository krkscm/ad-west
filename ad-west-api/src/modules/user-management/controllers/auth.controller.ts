import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../decorators/current-user.decorator';
import { MemberLoginDto } from '../dto/member-login.dto';
import { AuthGuard } from '../guards/auth.guard';
import { AuthPrincipal } from '../interfaces/auth-principal.interface';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('captcha')
  captchaChallenge(): {
    captchaToken: string;
    captchaImage: string;
    expiresInSeconds: number;
  } {
    return this.authService.createCaptchaChallenge();
  }

  @Post('login')
  async login(
    @Body() dto: { identifier: string; password: string; captchaToken: string; captchaAnswer: string },
  ): Promise<{ accessToken: string }> {
    return this.authService.login(dto.identifier, dto.password, dto.captchaToken, dto.captchaAnswer);
  }

  @UseGuards(AuthGuard)
  @Post('admin/logout')
  async adminLogout(
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<{ success: boolean }> {
    await this.authService.adminLogout(principal);
    return { success: true };
  }

  @Post('member/login')
  async memberLogin(@Body() dto: MemberLoginDto): Promise<{ accessToken: string }> {
    return this.authService.memberLogin(dto);
  }

  @Get('bootstrap-admin')
  bootstrapAdmin(): { email: string; password: string; roles: string[] } {
    const bootstrap = this.authService.getBootstrapAdmin();
    return {
      ...bootstrap,
      roles: bootstrap.roles,
    };
  }
}
