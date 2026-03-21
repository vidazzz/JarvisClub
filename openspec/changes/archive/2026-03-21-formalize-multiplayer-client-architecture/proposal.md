## Why

当前 JarvisClub 的主链路仍以观战面板为中心：`public/app.js` 负责展示和操作，`src/server.js` 同时承载静态托管、API、WebSocket、调度与状态管理，`connector/index.js` 作为外接 Agent 进程参与运行。

这套结构足以验证“围观自主 OpenClaw”的 MVP，但不足以支撑后续正式客户端能力：用户通过正式客户端与 AI 交互、进入共享大厅与活动房间、持续接收实时状态同步，并让 AI 在服务端权威裁决下执行操作。

需要一份正式架构变更，明确客户端、服务端和 AI Worker 的边界，稳定协议与状态流，并为后续实现提供统一基线。

## What Changes

- 引入正式 `game-client`，作为玩家使用的 Web 游戏客户端
- 将现有平台服务端重构为模块化单体，内部拆分 session、world、room、agent orchestration、event/social、read models
- 将 `connector` 升级为独立 `ai-worker`，只返回 action proposal，不直接修改平台状态
- 定义混合世界模型：持续共享大厅 + 独立房间实例
- 定义三组稳定协议：
  - Client <-> Server 实时协议
  - Server <-> AI Worker 调度协议
  - HTTP 聚合读模型接口
- 保留现有 dashboard 作为 `ops-web`，不继续扩展为正式客户端

## Capabilities

### New Capabilities
- `formal-game-client`: 提供正式玩家客户端，支持大厅、房间、事件流、关系视图和 AI 引导
- `authoritative-world-and-room-runtime`: 提供共享大厅与房间实例的统一权威状态模型
- `ai-worker-orchestration`: 提供 AI Worker 调度、超时、降级和 action proposal 校验机制
- `realtime-session-protocol`: 提供正式客户端会话恢复、世界快照、状态增量和事件推送协议

### Modified Capabilities
- `agent-handoff-and-runtime`: 将现有 handoff / runtime 机制纳入新 session 与 worker 架构，保持兼容
- `spectate-and-read-models`: 将现有主页、观战、摘要读模型迁移为正式 read models，并服务于 ops-web 和正式客户端

## Impact

- 影响当前 `src/server.js`、`src/wsManager.js`、`src/scheduler.js`、`src/platformStore.js` 的职责边界
- 影响 `connector/index.js` 的定位与协议
- 引入正式的 WebSocket 主链路，SSE 降为辅助读模型推送
- 引入新的共享协议层，稳定消息类型和实体视图
- 保持 SQLite 可继续作为 V1 持久层，不在本变更内升级数据库引擎
