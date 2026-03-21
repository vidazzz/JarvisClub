## Context

当前系统由三部分构成：

- `public/*`：轻量前端控制台/观战面板
- `src/*`：平台 API、状态、调度、WebSocket 与持久化
- `connector/index.js`：外部 Agent 接入脚本

这套设计偏向“观赏型自主 Agent 平台 MVP”，但后续产品方向已经明确：

- 需要一个正式客户端，供用户进入世界、与 AI 交互、进入活动房间
- 用户与 AI 的关系以“高层引导”为主，而不是逐帧直接操控
- 服务端必须成为唯一权威状态源
- AI 必须通过独立 Worker 参与运行，而不是直接深度耦合进服务端写状态

## Goals / Non-Goals

**Goals:**
- 建立正式客户端、服务端、AI Worker 的职责边界
- 建立共享大厅 + 房间实例的混合世界模型
- 建立权威状态流：客户端提交输入，AI Worker 提交意图，服务端统一裁决
- 稳定实时协议和聚合读模型接口
- 为后续实现提供清晰迁移路径，尽量复用现有 runtime / relationship / event 模型

**Non-Goals:**
- 不在本变更内实现完整多服务部署
- 不在本变更内实现强操作型战斗客户端
- 不在本变更内引入复杂回滚网络模型
- 不在本变更内替换 SQLite
- 不在本变更内设计完整经济、公会或多地图体系

## Decisions

1. 正式客户端采用 Web 形态
   - 复用当前 Node/Web 基础设施
   - 先解决正式交互和实时同步，不引入桌面发版复杂度

2. 服务端采用模块化单体 + 独立 AI Worker
   - 平台服务端保留单部署单进程形态，但内部拆模块
   - AI Worker 以独立进程/服务存在，便于超时、重试、扩缩容和多实现接入

3. 世界模型采用混合模式
   - 默认世界为持续运转的 `arcade_hall`
   - 对局、协作活动进入 `room instance`
   - 房间结果回写共享大厅事件流和关系系统

4. 服务端为唯一权威状态源
   - 客户端只提交 command / guidance，不直接改状态
   - AI Worker 只返回 action proposal，不直接写数据库
   - 所有实体状态、活动结果、关系变化和事件落账均由服务端确认

5. 正式客户端主链路使用 WebSocket
   - 用于 session、world snapshot、delta、room update、agent status
   - SSE 仅保留给 ops-web 和低频聚合视图

6. 共享协议单独定义
   - 稳定 `EntityRef`、`WorldSnapshot`、`RoomSnapshot`、`PlayerGuidanceCommand`、`ActionProposal`
   - 避免客户端、服务端、worker 各自内嵌协议定义

7. 保留现有 dashboard 作为 ops-web
   - 继续用于调试、运营、辅助观战
   - 不再作为正式玩家客户端的未来基础

## Risks / Trade-offs

- 模块化单体虽然比多服务简单，但内部边界不清时仍可能重新耦合，需要严格按模块分责任
- 混合世界模型比纯共享世界或纯房间模型更复杂，需要明确大厅和房间之间的状态切换语义
- 高层引导而非直接操控，更符合产品定位，但会降低部分用户对“可控感”的预期，需要客户端显式展示 AI 状态和反馈
- AI Worker 外置后，超时和失败会更常见，服务端必须设计稳定的安全降级路径
