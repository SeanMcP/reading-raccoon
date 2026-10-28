# Vendored libraries

Copied from npm so the app makes no requests to other servers. To update, download the package with `npm pack <name>@<version>` and copy the same files in.

| Folder | Package | Version | License | Files |
|---|---|---|---|---|
| `onnxruntime-web/` | [onnxruntime-web](https://www.npmjs.com/package/onnxruntime-web) | 1.31.1 | MIT | `dist/ort.wasm.min.mjs`, `dist/ort-wasm-simd-threaded.mjs`, `dist/ort-wasm-simd-threaded.wasm` |
| `phonemizer/` | [phonemizer](https://www.npmjs.com/package/phonemizer) | 1.2.1 | Apache-2.0 (bundles [eSpeak NG](https://github.com/espeak-ng/espeak-ng), GPL-3.0) | `dist/phonemizer.js`, `LICENSE` |
