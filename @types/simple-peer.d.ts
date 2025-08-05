declare module 'simple-peer' {
  import { Duplex } from 'stream';
  import { SignalData } from 'simple-peer';

  interface SimplePeerOptions {
    initiator?: boolean;
    trickle?: boolean;
    stream?: MediaStream;
    config?: RTCConfiguration;
    channelName?: string;
    wrtc?: any;
    objectMode?: boolean;
    offerOptions?: RTCOfferOptions;
    answerOptions?: RTCAnswerOptions;
    sdpTransform?: (sdp: string) => string;
    iceCompleteTimeout?: number;
    allowHalfTrickle?: boolean;
  }

  export default class SimplePeer extends Duplex {
    constructor(opts?: SimplePeerOptions);
    signal(data: SignalData): void;
    send(data: any): void;
    destroy(error?: Error): void;
    addStream(stream: MediaStream): void;
    removeStream(stream: MediaStream): void;
    addTrack(track: MediaStreamTrack, stream: MediaStream): void;
    removeTrack(track: MediaStreamTrack, stream: MediaStream): void;
    connect(): void;
    _debug(...args: any[]): void;
    on(event: 'signal', listener: (data: SignalData) => void): this;
    on(event: 'stream', listener: (stream: MediaStream) => void): this;
    on(event: 'connect', listener: () => void): this;
    on(event: 'close', listener: () => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
    on(event: 'data', listener: (data: any) => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
  }

  export interface SignalData {
    sdp?: any;
    candidate?: any;
    type?: string;
    renegotiate?: boolean;
    transceiverRequest?: any;
  }
} 