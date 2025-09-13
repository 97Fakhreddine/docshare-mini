import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../../core/decorators/public.decorator';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { AuthService } from '../services/auth.service';
import { LoginDto, MeDto, RegisterDto, TokenDto } from 'src/core/dtos/dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register (name, email, password)' })
  @ApiCreatedResponse({ type: TokenDto })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(
      dto.name.trim(),
      dto.email.toLowerCase().trim(),
      dto.password,
    );
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login (email, password)' })
  @ApiOkResponse({ type: TokenDto })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email.toLowerCase().trim(), dto.password);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get current user (JWT guard)' })
  @ApiOkResponse({ type: MeDto })
  me(@CurrentUser() user: { userId: string }) {
    return this.auth.me(user.userId);
  }

  @Public() // this route validates the token itself (no guard)
  @Get('current')
  @ApiOperation({
    summary: 'Get current user from Authorization header (no guard)',
  })
  @ApiOkResponse({ type: MeDto })
  current(@Headers('authorization') authHeader?: string) {
    return this.auth.currentFromBearer(authHeader);
  }
}
