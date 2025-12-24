declare function extractPdfText(filePath: string): Promise<string>;
declare function extractTextFile(filePath: string): Promise<string>;
declare function transcribeAudio(filePath: string): Promise<string>;
declare function analyzeVideo(filePath: string): Promise<string>;
declare function analyzeImage(filePath: string): Promise<{
    description: string;
    memoryPrompts: string[];
    estimatedDate?: string;
}>;
export declare function extractContent(filePath: string, mimeType: string, artifactId?: string): Promise<{
    text: string;
    analysis?: string;
    memoryPrompts?: string[];
    estimatedDate?: string;
}>;
export declare function processUnextractedArtifacts(): Promise<void>;
export { extractPdfText, extractTextFile, transcribeAudio, analyzeVideo, analyzeImage };
//# sourceMappingURL=contentExtractor.d.ts.map