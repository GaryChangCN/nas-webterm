# nas-webterm

轻量的 NAS 浏览器终端：打开网页即可使用容器 Shell，通过 SSH 管理获授权的设备，兼顾桌面键盘与移动端触控操作。

- **开箱即用**：已提供 AMD64 / ARM64 多架构镜像 `ghcr.io/garychangcn/nas-webterm:latest`，直接用 Docker 或 Compose 启动，无需下载或编译源码。
- **日常工具齐全**：内置 Bash、SSH 客户端、tmux、curl；SSH 配置与共享文件可持久化。
- **移动辅助操作**：方向键、Tab、Esc、Ctrl / Alt 组合键、字号调整、键盘开关与粘贴预览。
- **明确的使用边界**：面向单用户、可信网络；多个连接共享容器文件环境，不提供多用户隔离。

## 3 分钟快速开始

需要已安装 Docker Engine 和 Docker Compose 插件的 NAS 或 Linux 主机。新建一个部署目录，只需保存下面两个文件，不必下载源码。

### 1. 保存 compose.yaml

```yaml
services:
  webterm:
    image: ghcr.io/garychangcn/nas-webterm:latest
    restart: unless-stopped
    ports:
      - "7681:7681"
    environment:
      TTYD_USER: ${TTYD_USER:-terminal}
      TTYD_PASS: ${TTYD_PASS:?请在 .env 中设置非空的长随机密码}
      TZ: ${TZ:-UTC}
    volumes:
      - ./data/ssh:/root/.ssh
      - ./data/share:/share
    security_opt:
      - no-new-privileges:true
    pids_limit: 256
    healthcheck:
      test: ["CMD", "/usr/local/bin/healthcheck.sh"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
```

### 2. 在同一目录保存 .env，并手动设置密码

```dotenv
TTYD_USER=terminal
# 必须在引号内填入自己生成的长随机密码；留空将拒绝启动，没有默认密码。
TTYD_PASS=''
TZ=UTC
```

建议使用密码管理器生成至少 24 位的独立随机密码。密码含 `$` 时，保留 `.env` 的**单引号**可避免 Compose 变量插值；密码本身含单引号时须遵循 Compose 的 `.env` 转义规则。不要公开包含真实密码的配置、截图或日志。

### 3. 启动并登录

在部署目录执行；以下目录与权限命令适用于 POSIX Shell：

```sh
mkdir -p data/ssh data/share
chmod 700 data/ssh
chmod 600 .env
docker compose up -d
```

浏览器访问 `http://<NAS局域网地址>:7681`，使用 `TTYD_USER` / `TTYD_PASS` 登录。首次启动会自动拉取镜像；下载耗时取决于网络。

**此示例将主机 7681 端口发布到所有接口，不是 HTTPS，也不是安全的公网暴露方案。** 仅在受控局域网中临时直连，并用防火墙限制访问来源；日常使用应通过 HTTPS 反向代理或可信 VPN 保护传输。HTTP Basic 只验证身份，HTTP 会暴露密码与终端内容，切勿直接做公网端口转发。

## 反向代理与 NAS 管理界面

- NAS 厂商反代的上游协议选 **HTTP**、端口 `7681`，客户端入口使用 HTTPS；启用 **WebSocket 转发**，确保终端长连接可用。
- 保留正确的外部 `Host` 与浏览器 `Origin`，让来源检查正常通过；连接失败先检查代理头和 WebSocket 配置，不要为排错随意关闭来源检查或认证。
- 若反代确实运行在宿主机并经 localhost 访问，可将端口改为 `"127.0.0.1:7681:7681"`，仅供本机反代；其他设备不能直接访问。厂商反代若使用 localhost，不要只绑定 NAS 内网 IP，否则它可能无法连接。
- 反代若运行在另一个容器，其 `127.0.0.1` 指向它自己，不是 NAS；应按实际容器网络设置可达上游。不同 NAS 的网络与代理界面有所不同。
- 使用 NAS 的 Docker 管理界面时：镜像填写 `ghcr.io/garychangcn/nas-webterm:latest`，映射主机端口到容器 `7681`，设置 `TTYD_USER` 和非空 `TTYD_PASS`，将持久化目录分别挂到 `/root/.ssh` 与 `/share`，并按界面能力设置重启策略等选项。
- 管理界面若不支持 Compose 的 `.env` 插值，须在环境变量栏直接设置实际值，不能原样填入 `${TTYD_PASS:?...}`。部署前检查最终配置；不保证所有 NAS 型号的界面步骤一致。

