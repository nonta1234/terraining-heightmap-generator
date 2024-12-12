export class WorkerPool<T> {
  private workerQueue: T[] = []
  private waitingCalls: ((worker: T) => void)[] = []

  constructor(workers: T[]) {
    this.workerQueue = [...workers]
  }

  public getWorker(): Promise<T> {
    return new Promise((resolve) => {
      if (this.workerQueue.length > 0) {
        resolve(this.workerQueue.shift()!)
      } else {
        this.waitingCalls.push(resolve)
      }
    })
  }

  public addWorker(worker: T) {
    if (this.waitingCalls.length > 0) {
      const nextCall = this.waitingCalls.shift()!
      nextCall(worker)
    } else {
      this.workerQueue.push(worker)
    }
  }

  public releaseWorker(worker: T) {
    this.addWorker(worker)
  }

  public removeWorker(worker: T) {
    const index = this.workerQueue.indexOf(worker)
    if (index !== -1) {
      this.workerQueue.splice(index, 1)
    } else {
      console.warn('Worker is not in the queue, cannot remove.')
    }
  }

  public getQueueSize(): number {
    return this.workerQueue.length
  }

  public getWaitingSize(): number {
    return this.waitingCalls.length
  }

  public getQueueList(): T[] {
    return this.workerQueue
  }
}
