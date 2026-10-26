import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { Organization, User } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { AdminTeamsService } from '@gitroom/nestjs-libraries/database/prisma/admin-teams/admin-teams.service';
import {
  AdminCreateTeamDto,
  AdminInviteDto,
  AdminMemberRoleDto,
} from '@gitroom/nestjs-libraries/dtos/admin/admin.teams.dto';
import { ApiTags } from '@nestjs/swagger';
import { ErrorsService } from '@gitroom/nestjs-libraries/database/prisma/errors/errors.service';
import { AdminStatsService } from '@gitroom/nestjs-libraries/database/prisma/admin-stats/admin-stats.service';
import dayjs from 'dayjs';

@ApiTags('Admin')
@Controller('/admin')
export class AdminController {
  constructor(
    private _errorsService: ErrorsService,
    private _adminStatsService: AdminStatsService,
    private _adminTeamsService: AdminTeamsService
  ) {}

  private assertSuperAdmin(user: User) {
    if (!user?.isSuperAdmin) {
      throw new HttpException('Unauthorized', 400);
    }
  }

  @Get('/errors')
  async listErrors(
    @GetUserFromRequest() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('platform') platform?: string,
    @Query('email') email?: string,
    @Query('unknownFirst') unknownFirst?: string
  ) {
    this.assertSuperAdmin(user);
    return this._errorsService.listErrors({
      page: page ? parseInt(page, 10) : 0,
      limit: limit ? parseInt(limit, 10) : 20,
      platform: platform || undefined,
      email: email || undefined,
      unknownFirst: unknownFirst === 'true' || unknownFirst === '1',
    });
  }

  @Get('/errors/platforms')
  async listPlatforms(@GetUserFromRequest() user: User) {
    this.assertSuperAdmin(user);
    return this._errorsService.listPlatforms();
  }

  @Get('/stats')
  async getStats(
    @GetUserFromRequest() user: User,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('unknownOnly') unknownOnly?: string
  ) {
    this.assertSuperAdmin(user);

    const fromDate = from ? dayjs(from) : dayjs().subtract(30, 'day');
    const toDate = to ? dayjs(to) : dayjs();

    return this._adminStatsService.getStats({
      from: fromDate.startOf('day').toDate(),
      to: toDate.endOf('day').toDate(),
      unknownOnly: unknownOnly === 'true' || unknownOnly === '1',
    });
  }

  @Get('/teams')
  async listTeams(@GetUserFromRequest() user: User) {
    this.assertSuperAdmin(user);
    return this._adminTeamsService.list();
  }

  @Post('/teams')
  async createTeam(
    @GetUserFromRequest() user: User,
    @Body() body: AdminCreateTeamDto
  ) {
    this.assertSuperAdmin(user);
    return this._adminTeamsService.create(user, body.name);
  }

  @Post('/teams/:orgId/invite')
  async invite(
    @GetUserFromRequest() user: User,
    @Param('orgId') orgId: string,
    @Body() body: AdminInviteDto
  ) {
    this.assertSuperAdmin(user);
    return this._adminTeamsService.invite(user, orgId, body);
  }

  @Put('/teams/:orgId/members/:userId')
  async setRole(
    @GetUserFromRequest() user: User,
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @Body() body: AdminMemberRoleDto
  ) {
    this.assertSuperAdmin(user);
    return this._adminTeamsService.setRole(user, orgId, userId, body);
  }

  @Delete('/teams/:orgId/members/:userId')
  async removeMember(
    @GetUserFromRequest() user: User,
    @Param('orgId') orgId: string,
    @Param('userId') userId: string
  ) {
    this.assertSuperAdmin(user);
    return this._adminTeamsService.removeMember(user, orgId, userId);
  }

  @Delete('/teams/:orgId')
  async deleteTeam(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() org: Organization,
    @Param('orgId') orgId: string
  ) {
    this.assertSuperAdmin(user);
    return this._adminTeamsService.deleteTeam(user, orgId, org?.id);
  }

  @Delete('/users/:userId')
  async deleteUser(
    @GetUserFromRequest() user: User,
    @Param('userId') userId: string
  ) {
    this.assertSuperAdmin(user);
    return this._adminTeamsService.deleteUser(user, userId);
  }
}
