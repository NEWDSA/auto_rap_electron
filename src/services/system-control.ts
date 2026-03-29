export type PowerAction = 'shutdown' | 'restart' | 'sleep' | 'lock'

class SystemControlService {
  async power(
    action: PowerAction,
    force: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await window.electronAPI.invoke('system:power', { action, force })
      return result
    } catch (error: any) {
      return { success: false, error: error?.message || '操作失败' }
    }
  }

  shutdown(force: boolean = false) {
    return this.power('shutdown', force)
  }

  restart(force: boolean = false) {
    return this.power('restart', force)
  }

  sleep() {
    return this.power('sleep')
  }

  lock() {
    return this.power('lock')
  }
}

export const systemControl = new SystemControlService()
