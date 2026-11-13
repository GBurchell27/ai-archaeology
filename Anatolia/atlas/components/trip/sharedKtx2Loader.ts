import type * as THREE from "three";
import { KTX2Loader } from "three-stdlib";

const TRANSCODER_PATH = "/basis/";
const loaders = new WeakMap<THREE.WebGLRenderer, KTX2Loader>();

/** One KTX2 loader per renderer, since each starts its own transcoder workers. */
export function sharedKtx2Loader(renderer: THREE.WebGLRenderer): KTX2Loader {
  let loader = loaders.get(renderer);
  if (!loader) {
    loader = new KTX2Loader().setTranscoderPath(TRANSCODER_PATH).detectSupport(renderer);
    loaders.set(renderer, loader);
  }
  return loader;
}