### 可选：国内第三方镜像代理

拉取 GHCR 困难时，可将 `image` 替换为 `ghcr.dockerproxy.net/garychangcn/nas-webterm:latest`。这是**非官方第三方服务**，不保证可用性、更新及时性或内容可信度。推荐与官方 GHCR 来源核对镜像摘要，不能仅凭相同标签认定内容一致；条件允许时优先使用官方地址。

## 常用操作

**连接设备**：在网页终端运行 `ssh user@host`，将占位符替换为获授权的目标。目标需启用 SSH，且容器网络能够访问。首次连接核对主机指纹，不要关闭主机密钥校验；需要密钥时在容器内生成专用密钥，只将公钥安装到目标，不要复制电脑私钥。

**浏览器断线后继续任务**：先启动 `tmux` 再运行任务；用 `Ctrl+B` 后按 `D` 分离，重新登录后运行 `tmux attach`。这只保护浏览器断线场景，**容器停止、重启或重建会结束会话**，持久化目录不会保存运行中的进程。

**移动端辅助栏**：点选 Ctrl / Alt 后再选按键；方向键、Tab、Esc 和字号按钮可减少对软键盘的依赖。键盘表现取决于系统与浏览器，不保证所有移动设备体验一致。

**粘贴**：先检查预览再发送，多行或控制字符可能直接触发命令；“发送文本”不额外回车，不代表文本本身不会执行命令。剪贴板 API 通常要求 HTTPS 或 localhost 与用户授权，不可用时可手动粘贴。仅发送可信内容。

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `TTYD_USER` | `terminal` | HTTP Basic 登录用户名，不能含冒号；不是 SSH 用户名 |
| `TTYD_PASS` | 无，必填 | 非空的独立长随机密码；Compose 与镜像入口都会拒绝空密码 |
| `TZ` | `UTC` | 容器时区，可按需设置 |

上表是镜像支持的环境变量。仓库附带 Compose 中的 `WEBTERM_IMAGE`、`WEB_BIND_IP`、`WEB_PORT` 只是该配置文件的插值变量，不是镜像原生参数；本文自包含示例直接设置镜像和端口，不需要它们。

## 存储与安全边界

**容器 Shell 不是 NAS 宿主机 Shell。** Web 登录者以容器内 root 身份执行命令，可读取挂载文件并访问容器可达的网络；容器 root 仍有风险，不能把容器当成绝对安全隔离。

默认仅持久化 `./data/ssh`（专用 SSH 认证材料、配置与 Shell 历史）和 `./data/share`（容器内 `/share`）。限制这两个目录的访问权限并妥善备份；不要提交 `.env` 或数据目录。

确有需要时，在服务的 `volumes` 下添加必要的存储目录，例如：

```yaml
      - /your/storage/path:/mnt/storage:ro
```

`:ro` 为只读；改成 `:rw` 会允许终端修改或删除该目录文件。不要挂载宿主机 `/`、Docker socket 或无关敏感目录，也不要开启 `privileged`。保持 NAS、Docker 与镜像更新，更多说明见 [SECURITY.md](<SECURITY.md>)。

## 更新与排障

在部署目录执行：

```sh
docker compose pull
docker compose up -d
docker compose ps
docker compose logs --tail=100 webterm
```

更新会重建容器并中断现有会话，操作前先保存工作、备份数据。`latest` 会变化；需要可重复部署时，建议固定已发布版本，或使用官方核验过的 `ghcr.io/garychangcn/nas-webterm@sha256:<摘要>`，并计划定期更新。

- 无法拉取：检查 NAS 网络、DNS 与镜像地址；确认设备为受支持的 AMD64 / ARM64 架构。
- 提示密码为空：检查 `.env` 是否与 Compose 同目录、是否已保存非空密码，或在 NAS 管理界面直接设置环境变量。
- 页面能开但终端不连：检查 WebSocket 转发、Host / Origin 与反代上游地址。
- 不要用 `docker compose down -v` 作为更新步骤；保留持久化数据，不要把删除卷当作排障手段。分享日志前先脱敏。

## 参与与许可

使用问题和建议可提交 Issue，安全问题请遵循 [SECURITY.md](<SECURITY.md>) 私密报告指引。

[贡献指南](<CONTRIBUTING.md>) · [协作约定](<AGENTS.md>) · [MIT License](<LICENSE>) · [第三方声明](<THIRD_PARTY_NOTICES.md>)

Copyright (c) 2026 nas-webterm contributors
