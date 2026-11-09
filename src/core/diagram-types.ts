export type DiagramView = "overview" | "detailed" | "storage";
export type DiagramFormat = "svg" | "png";

export type DiagramRequest = {
  path: string;
  view?: DiagramView;
  format?: DiagramFormat;
  outputPath?: string;
  contractName?: string;
};

type DiagramResultMetadata = {
  inputPath: string;
  view: DiagramView;
  contractName?: string;
  savedPath?: string;
  byteLength: number;
};

export type DiagramSuccess =
  | (DiagramResultMetadata & { success: true; format: "svg"; artifact: string })
  | (DiagramResultMetadata & { success: true; format: "png"; artifact: Buffer });

export type DiagramResult = DiagramSuccess | { success: false; error: string };
