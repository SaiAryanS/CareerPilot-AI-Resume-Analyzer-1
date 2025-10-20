declare module "pdf-parse-fixed" {
  export default function pdfParse(
    data: Buffer,
    options?: any
  ): Promise<{ text?: string }>;
}
