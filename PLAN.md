Title: Nuxt 环境配置管理系统（本机部署，文件存储）

Context & Goals
- 目标：在网页端统一管理“本地/校内服务器/阿里云服务器”三类环境下的项目配置文件；支持读取、编辑、同步；不在远端部署 Agent；仅通过本机执行 SSH 命令与 SCP/SFTP 上传。
- 你关心点：操作简单、无数据库、可通过 SSH 别名连接、文件即存储、集中管理环境变量。
- 已确认：无权限控制（或仅内网使用）、主要管理 .env（KEY=VALUE）、管理端本机运行。

Assumptions (可调整)
- SSH 已配置别名（~/.ssh/config），本机可直接 `ssh alias` / `scp`。
- 远端项目路径固定或可在项目配置里维护。
- .env 文件为主；非 .env 可以作为可选扩展（JSON/YAML），后续再加。

High-Level Architecture
- Web 端（Nuxt 4 UI）
  - 项目列表、环境列表（local/campus/aliyun）、文件树/文件详情、diff/变更历史（文件级）
  - 编辑器支持 .env 语法高亮（CodeMirror/Monaco）
- Nitro API（Server Routes）
  - 本地文件读取/写入
  - 通过 SSH 命令读取远端文件内容
  - 通过 SCP/SFTP 上传远端文件
  - 记录操作日志（文件形式）
- File Storage（本地）
  - projects.json（项目与环境配置）
  - env-cache/（可选：远端拉取内容缓存）
  - audit.log（操作日志）

Data Model (文件存储)
- `data/projects.json`
  - projects: [{ id, name, repoPathLocal?, envs: { local, campus, aliyun } }]
  - envs.xxx: { hostAlias, basePath, files: [".env", ".env.local"], notes }
- `data/audit.log` 纯文本或 JSON lines 记录（时间、用户/来源、项目、环境、文件、动作）
- `data/cache/{projectId}/{env}/file.env`（可选）

Core Features (MVP)
1) 项目管理
- 新增/编辑/删除项目
- 为每个环境设置 SSH 别名、远端路径、可管理文件列表

2) 读取配置
- local：直接读取本机文件
- remote：通过 ssh `cat` 读取（或 `sed -n`）
- 支持“刷新”与“查看当前版本”

3) 编辑与保存
- Web 端编辑后保存到本地存储区（待同步版本或指定文件）
- 保存到本地 + 校验 .env 格式

4) 同步到远端
- 将本地文件通过 scp 上传到指定服务器/路径
- 支持批量同步：同一项目多个文件

5) Diff 与历史
- 读取前后内容的 diff（前端对比视图）
- 本地记录变更历史（文件版本归档或 Git 方式）

6) 基础日志
- 写入 audit.log，支持查看最近操作

Nitro API 设计（示例）
- GET /api/projects
- POST /api/projects (create)
- PUT /api/projects/:id
- DELETE /api/projects/:id
- GET /api/env?projectId=&env=&file=
- PUT /api/env?projectId=&env=&file= (body: content)
- POST /api/sync (projectId, env, file)
- GET /api/diff (projectId, env, file)
- GET /api/audit

SSH/文件操作策略
- 读取：`ssh <alias> "cat <path>"`
- 上传：`scp <local> <alias>:<path>`
- 路径安全：仅允许在项目配置的 basePath 下
- 失败处理：统一返回 error_code + message

Frontend UX & Design (Nuxt)
- 左侧：项目列表 + 环境标签（local/campus/aliyun）
- 右侧：文件列表 + 编辑器
- 顶部：刷新、保存、同步、查看 diff
- 编辑器：.env 语法提示与格式校验
- 同步前提示：显示将要覆盖的远端文件路径

Files/Directories to Touch
- `server/api/*`：Nitro API
- `server/utils/ssh.ts`：封装 ssh/scp
- `server/utils/fs.ts`：本地文件读写
- `data/`：项目配置、日志、缓存
- `pages/index.vue` 或 `components/*`：主 UI

Tools & Dependencies
- Nuxt 4 + Nitro
- Node child_process（执行 ssh/scp）
- 编辑器组件（如 CodeMirror 6）
- 可选：diff 库（如 diff-match-patch）

Questions Asked & Answers
- Auth: 不需要
- Env 格式: .env/KEY=VALUE
- 部署: 本机运行

Risks & Mitigations
- SSH 命令安全：限制路径、避免任意命令执行
- 文件冲突：同步前显示 diff
- 权限问题：提示用户配置 SSH key

Testing Strategy
- 本地模拟：对本地文件读写
- 远端：对配置好的 SSH 别名进行读/写验证
- API：简单 smoke test（读取/保存/同步）

TODOs (implementation checklist)
- [ ] 建立 data/projects.json 结构与读写接口
- [ ] 完成 SSH 读写封装（安全检查 + 错误处理）
- [ ] 搭建 Nitro API endpoints
- [ ] 前端项目/环境/文件 UI 与编辑器
- [ ] diff 视图与同步确认
- [ ] 操作日志与简单历史

Next Step Proposal
- 如果你认可以上结构，我可以开始：搭建数据结构 + Nitro API 骨架 + 基础 UI。
