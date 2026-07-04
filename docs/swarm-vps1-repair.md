# Swarm repair for `vps1`

Use this when the Rahiel Social Media Planner stack deploys but `docker ps` on `vps1` shows no containers and the worker logs show it trying to reach the manager at `172.17.0.1:2377`.

## Symptom

On `vps1`:

```text
Swarm: active
Is Manager: false
agent: session failed ... dial tcp 172.17.0.1:2377: connect: connection refused
```

On the manager:

```bash
docker node ls
```

shows `vps1` as `Down` / heartbeat failure.

## Cause

The Swarm manager is advertising Docker's bridge address (`172.17.0.1`) instead of a real reachable manager IP. The worker may initially join using the correct IP, but after joining it uses the manager address stored in Swarm cluster metadata. If that metadata says `172.17.0.1:2377`, the worker heartbeat fails and the scheduler cannot place services on `vps1`.

The production compose intentionally pins the stack to `vps1`:

```yaml
node.hostname == vps1
```

So if `vps1` is down in Swarm, the stack can be accepted but no containers will run.

## 1. Find the manager

Run on candidate server:

```bash
docker node ls
```

If it works, that server is the manager. If Docker says the node is not a swarm manager, you are on a worker.

## 2. Confirm bad advertise address

On the manager:

```bash
docker info | grep -A30 Swarm
docker node inspect self --format 'Manager={{.ManagerStatus.Addr}} Status={{.Status.Addr}} Hostname={{.Description.Hostname}}'
```

If you see `172.17.0.1:2377`, the manager advertise address is wrong.

## 3. Choose the correct manager IP

On the manager:

```bash
hostname -I
ip route get 1.1.1.1
```

Use the real IP reachable from `vps1` — either the private VPS network IP if both servers share one, or the public manager IPv4.

Do **not** use:

```text
172.17.0.1
```

In the commands below, replace `<MANAGER_REAL_IP>`.

## 4. Try non-destructive repair first

On the manager:

```bash
docker swarm update --advertise-addr <MANAGER_REAL_IP>
```

On `vps1`:

```bash
systemctl restart docker
sleep 10
journalctl -u docker --since "1 min ago" --no-pager | grep -E "manager selected|session failed|2377"
```

Back on the manager:

```bash
docker node ls
```

Success state:

```text
vps1   Ready   Active
```

If the worker still tries `172.17.0.1:2377`, use the clean rebuild below.

## 5. Clean rebuild if needed

Only do this after checking whether other production Swarm stacks/services exist.

On the manager:

```bash
docker stack ls
docker service ls
docker ps
```

If nothing important depends on the current broken Swarm, recreate it.

On the manager:

```bash
docker swarm leave --force
docker swarm init --advertise-addr <MANAGER_REAL_IP> --listen-addr 0.0.0.0:2377
docker swarm join-token worker
```

Copy the emitted `docker swarm join ...` command.

On `vps1`:

```bash
docker swarm leave --force
docker swarm join --token SWMTKN-... <MANAGER_REAL_IP>:2377
```

Back on the manager:

```bash
docker node ls
```

Expected:

```text
vps1   Ready   Active
```

## 6. Firewall check

From `vps1`:

```bash
nc -vz <MANAGER_REAL_IP> 2377
```

If it fails, allow Swarm ports between manager and worker:

```bash
ufw allow 2377/tcp
ufw allow 7946/tcp
ufw allow 7946/udp
ufw allow 4789/udp
```

Required ports:

```text
TCP 2377      cluster management
TCP/UDP 7946  node discovery
UDP 4789      overlay networking
```

## 7. Redeploy Rahiel stack

On the manager from the folder containing `docker-compose.yaml`:

```bash
docker stack deploy -c docker-compose.yaml rahiel-planner
```

Verify scheduling:

```bash
docker service ls
docker service ps rahiel-planner_postiz --no-trunc
docker service ps rahiel-planner_postiz-postgres --no-trunc
docker service ps rahiel-planner_temporal --no-trunc
```

On `vps1`:

```bash
docker ps
```

Containers should now be running on `vps1`.

## 8. Pull latest image if needed

The fork publishes:

```text
ghcr.io/omar7l/rahiel-social-media-planner:latest
```

After a successful GitHub image build, force the service to pick up the current image:

```bash
docker service update --force --image ghcr.io/omar7l/rahiel-social-media-planner:latest rahiel-planner_postiz
```
