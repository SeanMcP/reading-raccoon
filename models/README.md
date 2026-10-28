# Models

## kokoro-82m

[onnx-community/Kokoro-82M-v1.0-ONNX](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX) (Apache-2.0), revision `1939ad2`. The original model is [hexgrad/Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M).

- `model.onnx` is `onnx/model_quantized.onnx` (8-bit), unchanged.
- `voices/*.bin` are copied unchanged from `voices/` in that repo (510 × 256 float32 each): `am_puck` (Puck).

To try another voice, download it from the `voices/` folder of that repo into `voices/` and change `VOICE` in `tts.js`. The best-rated American English voices are `af_heart`, `af_bella`, and `af_nicole`.
