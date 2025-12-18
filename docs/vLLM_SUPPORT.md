# vLLM Support

This application supports vLLM as an OpenAI-compatible provider.

## Configuration

When adding a vLLM provider, use the OpenAI provider type with your vLLM server URL.

## URL Format

Always use the `/v1` suffix for vLLM endpoints:

- ✅ Correct: `http://10.67.67.195:8001/v1`
- ❌ Wrong: `http://10.67.67.195:8001`

## vLLM Server Requirements

### For Tool Calling Support
Start vLLM with the following flags:
```bash
--enable-auto-tool-choice \
--tool-call-parser hermes
```

## Example Docker Command for vLLM hosting

```bash
docker run -it --rm \
    --network=host \
    -v ~/.cache/huggingface:/root/.cache/huggingface \
    vllm-cpu-env \
    Qwen/Qwen2.5-0.5B-Instruct \
    --dtype float32 \
    --port 8001 \
    --enable-auto-tool-choice \
    --tool-call-parser hermes
```

## Compatibility

The existing OpenAI provider is fully compatible with vLLM. No code changes or separate provider implementation is needed.
