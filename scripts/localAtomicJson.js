import fs from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'

export const atomicJson = async (file, value, { rename = fs.rename, sleep = delay, attempts = 20 } = {}) => {
  const temporary = `${file}.${randomUUID()}.tmp`
  try {
    await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' })
    for (let attempt = 0; ; attempt++) {
      try { await rename(temporary, file); break }
      catch (error) {
        if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code) || attempt >= attempts - 1) throw error
        await sleep(Math.min(25 * 2 ** attempt, 500))
      }
    }
  } finally { await fs.rm(temporary, { force: true }) }
}
