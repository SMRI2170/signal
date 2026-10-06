declare module "braces" {
  export interface BracesNode {
    type: string;
    value?: string;
    nodes?: BracesNode[];
    parent?: BracesNode;
  }

  interface BracesOptions {
    escapeInvalid?: boolean;
    expand?: boolean;
    maxDepth?: number;
  }

  interface Braces {
    (input: string, options?: BracesOptions): string[];
    parse(input: string, options?: BracesOptions): BracesNode;
    compile(input: string | BracesNode, options?: BracesOptions): string;
    expand(input: string | BracesNode, options?: BracesOptions): string[];
    stringify(input: string | BracesNode, options?: BracesOptions): string;
  }

  const braces: Braces;
  export default braces;
}
