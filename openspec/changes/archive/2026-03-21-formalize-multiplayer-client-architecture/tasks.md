## 1. 服务端运行时重构

- [x] 1.1 将现有平台服务端职责拆分为 session、world、room、agent orchestration、event/social、read models 模块
- [x] 1.2 为共享大厅和房间实例建立统一的权威状态模型与生命周期
- [x] 1.3 将现有 scheduler/tick 逻辑重组为可作用于 world scope 和 room scope 的调度入口
- [x] 1.4 明确 AI proposal 校验、超时、拒绝和安全降级流程

## 2. 协议与接口稳定化

- [x] 2.1 定义 Client <-> Server WebSocket 协议与共享类型
- [x] 2.2 定义 Server <-> AI Worker 调度协议与 action proposal 结构
- [x] 2.3 梳理并收敛 HTTP 读模型接口，区分正式客户端与 ops-web 的消费方式
- [x] 2.4 定义 session 恢复、world snapshot、room snapshot、delta 和 event feed 的最小消息集合

## 3. AI Worker 重构

- [x] 3.1 将 connector 升级为 ai-worker，输入改为标准 agent context，输出改为 action proposal
- [x] 3.2 保留 mock 与真实 OpenClaw 两类后端适配
- [x] 3.3 增加 worker 超时、重试、错误上报和诊断事件
- [x] 3.4 去除 worker 直接承担平台状态写入的职责

## 4. 正式客户端引入

- [x] 4.1 新建 game-client，覆盖大厅视图、房间视图、事件流、关系视图和 AI 引导面板
- [x] 4.2 实现 session 建立、重连恢复和基础本地状态管理
- [x] 4.3 接入世界快照、状态增量、房间更新和 agent status 展示
- [x] 4.4 明确 ops-web 与正式客户端的边界，保留现有 dashboard 作为调试/运营入口

## 5. 兼容与验收

- [x] 5.1 保证 handoff / ownership / API key 机制在新 session 模型下可迁移或兼容
- [x] 5.2 验证大厅进入房间、房间结束回写大厅、事件落账和关系连续性
- [x] 5.3 验证客户端断线恢复、worker 超时降级和非法 proposal 拒绝
- [x] 5.4 补齐协议与运行时集成测试
