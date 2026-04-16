export interface TestConnectionResult {
  success: boolean;
  response?: string;
  message?: string;
}

export function testOpenAIConnection(): Promise<TestConnectionResult>;
