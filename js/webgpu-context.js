export class WebGpuContext {
    device = undefined;
    canvasElement = undefined;

    canvasResizeListeners = [];

    async init(canvasElement) {
        await this.initDevice();
        this.canvasElement = canvasElement;
        this.canvasContext = this.canvasElement.getContext("webgpu");
        this.initResizeObserver();
    }

    async initDevice() {
        if (!navigator.gpu) {
            throw Error("WebGPU is not supported.");
        }

        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            throw Error("Could not request WebGPU adapter");
        }

        this.device = await adapter.requestDevice();
    }

    createComputePipeline(bindingNumberToBufferInfo, shaderCode, entrypointName = "main") {

        const shaderModule = this.device.createShaderModule({
            code: shaderCode,
        });

        const bindGroupLayout = this.device.createBindGroupLayout({
            entries: Object.keys(bindingNumberToBufferInfo).map(binding => {
                return {
                    binding: binding,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: bindingNumberToBufferInfo[binding].type,
                    },
                }
            }),
        });

        const bindGroup = this.device.createBindGroup({
            layout: bindGroupLayout,
            entries: Object.keys(bindingNumberToBufferInfo).map(binding => {
                return {
                    binding: binding,
                    resource: {
                        buffer: bindingNumberToBufferInfo[binding].buffer,
                    },
                }
            }),
        })

        const computePipeline = this.device.createComputePipeline({
            layout: this.device.createPipelineLayout({
                bindGroupLayouts: [bindGroupLayout],
            }),
            compute: {
                module: shaderModule,
                entryPoint: entrypointName,
            },
        });

        return {
            bindGroupLayout: bindGroupLayout,
            bindGroup: bindGroup,
            pipeline: computePipeline,
        };
    }

    encodeAndSubmitCommands(pipelineInfo, numWorkgroups, outputBuffer, stagingBuffer, size) {
        const commandEncoder = this.device.createCommandEncoder();

        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(pipelineInfo.pipeline);
        passEncoder.setBindGroup(0, pipelineInfo.bindGroup);
        passEncoder.dispatchWorkgroups(numWorkgroups);
        passEncoder.end();

        commandEncoder.copyBufferToBuffer(
            outputBuffer,
            0,
            stagingBuffer,
            0,
            size,
        );

        this.device.queue.submit([commandEncoder.finish()]);
    }

    addCanvasResizeListener(canvasResizeCallbackFunc) {
        this.canvasResizeListeners.push(canvasResizeCallbackFunc);
    }

    initResizeObserver() {
        const observer = new ResizeObserver(entries => {
            entries.forEach(entry => {
                const width = entry.contentBoxSize[0].inlineSize;
                const height = entry.contentBoxSize[0].blockSize;

                const canvasWidth = Math.max(1, Math.min(width, this.device.limits.maxTextureDimension2D));
                const canvasHeight = Math.max(1, Math.min(height, this.device.limits.maxTextureDimension2D));
                this.canvasElement.width = canvasWidth;
                this.canvasElement.height = canvasHeight;

                for (const resizeCallback of this.canvasResizeListeners) {
                    resizeCallback(width, height);
                }

            });
        });
        observer.observe(this.canvasElement);
    }

}
