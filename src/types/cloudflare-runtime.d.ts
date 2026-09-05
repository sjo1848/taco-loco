declare module "cloudflare:workers" {
  interface ImagesInfo { format: string; fileSize: number; width: number; height: number }
  interface ImagesOutput { response(): Response }
  interface ImagesHandle {
    transform(options: { width?: number; height?: number; fit?: "scale-down" | "contain" | "cover" | "crop" | "pad" | "squeeze" | "scale-up" }): ImagesHandle;
    output(options: { format: "image/webp" | "image/jpeg" | "image/avif" | "image/png"; quality?: number; anim?: boolean }): Promise<ImagesOutput>;
  }
  interface ImagesBinding {
    info(stream: ReadableStream<Uint8Array>): Promise<ImagesInfo>;
    input(stream: ReadableStream<Uint8Array> | Uint8Array): ImagesHandle;
  }
  interface R2HTTPMetadata { contentType?: string; cacheControl?: string }
  interface R2ObjectBody { httpMetadata?: R2HTTPMetadata; arrayBuffer(): Promise<ArrayBuffer> }
  interface R2Bucket {
    put(key: string, value: Uint8Array | ArrayBuffer | ReadableStream<Uint8Array>, options?: { httpMetadata?: R2HTTPMetadata }): Promise<unknown>;
    get(key: string): Promise<R2ObjectBody | null>;
    delete(key: string): Promise<void>;
  }
  interface HyperdriveBinding { connectionString: string }
  export const env: {
    IMAGES: ImagesBinding;
    MEDIA_BUCKET: R2Bucket;
    HYPERDRIVE: HyperdriveBinding;
  };
}
