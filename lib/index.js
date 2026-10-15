/**
 * dsh-subagent-model-freedom — 让 DSH 子代理可以自由选择模型路由。
 *
 * 机制：监听 session/created，在新建的顶层会话上 append 一个
 * subagent/model-selection-policy 事件。tool-subagent 在 agent/created
 * （晚于 session/created）里读 subagentModelSelectionPolicy projection，
 * 只要策略事件存在，subagent 工具就暴露 provider/model/reasoning_effort 参数。
 *
 * 默认授权 WorkBuddy 免费模型（hy3 / step-5-preview，x0.00 credits）。
 */

import { Service } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

/** 默认授权路由：WorkBuddy 免费模型。 */
const DEFAULT_ROUTES = [
  { provider: 'workbuddy', model: 'hy3' },
  { provider: 'workbuddy', model: 'step-5-preview' },
]

/**
 * 在新建会话上注入子代理模型选择策略。
 */
class SubagentModelFreedom extends Service {
  static Config = z.object({
    routes: z.array(z.object({
      provider: z.string().required(),
      model: z.string().required(),
    })).default(DEFAULT_ROUTES.map(r => ({ ...r }))),
    injectIntoSubagentSessions: z.boolean().default(false),
  })

  constructor(ctx, config) {
    super(ctx, 'subagentModelFreedom')

    this.routes = config.routes
    this.injectIntoSubagentSessions = config.injectIntoSubagentSessions

    if (!this.routes || this.routes.length === 0) {
      ctx.logger.warn('subagent-model-freedom: routes 为空，插件不生效（等价于未安装）')
      return
    }

    ctx.on('session/created', (session) => {
      this.injectPolicy(session)
    })
  }

  /**
   * 给一个会话 append 模型选择策略事件。
   * session/created 每会话只触发一次，无重复 append 风险。
   * 子代理会话默认跳过——它们的策略由 tool-subagent 的继承逻辑处理。
   */
  injectPolicy(session) {
    if (!this.injectIntoSubagentSessions && session.header.origin === 'subagent') {
      return
    }
    const routes = this.routes.map(r => ({ provider: r.provider, model: r.model }))
    session.append('subagent/model-selection-policy', { allowedModels: routes })
  }
}

export function apply(ctx, config) {
  ctx.plugin(SubagentModelFreedom, config)
}

export const name = 'subagent-model-freedom'
export default SubagentModelFreedom
