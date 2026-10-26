'use client';

import React, { FC, useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import copy from 'copy-to-clipboard';
import { Button } from '@gitroom/react/form/button';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

type Role = 'SUPERADMIN' | 'ADMIN' | 'USER';
type Member = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  disabled: boolean;
  superAdmin: boolean;
  lastOnline: string;
};
type Team = {
  id: string;
  name: string;
  createdAt: string;
  channels: number;
  members: Member[];
};

const roleLabel: Record<Role, string> = {
  SUPERADMIN: 'Owner',
  ADMIN: 'Admin',
  USER: 'User',
};

const field =
  'h-[40px] w-full rounded-[8px] border border-newTableBorder bg-newBgColorInner px-[12px] text-[14px] outline-none focus:border-btnPrimary';

const message = async (response: Response, fallback: string) => {
  const body = await response.json().catch(() => ({} as any));
  const text = Array.isArray(body?.message) ? body.message[0] : body?.message;
  return text || fallback;
};

const InviteForm: FC<{ team: Team; onDone: () => void }> = ({ team, onDone }) => {
  const fetch = useFetch();
  const toast = useToaster();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'USER' | 'ADMIN'>('USER');
  const [sendEmail, setSendEmail] = useState(true);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState('');

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setBusy(true);
      const response = await fetch(`/admin/teams/${team.id}/invite`, {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), role, sendEmail }),
      });
      setBusy(false);
      if (!response.ok) {
        toast.show(await message(response, 'Could not create the invitation'), 'warning');
        return;
      }
      const { url } = await response.json();
      setLink(url);
      copy(url);
      toast.show(sendEmail ? 'Invitation emailed, link copied' : 'Invitation link copied');
      onDone();
    },
    [email, role, sendEmail, team.id]
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-[12px] p-[16px] pt-0 min-w-[340px]">
      <div className="text-[13px] text-textItemBlur">
        Joins <strong className="text-textColor">{team.name}</strong>. The link works once and
        expires in 2 days; they create their login when they open it.
      </div>
      <label className="flex flex-col gap-[6px] text-[13px]">
        Email
        <input
          className={field}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@company.ch"
          autoFocus
        />
      </label>
      <label className="flex flex-col gap-[6px] text-[13px]">
        Role
        <select className={field} value={role} onChange={(e) => setRole(e.target.value as any)}>
          <option value="USER">User · plans and posts</option>
          <option value="ADMIN">Admin · also manages channels and team</option>
        </select>
      </label>
      <label className="flex items-center gap-[8px] text-[13px]">
        <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
        Also send it by email
      </label>
      {link && (
        <input className={field} readOnly value={link} onFocus={(e) => e.target.select()} />
      )}
      <Button type="submit" disabled={busy || !email}>
        {link ? 'Create another link' : 'Create invitation'}
      </Button>
    </form>
  );
};

const CreateTeamForm: FC<{ onDone: (team: { id: string; name: string }) => void }> = ({
  onDone,
}) => {
  const fetch = useFetch();
  const toast = useToaster();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setBusy(true);
      const response = await fetch('/admin/teams', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() }),
      });
      setBusy(false);
      if (!response.ok) {
        toast.show(await message(response, 'Could not create the team'), 'warning');
        return;
      }
      onDone(await response.json());
    },
    [name]
  );
  return (
    <form onSubmit={submit} className="flex flex-col gap-[12px] p-[16px] pt-0 min-w-[340px]">
      <div className="text-[13px] text-textItemBlur">
        You become its owner. Then invite the client's people into it.
      </div>
      <label className="flex flex-col gap-[6px] text-[13px]">
        Team name
        <input
          className={field}
          required
          minLength={2}
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. MAS Auto"
          autoFocus
        />
      </label>
      <Button type="submit" disabled={busy || name.trim().length < 2}>
        Create team
      </Button>
    </form>
  );
};

