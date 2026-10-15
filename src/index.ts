/**
 * dsh-subagent-model-freedom
 *
 * 让 DSH 子代理可以自由选择模型路由。
 *
 * 机制：监听 `session/created`，在新建的顶层会话上 append 一个
 * `subagent/model-selection-policy` 事件（事件 schema 由 tool-subagent 的
 * `subagentModelSelectionProjectionDefinition` 注册并 apply）。tool-subagent
 * 在 `agent/created`（时序晚于 `session/created`）里读 `subagentModelSelectionPolicy`
 * projection，只要策略事件存在，subagent 工具就暴露
 * `provider`/`model`/`reasoning_effort` 参数。
 *
 * 这样不用开 `subagent-model-selection-settings` 的 Host 级 enabled 开关，
 * 也不用改 `tool-subagent` 条目的 `agentRouteDefaults`——一个插件条目搞定，
 * 且默认授权 WorkBuddy 的免费模型（hy3 / step-5-preview），开箱即用。
 *
 * @module dsh-subagent-model-freedom
 */

import { Context, Service } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { Session } from '@deepseek-ai/dsh-session'

/** 一条授权的子代理模型路由。 */
export interface AllowedRoute {
  /** provider 路由 id，如 `workbuddy`、`deepseek-official`。 */
  provider: string
  /** provider 下的模型 id，如 `hy3`、`step-5-preview`。 */
  model: string
}

/** 插件配置。 */
export interface Config {
  /**
   * 授权给每个新会话的子代理模型路由列表。
   * 默认是 WorkBuddy 的两个免费模型（x0.00 credits）。
   * 设为空数组则禁用（等价于不装本插件）。
   */
  routes: AllowedRoute[]
  /**
   * 是否对子代理会话（origin === 'subagent'）也注入策略。
   * 默认 false——子代理会话的策略由它自己的 tool-subagent 按继承规则处理，
   * 注入反而可能覆盖父会话的授权。保持 false 让继承链自然工作。
   */
  injectIntoSubagentSessions: boolean
}

/**
 * 默认授权路由：WorkBuddy 免费模型。
 * 来源：.workbuddy-catalog.json 里 `billing.free === true` / `x0.00 credits` 的条目。
 * hy3（限时免费）和 step-5-preview（独家限免）是当前两个免费模型。
 */
const DEFAULT_ROUTES: readonly AllowedRoute[] = [
  { provider: 'workbuddy', model: 'hy3' },
  { provider: 'workbuddy', model: 'step-5-preview' },
]

declare module '@deepseek-ai/cordis' {
  interface Context {
    subagentModelFreedom: SubagentModelFreedom
  }
}

/**
 * 在新建会话上注入子代理模型选择策略。
 * 一个极简服务：构造时注册 `session/created` 监听，每个新顶层会话拿到
 * 配置里的 routes，append 一条 `subagent/model-selection-policy` 事件。
 */
export class SubagentModelFreedom extends Service {
  private readonly routes: readonly AllowedRoute[]
  private readonly injectIntoSubagentSessions: boolean

  static Config = z.object({
    routes: z.array(z.object({
      provider: z.string().required(),
      model: z.string().required(),
    })).default(DEFAULT_ROUTES.map(r => ({ ...r }))),
    injectIntoSubagentSessions: z.boolean().default(false),
  })

  constructor(ctx: Context, config: Config) {
    super(ctx, 'subagentModelFreedom')

    this.routes = config.routes
    this.injectIntoSubagentSessions = config.injectIntoSubagentSessions

    if (this.routes.length === 0) {
      ctx.logger.warn('subagent-model-freedom: routes 为空，插件不生效（等价于未安装）')
      return
    }

    ctx.on('session/created', (session) => {
      this.injectPolicy(session)
    })
  }

  /**
   * 给一个会话 append 模型选择策略事件（幂等）。
   * `session/created` 每会话只触发一次，所以不存在重复 append 风险。
   * 子代理会话默认跳过——它们的策略由 tool-subagent 的继承逻辑处理
   * （selectForSession 会从父会话读 subagentModelSelectionPolicy）。
   */
  private injectPolicy(session: Session): void {
    if (!this.injectIntoSubagentSessions && session.header.origin === 'subagent') {
      return
    }
    const routes = this.routes.map(r => ({ provider: r.provider, model: r.model }))
    session.append('subagent/model-selection-policy', { allowedModels: routes })
  }
}

/** Cordis 插件 apply 入口。 */
export function apply(ctx: Context, config: Config): void {
  ctx.plugin(SubagentModelFreedom, config)
}

export const name = 'subagent-model-freedom'
export default SubagentModelFreedom
