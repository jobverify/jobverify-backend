// Offline replay only. Production never imports this module.
import {capturedSource,currentNativeTransport} from '../../test/helpers/replayCurrentNativeQuality.js'
export const nativePackets=()=>structuredClone(capturedSource('dovercorporation').requests)
export const replayTransport=(packets,mutate)=>currentNativeTransport('dovercorporation',mutate,packets)
