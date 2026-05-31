import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { CurrentUser } from '../decorators/current-user.decorator';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { MemberLoginDto } from '../dto/member-login.dto';
import { AuthGuard } from '../guards/auth.guard';
import { AuthPrincipal } from '../interfaces/auth-principal.interface';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Get('captcha')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  captchaChallenge(): {
    captchaToken: string;
    captchaImage: string;
    expiresInSeconds: number;
  } {
    const startedAt = Date.now();
    try {
      const response = this.authService.createCaptchaChallenge();
      const elapsedMs = Date.now() - startedAt;
      if (elapsedMs >= 1000) {
        this.logger.warn(`Slow captcha challenge generation: ${elapsedMs}ms`);
      }
      return response;
    } catch (error) {
      const elapsedMs = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Captcha challenge failed after ${elapsedMs}ms: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
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
  @Throttle({ default: { limit: 10, ttl: 60000 } })
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

  @Post('forgot-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ success: boolean }> {
    await this.authService.forgotPassword(dto.email);
    return { success: true };
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ success: boolean }> {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { success: true };
  }

  @Get('google/start')
  async googleStart(
    @Query('returnOrigin') returnOrigin: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const url = await this.authService.buildGoogleAuthUrl(returnOrigin);
    res.redirect(url);
  }

  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    if (!code || !state) {
      res.status(400).send('Missing OAuth callback parameters.');
      return;
    }

    try {
      const result = await this.authService.completeGoogleAuth(code, state);
      const payload = {
        type: 'adwest-google-auth',
        success: true,
        accessToken: result.accessToken,
        profile: result.profile,
      };

      res.type('html').send(`<!doctype html>
<html>
  <body>
    <script>
      (function() {
        var payload = ${JSON.stringify(payload)};
        var targetOrigin = ${JSON.stringify(result.returnOrigin)};
        if (window.opener) {
          window.opener.postMessage(payload, targetOrigin);
        }
        window.close();
      })();
    </script>
    <p>Sign-in complete. You can close this window.</p>
  </body>
</html>`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google login failed.';
      const payload = {
        type: 'adwest-google-auth',
        success: false,
        error: message,
      };
      const fallbackOrigin = process.env.WEB_APP_ORIGIN || 'http://localhost:3000';
      res.status(401).type('html').send(`<!doctype html>
<html>
  <body>
    <script>
      (function() {
        var payload = ${JSON.stringify(payload)};
        var targetOrigin = ${JSON.stringify(fallbackOrigin)};
        if (window.opener) {
          window.opener.postMessage(payload, targetOrigin);
        }
        window.close();
      })();
    </script>
    <p>${message}</p>
  </body>
</html>`);
    }
  }
}
