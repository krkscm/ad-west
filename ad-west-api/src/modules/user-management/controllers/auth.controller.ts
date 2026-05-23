import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AdminLoginDto } from '../dto/admin-login.dto';
import { MemberRequestOtpDto } from '../dto/member-request-otp.dto';
import { MemberVerifyOtpDto } from '../dto/member-verify-otp.dto';
import { MfaVerifyDto } from '../dto/mfa-verify.dto';
import { AuthGuard } from '../guards/auth.guard';
import { AuthPrincipal } from '../interfaces/auth-principal.interface';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('admin/login')
  async adminLogin(@Body() dto: AdminLoginDto): Promise<{
    accessToken: string;
    mfaRequired: boolean;
  }> {
    return this.authService.adminLogin(dto);
  }

  @UseGuards(AuthGuard)
  @Post('admin/logout')
  async adminLogout(
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<{ success: boolean }> {
    await this.authService.adminLogout(principal);
    return { success: true };
  }

  @UseGuards(AuthGuard)
  @Post('admin/mfa/enroll')
  async enrollMfa(
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<{ secret: string; otpauthUrl: string }> {
    return this.authService.enrollMfa(principal);
  }

  @UseGuards(AuthGuard)
  @Post('admin/mfa/verify')
  async verifyMfa(
    @CurrentUser() principal: AuthPrincipal,
    @Body() dto: MfaVerifyDto,
  ): Promise<{ enabled: boolean }> {
    return this.authService.verifyAndEnableMfa(principal, dto);
  }

  @Post('member/request-otp')
  async requestMemberOtp(@Body() dto: MemberRequestOtpDto): Promise<{
    requestId: string;
    expiresInSeconds: number;
    debugCode?: string;
  }> {
    return this.authService.requestMemberOtp(dto);
  }

  @Post('member/verify-otp')
  async verifyMemberOtp(
    @Body() dto: MemberVerifyOtpDto,
  ): Promise<{ accessToken: string }> {
    return this.authService.verifyMemberOtp(dto);
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