export const AllTeamsComponent = () => {
  const fetch = useFetch();
  const toast = useToaster();
  const modals = useModals();
  const me = useUser();
  const t = useT();
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    const response = await fetch('/admin/teams');
    if (!response.ok) {
      throw new Error('forbidden');
    }
    return (await response.json()) as Team[];
  }, []);
  const { data, mutate, error } = useSWR('admin-all-teams', load, {
    revalidateOnFocus: false,
  });

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data || [];
    return (data || []).filter(
      (team) =>
        team.name.toLowerCase().includes(q) ||
        team.members.some((m) => m.email.toLowerCase().includes(q))
    );
  }, [data, query]);

  const people = useMemo(
    () => new Set((data || []).flatMap((team) => team.members.map((m) => m.id))).size,
    [data]
  );

  const call = useCallback(
    async (url: string, init: RequestInit, done: string) => {
      const response = await fetch(url, init);
      if (!response.ok) {
        toast.show(await message(response, 'That did not work'), 'warning');
        return;
      }
      toast.show(done);
      await mutate();
    },
    [mutate]
  );

  const openInvite = useCallback(
    (team: Team) =>
      modals.openModal({
        classNames: { modal: 'bg-transparent text-textColor' },
        title: `Invite to ${team.name}`,
        withCloseButton: true,
        children: <InviteForm team={team} onDone={() => mutate()} />,
      }),
    [mutate]
  );

  const openCreate = useCallback(
    () =>
      modals.openModal({
        classNames: { modal: 'bg-transparent text-textColor' },
        title: 'Create team',
        withCloseButton: true,
        children: (
          <CreateTeamForm
            onDone={async (team) => {
              modals.closeAll();
              toast.show(`Team ${team.name} created`);
              await mutate();
            }}
          />
        ),
      }),
    [mutate]
  );

  const setRole = (team: Team, member: Member) => async (e: React.ChangeEvent<HTMLSelectElement>) =>
    call(
      `/admin/teams/${team.id}/members/${member.id}`,
      { method: 'PUT', body: JSON.stringify({ role: e.target.value }) },
      'Role updated'
    );

  const removeMember = (team: Team, member: Member) => async () => {
    if (
      !(await deleteDialog(
        `${member.email} loses access to ${team.name}. Their login and other teams stay.`,
        'Remove from team'
      ))
    ) {
      return;
    }
    await call(`/admin/teams/${team.id}/members/${member.id}`, { method: 'DELETE' }, 'Removed from team');
  };

  const deleteUser = (member: Member, teams: Team[]) => async () => {
    const owned = teams
      .filter((team) => team.members.some((m) => m.id === member.id && m.role === 'SUPERADMIN'))
      .map((team) => team.name);
    const extra = owned.length
      ? ` Teams they own (${owned.join(', ')}) are deleted too, with their channels.`
      : '';
    if (
      !(await deleteDialog(
        `Delete the account ${member.email}? They can no longer sign in.${extra}`,
        'Delete account',
        undefined,
        undefined,
        true
      ))
    ) {
      return;
    }
    await call(`/admin/users/${member.id}`, { method: 'DELETE' }, 'Account deleted');
  };

  const deleteTeam = (team: Team) => async () => {
    if (
      !(await deleteDialog(
        `Delete ${team.name}? Its ${team.channels} channel${
          team.channels === 1 ? '' : 's'
        } are disconnected and its posts removed. Members keep their logins and other teams.`,
        'Delete team',
        undefined,
        undefined,
        true
      ))
    ) {
      return;
    }
    await call(`/admin/teams/${team.id}`, { method: 'DELETE' }, 'Team deleted');
  };

  if (error) {
    return <div className="text-textItemBlur">Only super admins can see all teams.</div>;
  }

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex items-end justify-between gap-[16px] flex-wrap">
        <div>
          <h3 className="text-[20px]">{t('teams', 'Teams')}</h3>
          <div className="text-customColor18 mt-[4px]">
            {data
              ? `${data.length} team${data.length === 1 ? '' : 's'} · ${people} ${
                  people === 1 ? 'person' : 'people'
                }. Sign-up is closed; people join by invitation.`
              : 'Loading…'}
          </div>
        </div>
        <div className="flex gap-[8px] items-center">
          <input
            className={`${field} w-[220px]`}
            placeholder="Search team or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button onClick={openCreate}>Create team</Button>
        </div>
      </div>

      {visible.map((team) => (
        <section
          key={team.id}
          className="rounded-[8px] border border-newTableBorder bg-newBgColorInner overflow-hidden"
        >
          <header className="flex items-center gap-[12px] px-[16px] py-[12px] border-b border-newTableBorder">
            <div className="flex-1 min-w-0">
              <div className="font-[600] truncate">
                {team.name}
                {team.id === me?.orgId && (
                  <span className="ms-[8px] text-[12px] font-[400] text-textItemBlur">
                    current
                  </span>
                )}
              </div>
              <div className="text-[12px] text-textItemBlur">
                {team.members.length} member{team.members.length === 1 ? '' : 's'} ·{' '}
                {team.channels} channel{team.channels === 1 ? '' : 's'}
              </div>
            </div>
            <Button className="!h-[32px] text-[13px]" onClick={() => openInvite(team)}>
              Invite
            </Button>
            {team.id !== me?.orgId && (
              <button
                type="button"
                className="text-[13px] text-textItemBlur hover:text-red-400 px-[8px]"
                onClick={deleteTeam(team)}
              >
                Delete team
              </button>
            )}
          </header>
          <ul>
            {team.members.map((member) => {
              const isMe = member.id === me?.id;
              return (
                <li
                  key={member.id}
                  className="flex items-center gap-[12px] px-[16px] py-[10px] border-b border-newTableBorder last:border-b-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-[14px]">
                      {member.email}
                      {isMe && <span className="ms-[6px] text-[12px] text-textItemBlur">you</span>}
                    </div>
                    <div className="text-[12px] text-textItemBlur">
                      {member.superAdmin ? 'Super admin · ' : ''}
                      {member.disabled ? 'Disabled · ' : ''}
                      Last active {new Date(member.lastOnline).toLocaleDateString()}
                    </div>
                  </div>
                  <select
                    aria-label={`Role of ${member.email} in ${team.name}`}
                    className="h-[32px] rounded-[6px] border border-newTableBorder bg-newBgColorInner px-[8px] text-[13px]"
                    value={member.role}
                    onChange={setRole(team, member)}
                  >
                    {(['SUPERADMIN', 'ADMIN', 'USER'] as Role[]).map((r) => (
                      <option key={r} value={r}>
                        {roleLabel[r]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="text-[13px] text-textItemBlur hover:text-textColor px-[6px]"
                    onClick={removeMember(team, member)}
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    disabled={isMe || member.superAdmin}
                    title={
                      isMe || member.superAdmin
                        ? 'Super admin accounts cannot be deleted here'
                        : 'Delete this account everywhere'
                    }
                    className="text-[13px] text-textItemBlur hover:text-red-400 px-[6px] disabled:opacity-30 disabled:hover:text-textItemBlur"
                    onClick={deleteUser(member, data || [])}
                  >
                    Delete account
                  </button>
                </li>
              );
            })}
            {!team.members.length && (
              <li className="px-[16px] py-[12px] text-[13px] text-textItemBlur">No members.</li>
            )}
          </ul>
        </section>
      ))}
      {data && !visible.length && (
        <div className="text-textItemBlur text-[14px]">No team or person matches.</div>
      )}
    </div>
  );
};
