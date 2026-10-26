import { HttpException, Injectable, Logger } from '@nestjs/common';
import { Role, User } from '@prisma/client';
import { OrganizationRepository } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.repository';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { UsersService } from '@gitroom/nestjs-libraries/database/prisma/users/users.service';
import { IntegrationRepository } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.repository';
import { AddTeamMemberDto } from '@gitroom/nestjs-libraries/dtos/settings/add.team.member.dto';
import {
  AdminInviteDto,
  AdminMemberRoleDto,
} from '@gitroom/nestjs-libraries/dtos/admin/admin.teams.dto';

/**
 * Instance-wide team administration for super admins: every team, its members,
 * creating teams and inviting people into them, and removing access. Sign-up is
 * normally disabled, so invitations are the only way in.
 */
@Injectable()
export class AdminTeamsService {
  private readonly _logger = new Logger(AdminTeamsService.name);

  constructor(
    private _organizationRepository: OrganizationRepository,
    private _organizationService: OrganizationService,
    private _usersService: UsersService,
    private _integrationRepository: IntegrationRepository
  ) {}

  async list() {
    const teams = await this._organizationRepository.listAllTeams();
    return teams.map((team) => ({
      id: team.id,
      name: team.name,
      createdAt: team.createdAt,
      channels: team._count.Integration,
      members: team.users.map((m) => ({
        id: m.user.id,
        email: m.user.email,
        name: m.user.name,
        role: m.role,
        disabled: m.disabled,
        superAdmin: m.user.isSuperAdmin,
        lastOnline: m.user.lastOnline,
      })),
    }));
  }

  async create(admin: User, name: string) {
    const team = await this._organizationRepository.createTeamForUser(
      name.trim(),
      admin.id
    );
    this._logger.log(`Super admin ${admin.id} created team ${team.id}`);
    return team;
  }

  private async team(orgId: string) {
    const org = await this._organizationRepository.getOrgByIdWithSubscription(
      orgId
    );
    if (!org || org.deletedAt) {
      throw new HttpException('Team not found', 404);
    }
    return org;
  }

  /** Invitation link for a new or existing person; also emailed when asked. */
  async invite(admin: User, orgId: string, body: AdminInviteDto) {
    const org = await this.team(orgId);
    const invite: AddTeamMemberDto = {
      email: body.email,
      role: body.role,
      sendEmail: !!body.sendEmail,
    };
    return this._organizationService.inviteTeamMember(org, admin, invite);
  }

  async setRole(admin: User, orgId: string, userId: string, body: AdminMemberRoleDto) {
    await this.team(orgId);
    const member = await this._organizationRepository.getMembership(orgId, userId);
    if (!member) {
      throw new HttpException('Not a member of this team', 404);
    }
    if (
      member.role === Role.SUPERADMIN &&
      body.role !== Role.SUPERADMIN &&
      (await this._organizationRepository.countOwners(orgId)) <= 1
    ) {
      throw new HttpException('A team needs at least one owner', 400);
    }
    await this._organizationRepository.setMemberRole(orgId, userId, body.role as Role);
    this._logger.log(`Super admin ${admin.id} set ${userId} to ${body.role} in ${orgId}`);
    return { ok: true };
  }

  async removeMember(admin: User, orgId: string, userId: string) {
    await this.team(orgId);
    const member = await this._organizationRepository.getMembership(orgId, userId);
    if (!member) {
      throw new HttpException('Not a member of this team', 404);
    }
    if (
      member.role === Role.SUPERADMIN &&
      (await this._organizationRepository.countOwners(orgId)) <= 1
    ) {
      throw new HttpException(
        'This is the only owner. Make someone else owner first, or delete the team.',
        400
      );
    }
    await this._organizationRepository.deleteTeamMember(orgId, userId);
    this._logger.log(`Super admin ${admin.id} removed ${userId} from ${orgId}`);
    return { ok: true };
  }

  /** Deletes a person's account. Teams they solely own are deleted with their channels. */
  async deleteUser(admin: User, userId: string) {
    if (userId === admin.id) {
      throw new HttpException('You cannot delete your own account here', 400);
    }
    const target = await this._usersService.getUserById(userId);
    if (!target) {
      throw new HttpException('User not found', 404);
    }
    if (target.isSuperAdmin) {
      throw new HttpException('Remove super admin rights before deleting this account', 400);
    }
    await this._usersService.deleteAccount(userId);
    this._logger.log(`Super admin ${admin.id} deleted user ${userId}`);
    return { ok: true };
  }

  /** Soft-deletes a team and disconnects its channels; members keep their other teams. */
  async deleteTeam(admin: User, orgId: string, currentOrgId: string) {
    if (orgId === currentOrgId) {
      throw new HttpException('Switch to another team before deleting this one', 400);
    }
    await this.team(orgId);
    await this._integrationRepository.deleteIntegrationsForAccount(orgId);
    await this._organizationRepository.deleteOrganization(orgId);
    this._logger.log(`Super admin ${admin.id} deleted team ${orgId}`);
    return { ok: true };
  }
}
