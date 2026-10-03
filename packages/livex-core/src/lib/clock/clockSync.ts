/**
 * NTP Ping-Pong Clock Offset Synchronizer
 * Estimates clock offset (theta) between devices using multi-round ping-pong
 * filtering for the minimum round-trip time (RTT).
 *
 * Mathematical model:
 *   RTT = (T3 - T0) - (T2 - T1)
 *   theta = ((T1 - T0) + (T2 - T3)) / 2
 *   ServerTimeEstimate = LocalTime + theta
 */

export interface ClockPingPacket {
  type: 'CLOCK_PING';
  pingId: string;
  senderId: string;
  t0: number; // Local time ping sent
}

export interface ClockPongPacket {
  type: 'CLOCK_PONG';
  pingId: string;
  senderId: string; // responder
  targetId: string; // original sender
  t0: number; // Original ping sent time
  t1: number; // Responder received time
  t2: number; // Responder sent time
}

export interface ClockOffsetSample {
  rtt: number;
  offset: number;
  timestamp: number;
}

export class ClockSyncEngine {
  private _offset: number = 0;
  private _samples: ClockOffsetSample[] = [];
  private _maxSamples: number = 7;
  private _pingCounter: number = 0;
  private _pendingPings = new Map<string, number>();

  /**
   * Current estimated clock offset in milliseconds (ServerTime - LocalTime).
   * LocalTime + offset = ServerTime.
   */
  public get offset(): number {
    return this._offset;
  }

  /**
   * History of recorded clock offset samples
   */
  public get samples(): ReadonlyArray<ClockOffsetSample> {
    return this._samples;
  }

  /**
   * Reset offset and samples
   */
  public reset(): void {
    this._offset = 0;
    this._samples = [];
    this._pendingPings.clear();
  }

  /**
   * Create an outgoing CLOCK_PING packet
   */
  public createPing(senderId: string, now: number = Date.now()): ClockPingPacket {
    this._pingCounter += 1;
    const pingId = `ping-${senderId}-${this._pingCounter}-${now}`;
    this._pendingPings.set(pingId, now);
    return {
      type: 'CLOCK_PING',
      pingId,
      senderId,
      t0: now,
    };
  }

  /**
   * Leader receives a ping and creates a CLOCK_PONG response
   */
  public static createPong(
    ping: ClockPingPacket,
    responderId: string,
    now: number = Date.now()
  ): ClockPongPacket {
    return {
      type: 'CLOCK_PONG',
      pingId: ping.pingId,
      senderId: responderId,
      targetId: ping.senderId,
      t0: ping.t0,
      t1: now,
      t2: now,
    };
  }

  /**
   * Follower processes an incoming CLOCK_PONG and updates the offset estimate
   */
  public processPong(pong: ClockPongPacket, now: number = Date.now()): ClockOffsetSample | null {
    const t0 = pong.t0;
    const t1 = pong.t1;
    const t2 = pong.t2;
    const t3 = now;

    // Remove pending ping
    this._pendingPings.delete(pong.pingId);

    // Compute RTT and offset
    const rtt = Math.max(0, (t3 - t0) - (t2 - t1));
    const offset = Math.round(((t1 - t0) + (t2 - t3)) / 2);

    const sample: ClockOffsetSample = {
      rtt,
      offset,
      timestamp: t3,
    };

    this._samples.push(sample);
    if (this._samples.length > this._maxSamples) {
      this._samples.shift();
    }

    // Filter samples: Select the offset corresponding to the lowest RTT
    let lowestRttSample = this._samples[0];
    for (let i = 1; i < this._samples.length; i++) {
      if (this._samples[i].rtt < lowestRttSample.rtt) {
        lowestRttSample = this._samples[i];
      }
    }

    this._offset = lowestRttSample.offset;
    return sample;
  }

  /**
   * Directly inject an offset estimate (e.g. from server HTTP header or calibration)
   */
  public setOffset(offset: number): void {
    this._offset = offset;
  }

  /**
   * Returns estimated server/leader UTC timestamp for a given local timestamp
   */
  public getEstimatedServerTime(localTime: number = Date.now()): number {
    return localTime + this._offset;
  }

  /**
   * Returns estimated local timestamp for a given server/leader UTC timestamp
   */
  public getEstimatedLocalTime(serverTime: number): number {
    return serverTime - this._offset;
  }
}

/** Global default clock sync engine singleton */
export const globalClockSync = new ClockSyncEngine();
